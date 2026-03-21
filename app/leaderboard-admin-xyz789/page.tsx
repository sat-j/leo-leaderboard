'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';

interface AdminMatch {
  id: string;
  playedAt: string;
  playDate: string | null;
  score1: number;
  score2: number;
  status: string;
  participants: Array<{
    playerId: string;
    displayName: string;
    team: number;
    seat: number;
  }>;
  team1: string[];
  team2: string[];
}

interface ProcessingRun {
  id: string;
  trigger_type: string;
  scope: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  summary: Record<string, unknown>;
  error_message: string | null;
}

interface EditableMatchState {
  score1: string;
  score2: string;
  playedAtLocal: string;
  status: string;
  participantIds: Record<string, string>;
}

interface AdminPlayer {
  id: string;
  displayName: string;
  slug: string;
  level: 'INT' | 'PLUS' | 'ADV';
  isActive: boolean;
}

interface EditablePlayerState {
  displayName: string;
  level: 'INT' | 'PLUS' | 'ADV';
  isActive: boolean;
}

interface MatchDateOption {
  playDate: string;
  labelShort: string;
  matchCount: number;
}

interface AdminSeason {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  status: 'draft' | 'active' | 'completed' | 'archived';
}

interface EditableSeasonAssignment {
  level: 'INT' | 'PLUS' | 'ADV';
  seedMu: string;
  seedSigma: string;
  isActive: boolean;
}

interface PlayerSeasonAssignment {
  id: string;
  seasonId: string;
  playerId: string;
  displayName: string;
  slug: string;
  level: 'INT' | 'PLUS' | 'ADV';
  seedMu: number;
  seedSigma: number;
  seedSource: 'level_baseline' | 'carryover' | 'manual';
  isActive: boolean;
}

const MATCH_PAGE_SIZE = 20;
const CLUB_TIME_ZONE = process.env.NEXT_PUBLIC_CLUB_TIME_ZONE || 'America/Toronto';

function toLocalDatetimeInputValue(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function toIsoFromLocalDatetime(localValue: string): string {
  return new Date(localValue).toISOString();
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'In progress';
  }

  return new Date(value).toLocaleString();
}

function summarizeRun(run: ProcessingRun): string {
  const summary = run.summary ?? {};
  const matchesProcessed =
    typeof summary.matchesProcessed === 'number' ? summary.matchesProcessed : null;
  const playDatesProcessed =
    typeof summary.playDatesProcessed === 'number' ? summary.playDatesProcessed : null;

  if (matchesProcessed === null && playDatesProcessed === null) {
    return run.error_message ?? 'No summary available yet';
  }

  const parts: string[] = [];
  if (matchesProcessed !== null) {
    parts.push(`${matchesProcessed} matches`);
  }
  if (playDatesProcessed !== null) {
    parts.push(`${playDatesProcessed} play dates`);
  }

  return parts.join(' - ');
}

function createParticipantIdMap(match: AdminMatch) {
  return Object.fromEntries(
    match.participants.map((participant) => [`${participant.team}-${participant.seat}`, participant.playerId])
  );
}

function isPlayerTakenInMatch(
  participantIds: Record<string, string>,
  currentKey: string,
  playerId: string
) {
  return Object.entries(participantIds).some(
    ([key, selectedPlayerId]) => key !== currentKey && selectedPlayerId === playerId
  );
}

function buildEditableMatchState(match: AdminMatch): EditableMatchState {
  return {
    score1: String(match.score1),
    score2: String(match.score2),
    playedAtLocal: toLocalDatetimeInputValue(match.playedAt),
    status: match.status,
    participantIds: createParticipantIdMap(match),
  };
}

function getMatchStatusTheme(status: string) {
  switch (status.toLowerCase()) {
    case 'processed':
      return {
        row: 'bg-emerald-950/70 text-emerald-50 border border-emerald-500/20',
        dot: 'bg-emerald-400',
        label: 'text-emerald-100',
      };
    case 'validated':
      return {
        row: 'bg-cyan-950/70 text-cyan-50 border border-cyan-500/20',
        dot: 'bg-cyan-400',
        label: 'text-cyan-100',
      };
    case 'pending':
      return {
        row: 'bg-amber-950/70 text-amber-50 border border-amber-500/20',
        dot: 'bg-amber-400',
        label: 'text-amber-100',
      };
    case 'rejected':
      return {
        row: 'bg-rose-950/70 text-rose-50 border border-rose-500/20',
        dot: 'bg-rose-400',
        label: 'text-rose-100',
      };
    default:
      return {
        row: 'bg-slate-900/80 text-slate-100 border border-slate-800',
        dot: 'bg-slate-400',
        label: 'text-slate-100',
      };
  }
}

function parsePlayDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatPlayDateHeading(value: string | null) {
  if (!value) {
    return 'Choose a match date';
  }

  return parsePlayDate(value).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function startOfCalendarMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function slugifySeasonName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function baselineForLevel(level: 'INT' | 'PLUS' | 'ADV') {
  if (level === 'ADV') {
    return { seedMu: 45, seedSigma: 8.33 };
  }

  if (level === 'PLUS') {
    return { seedMu: 35, seedSigma: 8.33 };
  }

  return { seedMu: 25, seedSigma: 8.33 };
}

function formatSeasonDateRange(startDate: string, endDate: string | null) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = endDate ? new Date(`${endDate}T12:00:00`) : null;

  const startLabel = start.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  if (!end) {
    return `Starts ${startLabel}`;
  }

  const endLabel = end.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}

