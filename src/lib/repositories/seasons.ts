import type { PlayerLevel, PlayerSeasonAssignment, SeasonOption } from '@/types';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function listSeasons(): Promise<SeasonOption[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('seasons')
    .select('id, name, slug, start_date, end_date, is_current, status')
    .order('start_date', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    startDate: row.start_date,
    endDate: row.end_date,
    isCurrent: row.is_current,
    status: row.status,
  }));
}

export async function getResolvedSeason(slug?: string | null) {
  const seasons = await listSeasons();
  if (seasons.length === 0) {
    throw new Error('No seasons found. Run season bootstrap first.');
  }

  const selectedSeason =
    (slug ? seasons.find((season) => season.slug === slug) : null) ??
    seasons.find((season) => season.isCurrent) ??
    seasons[seasons.length - 1];

  return {
    seasons,
    selectedSeason,
    currentSeason: seasons.find((season) => season.isCurrent)?.slug ?? null,
  };
}

function baselineForLevel(level: PlayerLevel) {
  if (level === 'ADV') {
    return { seedMu: 45, seedSigma: 8.33 };
  }

  if (level === 'PLUS') {
    return { seedMu: 35, seedSigma: 8.33 };
  }

  return { seedMu: 25, seedSigma: 8.33 };
}

export async function createSeason(input: {
  name: string;
  slug: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  status?: 'draft' | 'active' | 'completed' | 'archived';
  resetStrategy?: 'hard_reset' | 'soft_reset';
  notes?: string | null;
}) {
  const supabase = createSupabaseAdminClient();

  if (input.isCurrent) {
    await supabase.from('seasons').update({ is_current: false, updated_at: new Date().toISOString() }).eq('is_current', true);
  }

  const { data: season, error } = await supabase
    .from('seasons')
    .insert({
      name: input.name,
      slug: input.slug,
      start_date: input.startDate,
      end_date: input.endDate ?? null,
      is_current: input.isCurrent,
      status: input.status ?? 'active',
      reset_strategy: input.resetStrategy ?? 'hard_reset',
      notes: input.notes ?? null,
    })
    .select('id, name, slug, start_date, end_date, is_current, status')
    .single();

  if (error || !season) {
    throw error ?? new Error('Failed to create season');
  }

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, level, is_active')
    .order('display_name', { ascending: true });

  if (playersError) {
    throw playersError;
  }

  if ((players ?? []).length > 0) {
    const assignments = players!.map((player) => {
      const baseline = baselineForLevel(player.level);
      return {
        season_id: season.id,
        player_id: player.id,
        level: player.level,
        seed_mu: baseline.seedMu,
        seed_sigma: baseline.seedSigma,
        seed_source: 'level_baseline' as const,
        is_active: player.is_active,
      };
    });

    const { error: assignmentError } = await supabase.from('player_season_assignments').insert(assignments);
    if (assignmentError) {
      throw assignmentError;
    }
  }

  return {
    id: season.id,
    name: season.name,
    slug: season.slug,
    startDate: season.start_date,
    endDate: season.end_date,
    isCurrent: season.is_current,
    status: season.status,
  } satisfies SeasonOption;
}

export async function updateSeason(
  seasonId: string,
  updates: Partial<{
    name: string;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
    status: 'draft' | 'active' | 'completed' | 'archived';
    notes: string | null;
  }>
) {
  const supabase = createSupabaseAdminClient();

  if (updates.isCurrent) {
    await supabase.from('seasons').update({ is_current: false, updated_at: new Date().toISOString() }).eq('is_current', true);
  }

  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.startDate !== undefined) payload.start_date = updates.startDate;
  if (updates.endDate !== undefined) payload.end_date = updates.endDate;
  if (updates.isCurrent !== undefined) payload.is_current = updates.isCurrent;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('seasons')
    .update(payload)
    .eq('id', seasonId)
    .select('id, name, slug, start_date, end_date, is_current, status')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to update season');
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    startDate: data.start_date,
    endDate: data.end_date,
    isCurrent: data.is_current,
    status: data.status,
  } satisfies SeasonOption;
}

export async function listSeasonAssignments(seasonId: string): Promise<PlayerSeasonAssignment[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('player_season_assignments')
    .select('id, season_id, player_id, level, seed_mu, seed_sigma, seed_source, is_active, players ( display_name, slug )')
    .eq('season_id', seasonId)
    .order('player_id', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    return {
      id: row.id,
      seasonId: row.season_id,
      playerId: row.player_id,
      displayName: player?.display_name ?? 'Unknown',
      slug: player?.slug ?? '',
      level: row.level,
      seedMu: row.seed_mu,
      seedSigma: row.seed_sigma,
      seedSource: row.seed_source,
      isActive: row.is_active,
    } satisfies PlayerSeasonAssignment;
  });
}

export async function getSeasonAssignmentLevelMap(seasonId: string) {
  const assignments = await listSeasonAssignments(seasonId);
  return new Map(assignments.map((assignment) => [assignment.playerId, assignment.level]));
}

export async function updateSeasonAssignment(
  assignmentId: string,
  updates: Partial<{
    level: PlayerLevel;
    seedMu: number;
    seedSigma: number;
    isActive: boolean;
  }>
) {
  const supabase = createSupabaseAdminClient();
  const payload: Record<string, unknown> = {};
  if (updates.level !== undefined) payload.level = updates.level;
  if (updates.seedMu !== undefined) payload.seed_mu = updates.seedMu;
  if (updates.seedSigma !== undefined) payload.seed_sigma = updates.seedSigma;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  payload.seed_source = 'manual';
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase.from('player_season_assignments').update(payload).eq('id', assignmentId);
  if (error) {
    throw error;
  }
}
