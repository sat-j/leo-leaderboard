import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatClubDateLabel, formatClubDateLongLabel, toClubDateString } from '@/lib/dates';
import { getResolvedSeason } from '@/lib/repositories/seasons';
import type { MatchInput } from '@/lib/validation/matches';

function buildPlayDateLabels(date: Date) {
  return {
    short: formatClubDateLabel(date.toISOString()),
    long: formatClubDateLongLabel(date.toISOString()),
  };
}

async function ensurePlayersExist(playerIds: string[]) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('players').select('id').in('id', playerIds);

  if (error) {
    throw error;
  }

  const existingIds = new Set((data ?? []).map((player) => player.id));
  const missingIds = playerIds.filter((playerId) => !existingIds.has(playerId));

  return missingIds;
}

async function upsertPlayDateForTimestamp(playedAt: string, seasonId: string) {
  const supabase = createSupabaseAdminClient();
  const playedAtDate = new Date(playedAt);
  const playDate = toClubDateString(playedAt);
  const labels = buildPlayDateLabels(playedAtDate);

  const { data: playDateRow, error } = await supabase
    .from('play_dates')
    .upsert(
      {
        season_id: seasonId,
        play_date: playDate,
        label_short: labels.short,
        label_long: labels.long,
      },
      { onConflict: 'play_date' }
    )
    .select('id, play_date')
    .single();

  if (error || !playDateRow) {
    throw error ?? new Error('Failed to resolve play date');
  }

  return playDateRow;
}

async function refreshPlayDateMatchCount(playDateId: string) {
  const supabase = createSupabaseAdminClient();
  const { count, error: countError } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('play_date_id', playDateId);

  if (countError) {
    throw countError;
  }

  const { error: updateError } = await supabase
    .from('play_dates')
    .update({ match_count: count ?? 0 })
    .eq('id', playDateId);

  if (updateError) {
    throw updateError;
  }
}

export async function createMatch(input: MatchInput) {
  const supabase = createSupabaseAdminClient();
  const playDate = toClubDateString(input.playedAt);
  const { selectedSeason } = await getResolvedSeason();

  const missingPlayerIds = await ensurePlayersExist(input.players.map((player) => player.playerId));
  if (missingPlayerIds.length > 0) {
    throw new Error(`Unknown players: ${missingPlayerIds.join(', ')}`);
  }

  const playDateRow = await upsertPlayDateForTimestamp(input.playedAt, selectedSeason.id);

  const { data: insertedMatch, error: matchError } = await supabase
    .from('matches')
    .insert({
      season_id: selectedSeason.id,
      play_date_id: playDateRow.id,
      played_at: input.playedAt,
      score1: input.score1,
      score2: input.score2,
      submitted_via: input.submittedVia ?? 'admin',
      source: input.source ?? 'manual',
      status: 'validated',
      external_source_id: input.externalSourceId ?? null,
    })
    .select('id, play_date_id, played_at, score1, score2, status')
    .single();

  if (matchError || !insertedMatch) {
    throw matchError ?? new Error('Failed to create match');
  }

  const participantRows = input.players.map((player) => ({
    match_id: insertedMatch.id,
    player_id: player.playerId,
    team_number: player.team,
    seat_number: player.seat,
  }));

  const { error: participantsError } = await supabase.from('match_participants').insert(participantRows);
  if (participantsError) {
    throw participantsError;
  }

  const { error: countError } = await supabase.rpc('increment_play_date_match_count', { play_date_id_input: playDateRow.id });
  if (countError) {
    throw countError;
  }

  return {
    matchId: insertedMatch.id,
    playDate,
    status: insertedMatch.status,
  };
}