function buildEditableAssignmentState(assignment: PlayerSeasonAssignment): EditableSeasonAssignment {
  return {
    level: assignment.level,
    seedMu: assignment.seedMu.toFixed(2),
    seedSigma: assignment.seedSigma.toFixed(2),
    isActive: assignment.isActive,
  };
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [matchTotal, setMatchTotal] = useState(0);
  const [processingRuns, setProcessingRuns] = useState<ProcessingRun[]>([]);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [matchPlayerOptions, setMatchPlayerOptions] = useState<AdminPlayer[]>([]);
  const [editState, setEditState] = useState<Record<string, EditableMatchState>>({});
  const [playerEditState, setPlayerEditState] = useState<Record<string, EditablePlayerState>>({});
  const [loadingData, setLoadingData] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [rebuildMessage, setRebuildMessage] = useState<string | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [matchSearchInput, setMatchSearchInput] = useState('');
  const [matchSearch, setMatchSearch] = useState('');
  const [matchStatusFilter, setMatchStatusFilter] = useState('all');
  const [matchPage, setMatchPage] = useState(1);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const [isSeasonManagerOpen, setIsSeasonManagerOpen] = useState(false);
  const [isRebuildHistoryOpen, setIsRebuildHistoryOpen] = useState(false);
  const [isDateBrowserOpen, setIsDateBrowserOpen] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isLoadingDateMatches, setIsLoadingDateMatches] = useState(false);
  const [isLoadingMatchDates, setIsLoadingMatchDates] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerLevel, setNewPlayerLevel] = useState<'INT' | 'PLUS' | 'ADV'>('INT');
  const [needsRebuild, setNeedsRebuild] = useState(false);
  const [matchDates, setMatchDates] = useState<MatchDateOption[]>([]);
  const [selectedMatchDate, setSelectedMatchDate] = useState<string | null>(null);
  const [dateMatches, setDateMatches] = useState<AdminMatch[]>([]);
  const [dateMatchSearch, setDateMatchSearch] = useState('');
  const [expandedDateMatchId, setExpandedDateMatchId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [seasons, setSeasons] = useState<AdminSeason[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [seasonAssignments, setSeasonAssignments] = useState<PlayerSeasonAssignment[]>([]);
  const [assignmentEditState, setAssignmentEditState] = useState<Record<string, EditableSeasonAssignment>>({});
  const [activeSeasonAssignmentId, setActiveSeasonAssignmentId] = useState<string | null>(null);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [isLoadingSeasonAssignments, setIsLoadingSeasonAssignments] = useState(false);
  const [seasonSearch, setSeasonSearch] = useState('');
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonStartDate, setNewSeasonStartDate] = useState('');
  const [newSeasonEndDate, setNewSeasonEndDate] = useState('');
  const [isCreatingSeason, setIsCreatingSeason] = useState(false);

  const loadMatches = async (page: number, search: string, statusFilter: string) => {
    const offset = (page - 1) * MATCH_PAGE_SIZE;
    const query = new URLSearchParams({
      limit: String(MATCH_PAGE_SIZE),
      offset: String(offset),
    });

    if (search) {
      query.set('search', search);
    }

    if (statusFilter !== 'all') {
      query.set('status', statusFilter);
    }

    const response = await fetch(`/api/admin/matches?${query.toString()}`, { credentials: 'include' });
    if (response.status === 401) {
      setIsAuthenticated(false);
      return false;
    }

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'Failed to load matches');
    }

    const nextMatches = result.data.matches as AdminMatch[];
    setMatches(nextMatches);
    setMatchTotal(result.data.total as number);
    setEditState(
      Object.fromEntries(
        nextMatches.map((match) => [
          match.id,
          buildEditableMatchState(match),
        ])
      )
    );

    return true;
  };

  const loadMatchDates = async () => {
    setIsLoadingMatchDates(true);

    try {
      const response = await fetch('/api/admin/matches?includeDates=true&limit=1', {
        credentials: 'include',
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return false;
      }

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load match dates');
      }

      const nextMatchDates = (result.data.matchDates as MatchDateOption[] | null) ?? [];
      setMatchDates(nextMatchDates);

      if (nextMatchDates.length > 0) {
        const nextSelectedDate = selectedMatchDate && nextMatchDates.some((item) => item.playDate === selectedMatchDate)
          ? selectedMatchDate
          : nextMatchDates[0].playDate;

        setSelectedMatchDate(nextSelectedDate);
        setCalendarMonth(startOfCalendarMonth(parsePlayDate(nextSelectedDate)));
      } else {
        setSelectedMatchDate(null);
      }

      return true;
    } finally {
      setIsLoadingMatchDates(false);
    }
  };

  const loadMatchesForDate = async (playDate: string) => {
    setIsLoadingDateMatches(true);

    try {
      const query = new URLSearchParams({ playDate });
      const response = await fetch(`/api/admin/matches?${query.toString()}`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return false;
      }

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load matches for date');
      }

      const nextMatches = result.data.matches as AdminMatch[];
      setDateMatches(nextMatches);
      setEditState((current) => ({
        ...current,
        ...Object.fromEntries(
          nextMatches.map((match) => [match.id, buildEditableMatchState(match)])
        ),
      }));
      setExpandedDateMatchId(null);
      return true;
    } finally {
      setIsLoadingDateMatches(false);
    }
  };

  const loadPlayers = async () => {
    setIsLoadingPlayers(true);

    try {
      const query = new URLSearchParams({ limit: '150' });
      if (playerSearch.trim()) {
        query.set('search', playerSearch.trim());
      }

      const response = await fetch(`/api/admin/players?${query.toString()}`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return false;
      }

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load players');
      }

      const nextPlayers = result.data.players as AdminPlayer[];
      setPlayers(nextPlayers);
      setPlayerEditState(
        Object.fromEntries(
          nextPlayers.map((player) => [
            player.id,
            {
              displayName: player.displayName,
              level: player.level,
              isActive: player.isActive,
            },
          ])
        )
      );
      return true;
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  const loadMatchPlayerOptions = async () => {
    const response = await fetch('/api/admin/players?active=true&limit=250', {
      credentials: 'include',
    });

    if (response.status === 401) {
      setIsAuthenticated(false);
      return false;
    }

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'Failed to load player options');
    }

    setMatchPlayerOptions(result.data.players as AdminPlayer[]);
    return true;
  };

  const loadSeasons = async () => {
    setIsLoadingSeasons(true);

    try {
      const response = await fetch('/api/admin/seasons', {
        credentials: 'include',
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return false;
      }

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load seasons');
      }

      const nextSeasons = (result.data.seasons as AdminSeason[] | null) ?? [];
      setSeasons(nextSeasons);
      setSelectedSeasonId((current) => {
        if (current && nextSeasons.some((season) => season.id === current)) {
          return current;
        }

        return nextSeasons.find((season) => season.isCurrent)?.id ?? nextSeasons[0]?.id ?? null;
      });

      return true;
    } finally {
      setIsLoadingSeasons(false);
    }
  };

  const loadSeasonAssignments = async (seasonId: string) => {
    setIsLoadingSeasonAssignments(true);

    try {
      const response = await fetch(`/api/admin/seasons/${seasonId}/players`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return false;
      }

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load season assignments');
      }

      const nextAssignments = (result.data.assignments as PlayerSeasonAssignment[] | null) ?? [];
      setSeasonAssignments(nextAssignments);
      setAssignmentEditState(
        Object.fromEntries(
          nextAssignments.map((assignment) => [assignment.id, buildEditableAssignmentState(assignment)])
        )
      );

      return true;
    } finally {
      setIsLoadingSeasonAssignments(false);
    }
  };
  const loadDashboardData = async () => {
    setLoadingData(true);
    setPageError(null);

    try {
      const runsResponse = await fetch('/api/admin/processing/runs?limit=5', { credentials: 'include' });

      if (runsResponse.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const runsResult = await runsResponse.json();
      if (!runsResponse.ok || !runsResult.success) {
        throw new Error(runsResult.error?.message || 'Failed to load processing runs');
      }

      const [matchesLoaded, optionsLoaded, matchDatesLoaded, seasonsLoaded] = await Promise.all([
        loadMatches(matchPage, matchSearch, matchStatusFilter),
        loadMatchPlayerOptions(),
        loadMatchDates(),
        loadSeasons(),
      ]);
      if (!matchesLoaded || !optionsLoaded || !matchDatesLoaded || !seasonsLoaded) {
        return;
      }

      setProcessingRuns(runsResult.data.runs as ProcessingRun[]);
      setIsAuthenticated(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load admin dashboard');
    } finally {
      setLoadingData(false);
      setIsCheckingSession(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isCheckingSession) {
      return;
    }

    const refreshMatches = async () => {
      setLoadingData(true);
      setPageError(null);

      try {
        await loadMatches(matchPage, matchSearch, matchStatusFilter);
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Failed to load matches');
      } finally {
        setLoadingData(false);
      }
    };

    refreshMatches();
  }, [isAuthenticated, isCheckingSession, matchPage, matchSearch, matchStatusFilter]);

  useEffect(() => {
    if (!isAuthenticated || !isPlayersOpen) {
      return;
    }

    const refreshPlayers = async () => {
      try {
        await loadPlayers();
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Failed to load players');
      }
    };

    refreshPlayers();
  }, [isAuthenticated, isPlayersOpen, playerSearch]);

  useEffect(() => {
    if (!isAuthenticated || !isDateBrowserOpen || !selectedMatchDate) {
      return;
    }

    const refreshDateMatches = async () => {
      try {
        await loadMatchesForDate(selectedMatchDate);
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Failed to load matches for selected date');
      }
    };

    refreshDateMatches();
  }, [isAuthenticated, isDateBrowserOpen, selectedMatchDate]);

  useEffect(() => {
    if (!isAuthenticated || !isSeasonManagerOpen || !selectedSeasonId) {
      return;
    }

    const refreshAssignments = async () => {
      try {
        await loadSeasonAssignments(selectedSeasonId);
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Failed to load season assignments');
      }
    };

    refreshAssignments();
  }, [isAuthenticated, isSeasonManagerOpen, selectedSeasonId]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Invalid admin secret');
      }

      setPassword('');
      setIsAuthenticated(true);
      await loadDashboardData();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/session', {
      method: 'DELETE',
      credentials: 'include',
    });

    setIsAuthenticated(false);
    setMatches([]);
    setMatchTotal(0);
    setProcessingRuns([]);
    setPlayers([]);
    setSeasons([]);
    setSelectedSeasonId(null);
    setSeasonAssignments([]);
    setAssignmentEditState({});
    setEditState({});
    setPlayerEditState({});
    setRebuildMessage(null);
    setNeedsRebuild(false);
  };

  const handleRebuild = async () => {
    setIsRebuilding(true);
    setRebuildMessage(null);

    try {
      const response = await fetch('/api/admin/processing/rebuild', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to rebuild processed data');
      }

      const summary = result.data.summary;
      setRebuildMessage(
        `Rebuild completed. ${summary.matchesProcessed} matches across ${summary.playDatesProcessed} play dates.`
      );
      setNeedsRebuild(false);
      await loadDashboardData();
    } catch (error) {
      setRebuildMessage(error instanceof Error ? error.message : 'Rebuild failed');
    } finally {
      setIsRebuilding(false);
    }
  };

  const updateField = (matchId: string, field: keyof EditableMatchState, value: string) => {
    setEditState((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [field]: value,
      },
    }));
  };


  const updateMatchParticipant = (matchId: string, team: number, seat: number, playerId: string) => {
    const participantKey = `${team}-${seat}`;
    setEditState((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        participantIds: {
          ...current[matchId].participantIds,
          [participantKey]: playerId,
        },
      },
    }));
  };
  const handleSaveMatch = async (matchId: string) => {
    const current = editState[matchId];
    if (!current) {
      return;
    }

    setActiveMatchId(matchId);
    setPageError(null);

    try {
      const response = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score1: Number.parseInt(current.score1, 10),
          score2: Number.parseInt(current.score2, 10),
          playedAt: toIsoFromLocalDatetime(current.playedAtLocal),
          status: current.status,
          players: [
            { playerId: current.participantIds['1-1'], team: 1, seat: 1 },
            { playerId: current.participantIds['1-2'], team: 1, seat: 2 },
            { playerId: current.participantIds['2-1'], team: 2, seat: 1 },
            { playerId: current.participantIds['2-2'], team: 2, seat: 2 },
          ],
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update match');
      }

      setPageError('Match updated. Run rebuild when you are ready to refresh public stats.');
      setNeedsRebuild(true);
      await loadMatches(matchPage, matchSearch, matchStatusFilter);
      await loadMatchDates();
      if (selectedMatchDate && isDateBrowserOpen) {
        await loadMatchesForDate(selectedMatchDate);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to update match');
    } finally {
      setActiveMatchId(null);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    const confirmed = window.confirm('Delete this match? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    setActiveMatchId(matchId);
    setPageError(null);

    try {
      const response = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to delete match');
      }

      setPageError('Match deleted. Run rebuild when you are ready to refresh public stats.');
      setNeedsRebuild(true);
      if (matches.length === 1 && matchPage > 1) {
        setMatchPage((current) => current - 1);
      } else {
        await loadMatches(matchPage, matchSearch, matchStatusFilter);
      }
      await loadMatchDates();
      if (selectedMatchDate && isDateBrowserOpen) {
        await loadMatchesForDate(selectedMatchDate);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to delete match');
    } finally {
      setActiveMatchId(null);
    }
  };
  const updatePlayerField = (
    playerId: string,
    field: keyof EditablePlayerState,
    value: string | boolean
  ) => {
    setPlayerEditState((current) => ({
      ...current,
      [playerId]: {
        ...current[playerId],
        [field]: value,
      },
    }));
  };

  const handleSavePlayer = async (playerId: string) => {
    const current = playerEditState[playerId];
    if (!current) {
      return;
    }

    setActivePlayerId(playerId);
    setPageError(null);

    try {
      const response = await fetch(`/api/admin/players/${playerId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(current),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update player');
      }

      setPageError('Player updated. Run rebuild if the change should affect public processed stats.');
      setNeedsRebuild(true);
      await loadPlayers();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to update player');
    } finally {
      setActivePlayerId(null);
    }
  };

  const handleCancelDateMatchEdit = (match: AdminMatch) => {
    setEditState((current) => ({
      ...current,
      [match.id]: buildEditableMatchState(match),
    }));
    setExpandedDateMatchId(null);
  };

  const handleCreatePlayer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActivePlayerId('new-player');
    setPageError(null);

    try {
      const response = await fetch('/api/admin/players', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: newPlayerName,
          level: newPlayerLevel,
          isActive: true,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create player');
      }

      setNewPlayerName('');
      setNewPlayerLevel('INT');
      setPageError('Player created successfully.');
      setNeedsRebuild(true);
      await loadPlayers();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to create player');
    } finally {
      setActivePlayerId(null);
    }
  };

  const handleCreateSeason = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingSeason(true);
    setPageError(null);

    try {
      const trimmedName = newSeasonName.trim();
      if (!trimmedName) {
        throw new Error('Season name is required');
      }

      if (!newSeasonStartDate) {
        throw new Error('Season start date is required');
      }

      const slug = slugifySeasonName(trimmedName);
      if (!slug) {
        throw new Error('Season name must produce a valid slug');
      }

      const response = await fetch('/api/admin/seasons', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          slug,
          startDate: newSeasonStartDate,
          endDate: newSeasonEndDate || null,
          isCurrent: true,
          status: 'active',
          resetStrategy: 'hard_reset',
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create season');
      }

      const createdSeason = result.data.season as AdminSeason;
      setNewSeasonName('');
      setNewSeasonStartDate('');
      setNewSeasonEndDate('');
      setPageError(`Season "${createdSeason.name}" is ready and set as current.`);
      setNeedsRebuild(true);
      await loadSeasons();
      setSelectedSeasonId(createdSeason.id);
      if (isSeasonManagerOpen) {
        await loadSeasonAssignments(createdSeason.id);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to create season');
    } finally {
      setIsCreatingSeason(false);
    }
  };

  const handleMakeCurrentSeason = async (season: AdminSeason) => {
    setActivePlayerId(`season-${season.id}`);
    setPageError(null);

    try {
      const response = await fetch(`/api/admin/seasons/${season.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isCurrent: true,
          status: season.status === 'archived' ? 'active' : season.status,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update season');
      }

      setPageError(`Current season changed to "${season.name}". New public submissions will attach there.`);
      await loadSeasons();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to update season');
    } finally {
      setActivePlayerId(null);
    }
  };

  const updateAssignmentField = (
    assignmentId: string,
    field: keyof EditableSeasonAssignment,
    value: string | boolean
  ) => {
    setAssignmentEditState((current) => ({
      ...current,
      [assignmentId]: {
        ...current[assignmentId],
        [field]: value,
      },
    }));
  };

  const handleResetAssignmentBaseline = (assignmentId: string) => {
    const current = assignmentEditState[assignmentId];
    if (!current) {
      return;
    }

    const baseline = baselineForLevel(current.level);
    setAssignmentEditState((state) => ({
      ...state,
      [assignmentId]: {
        ...state[assignmentId],
        seedMu: baseline.seedMu.toFixed(2),
        seedSigma: baseline.seedSigma.toFixed(2),
      },
    }));
  };

  const handleSaveAssignment = async (assignmentId: string) => {
    const current = assignmentEditState[assignmentId];
    if (!current || !selectedSeasonId) {
      return;
    }

    setActiveSeasonAssignmentId(assignmentId);
    setPageError(null);

    try {
      const response = await fetch(`/api/admin/seasons/${selectedSeasonId}/players`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignmentId,
          level: current.level,
          seedMu: Number.parseFloat(current.seedMu),
          seedSigma: Number.parseFloat(current.seedSigma),
          isActive: current.isActive,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update season assignment');
      }

      setPageError('Season assignment updated. Run rebuild once you are ready for the new season standings.');
      setNeedsRebuild(true);
      await loadSeasonAssignments(selectedSeasonId);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to update season assignment');
    } finally {
      setActiveSeasonAssignmentId(null);
    }
  };

  const totalMatchPages = Math.max(1, Math.ceil(matchTotal / MATCH_PAGE_SIZE));
  const currentSeason = useMemo(
    () => seasons.find((season) => season.isCurrent) ?? null,
    [seasons]
  );
  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === selectedSeasonId) ?? null,
    [seasons, selectedSeasonId]
  );
  const filteredSeasonAssignments = useMemo(() => {
    const query = seasonSearch.trim().toLowerCase();
    if (!query) {
      return seasonAssignments;
    }

    return seasonAssignments.filter((assignment) => {
      const haystack = [assignment.displayName, assignment.level, assignment.slug]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [seasonAssignments, seasonSearch]);
  const enabledMatchDateSet = useMemo(
    () => new Set(matchDates.map((item) => item.playDate)),
    [matchDates]
  );
  const visibleDateMatches = useMemo(() => {
    const query = dateMatchSearch.trim().toLowerCase();
    if (!query) {
      return dateMatches;
    }

    return dateMatches.filter((match) => {
      const haystack = [
        ...match.team1,
        ...match.team2,
        match.status,
        match.playDate ?? '',
        `${match.score1}-${match.score2}`,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [dateMatchSearch, dateMatches]);
  const monthStart = startOfCalendarMonth(calendarMonth);
  const monthLabel = monthStart.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const monthStartOffset = monthStart.getDay();
  const monthDays = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const calendarCells = Array.from({ length: monthStartOffset + monthDays }, (_, index) => {
    if (index < monthStartOffset) {
      return null;
    }

    const day = index - monthStartOffset + 1;
    const cellDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    const playDate = [
      cellDate.getFullYear(),
      String(cellDate.getMonth() + 1).padStart(2, '0'),
      String(cellDate.getDate()).padStart(2, '0'),
    ].join('-');

    return {
      day,
      playDate,
      enabled: enabledMatchDateSet.has(playDate),
      selected: selectedMatchDate === playDate,
    };
  });

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-300">
            Loading admin workspace...
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-emerald-300">Hidden Admin</p>
          <h1 className="text-3xl font-semibold text-white">Leaderboard Control Room</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Sign in to run rebuilds and correct match data. Public score entry stays outside admin.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleLogin}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Admin password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                autoComplete="current-password"
              />
            </label>

            {authError ? <p className="text-sm text-rose-300">{authError}</p> : null}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoggingIn ? 'Signing in...' : 'Enter Admin'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-3 py-6 text-white sm:px-4 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-8">
        <header className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-black/30 lg:flex-row lg:items-end lg:justify-between sm:p-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Hidden Admin</p>
            <h1 className="mt-2 text-3xl font-semibold">Leaderboard Operations</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Use this area for rebuilds and data correction. Match entry is public now, so this page is
              focused on moderation and recovery.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={loadDashboardData} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800">Refresh</button>
            <button type="button" onClick={handleLogout} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800">Sign out</button>
          </div>
        </header>

        {needsRebuild ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100">
            Rebuild recommended. One or more admin changes have not been pushed into public processed stats yet.
          </div>
        ) : null}

        {!loadingData && seasons.length > 0 && !currentSeason ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-100">
            No current season is set. Public score entry should not be used until one season is marked current.
          </div>
        ) : null}

        {pageError ? <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{pageError}</div> : null}

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Rebuild Processed Data</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">Run this after correcting matches or importing new history so the public leaderboard stays in sync.</p>
              </div>
              <button type="button" onClick={handleRebuild} disabled={isRebuilding} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70">{isRebuilding ? 'Rebuilding...' : 'Run Rebuild'}</button>
            </div>
            {rebuildMessage ? <p className="mt-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-sm text-cyan-100">{rebuildMessage}</p> : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
            <h2 className="text-xl font-semibold">Admin Notes</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>Public users enter scores. Admin stays focused on correction and recovery.</li>
              <li>After player-level or match corrections, run rebuild to refresh public processed stats.</li>
              <li>Player editor stays hidden until you open it, so the page stays lighter by default.</li>
            </ul>
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Recent Processing Runs</h2>
              <p className="mt-2 text-sm text-slate-300">Latest rebuild outcomes for quick sanity checks.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsRebuildHistoryOpen((current) => !current)}
              className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
            >
              {isRebuildHistoryOpen ? 'Hide History' : 'Show History'}
            </button>
          </div>
          {isRebuildHistoryOpen ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {processingRuns.map((run) => (
                <article key={run.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{run.status}</p>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{run.scope}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-200">{summarizeRun(run)}</p>
                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    <p>Started: {formatTimestamp(run.started_at)}</p>
                    <p>Finished: {formatTimestamp(run.finished_at)}</p>
                    {run.error_message ? <p className="text-rose-300">{run.error_message}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Season Manager</h2>
              <p className="mt-2 text-sm text-slate-300">
                Start the next season, mark the active one, and tune promotion or relegation seed values.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSeasonManagerOpen((current) => !current)}
              className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
            >
              {isSeasonManagerOpen ? 'Hide Season Manager' : 'Open Season Manager'}
            </button>
          </div>

          {isSeasonManagerOpen ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current Attachment</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">
                        {currentSeason ? currentSeason.name : 'No current season'}
                      </h3>
                    </div>
                    {currentSeason ? (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                        Current Season
                      </span>
                    ) : (
                      <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-100">
                        Action Needed
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Public score submissions attach to the current season automatically. Change this before league night if you are moving to a clean slate.
                  </p>
                </div>

                <form onSubmit={handleCreateSeason} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Next season name</label>
                      <input
                        type="text"
                        value={newSeasonName}
                        onChange={(event) => setNewSeasonName(event.target.value)}
                        placeholder="Season 2 (Apr - Jun 2026)"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Start date</label>
                      <input
                        type="date"
                        value={newSeasonStartDate}
                        onChange={(event) => setNewSeasonStartDate(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">End date</label>
                      <input
                        type="date"
                        value={newSeasonEndDate}
                        onChange={(event) => setNewSeasonEndDate(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">New seasons start as current and seed players from level baselines.</p>
                    <button
                      type="submit"
                      disabled={isCreatingSeason}
                      className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isCreatingSeason ? 'Starting...' : 'Start Next Season'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Season List</h3>
                  <div className="mt-3 space-y-2">
                    {isLoadingSeasons ? <p className="text-sm text-slate-400">Loading seasons...</p> : null}
                    {seasons.map((season) => (
                      <button
                        key={season.id}
                        type="button"
                        onClick={() => setSelectedSeasonId(season.id)}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                          selectedSeasonId === season.id
                            ? 'border-cyan-400/40 bg-cyan-400/10'
                            : 'border-slate-800 bg-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{season.name}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatSeasonDateRange(season.startDate, season.endDate)}
                            </p>
                          </div>
                          {season.isCurrent ? (
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                              Current
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{season.status}</span>
                          {!season.isCurrent ? (
                            <span className="text-xs font-medium text-cyan-200">Select to manage</span>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {selectedSeason ? `${selectedSeason.name} roster` : 'Season roster'}
                      </h3>
                      <p className="mt-1 text-sm text-slate-300">
                        Promotions and relegations live here. Adjust levels or seed ratings before the next rebuild.
                      </p>
                    </div>
                    {selectedSeason && !selectedSeason.isCurrent ? (
                      <button
                        type="button"
                        onClick={() => handleMakeCurrentSeason(selectedSeason)}
                        disabled={activePlayerId === `season-${selectedSeason.id}`}
                        className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {activePlayerId === `season-${selectedSeason.id}` ? 'Switching...' : 'Make Current'}
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      type="text"
                      value={seasonSearch}
                      onChange={(event) => setSeasonSearch(event.target.value)}
                      placeholder="Search promoted or relegated players"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                    />
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-slate-400">
                      {filteredSeasonAssignments.length} players
                    </div>
                  </div>

                  {isLoadingSeasonAssignments ? <p className="mt-4 text-sm text-slate-400">Loading season assignments...</p> : null}

                  <div className="mt-4 space-y-2.5">
                    {filteredSeasonAssignments.map((assignment) => {
                      const formState = assignmentEditState[assignment.id];
                      if (!formState) {
                        return null;
                      }

                      return (
                        <article
                          key={assignment.id}
                          className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3 md:grid-cols-[1.25fr_0.5fr_0.4fr_0.4fr_0.45fr_auto]"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">{assignment.displayName}</p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {assignment.slug} · {assignment.seedSource}
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Level</label>
                            <select
                              value={formState.level}
                              onChange={(event) => updateAssignmentField(assignment.id, 'level', event.target.value as 'INT' | 'PLUS' | 'ADV')}
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                            >
                              <option value="INT">INT</option>
                              <option value="PLUS">PLUS</option>
                              <option value="ADV">ADV</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Seed Mu</label>
                            <input
                              type="number"
                              step="0.01"
                              value={formState.seedMu}
                              onChange={(event) => updateAssignmentField(assignment.id, 'seedMu', event.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Seed Sigma</label>
                            <input
                              type="number"
                              step="0.01"
                              value={formState.seedSigma}
                              onChange={(event) => updateAssignmentField(assignment.id, 'seedSigma', event.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                              <input
                                type="checkbox"
                                checked={formState.isActive}
                                onChange={(event) => updateAssignmentField(assignment.id, 'isActive', event.target.checked)}
                              />
                              Active
                            </label>
                          </div>
                          <div className="flex gap-2 md:flex-col">
                            <button
                              type="button"
                              onClick={() => handleResetAssignmentBaseline(assignment.id)}
                              className="flex-1 rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveAssignment(assignment.id)}
                              disabled={activeSeasonAssignmentId === assignment.id}
                              className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {activeSeasonAssignmentId === assignment.id ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Players</h2>
              <p className="mt-2 text-sm text-slate-300">Open this only when you need to add a player or fix a level.</p>
            </div>
            <button type="button" onClick={() => setIsPlayersOpen((current) => !current)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800">{isPlayersOpen ? 'Hide Player Manager' : 'Open Player Manager'}</button>
          </div>

          {isPlayersOpen ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Search players</label>
                  <input type="text" value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} placeholder="Find a player" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400" />
                </div>
                <form onSubmit={handleCreatePlayer} className="grid gap-3 md:grid-cols-[1.3fr_0.7fr_auto]">
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">New player</label>
                    <input type="text" value={newPlayerName} onChange={(event) => setNewPlayerName(event.target.value)} placeholder="Player full name" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Level</label>
                    <select value={newPlayerLevel} onChange={(event) => setNewPlayerLevel(event.target.value as 'INT' | 'PLUS' | 'ADV')} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400">
                      <option value="INT">INT</option>
                      <option value="PLUS">PLUS</option>
                      <option value="ADV">ADV</option>
                    </select>
                  </div>
                  <button type="submit" disabled={activePlayerId === 'new-player'} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70">{activePlayerId === 'new-player' ? 'Creating...' : 'Add'}</button>
                </form>
              </div>

              {isLoadingPlayers ? <p className="text-sm text-slate-300">Loading players...</p> : null}

              <div className="space-y-3">
                {players.map((player) => {
                  const formState = playerEditState[player.id];
                  if (!formState) {
                    return null;
                  }

                  return (
                    <article key={player.id} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 md:grid-cols-[1.2fr_0.5fr_0.45fr_auto] md:items-end">
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Display name</label>
                        <input type="text" value={formState.displayName} onChange={(event) => updatePlayerField(player.id, 'displayName', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400" />
                        <p className="mt-1 text-[11px] text-slate-500">Slug: {player.slug}</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Level</label>
                        <select value={formState.level} onChange={(event) => updatePlayerField(player.id, 'level', event.target.value as 'INT' | 'PLUS' | 'ADV')} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400">
                          <option value="INT">INT</option>
                          <option value="PLUS">PLUS</option>
                          <option value="ADV">ADV</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                        <input type="checkbox" checked={formState.isActive} onChange={(event) => updatePlayerField(player.id, 'isActive', event.target.checked)} />
                        Active
                      </label>
                      <button type="button" onClick={() => handleSavePlayer(player.id)} disabled={activePlayerId === player.id} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70">Save</button>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Matches By Day</h2>
              <p className="mt-2 text-sm text-slate-300">
                Open this when you need all matches for one date, with search and row-level editing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDateBrowserOpen((current) => !current)}
              className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
            >
              {isDateBrowserOpen ? 'Hide Date Browser' : 'Open Date Browser'}
            </button>
          </div>

          {isDateBrowserOpen ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-slate-800"
                    >
                      Prev
                    </button>
                    <div className="text-sm font-semibold text-white">{monthLabel}</div>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-slate-800"
                    >
                      Next
                    </button>
                  </div>

                  <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day}>{day}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarCells.map((cell, index) =>
                      cell ? (
                        <button
                          key={cell.playDate}
                          type="button"
                          disabled={!cell.enabled}
                          onClick={() => setSelectedMatchDate(cell.playDate)}
                          className={`aspect-square rounded-lg border text-sm transition ${
                            cell.selected
                              ? 'border-cyan-400 bg-cyan-400/20 text-cyan-100'
                              : cell.enabled
                                ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'
                                : 'border-slate-900 bg-slate-950/60 text-slate-600'
                          }`}
                        >
                          {cell.day}
                        </button>
                      ) : (
                        <div key={`empty-${index}`} />
                      )
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                    {isLoadingMatchDates
                      ? 'Loading available dates...'
                      : `${matchDates.length} match dates available`}
                  </div>
                </div>

                <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{formatPlayDateHeading(selectedMatchDate)}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {selectedMatchDate ? `${visibleDateMatches.length} match rows ready for review` : 'Pick an enabled date to review matches.'}
                      </p>
                    </div>
                    <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={dateMatchSearch}
                        onChange={(event) => setDateMatchSearch(event.target.value)}
                        placeholder="Search player, score, or status"
                        className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => selectedMatchDate && loadMatchesForDate(selectedMatchDate)}
                        disabled={!selectedMatchDate || isLoadingDateMatches}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        {isLoadingDateMatches ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 max-w-full overflow-x-auto">
                    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
                      {[
                        ['processed', 'Processed'],
                        ['validated', 'Validated'],
                        ['pending', 'Pending'],
                        ['rejected', 'Rejected'],
                      ].map(([code, label]) => {
                        const theme = getMatchStatusTheme(code);
                        return (
                          <span key={code} className="inline-flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />
                            <span>{label}</span>
                          </span>
                        );
                      })}
                    </div>
                    <table className="w-full table-fixed border-separate border-spacing-y-2 text-sm">
                      <colgroup>
                        <col className="w-[72px]" />
                        <col className="w-[40%]" />
                        <col className="w-[110px]" />
                        <col className="w-[40%]" />
                      </colgroup>
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          <th className="px-3 py-2">Edit</th>
                          <th className="px-3 py-2">Team 1</th>
                          <th className="px-3 py-2">Score</th>
                          <th className="px-3 py-2">Team 2</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleDateMatches.map((match) => {
                          const formState = editState[match.id];
                          if (!formState) {
                            return null;
                          }

                          const isExpanded = expandedDateMatchId === match.id;
                          const theme = getMatchStatusTheme(formState.status || match.status);
                          return (
                            <Fragment key={match.id}>
                              <tr key={match.id} className={theme.row}>
                                <td className="rounded-l-xl px-3 py-3">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedDateMatchId((current) => (current === match.id ? null : match.id))}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-slate-950/70 text-white transition hover:bg-slate-800"
                                    aria-label={`Edit match ${match.id}`}
                                    title="Edit match"
                                  >
                                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                                      <path d="M4 20h4l10-10-4-4L4 16v4Z" />
                                      <path d="m12 6 4 4" />
                                    </svg>
                                  </button>
                                </td>
                                <td className="px-3 py-3 align-top">{match.team1.join(' / ')}</td>
                                <td className="px-3 py-3 align-top font-semibold">{match.score1} - {match.score2}</td>
                                <td className="rounded-r-xl px-3 py-3 align-top">{match.team2.join(' / ')}</td>
                              </tr>
                              {isExpanded ? (
                                <tr>
                                  <td colSpan={4} className="px-0 pb-2">
                                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                                      <div className="grid gap-3 xl:grid-cols-[1.35fr_0.95fr_auto] xl:items-end">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">Team 1</p>
                                            <div className="mt-1 grid gap-1.5">
                                              {[1, 2].map((seat) => (
                                                <select
                                                  key={`date-team1-${match.id}-${seat}`}
                                                  value={formState.participantIds[`1-${seat}`] ?? ''}
                                                  onChange={(event) => updateMatchParticipant(match.id, 1, seat, event.target.value)}
                                                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-emerald-400"
                                                >
                                                  <option value="">Select player</option>
                                                  {matchPlayerOptions.map((player) => (
                                                    <option
                                                      key={player.id}
                                                      value={player.id}
                                                      disabled={isPlayerTakenInMatch(formState.participantIds, `1-${seat}`, player.id)}
                                                    >
                                                      {player.displayName}
                                                    </option>
                                                  ))}
                                                </select>
                                              ))}
                                            </div>
                                          </div>
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">Team 2</p>
                                            <div className="mt-1 grid gap-1.5">
                                              {[1, 2].map((seat) => (
                                                <select
                                                  key={`date-team2-${match.id}-${seat}`}
                                                  value={formState.participantIds[`2-${seat}`] ?? ''}
                                                  onChange={(event) => updateMatchParticipant(match.id, 2, seat, event.target.value)}
                                                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-cyan-400"
                                                >
                                                  <option value="">Select player</option>
                                                  {matchPlayerOptions.map((player) => (
                                                    <option
                                                      key={player.id}
                                                      value={player.id}
                                                      disabled={isPlayerTakenInMatch(formState.participantIds, `2-${seat}`, player.id)}
                                                    >
                                                      {player.displayName}
                                                    </option>
                                                  ))}
                                                </select>
                                              ))}
                                            </div>
                                          </div>
                                          <div>
                                            <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Played At</label>
                                            <input
                                              type="datetime-local"
                                              value={formState.playedAtLocal}
                                              onChange={(event) => updateField(match.id, 'playedAtLocal', event.target.value)}
                                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                                            />
                                          </div>
                                          <div>
                                            <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Status</label>
                                            <select
                                              value={formState.status}
                                              onChange={(event) => updateField(match.id, 'status', event.target.value)}
                                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                                            >
                                              <option value="pending">pending</option>
                                              <option value="validated">validated</option>
                                              <option value="processed">processed</option>
                                              <option value="rejected">rejected</option>
                                            </select>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
                                          <div>
                                            <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Score 1</label>
                                            <input
                                              type="number"
                                              min="0"
                                              value={formState.score1}
                                              onChange={(event) => updateField(match.id, 'score1', event.target.value)}
                                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-center text-base font-semibold text-white outline-none transition focus:border-emerald-400"
                                            />
                                          </div>
                                          <div>
                                            <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Score 2</label>
                                            <input
                                              type="number"
                                              min="0"
                                              value={formState.score2}
                                              onChange={(event) => updateField(match.id, 'score2', event.target.value)}
                                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-center text-base font-semibold text-white outline-none transition focus:border-emerald-400"
                                            />
                                          </div>
                                          <p className="col-span-2 text-[11px] text-slate-400">{match.playDate ? `Play date: ${match.playDate}` : 'Play date not assigned'}</p>
                                        </div>

                                        <div className="flex gap-2 xl:flex-col">
                                          <button
                                            type="button"
                                            onClick={() => handleSaveMatch(match.id)}
                                            disabled={activeMatchId === match.id}
                                            className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                                          >
                                            Save
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleCancelDateMatchEdit(match)}
                                            disabled={activeMatchId === match.id}
                                            className="flex-1 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteMatch(match.id)}
                                            disabled={activeMatchId === match.id}
                                            className="flex-1 rounded-xl border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {!selectedMatchDate ? (
                    <p className="mt-4 text-sm text-slate-400">Select any enabled date on the calendar to view its matches.</p>
                  ) : null}
                  {selectedMatchDate && !isLoadingDateMatches && visibleDateMatches.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">No matches found for that date/search combination.</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Recent Matches</h2>
              <p className="mt-2 text-sm text-slate-300">Compact moderation view with search and pagination.</p>
            </div>
            <form className="grid w-full max-w-2xl gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto_auto]" onSubmit={(event) => { event.preventDefault(); setMatchPage(1); setMatchSearch(matchSearchInput.trim()); }}>
              <input type="text" value={matchSearchInput} onChange={(event) => setMatchSearchInput(event.target.value)} placeholder="Search player, score, date" className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400" />
              <select value={matchStatusFilter} onChange={(event) => { setMatchPage(1); setMatchStatusFilter(event.target.value); }} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400">
                <option value="all">All statuses</option>
                <option value="pending">pending</option>
                <option value="validated">validated</option>
                <option value="processed">processed</option>
                <option value="rejected">rejected</option>
              </select>
              <button type="submit" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800">Search</button>
              <button type="button" onClick={() => { setMatchSearchInput(''); setMatchSearch(''); setMatchStatusFilter('all'); setMatchPage(1); }} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800">Clear</button>
            </form>
          </div>

          {loadingData ? <p className="text-sm text-slate-300">Loading matches...</p> : null}

          <div className="mb-4 flex flex-col gap-2 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>Showing {matches.length} of {matchTotal} matches{matchSearch ? ` for "${matchSearch}"` : ''}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMatchPage((current) => Math.max(1, current - 1))} disabled={matchPage <= 1} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-50">Prev</button>
              <span>Page {matchPage} / {totalMatchPages}</span>
              <button type="button" onClick={() => setMatchPage((current) => Math.min(totalMatchPages, current + 1))} disabled={matchPage >= totalMatchPages} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-50">Next</button>
            </div>
          </div>

          <div className="space-y-2.5">
            {matches.map((match) => {
              const formState = editState[match.id];
              if (!formState) {
                return null;
              }

              return (
                <article key={match.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 shadow-lg shadow-black/20 sm:p-3">
                  <div className="grid gap-2.5 xl:grid-cols-[1.35fr_0.95fr_auto] xl:items-end">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">Team 1</p>
                        <div className="mt-1 grid gap-1.5">
                          {[1, 2].map((seat) => (
                            <select
                              key={`team1-${seat}`}
                              value={formState.participantIds[`1-${seat}`] ?? ''}
                              onChange={(event) => updateMatchParticipant(match.id, 1, seat, event.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-emerald-400"
                            >
                              <option value="">Select player</option>
                              {matchPlayerOptions.map((player) => (
                                <option
                                  key={player.id}
                                  value={player.id}
                                  disabled={isPlayerTakenInMatch(formState.participantIds, `1-${seat}`, player.id)}
                                >
                                  {player.displayName}
                                </option>
                              ))}
                            </select>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">Team 2</p>
                        <div className="mt-1 grid gap-1.5">
                          {[1, 2].map((seat) => (
                            <select
                              key={`team2-${seat}`}
                              value={formState.participantIds[`2-${seat}`] ?? ''}
                              onChange={(event) => updateMatchParticipant(match.id, 2, seat, event.target.value)}
                              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-cyan-400"
                            >
                              <option value="">Select player</option>
                              {matchPlayerOptions.map((player) => (
                                <option
                                  key={player.id}
                                  value={player.id}
                                  disabled={isPlayerTakenInMatch(formState.participantIds, `2-${seat}`, player.id)}
                                >
                                  {player.displayName}
                                </option>
                              ))}
                            </select>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Played At</label>
                        <input type="datetime-local" value={formState.playedAtLocal} onChange={(event) => updateField(match.id, 'playedAtLocal', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white outline-none transition focus:border-emerald-400" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Status</label>
                        <select value={formState.status} onChange={(event) => updateField(match.id, 'status', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-white outline-none transition focus:border-emerald-400">
                          <option value="pending">pending</option>
                          <option value="validated">validated</option>
                          <option value="processed">processed</option>
                          <option value="rejected">rejected</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Score 1</label>
                        <input type="number" min="0" value={formState.score1} onChange={(event) => updateField(match.id, 'score1', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-center text-base font-semibold text-white outline-none transition focus:border-emerald-400" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-slate-400">Score 2</label>
                        <input type="number" min="0" value={formState.score2} onChange={(event) => updateField(match.id, 'score2', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-center text-base font-semibold text-white outline-none transition focus:border-emerald-400" />
                      </div>
                      <p className="col-span-2 text-[11px] text-slate-400">{match.playDate ? `Play date: ${match.playDate}` : 'Play date not assigned'}</p>
                    </div>

                    <div className="flex gap-2 xl:flex-col">
                      <button type="button" onClick={() => handleSaveMatch(match.id)} disabled={activeMatchId === match.id} className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70">Save</button>
                      <button type="button" onClick={() => handleDeleteMatch(match.id)} disabled={activeMatchId === match.id} className="flex-1 rounded-xl border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-70">Delete</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
