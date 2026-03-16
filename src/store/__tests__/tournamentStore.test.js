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
    opts.gameType || undefined
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

    it('walkoverPlayer auto-completes tournament if all matches become completed', () => {
      startWith(['A', 'B', 'C']);
      const players = getState().players;

      // Walk over two players so all matches have at least one walked-over player
      getState().walkoverPlayer(players[0].id);
      getState().walkoverPlayer(players[1].id);
      const state = getState();

      const allDone = state.matches.every((m) => m.completed);
      expect(allDone).toBe(true);
      expect(state.status).toBe('completed');
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

    it('recording score when all tournament matches complete auto-completes', () => {
      startWith(['A', 'B', 'C']);
      const state = completeAllMatches();

      expect(state.matches.every((m) => m.completed)).toBe(true);
      expect(state.status).toBe('completed');
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
});