export async function listRecentMatches(limit = 25) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('matches')
    .select(
      `
        id,
        played_at,
        score1,
        score2,
        status,
        play_dates ( play_date, label_short ),
        match_participants (
          team_number,
          seat_number,
          players ( id, display_name )
        )
      `
    )
    .order('played_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

function flattenAdminMatch(row: Awaited<ReturnType<typeof listRecentMatches>>[number]) {
  const playDateRow = Array.isArray(row.play_dates) ? row.play_dates[0] : row.play_dates;
  const participants = [...(row.match_participants ?? [])].sort((left, right) => {
    if (left.team_number !== right.team_number) {
      return left.team_number - right.team_number;
    }
    return left.seat_number - right.seat_number;
  });

  const flattenedParticipants = participants.map((participant) => {
    const player = Array.isArray(participant.players) ? participant.players[0] : participant.players;
    return {
      playerId: player?.id ?? '',
      displayName: player?.display_name ?? 'Unknown',
      team: participant.team_number,
      seat: participant.seat_number,
    };
  });

  return {
    id: row.id,
    playedAt: row.played_at,
    playDate: playDateRow?.play_date ?? null,
    score1: row.score1,
    score2: row.score2,
    status: row.status,
    participants: flattenedParticipants,
    team1: flattenedParticipants.filter((participant) => participant.team === 1).map((participant) => participant.displayName),
    team2: flattenedParticipants.filter((participant) => participant.team === 2).map((participant) => participant.displayName),
  };
}

async function listMatchesByPlayDate(playDate: string) {
  const supabase = createSupabaseAdminClient();
  const { data: playDateRow, error: playDateError } = await supabase
    .from('play_dates')
    .select('id')
    .eq('play_date', playDate)
    .single();

  if (playDateError) {
    throw playDateError;
  }

  if (!playDateRow) {
    return [];
  }

  const { data, error } = await supabase
    .from('matches')
    .select(
      `
        id,
        played_at,
        score1,
        score2,
        status,
        play_dates ( play_date, label_short ),
        match_participants (
          team_number,
          seat_number,
          players ( id, display_name )
        )
      `
    )
    .eq('play_date_id', playDateRow.id)
    .order('played_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listAdminMatches(options: {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  playDate?: string;
} = {}) {
  const supabase = createSupabaseAdminClient();
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const search = options.search?.trim().toLowerCase();
  const status = options.status?.trim().toLowerCase();
  const playDate = options.playDate?.trim();

  if (playDate) {
    const rows = await listMatchesByPlayDate(playDate);
    const flattened = rows.map(flattenAdminMatch);
    const filtered = flattened.filter((match) => {
      if (status && match.status.toLowerCase() !== status) {
        return false;
      }

      const haystack = [
        ...match.team1,
        ...match.team2,
        match.playDate ?? '',
        match.status,
        `${match.score1}-${match.score2}`,
      ]
        .join(' ')
        .toLowerCase();

      return search ? haystack.includes(search) : true;
    });

    return {
      matches: filtered,
      total: filtered.length,
    };
  }

  let countQuery = supabase.from('matches').select('id', { count: 'exact', head: true });
  if (status) {
    countQuery = countQuery.eq('status', status);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    throw countError;
  }

  if (!search && !status) {
    const rows = await listRecentMatches(offset + limit);
    const flattened = rows.map(flattenAdminMatch);

    return {
      matches: flattened.slice(offset, offset + limit),
      total: count ?? 0,
    };
  }

  const rows = await listRecentMatches(500);
  const flattened = rows.map(flattenAdminMatch);
  const filtered = flattened.filter((match) => {
    if (status && match.status.toLowerCase() !== status) {
      return false;
    }

    const haystack = [
      ...match.team1,
      ...match.team2,
      match.playDate ?? '',
      match.status,
      `${match.score1}-${match.score2}`,
    ]
      .join(' ')
      .toLowerCase();

    return search ? haystack.includes(search) : true;
  });

  return {
    matches: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

export async function listAdminMatchDates() {
  const supabase = createSupabaseAdminClient();
  const pageSize = 500;
  const rows: Array<{
    play_dates:
      | {
          play_date: string;
          label_short: string | null;
        }
      | Array<{
          play_date: string;
          label_short: string | null;
        }>
      | null;
  }> = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('matches')
      .select('play_dates ( play_date, label_short )')
      .order('played_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    const batch = data ?? [];
    rows.push(...(batch as typeof rows));

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  const counts = new Map<string, { labelShort: string; matchCount: number }>();
  for (const row of rows) {
    const playDateRow = Array.isArray(row.play_dates) ? row.play_dates[0] : row.play_dates;
    if (!playDateRow?.play_date) {
      continue;
    }

    const current = counts.get(playDateRow.play_date);
    if (current) {
      current.matchCount += 1;
      continue;
    }

    counts.set(playDateRow.play_date, {
      labelShort: playDateRow.label_short ?? playDateRow.play_date,
      matchCount: 1,
    });
  }

  return Array.from(counts.entries())
    .map(([playDate, value]) => ({
      playDate,
      labelShort: value.labelShort,
      matchCount: value.matchCount,
    }))
    .sort((left, right) => right.playDate.localeCompare(left.playDate));
}

export async function updateMatch(
  matchId: string,
  updates: {
    score1?: number;
    score2?: number;
    playedAt?: string;
    status?: string;
    players?: MatchInput['players'];
  }
) {
  const supabase = createSupabaseAdminClient();
  const { data: existingMatch, error: existingMatchError } = await supabase
    .from('matches')
    .select('id, season_id, play_date_id, played_at')
    .eq('id', matchId)
    .single();

  if (existingMatchError || !existingMatch) {
    throw existingMatchError ?? new Error('Match not found');
  }

  const updatePayload: Record<string, unknown> = {};
  let nextPlayDateId = existingMatch.play_date_id;

  if (typeof updates.score1 === 'number') {
    updatePayload.score1 = updates.score1;
  }

  if (typeof updates.score2 === 'number') {
    updatePayload.score2 = updates.score2;
  }

  if (typeof updates.status === 'string') {
    updatePayload.status = updates.status;
  }

  if (updates.playedAt) {
    const seasonId = existingMatch.season_id ?? (await getResolvedSeason()).selectedSeason.id;
    const playDateRow = await upsertPlayDateForTimestamp(updates.playedAt, seasonId);
    updatePayload.played_at = updates.playedAt;
    updatePayload.season_id = seasonId;
    updatePayload.play_date_id = playDateRow.id;
    nextPlayDateId = playDateRow.id;
  }

  const { error: updateError } = await supabase.from('matches').update(updatePayload).eq('id', matchId);
  if (updateError) {
    throw updateError;
  }

  if (updates.players) {
    const missingPlayerIds = await ensurePlayersExist(updates.players.map((player) => player.playerId));
    if (missingPlayerIds.length > 0) {
      throw new Error(`Unknown players: ${missingPlayerIds.join(', ')}`);
    }

    const { error: deleteParticipantsError } = await supabase
      .from('match_participants')
      .delete()
      .eq('match_id', matchId);

    if (deleteParticipantsError) {
      throw deleteParticipantsError;
    }

    const replacementParticipants = updates.players.map((player) => ({
      match_id: matchId,
      player_id: player.playerId,
      team_number: player.team,
      seat_number: player.seat,
    }));

    const { error: insertParticipantsError } = await supabase
      .from('match_participants')
      .insert(replacementParticipants);

    if (insertParticipantsError) {
      throw insertParticipantsError;
    }
  }

  if (existingMatch.play_date_id !== nextPlayDateId) {
    await refreshPlayDateMatchCount(existingMatch.play_date_id);
    await refreshPlayDateMatchCount(nextPlayDateId);
  }

  return { matchId, updated: true };
}

export async function deleteMatch(matchId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: existingMatch, error: existingMatchError } = await supabase
    .from('matches')
    .select('id, play_date_id')
    .eq('id', matchId)
    .single();

  if (existingMatchError || !existingMatch) {
    throw existingMatchError ?? new Error('Match not found');
  }

  const { error: deleteError } = await supabase.from('matches').delete().eq('id', matchId);
  if (deleteError) {
    throw deleteError;
  }

  await refreshPlayDateMatchCount(existingMatch.play_date_id);

  return { matchId, deleted: true };
}

export async function listMatchesForProcessing() {
  const supabase = createSupabaseAdminClient();
  const pageSize = 500;
  type ProcessingMatchRow = {
    id: string;
    season_id: string | null;
    played_at: string;
    score1: number;
    score2: number;
    status: string;
    play_dates:
      | {
          id: string;
          play_date: string;
          label_short: string | null;
          label_long: string | null;
        }
      | Array<{
          id: string;
          play_date: string;
          label_short: string | null;
          label_long: string | null;
        }>
      | null;
    match_participants: Array<{
      team_number: number;
      seat_number: number;
      players:
        | {
            id: string;
            display_name: string;
            level: 'PLUS' | 'INT' | 'ADV';
            initial_mu: number;
            initial_sigma: number;
          }
        | Array<{
            id: string;
            display_name: string;
            level: 'PLUS' | 'INT' | 'ADV';
            initial_mu: number;
            initial_sigma: number;
          }>
        | null;
    }> | null;
  };
  const rows: ProcessingMatchRow[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('matches')
      .select(
        `
          id,
          season_id,
          played_at,
          score1,
          score2,
          status,
          play_dates ( id, play_date, label_short, label_long ),
          match_participants (
            team_number,
            seat_number,
            players ( id, display_name, level, initial_mu, initial_sigma )
          )
        `
      )
      .in('status', ['pending', 'validated', 'processed'])
      .order('played_at', { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const batch = data ?? [];
    rows.push(...(batch as ProcessingMatchRow[]));

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}
