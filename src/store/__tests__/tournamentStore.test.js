import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTournamentStore } from '../tournamentStore';
import { DEFAULT_SETTINGS } from '../../constants/tournament';

// Mock Supabase so the store never attempts real network calls
vi.mock('../../lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

vi.mock('../../services/storageService', () => ({
  storageService: {
    saveTournament: vi.fn().mockResolvedValue(true),
    loadTournament: vi.fn().mockResolvedValue(null),
    loadAllTournaments: vi.fn().mockResolvedValue({ data: [], error: null }),
    deleteTournament: vi.fn().mockResolvedValue(true),
    subscribeToTournament: vi.fn(),
    unsubscribeFromTournament: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resets the Zustand store to its initial state between tests.
 * We call resetTournament which sets the full initial state.
 */
function resetStore() {
  const { resetTournament } = useTournamentStore.getState();
  resetTournament();
}

/** Shorthand to get current state snapshot */
function getState() {
  return useTournamentStore.getState();
}

/** Start a tournament with the given player names, returns state after start */
function startWith(names, opts = {}) {
  const { startTournament } = getState();
  startTournament(
    names,
    opts.name || '',
    opts.location || '',
    opts.date || '',
    opts.gameType || undefined,
    opts.numberOfRounds || undefined
  );
  return getState();
}

/** Record score for a given match, returns state after recording */
function recordScore(matchId, score1, score2, sets) {
  getState().recordScore(matchId, score1, score2, sets);
  return getState();
}

/** Complete all matches in the tournament with 2-0 scores */
function completeAllMatches() {
  let state = getState();
  for (const match of state.matches) {
    if (!match.completed) {
      recordScore(match.id, 2, 0, [[6, 3], [6, 4]]);
    }
  }
  return getState();
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('tournamentStore', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  // =========================================================================
  // 1. Tournament lifecycle
  // =========================================================================
  describe('Tournament lifecycle', () => {
    it('startTournament with valid players sets status to active', () => {
      const state = startWith(['Alice', 'Bob', 'Charlie']);

      expect(state.status).toBe('active');
      expect(state.players).toHaveLength(3);
      expect(state.id).toBeTruthy();
      expect(state.createdAt).toBeTruthy();
      expect(state.currentMatchIndex).toBe(0);
    });

    it('startTournament creates matches for round-robin schedule', () => {
      const state = startWith(['Alice', 'Bob', 'Charlie']);

      // 3 players => C(3,2) = 3 matches
      expect(state.matches).toHaveLength(3);

      // Every match should have the expected shape
      for (const match of state.matches) {
        expect(match).toHaveProperty('id');
        expect(match).toHaveProperty('round');
        expect(match).toHaveProperty('player1Id');
        expect(match).toHaveProperty('player2Id');
        expect(match.score1).toBeNull();
        expect(match.score2).toBeNull();
        expect(match.completed).toBe(false);
        expect(match.completedAt).toBeNull();
      }
    });

    it('round-robin schedule covers all player pairs exactly once', () => {
      const state = startWith(['Alice', 'Bob', 'Charlie', 'Diana']);

      // 4 players => C(4,2) = 6 matches
      expect(state.matches).toHaveLength(6);

      const playerIds = state.players.map((p) => p.id);
      const pairs = new Set();
      for (const match of state.matches) {
        const pair = [match.player1Id, match.player2Id].sort().join('-');
        pairs.add(pair);
      }

      // All unique pairs
      expect(pairs.size).toBe(6);

      // Every pair involves only valid player IDs
      for (const match of state.matches) {
        expect(playerIds).toContain(match.player1Id);
        expect(playerIds).toContain(match.player2Id);
        expect(match.player1Id).not.toBe(match.player2Id);
      }
    });

    it('startTournament defaults gameType to tournament for 3+ players', () => {
      const state = startWith(['A', 'B', 'C']);
      expect(state.gameType).toBe('tournament');
    });

    it('startTournament defaults gameType to sparring for 2 players', () => {
      const state = startWith(['A', 'B']);
      expect(state.gameType).toBe('sparring');
    });

    it('startTournament creates an initial changeLog entry', () => {
      const state = startWith(['A', 'B', 'C']);

      expect(state.changeLog).toHaveLength(1);
      expect(state.changeLog[0].action).toBe('START');
      expect(state.changeLog[0].details).toContain('3 graczy');
    });

    it('recordScore updates match and advances currentMatchIndex', () => {
      startWith(['A', 'B', 'C']);
      const firstMatch = getState().matches[0];

      const state = recordScore(firstMatch.id, 2, 1, [[6, 4], [3, 6], [7, 5]]);

      const updated = state.matches.find((m) => m.id === firstMatch.id);
      expect(updated.completed).toBe(true);
      expect(updated.score1).toBe(2);
      expect(updated.score2).toBe(1);
      expect(updated.sets).toEqual([[6, 4], [3, 6], [7, 5]]);
      expect(updated.completedAt).toBeTruthy();
      expect(state.currentMatchIndex).toBe(1);
    });

    it('endTournament sets status to completed', () => {
      startWith(['A', 'B', 'C']);
      getState().endTournament();
      const state = getState();

      expect(state.status).toBe('completed');
      expect(state.changeLog[0].action).toBe('SCORE');
      expect(state.changeLog[0].details).toContain('Turniej zakończony');
    });

    it('endTournament is a no-op if already completed', () => {
      startWith(['A', 'B', 'C']);
      getState().endTournament();
      const logLength = getState().changeLog.length;

      getState().endTournament();
      expect(getState().changeLog.length).toBe(logLength);
    });
  });

  // =========================================================================
  // 2. Sparring lifecycle
  // =========================================================================
  describe('Sparring lifecycle', () => {
    it('starts sparring with 2 players and creates initial match', () => {
      const state = startWith(['Player1', 'Player2'], { gameType: 'sparring' });

      expect(state.gameType).toBe('sparring');
      expect(state.players).toHaveLength(2);
      // 2 players => 1 round-robin match
      expect(state.matches).toHaveLength(1);
      expect(state.status).toBe('active');
    });

    it('addSparringMatch adds a new match between the same 2 players', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });
      const { players } = getState();

      getState().addSparringMatch();
      const state = getState();

      expect(state.matches).toHaveLength(2);
      const newMatch = state.matches[1];
      expect(newMatch.player1Id).toBe(players[0].id);
      expect(newMatch.player2Id).toBe(players[1].id);
      expect(newMatch.completed).toBe(false);
      expect(newMatch.id).toBe(2);
      expect(newMatch.round).toBe(2);
      expect(state.currentMatchIndex).toBe(1);
    });

    it('addSparringMatch is a no-op for tournament gameType', () => {
      startWith(['A', 'B', 'C']);
      const matchesBefore = getState().matches.length;

      getState().addSparringMatch();
      expect(getState().matches.length).toBe(matchesBefore);
    });

    it('records score for a sparring match', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });
      const match = getState().matches[0];

      const state = recordScore(match.id, 2, 0, [[6, 2], [6, 3]]);
      const updated = state.matches.find((m) => m.id === match.id);

      expect(updated.completed).toBe(true);
      expect(updated.score1).toBe(2);
      expect(updated.score2).toBe(0);
    });

    it('sparring does not auto-complete when all matches are done', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });
      const match = getState().matches[0];

      const state = recordScore(match.id, 2, 0, [[6, 2], [6, 3]]);

      // Even though all matches are completed, sparring stays active
      expect(state.status).toBe('active');
    });

    it('endTournament on sparring sets status completed with correct label', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });
      getState().endTournament();
      const state = getState();

      expect(state.status).toBe('completed');
      expect(state.changeLog[0].details).toContain('Sparring zakończony');
    });
  });

  // =========================================================================
  // 3. Score management
  // =========================================================================
  describe('Score management', () => {
    it('recordScore stores set details (gems)', () => {
      startWith(['A', 'B', 'C']);
      const match = getState().matches[0];
      const sets = [[6, 4], [3, 6], [10, 7]];

      const state = recordScore(match.id, 2, 1, sets);
      const updated = state.matches.find((m) => m.id === match.id);

      expect(updated.sets).toEqual(sets);
      expect(updated.score1).toBe(2);
      expect(updated.score2).toBe(1);
    });

    it('recordScore without sets stores empty array', () => {
      startWith(['A', 'B', 'C']);
      const match = getState().matches[0];

      const state = recordScore(match.id, 2, 0, undefined);
      const updated = state.matches.find((m) => m.id === match.id);

      expect(updated.sets).toEqual([]);
    });

    it('editScore on already-completed match updates it and adds EDIT log', () => {
      startWith(['A', 'B', 'C']);
      const match = getState().matches[0];

      // First score
      recordScore(match.id, 2, 0, [[6, 3], [6, 2]]);
      const firstLog = getState().changeLog[0];
      expect(firstLog.action).toBe('SCORE');

      // Edit (re-record on the same completed match)
      const state = recordScore(match.id, 1, 2, [[4, 6], [6, 3], [5, 7]]);
      const updated = state.matches.find((m) => m.id === match.id);

      expect(updated.score1).toBe(1);
      expect(updated.score2).toBe(2);
      expect(updated.sets).toEqual([[4, 6], [6, 3], [5, 7]]);
      expect(updated.editedAt).toBeTruthy();

      // The latest changeLog entry should be an EDIT
      expect(state.changeLog[0].action).toBe('EDIT');
      expect(state.changeLog[0].previousValue).toBe('2:0');
    });

    it('editScore preserves original completedAt timestamp', () => {
      startWith(['A', 'B', 'C']);
      const match = getState().matches[0];

      recordScore(match.id, 2, 0, [[6, 3], [6, 2]]);
      const originalCompletedAt = getState().matches.find(
        (m) => m.id === match.id
      ).completedAt;

      recordScore(match.id, 1, 2, [[4, 6], [6, 3], [5, 7]]);
      const updated = getState().matches.find((m) => m.id === match.id);

      expect(updated.completedAt).toBe(originalCompletedAt);
    });

    it('recordScore adds a SCORE entry to changeLog', () => {
      startWith(['A', 'B', 'C']);
      const match = getState().matches[0];

      recordScore(match.id, 2, 1, [[6, 4], [3, 6], [7, 5]]);
      const state = getState();

      // changeLog is prepended, so most recent is first
      const scoreLog = state.changeLog[0];
      expect(scoreLog.action).toBe('SCORE');
      expect(scoreLog.matchId).toBe(match.id);
      expect(scoreLog.newValue).toContain('6:4');
    });

    it('recordScore for nonexistent match is a no-op', () => {
      startWith(['A', 'B', 'C']);
      const stateBefore = getState();

      recordScore(999, 2, 0, [[6, 3], [6, 2]]);
      const stateAfter = getState();

      expect(stateAfter.matches).toEqual(stateBefore.matches);
      expect(stateAfter.changeLog.length).toBe(stateBefore.changeLog.length);
    });
  });

  // =========================================================================
  // 4. Player management
  // =========================================================================
  describe('Player management (walkover)', () => {
    it('walkoverPlayer marks remaining matches as losses for that player', () => {
      startWith(['A', 'B', 'C', 'D']);
      const walkoverPlayer = getState().players[0];

      getState().walkoverPlayer(walkoverPlayer.id);
      const state = getState();

      // Matches involving the walked-over player should all be completed
      const affectedMatches = state.matches.filter(
        (m) => m.player1Id === walkoverPlayer.id || m.player2Id === walkoverPlayer.id
      );

      for (const match of affectedMatches) {
        expect(match.completed).toBe(true);
        const isPlayer1 = match.player1Id === walkoverPlayer.id;
        // Walked-over player gets 0, opponent gets 3
        if (isPlayer1) {
          expect(match.score1).toBe(0);
          expect(match.score2).toBe(3);
        } else {
          expect(match.score1).toBe(3);
          expect(match.score2).toBe(0);
        }
      }
    });

    it('walkoverPlayer does not affect already-completed matches', () => {
      startWith(['A', 'B', 'C']);
      const match = getState().matches[0];
      const walkoverPlayerId = match.player1Id;

      // Complete one match first
      recordScore(match.id, 2, 1, [[6, 4], [3, 6], [7, 5]]);
      const completedBefore = getState().matches.find((m) => m.id === match.id);

      getState().walkoverPlayer(walkoverPlayerId);
      const state = getState();
      const completedAfter = state.matches.find((m) => m.id === match.id);

      // The already-completed match should remain unchanged
      expect(completedAfter.score1).toBe(completedBefore.score1);
      expect(completedAfter.score2).toBe(completedBefore.score2);
    });

    it('walkoverPlayer adds an EDIT entry to changeLog', () => {
      startWith(['A', 'B', 'C']);
      const player = getState().players[0];

      getState().walkoverPlayer(player.id);
      const state = getState();

      expect(state.changeLog[0].action).toBe('EDIT');
      expect(state.changeLog[0].details).toContain('Walkover');
      expect(state.changeLog[0].details).toContain(player.name);
    });

    it('walkoverPlayer with invalid playerId is a no-op', () => {
      startWith(['A', 'B', 'C']);
      const logBefore = getState().changeLog.length;

      getState().walkoverPlayer('nonexistent-id');
      expect(getState().changeLog.length).toBe(logBefore);
    });

    it('walkoverPlayer marks all matches completed but keeps tournament active for user choice', () => {
      startWith(['A', 'B', 'C']);
      const players = getState().players;

      // Walk over two players so all matches have at least one walked-over player
      getState().walkoverPlayer(players[0].id);
      getState().walkoverPlayer(players[1].id);
      const state = getState();

      const allDone = state.matches.every((m) => m.completed);
      expect(allDone).toBe(true);
      // Tournament stays active — user chooses "Zakończ" or "Dodaj rundę"
      expect(state.status).toBe('active');
    });
  });

  // =========================================================================
  // 5. State import/export
  // =========================================================================
  describe('State import/export', () => {
    it('importState with valid state restores the tournament', () => {
      // First create and export a valid state
      startWith(['A', 'B', 'C'], { name: 'Test Cup' });
      const exported = getState().getExportableState();

      // Reset to clean slate
      resetStore();
      expect(getState().status).toBe('dashboard');

      // Import the exported state
      getState().importState(exported);
      const state = getState();

      expect(state.id).toBe(exported.id);
      expect(state.players).toEqual(exported.players);
      expect(state.matches).toEqual(exported.matches);
      expect(state.status).toBe(exported.status);
      expect(state.settings).toEqual(exported.settings);
    });

    it('importState adds an IMPORT log entry', () => {
      startWith(['A', 'B', 'C']);
      const exported = getState().getExportableState();

      resetStore();
      getState().importState(exported);
      const state = getState();

      expect(state.changeLog[0].action).toBe('IMPORT');
    });

    it('importState with invalid state throws an error', () => {
      expect(() => getState().importState(null)).toThrow();
      expect(() => getState().importState({})).toThrow();
      expect(() => getState().importState({ id: 123 })).toThrow(); // id must be string
    });

    it('importState rejects state with missing players', () => {
      expect(() =>
        getState().importState({
          id: 'abc',
          status: 'active',
          matches: [],
          currentMatchIndex: 0,
          settings: {},
        })
      ).toThrow();
    });

    it('importState rejects state with invalid status', () => {
      expect(() =>
        getState().importState({
          id: 'abc',
          status: 'invalid-status',
          players: [],
          matches: [],
          currentMatchIndex: 0,
          settings: {},
        })
      ).toThrow();
    });

    it('importState rejects state with negative currentMatchIndex', () => {
      expect(() =>
        getState().importState({
          id: 'abc',
          status: 'active',
          players: [{ id: 'p1', name: 'A' }],
          matches: [],
          currentMatchIndex: -1,
          settings: {},
        })
      ).toThrow();
    });

    it('getExportableState returns all relevant fields', () => {
      startWith(['A', 'B', 'C'], { name: 'Cup', location: 'Park', date: '2026-01-01' });
      const exported = getState().getExportableState();

      expect(exported).toHaveProperty('id');
      expect(exported).toHaveProperty('name');
      expect(exported).toHaveProperty('gameType');
      expect(exported).toHaveProperty('location');
      expect(exported).toHaveProperty('date');
      expect(exported).toHaveProperty('createdAt');
      expect(exported).toHaveProperty('status');
      expect(exported).toHaveProperty('players');
      expect(exported).toHaveProperty('matches');
      expect(exported).toHaveProperty('currentMatchIndex');
      expect(exported).toHaveProperty('settings');
      expect(exported).toHaveProperty('changeLog');

      // Should not include internal Zustand actions
      expect(exported).not.toHaveProperty('startTournament');
      expect(exported).not.toHaveProperty('recordScore');
      expect(exported).not.toHaveProperty('_syncToSupabase');
    });

    it('importState round-trips correctly through export/import', () => {
      startWith(['A', 'B', 'C', 'D']);
      const match = getState().matches[0];
      recordScore(match.id, 2, 0, [[6, 2], [6, 3]]);

      const exported = getState().getExportableState();

      resetStore();
      getState().importState(exported);
      const reimported = getState().getExportableState();

      // Exported fields should match (except the IMPORT log entry added)
      expect(reimported.id).toBe(exported.id);
      expect(reimported.players).toEqual(exported.players);
      expect(reimported.matches).toEqual(exported.matches);
      expect(reimported.status).toBe(exported.status);
    });
  });

  // =========================================================================
  // 6. Edge cases
  // =========================================================================
  describe('Edge cases', () => {
    it('tournament with minimum players (3) works correctly', () => {
      const state = startWith(['A', 'B', 'C']);

      // C(3,2) = 3 matches
      expect(state.matches).toHaveLength(3);
      expect(state.players).toHaveLength(3);
      expect(state.status).toBe('active');

      // Verify all pairs are covered
      const pairs = state.matches.map((m) =>
        [m.player1Id, m.player2Id].sort().join('-')
      );
      expect(new Set(pairs).size).toBe(3);
    });

    it('tournament with many players (8) generates correct match count', () => {
      const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const state = startWith(names);

      // C(8,2) = 28 matches
      expect(state.matches).toHaveLength(28);
      expect(state.players).toHaveLength(8);

      // All pairs unique
      const pairs = state.matches.map((m) =>
        [m.player1Id, m.player2Id].sort().join('-')
      );
      expect(new Set(pairs).size).toBe(28);
    });

    it('recording all scores keeps tournament active for user choice', () => {
      startWith(['A', 'B', 'C']);
      const state = completeAllMatches();

      expect(state.matches.every((m) => m.completed)).toBe(true);
      // Tournament stays active — user chooses "Zakończ" or "Dodaj rundę"
      expect(state.status).toBe('active');
    });

    it('currentMatchIndex advances past completed matches', () => {
      startWith(['A', 'B', 'C']);
      const matches = getState().matches;

      expect(getState().currentMatchIndex).toBe(0);

      recordScore(matches[0].id, 2, 0, [[6, 3], [6, 2]]);
      expect(getState().currentMatchIndex).toBe(1);

      recordScore(matches[1].id, 2, 1, [[6, 4], [3, 6], [7, 5]]);
      expect(getState().currentMatchIndex).toBe(2);
    });

    it('goToMatch navigates to a valid index', () => {
      startWith(['A', 'B', 'C']);

      getState().goToMatch(2);
      expect(getState().currentMatchIndex).toBe(2);

      getState().goToMatch(0);
      expect(getState().currentMatchIndex).toBe(0);
    });

    it('goToMatch rejects out-of-range indices', () => {
      startWith(['A', 'B', 'C']);

      getState().goToMatch(-1);
      expect(getState().currentMatchIndex).toBe(0);

      getState().goToMatch(100);
      expect(getState().currentMatchIndex).toBe(0);
    });

    it('resetTournament returns to initial state', () => {
      startWith(['A', 'B', 'C']);
      recordScore(getState().matches[0].id, 2, 0, [[6, 3], [6, 2]]);

      resetStore();
      const state = getState();

      expect(state.status).toBe('dashboard');
      expect(state.players).toEqual([]);
      expect(state.matches).toEqual([]);
      expect(state.id).toBeNull();
      expect(state.changeLog).toEqual([]);
    });

    it('tournament with 5 players (odd number) generates correct matches', () => {
      const state = startWith(['A', 'B', 'C', 'D', 'E']);

      // C(5,2) = 10 matches
      expect(state.matches).toHaveLength(10);

      // No BYE player IDs should appear in the matches
      for (const match of state.matches) {
        expect(match.player1Id).not.toBe('BYE');
        expect(match.player2Id).not.toBe('BYE');
      }
    });

    it('player names are sanitized on startTournament', () => {
      const state = startWith(['  Alice  ', 'Bob\x00', 'Charlie']);

      expect(state.players[0].name).toBe('Alice');
      expect(state.players[1].name).toBe('Bob');
      expect(state.players[2].name).toBe('Charlie');
    });

    it('settings default to DEFAULT_SETTINGS', () => {
      const state = startWith(['A', 'B', 'C']);

      expect(state.settings).toEqual(DEFAULT_SETTINGS);
    });

    it('setSettings merges with existing settings', () => {
      startWith(['A', 'B', 'C']);
      getState().setSettings({ pointsForWin: 5 });
      const state = getState();

      expect(state.settings.pointsForWin).toBe(5);
      expect(state.settings.pointsForDraw).toBe(DEFAULT_SETTINGS.pointsForDraw);
      expect(state.settings.pointsForLoss).toBe(DEFAULT_SETTINGS.pointsForLoss);
    });

    it('goToSetup resets state and sets status to setup', () => {
      startWith(['A', 'B', 'C']);

      getState().goToSetup('sparring');
      const state = getState();

      expect(state.status).toBe('setup');
      expect(state.gameType).toBe('sparring');
      expect(state.players).toEqual([]);
      expect(state.matches).toEqual([]);
    });

    it('goToDashboard resets state to initial', () => {
      startWith(['A', 'B', 'C']);

      getState().goToDashboard();
      const state = getState();

      expect(state.status).toBe('dashboard');
      expect(state.id).toBeNull();
    });

    it('getDefaultPlayers returns the default player list', () => {
      const defaults = getState().getDefaultPlayers();

      expect(defaults).toBeInstanceOf(Array);
      expect(defaults.length).toBeGreaterThan(0);
      expect(defaults).toContain('Hubert');
    });

    it('multiple sparring matches can be added and scored independently', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });

      // Add 2 more matches
      getState().addSparringMatch();
      getState().addSparringMatch();
      expect(getState().matches).toHaveLength(3);

      // Score them in order
      const matches = getState().matches;
      recordScore(matches[0].id, 2, 0, [[6, 2], [6, 3]]);
      recordScore(matches[1].id, 1, 2, [[6, 4], [4, 6], [3, 6]]);
      recordScore(matches[2].id, 2, 1, [[7, 5], [3, 6], [6, 4]]);

      const state = getState();
      expect(state.matches.every((m) => m.completed)).toBe(true);
      // Sparring should stay active
      expect(state.status).toBe('active');
    });
  });

  // =========================================================================
  // 7. recordBatchScores (sparring batch scoring)
  // =========================================================================
  describe('recordBatchScores', () => {
    it('records a single score on the current unscored match', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });
      const currentMatch = getState().matches[0];

      getState().recordBatchScores([
        { score1: 2, score2: 1, sets: [[6, 4], [3, 6], [7, 5]] }
      ]);
      const state = getState();

      expect(state.matches).toHaveLength(1);
      const updated = state.matches[0];
      expect(updated.id).toBe(currentMatch.id);
      expect(updated.completed).toBe(true);
      expect(updated.score1).toBe(2);
      expect(updated.score2).toBe(1);
      expect(updated.sets).toEqual([[6, 4], [3, 6], [7, 5]]);
    });

    it('records multiple scores: first on current match, rest create new matches', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });
      const { players } = getState();

      getState().recordBatchScores([
        { score1: 2, score2: 0, sets: [[6, 2], [6, 3]] },
        { score1: 1, score2: 2, sets: [[6, 4], [4, 6], [3, 6]] },
        { score1: 2, score2: 1, sets: [[7, 5], [3, 6], [6, 4]] }
      ]);
      const state = getState();

      expect(state.matches).toHaveLength(3);
      expect(state.matches.every((m) => m.completed)).toBe(true);

      // First match used the existing one (id=1)
      expect(state.matches[0].id).toBe(1);
      expect(state.matches[0].score1).toBe(2);
      expect(state.matches[0].score2).toBe(0);

      // Second match is new (id=2)
      expect(state.matches[1].id).toBe(2);
      expect(state.matches[1].score1).toBe(1);
      expect(state.matches[1].score2).toBe(2);
      expect(state.matches[1].player1Id).toBe(players[0].id);
      expect(state.matches[1].player2Id).toBe(players[1].id);

      // Third match is new (id=3)
      expect(state.matches[2].id).toBe(3);
      expect(state.matches[2].score1).toBe(2);
      expect(state.matches[2].score2).toBe(1);
    });

    it('creates all new matches when current match is already completed', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });
      // Complete the first match manually
      recordScore(getState().matches[0].id, 2, 0, [[6, 2], [6, 3]]);

      getState().recordBatchScores([
        { score1: 1, score2: 2, sets: [[4, 6], [6, 3], [5, 7]] },
        { score1: 2, score2: 0, sets: [[6, 1], [6, 2]] }
      ]);
      const state = getState();

      // 1 original (completed) + 2 new
      expect(state.matches).toHaveLength(3);
      expect(state.matches[0].score1).toBe(2); // Original unchanged
      expect(state.matches[1].id).toBe(2);
      expect(state.matches[1].score1).toBe(1);
      expect(state.matches[2].id).toBe(3);
      expect(state.matches[2].score1).toBe(2);
    });

    it('adds changelog entries for each scored match', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });
      const logBefore = getState().changeLog.length; // 1 (START)

      getState().recordBatchScores([
        { score1: 2, score2: 0, sets: [[6, 2], [6, 3]] },
        { score1: 1, score2: 2, sets: [[6, 4], [4, 6], [3, 6]] }
      ]);
      const state = getState();

      // 2 new SCORE entries + 1 original START
      expect(state.changeLog).toHaveLength(logBefore + 2);
      // Most recent first
      expect(state.changeLog[0].action).toBe('SCORE');
      expect(state.changeLog[1].action).toBe('SCORE');
    });

    it('sparring stays active after batch scoring', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });

      getState().recordBatchScores([
        { score1: 2, score2: 0, sets: [[6, 2], [6, 3]] }
      ]);
      const state = getState();

      expect(state.status).toBe('active');
    });

    it('is a no-op for tournament gameType', () => {
      startWith(['A', 'B', 'C']);
      const matchesBefore = getState().matches.length;
      const logBefore = getState().changeLog.length;

      getState().recordBatchScores([
        { score1: 2, score2: 0, sets: [[6, 2], [6, 3]] }
      ]);
      const state = getState();

      expect(state.matches.length).toBe(matchesBefore);
      expect(state.changeLog.length).toBe(logBefore);
    });

    it('is a no-op for empty scores array', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });
      const matchesBefore = getState().matches.length;

      getState().recordBatchScores([]);
      expect(getState().matches.length).toBe(matchesBefore);
    });

    it('sets currentMatchIndex to last match', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });

      getState().recordBatchScores([
        { score1: 2, score2: 0, sets: [[6, 2], [6, 3]] },
        { score1: 1, score2: 2, sets: [[4, 6], [6, 3], [5, 7]] },
        { score1: 2, score2: 1, sets: [[7, 5], [3, 6], [6, 4]] }
      ]);
      const state = getState();

      expect(state.currentMatchIndex).toBe(2); // last match index
    });

    it('handles scores without sets (uses empty array)', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });

      getState().recordBatchScores([
        { score1: 2, score2: 0 }
      ]);
      const state = getState();

      expect(state.matches[0].sets).toEqual([]);
      expect(state.matches[0].score1).toBe(2);
    });

    it('match IDs are sequential after existing matches', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });
      // Add a few matches manually first
      getState().addSparringMatch();
      getState().addSparringMatch();
      // Now we have 3 matches (ids 1, 2, 3)
      // Complete all existing
      recordScore(1, 2, 0, [[6, 2], [6, 3]]);
      recordScore(2, 1, 2, [[4, 6], [6, 3], [5, 7]]);
      recordScore(3, 2, 1, [[7, 5], [3, 6], [6, 4]]);

      getState().recordBatchScores([
        { score1: 2, score2: 0, sets: [[6, 1], [6, 2]] },
        { score1: 0, score2: 2, sets: [[3, 6], [2, 6]] }
      ]);
      const state = getState();

      expect(state.matches).toHaveLength(5);
      expect(state.matches[3].id).toBe(4);
      expect(state.matches[4].id).toBe(5);
    });
  });

  // =========================================================================
  // 8. addRound (tournament additional rounds)
  // =========================================================================
  describe('addRound', () => {
    it('adds a new round of matches for tournament mode', () => {
      startWith(['A', 'B', 'C']);
      // 3 players => 3 matches initially
      expect(getState().matches).toHaveLength(3);

      getState().addRound();
      const state = getState();

      // 3 original + 3 new = 6
      expect(state.matches).toHaveLength(6);
    });

    it('new matches have IDs continuing from existing matches', () => {
      startWith(['A', 'B', 'C']);
      const originalMaxId = Math.max(...getState().matches.map(m => m.id));

      getState().addRound();
      const state = getState();

      const newMatches = state.matches.slice(3);
      const newIds = newMatches.map(m => m.id);
      // All new IDs should be > originalMaxId
      for (const id of newIds) {
        expect(id).toBeGreaterThan(originalMaxId);
      }
      // IDs should be sequential
      expect(newIds).toEqual([originalMaxId + 1, originalMaxId + 2, originalMaxId + 3]);
    });

    it('sets currentMatchIndex to first new match', () => {
      startWith(['A', 'B', 'C']);
      const originalLength = getState().matches.length;

      getState().addRound();
      const state = getState();

      expect(state.currentMatchIndex).toBe(originalLength);
    });

    it('new matches cover all player pairs', () => {
      startWith(['A', 'B', 'C', 'D']);
      // 4 players => 6 matches initially
      getState().addRound();
      const state = getState();

      const newMatches = state.matches.slice(6);
      expect(newMatches).toHaveLength(6);

      const playerIds = state.players.map(p => p.id);
      const pairs = new Set();
      for (const match of newMatches) {
        expect(playerIds).toContain(match.player1Id);
        expect(playerIds).toContain(match.player2Id);
        const pair = [match.player1Id, match.player2Id].sort().join('-');
        pairs.add(pair);
      }
      expect(pairs.size).toBe(6);
    });

    it('all new matches are uncompleted', () => {
      startWith(['A', 'B', 'C']);
      getState().addRound();
      const state = getState();

      const newMatches = state.matches.slice(3);
      for (const match of newMatches) {
        expect(match.completed).toBe(false);
        expect(match.score1).toBeNull();
        expect(match.score2).toBeNull();
      }
    });

    it('adds a changelog entry', () => {
      startWith(['A', 'B', 'C']);
      const logBefore = getState().changeLog.length;

      getState().addRound();
      const state = getState();

      expect(state.changeLog.length).toBe(logBefore + 1);
      expect(state.changeLog[0].action).toBe('SCORE');
      expect(state.changeLog[0].details).toContain('Dodano rundę');
    });

    it('addRound keeps tournament active after all matches completed', () => {
      startWith(['A', 'B', 'C']);
      completeAllMatches();
      // Tournament stays active (no auto-complete)
      expect(getState().status).toBe('active');

      getState().addRound();
      const state = getState();

      expect(state.status).toBe('active');
    });

    it('is a no-op for sparring gameType', () => {
      startWith(['Player1', 'Player2'], { gameType: 'sparring' });
      const matchesBefore = getState().matches.length;

      getState().addRound();
      expect(getState().matches.length).toBe(matchesBefore);
    });

    it('new rounds have higher round numbers than existing ones', () => {
      startWith(['A', 'B', 'C']);
      const originalMaxRound = Math.max(...getState().matches.map(m => m.round));

      getState().addRound();
      const state = getState();

      const newMatches = state.matches.slice(3);
      for (const match of newMatches) {
        expect(match.round).toBeGreaterThan(originalMaxRound);
      }
    });

    it('can add multiple rounds', () => {
      startWith(['A', 'B', 'C']);
      // 3 matches initially

      getState().addRound();
      expect(getState().matches).toHaveLength(6);

      getState().addRound();
      expect(getState().matches).toHaveLength(9);

      // All IDs should be unique
      const ids = getState().matches.map(m => m.id);
      expect(new Set(ids).size).toBe(9);
    });
  });

  // =========================================================================
  // 9. startTournament with numberOfRounds
  // =========================================================================
  describe('startTournament with numberOfRounds', () => {
    it('with numberOfRounds=1 creates standard round-robin (same as default)', () => {
      const state = startWith(['A', 'B', 'C'], { numberOfRounds: 1 });

      // C(3,2) = 3 matches
      expect(state.matches).toHaveLength(3);
    });

    it('with numberOfRounds=2 creates double round-robin', () => {
      const state = startWith(['A', 'B', 'C'], { numberOfRounds: 2 });

      // 3 matches per round * 2 rounds = 6 matches
      expect(state.matches).toHaveLength(6);
    });

    it('with numberOfRounds=3 creates triple round-robin', () => {
      const state = startWith(['A', 'B', 'C'], { numberOfRounds: 3 });

      // 3 matches per round * 3 rounds = 9 matches
      expect(state.matches).toHaveLength(9);
    });

    it('match IDs are unique and sequential', () => {
      const state = startWith(['A', 'B', 'C'], { numberOfRounds: 2 });

      const ids = state.matches.map(m => m.id);
      // Sequential from 1 to 6
      expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('each pair appears numberOfRounds times', () => {
      const state = startWith(['A', 'B', 'C', 'D'], { numberOfRounds: 2 });

      // 6 matches per round * 2 rounds = 12 matches
      expect(state.matches).toHaveLength(12);

      // Each pair should appear exactly 2 times
      const pairCounts = {};
      for (const match of state.matches) {
        const pair = [match.player1Id, match.player2Id].sort().join('-');
        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
      }

      const counts = Object.values(pairCounts);
      expect(counts.every(c => c === 2)).toBe(true);
      // C(4,2) = 6 unique pairs
      expect(Object.keys(pairCounts)).toHaveLength(6);
    });

    it('without numberOfRounds behaves as single round-robin', () => {
      const state = startWith(['A', 'B', 'C']);

      // C(3,2) = 3 matches
      expect(state.matches).toHaveLength(3);
    });

    it('all matches start uncompleted', () => {
      const state = startWith(['A', 'B', 'C'], { numberOfRounds: 2 });

      for (const match of state.matches) {
        expect(match.completed).toBe(false);
        expect(match.score1).toBeNull();
        expect(match.score2).toBeNull();
      }
    });

    it('changelog reflects total match count', () => {
      const state = startWith(['A', 'B', 'C'], { numberOfRounds: 2 });

      expect(state.changeLog[0].details).toContain('6 meczów');
    });

    it('with 4 players and numberOfRounds=3 creates correct match count', () => {
      const state = startWith(['A', 'B', 'C', 'D'], { numberOfRounds: 3 });

      // 6 matches per round * 3 rounds = 18 matches
      expect(state.matches).toHaveLength(18);

      const pairCounts = {};
      for (const match of state.matches) {
        const pair = [match.player1Id, match.player2Id].sort().join('-');
        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
      }
      expect(Object.values(pairCounts).every(c => c === 3)).toBe(true);
    });
  });
});
