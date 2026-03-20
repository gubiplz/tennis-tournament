import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { generateRoundRobin } from '../utils/roundRobin';
import { validateImportedState, sanitizePlayerName } from '../utils/validation';
import { DEFAULT_SETTINGS } from '../constants/tournament';
import { storageService } from '../services/storageService';
import { isSupabaseConfigured } from '../lib/supabase';

/** Create a changelog entry */
function logEntry(action, details, extra = {}) {
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    details,
    ...extra
  };
}

const DEFAULT_PLAYERS = [
  'Hubert',
  'Bartek',
  'Jasiu',
  'Gaba',
  'Pawciu',
  'Tworas'
];

const createInitialState = () => ({
  id: null,
  name: '',
  location: '',
  date: '',
  gameType: null, // 'sparring' | 'tournament'
  createdAt: null,
  status: 'dashboard', // 'dashboard' | 'setup' | 'active' | 'completed'
  players: [],
  matches: [],
  currentMatchIndex: 0,
  settings: { ...DEFAULT_SETTINGS },
  changeLog: [],
  _realtimeToast: false // true briefly when remote data arrives
});

// ---------------------------------------------------------------------------
// Flag to suppress realtime callbacks triggered by our own saves.
// Set to true just before saving, reset after a short window.
// ---------------------------------------------------------------------------
let _ignoringRealtime = false;
let _ignoreTimer = null;

function markOwnSave() {
  _ignoringRealtime = true;
  clearTimeout(_ignoreTimer);
  // Supabase Realtime typically delivers within ~200-500ms.
  // We ignore events for 2s after our own save to be safe.
  _ignoreTimer = setTimeout(() => {
    _ignoringRealtime = false;
  }, 2000);
}

export const useTournamentStore = create(
  persist(
    (set, get) => ({
      ...createInitialState(),

      // Setup actions
      setName: (name) => set({ name }),
      setLocation: (location) => set({ location }),
      setDate: (date) => set({ date }),

      setSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings }
        })),

      // Start tournament/sparring with player names
      startTournament: (playerNames, tournamentName, tournamentLocation, tournamentDate, gameType) => {
        const players = playerNames.map((name) => ({
          id: uuidv4(),
          name: sanitizePlayerName(name)
        }));

        const matches = generateRoundRobin(players);

        const id = uuidv4();
        const createdAt = new Date().toISOString();

        const resolvedType = gameType || (players.length <= 2 ? 'sparring' : 'tournament');
        const defaultName = resolvedType === 'sparring'
          ? `${players[0]?.name} vs ${players[1]?.name}`
          : `Turniej ${new Date().toLocaleDateString('pl-PL')}`;

        set({
          id,
          name: tournamentName || defaultName,
          gameType: resolvedType,
          location: tournamentLocation || '',
          date: tournamentDate || new Date().toLocaleDateString('pl-PL'),
          createdAt,
          status: 'active',
          players,
          matches,
          currentMatchIndex: 0,
          changeLog: [
            { ...logEntry('START', `Turniej rozpoczęty (${players.length} graczy, ${matches.length} meczów)`), timestamp: createdAt }
          ]
        });

        // Subscribe to realtime for the newly created tournament
        _subscribeToRealtime(id, set, get);
      },

      // Record match score with sets
      // sets: array of [gems1, gems2] per set, e.g. [[6,4],[3,6],[7,5]]
      // score1/score2: number of sets won (computed from sets)
      recordScore: (matchId, score1, score2, sets) => {
        const state = get();
        const matchIndex = state.matches.findIndex((m) => m.id === matchId);

        if (matchIndex === -1) return;

        const match = state.matches[matchIndex];

        // Block edits 24h after tournament completion
        if (match.completed && state.status === 'completed') {
          const endEntry = state.changeLog?.find(e => e.details?.includes('zakończony'));
          if (endEntry) {
            const age = Date.now() - new Date(endEntry.timestamp).getTime();
            if (age > 24 * 60 * 60 * 1000) return;
          }
        }

        const player1 = state.players.find((p) => p.id === match.player1Id);
        const player2 = state.players.find((p) => p.id === match.player2Id);
        const timestamp = new Date().toISOString();

        const isEdit = match.completed;
        const previousScore = isEdit ? `${match.score1}:${match.score2}` : null;

        const updatedMatches = [...state.matches];
        updatedMatches[matchIndex] = {
          ...match,
          score1,
          score2,
          sets: sets || [],
          completed: true,
          completedAt: isEdit ? match.completedAt : timestamp,
          editedAt: isEdit ? timestamp : null
        };

        // Find next incomplete match
        let nextMatchIndex = state.currentMatchIndex;
        if (matchIndex === state.currentMatchIndex) {
          for (let i = matchIndex + 1; i < updatedMatches.length; i++) {
            if (!updatedMatches[i].completed) {
              nextMatchIndex = i;
              break;
            }
          }
          // If no more matches, keep at last
          if (nextMatchIndex === state.currentMatchIndex && matchIndex < updatedMatches.length - 1) {
            nextMatchIndex = matchIndex + 1;
          }
        }

        // Neither sparring nor tournament auto-completes.
        // Sparring: user clicks "Zakończ" to end.
        // Tournament: UI shows a choice screen (end or add round) when all matches are done.
        // The user then calls endTournament() explicitly.

        const setsStr = sets && sets.length > 0
          ? sets.map(s => `${s[0]}:${s[1]}`).join(', ')
          : `${score1}:${score2}`;

        const scoreLog = logEntry(
          isEdit ? 'EDIT' : 'SCORE',
          isEdit
            ? `Mecz #${matchId}: Zmieniono na ${setsStr}`
            : `Mecz #${matchId}: ${player1?.name} vs ${player2?.name} (${setsStr})`,
          { matchId, previousValue: previousScore, newValue: setsStr }
        );

        set({
          matches: updatedMatches,
          currentMatchIndex: nextMatchIndex,
          status: 'active',
          changeLog: [scoreLog, ...state.changeLog]
        });
      },

      // Record multiple sparring match scores at once
      // scores = [{ score1, score2, sets }, ...]
      // First score goes to current match (if unscored), rest create new matches
      recordBatchScores: (scores) => {
        const state = get();
        if (state.gameType !== 'sparring' || state.players.length !== 2 || !scores || scores.length === 0) return;

        const timestamp = new Date().toISOString();
        const updatedMatches = [...state.matches];
        const logEntries = [];
        let startIdx = 0;

        // Try to use the current match for the first score
        const currentMatch = updatedMatches[state.currentMatchIndex];
        if (currentMatch && !currentMatch.completed) {
          const entry = scores[0];
          const player1 = state.players.find((p) => p.id === currentMatch.player1Id);
          const player2 = state.players.find((p) => p.id === currentMatch.player2Id);

          const setsStr = entry.sets && entry.sets.length > 0
            ? entry.sets.map(s => `${s[0]}:${s[1]}`).join(', ')
            : `${entry.score1}:${entry.score2}`;

          updatedMatches[state.currentMatchIndex] = {
            ...currentMatch,
            score1: entry.score1,
            score2: entry.score2,
            sets: entry.sets || [],
            completed: true,
            completedAt: timestamp,
            editedAt: null
          };

          logEntries.push(logEntry('SCORE', `Mecz #${currentMatch.id}: ${player1?.name} vs ${player2?.name} (${setsStr})`, {
            matchId: currentMatch.id, previousValue: null, newValue: setsStr
          }));

          startIdx = 1;
        }

        // Create new matches for remaining scores
        for (let i = startIdx; i < scores.length; i++) {
          const entry = scores[i];
          const newMatchId = updatedMatches.length + 1;
          const player1 = state.players[0];
          const player2 = state.players[1];

          const setsStr = entry.sets && entry.sets.length > 0
            ? entry.sets.map(s => `${s[0]}:${s[1]}`).join(', ')
            : `${entry.score1}:${entry.score2}`;

          updatedMatches.push({
            id: newMatchId,
            round: newMatchId,
            player1Id: player1.id,
            player2Id: player2.id,
            score1: entry.score1,
            score2: entry.score2,
            sets: entry.sets || [],
            completed: true,
            completedAt: timestamp,
            editedAt: null
          });

          logEntries.push(logEntry('SCORE', `Mecz #${newMatchId}: ${player1?.name} vs ${player2?.name} (${setsStr})`, {
            matchId: newMatchId, previousValue: null, newValue: setsStr
          }));
        }

        // Point currentMatchIndex to the last match (all are completed, sparring stays active)
        const lastIndex = updatedMatches.length - 1;

        set({
          matches: updatedMatches,
          currentMatchIndex: lastIndex,
          changeLog: [...logEntries.reverse(), ...state.changeLog]
        });
      },

      // Add another round of round-robin matches (tournament mode, 3+ players)
      addRound: () => {
        const state = get();
        if (state.gameType !== 'tournament' || state.players.length < 3) return;

        const newRoundMatches = generateRoundRobin(state.players);
        const lastMatchId = state.matches.length > 0
          ? Math.max(...state.matches.map(m => m.id))
          : 0;
        const maxRound = state.matches.length > 0
          ? Math.max(...state.matches.map(m => m.round))
          : 0;

        const renumberedMatches = newRoundMatches.map((match, idx) => ({
          ...match,
          id: lastMatchId + idx + 1,
          round: maxRound + match.round
        }));

        const firstNewIndex = state.matches.length;

        set({
          matches: [...state.matches, ...renumberedMatches],
          currentMatchIndex: firstNewIndex,
          status: 'active',
          changeLog: [
            logEntry('SCORE', `Dodano rundę (${renumberedMatches.length} meczów)`),
            ...state.changeLog
          ]
        });
      },

      // Go to specific match
      goToMatch: (matchIndex) => {
        const state = get();
        if (matchIndex >= 0 && matchIndex < state.matches.length) {
          set({ currentMatchIndex: matchIndex });
        }
      },

      // Reset tournament — go back to dashboard
      resetTournament: () => {
        storageService.unsubscribeFromTournament();
        set({ ...createInitialState() });
      },

      // Walkover — mark all remaining matches for a player as losses (0:3)
      walkoverPlayer: (playerId) => {
        const state = get();
        const timestamp = new Date().toISOString();
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;

        const updatedMatches = state.matches.map((match) => {
          if (match.completed) return match;
          const isPlayer1 = match.player1Id === playerId;
          const isPlayer2 = match.player2Id === playerId;
          if (!isPlayer1 && !isPlayer2) return match;

          return {
            ...match,
            score1: isPlayer1 ? 0 : 3,
            score2: isPlayer2 ? 0 : 3,
            completed: true,
            completedAt: timestamp
          };
        });

        // Don't auto-complete — let the UI handle the end-of-tournament choice
        let nextMatchIndex = state.currentMatchIndex;
        for (let i = nextMatchIndex; i < updatedMatches.length; i++) {
          if (!updatedMatches[i].completed) {
            nextMatchIndex = i;
            break;
          }
        }

        set({
          matches: updatedMatches,
          currentMatchIndex: nextMatchIndex,
          status: 'active',
          changeLog: [
            logEntry('EDIT', `Walkover: ${player.name} wycofany z turnieju`),
            ...state.changeLog
          ]
        });
      },

      // Import state from external source (with validation)
      importState: (importedState) => {
        const result = validateImportedState(importedState);
        if (!result.valid) {
          throw new Error(result.error);
        }

        const validState = result.state;

        set({
          ...validState,
          changeLog: [
            logEntry('IMPORT', 'Stan turnieju zaimportowany'),
            ...(validState.changeLog || [])
          ]
        });
      },

      // Get exportable state (for sharing)
      getExportableState: () => {
        const state = get();
        return {
          id: state.id,
          name: state.name,
          gameType: state.gameType,
          location: state.location,
          date: state.date,
          createdAt: state.createdAt,
          status: state.status,
          players: state.players,
          matches: state.matches,
          currentMatchIndex: state.currentMatchIndex,
          settings: state.settings,
          changeLog: state.changeLog
        };
      },

      // Go to dashboard (tournament list)
      goToDashboard: () => {
        storageService.unsubscribeFromTournament();
        set({ ...createInitialState() });
      },

      // Go to setup (new tournament/sparring form)
      goToSetup: (type = 'tournament') => {
        storageService.unsubscribeFromTournament();
        set({ ...createInitialState(), status: 'setup', gameType: type });
      },

      // Load a tournament from Supabase by ID
      loadTournamentFromDb: async (tournamentId) => {
        try {
          const data = await storageService.loadTournament(tournamentId);
          if (data) {
            // Auto-expire: if active and older than 24h, mark as completed
            let resolvedStatus = data.status === 'setup' ? 'active' : data.status;
            if (resolvedStatus === 'active' && data.createdAt) {
              const age = Date.now() - new Date(data.createdAt).getTime();
              if (age > 24 * 60 * 60 * 1000) {
                resolvedStatus = 'completed';
              }
            }
            set({ ...data, status: resolvedStatus });

            // Subscribe to realtime updates for this tournament
            _subscribeToRealtime(tournamentId, set, get);

            // Sync back if status changed
            if (resolvedStatus !== data.status) {
              get()._syncToSupabase();
            }
            return true;
          }
        } catch (err) {
          console.error('Failed to load tournament:', err);
        }
        return false;
      },

      // Add new match for sparring (same 2 players)
      addSparringMatch: () => {
        const state = get();
        if (state.gameType !== 'sparring' || state.players.length !== 2) return;

        const newMatchId = state.matches.length + 1;
        const newMatch = {
          id: newMatchId,
          round: newMatchId,
          player1Id: state.players[0].id,
          player2Id: state.players[1].id,
          score1: 0,
          score2: 0,
          sets: [],
          completed: false,
          completedAt: null,
          editedAt: null
        };

        set({
          matches: [...state.matches, newMatch],
          currentMatchIndex: state.matches.length
        });
      },

      // Add a single custom match in tournament mode (pick any pair)
      addCustomMatch: (player1Id, player2Id) => {
        const state = get();
        if (state.gameType !== 'tournament' || state.players.length < 3) return;
        if (player1Id === player2Id) return;
        if (!state.players.find(p => p.id === player1Id) || !state.players.find(p => p.id === player2Id)) return;

        const lastMatchId = state.matches.length > 0
          ? Math.max(...state.matches.map(m => m.id))
          : 0;
        const maxRound = state.matches.length > 0
          ? Math.max(...state.matches.map(m => m.round))
          : 0;

        const newMatch = {
          id: lastMatchId + 1,
          round: maxRound + 1,
          player1Id,
          player2Id,
          score1: 0,
          score2: 0,
          sets: [],
          completed: false,
          completedAt: null,
          editedAt: null
        };

        const p1 = state.players.find(p => p.id === player1Id);
        const p2 = state.players.find(p => p.id === player2Id);

        set({
          matches: [...state.matches, newMatch],
          currentMatchIndex: state.matches.length,
          status: 'active',
          changeLog: [
            logEntry('SCORE', `Dodano mecz: ${p1.name} vs ${p2.name}`),
            ...state.changeLog
          ]
        });
      },

      // End tournament/sparring manually
      endTournament: () => {
        const state = get();
        if (state.status === 'completed') return;
        const label = state.gameType === 'sparring' ? 'Sparring' : 'Turniej';
        set({
          status: 'completed',
          changeLog: [
            logEntry('SCORE', `${label} zakończony`),
            ...state.changeLog
          ]
        });
      },

      // Get default player names
      getDefaultPlayers: () => DEFAULT_PLAYERS,

      // Sync status for UI indicator
      syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'

      // Sync current state to Supabase
      _syncToSupabase: async () => {
        if (!isSupabaseConfigured()) return;
        const state = get();
        if (!state.id || state.status === 'setup' || state.status === 'dashboard') return;

        // Mark that the next realtime event is from our own save
        markOwnSave();

        try {
          const result = await storageService.saveTournament({
            id: state.id,
            name: state.name,
            gameType: state.gameType,
            location: state.location,
            date: state.date,
            createdAt: state.createdAt,
            status: state.status,
            players: state.players,
            matches: state.matches,
            currentMatchIndex: state.currentMatchIndex,
            settings: state.settings,
            changeLog: state.changeLog
          });

          if (result) {
            if (get().syncStatus === 'error') set({ syncStatus: 'idle' });
          } else {
            set({ syncStatus: 'error' });
            setTimeout(() => { get()._syncToSupabase(); }, 5000);
          }
        } catch (err) {
          console.error('Supabase sync failed:', err);
          set({ syncStatus: 'error' });
          setTimeout(() => { get()._syncToSupabase(); }, 5000);
        }
      },

      // Dismiss the realtime toast
      dismissRealtimeToast: () => set({ _realtimeToast: false })
    }),
    {
      name: 'tennis-tournament-storage',
      version: 5,
      migrate: (persistedState, version) => {
        if (version < 4) {
          persistedState.status = 'dashboard';
          persistedState.location = persistedState.location || '';
          persistedState.date = persistedState.date || '';
          persistedState.gameType = persistedState.gameType || null;
        }
        // v4 -> v5: gem-based scoring + default pointsForWin changed to 2.
        // No data migration needed — existing tournaments keep their own settings.
        return persistedState;
      },
      partialize: (state) => {
        // Exclude transient UI fields from persistence
        const { _realtimeToast, ...rest } = state;
        return rest;
      },
      storage: {
        getItem: (name) => {
          try {
            const value = localStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch {
            console.error('Failed to read from localStorage');
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            if (error?.name === 'QuotaExceededError' || error?.code === 22) {
              console.warn('localStorage quota exceeded — truncating changeLog');
              try {
                const truncated = { ...value };
                if (truncated.state?.changeLog?.length > 50) {
                  truncated.state.changeLog = truncated.state.changeLog.slice(0, 50);
                }
                localStorage.setItem(name, JSON.stringify(truncated));
              } catch {
                console.error('Failed to save even after truncation');
              }
            }
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // ignore
          }
        }
      }
    }
  )
);

// ---------------------------------------------------------------------------
// Realtime subscription helper (called from store actions)
// ---------------------------------------------------------------------------
function _subscribeToRealtime(tournamentId, set, get) {
  if (!isSupabaseConfigured()) return;

  storageService.subscribeToTournament(tournamentId, (remoteData) => {
    // Ignore events triggered by our own saves
    if (_ignoringRealtime) {
      return;
    }

    const local = get();

    // Only apply if the tournament ID matches the currently loaded one
    if (local.id !== remoteData.id) return;

    // Simple last-write-wins: compare changeLog length as a proxy for
    // "who has more recent data". If the remote changeLog is longer or
    // different, we accept it. This is a pragmatic heuristic — the
    // remote data is coming from Supabase which was written by
    // another device, so it is authoritative.
    const remoteLogLen = remoteData.changeLog?.length || 0;
    const localLogLen = local.changeLog?.length || 0;

    // Also compare the latest changelog entry timestamps when lengths
    // are equal, to avoid overwriting with stale echoes.
    if (remoteLogLen === localLogLen) {
      const remoteLatest = remoteData.changeLog?.[0]?.timestamp;
      const localLatest = local.changeLog?.[0]?.timestamp;
      if (remoteLatest && localLatest && remoteLatest <= localLatest) {
        return; // local is at least as recent
      }
    }

    // Apply the remote state (preserve status if dashboard/setup locally)
    if (local.status === 'dashboard' || local.status === 'setup') return;

    console.log('[Realtime] Applying remote update');
    set({
      name: remoteData.name,
      gameType: remoteData.gameType,
      location: remoteData.location,
      date: remoteData.date,
      status: remoteData.status,
      players: remoteData.players,
      matches: remoteData.matches,
      currentMatchIndex: remoteData.currentMatchIndex,
      settings: remoteData.settings,
      changeLog: remoteData.changeLog,
      _realtimeToast: true
    });
  });
}

// ---------------------------------------------------------------------------
// Auto-sync to Supabase on state changes (debounced)
// ---------------------------------------------------------------------------
let syncTimeout = null;
useTournamentStore.subscribe((state, prevState) => {
  // Skip sync status changes and toast changes to avoid infinite loop
  if (
    state.syncStatus !== prevState.syncStatus ||
    state._realtimeToast !== prevState._realtimeToast
  ) return;

  // Sync when any tournament data changes
  if (
    state.id &&
    state.status !== 'setup' &&
    state.status !== 'dashboard' &&
    (state.matches !== prevState.matches ||
      state.status !== prevState.status ||
      state.currentMatchIndex !== prevState.currentMatchIndex ||
      state.name !== prevState.name ||
      state.players !== prevState.players ||
      state.changeLog !== prevState.changeLog ||
      state.settings !== prevState.settings ||
      state.location !== prevState.location ||
      state.date !== prevState.date ||
      state.gameType !== prevState.gameType)
  ) {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      state._syncToSupabase();
    }, 1000);
  }
});

// ---------------------------------------------------------------------------
// Reconnect Realtime when page comes back from background (mobile Safari/Brave)
// ---------------------------------------------------------------------------
if (typeof document !== 'undefined') {
  // Pull latest data from Supabase and apply if newer
  async function _pullFromSupabase() {
    const state = useTournamentStore.getState();
    if (!state.id || state.status === 'dashboard' || state.status === 'setup') return;
    try {
      const remote = await storageService.loadTournament(state.id);
      if (!remote) return;
      const remoteLogLen = remote.changeLog?.length || 0;
      const localLogLen = state.changeLog?.length || 0;
      // Apply if remote has more data
      if (remoteLogLen > localLogLen) {
        _ignoringRealtime = true;
        useTournamentStore.setState({
          matches: remote.matches,
          currentMatchIndex: remote.currentMatchIndex,
          status: remote.status,
          players: remote.players,
          settings: remote.settings,
          changeLog: remote.changeLog,
          _realtimeToast: true
        });
        setTimeout(() => { _ignoringRealtime = false; }, 2000);
      }
    } catch (err) {
      console.error('[Pull] Failed:', err);
    }
  }

  // Reconnect + pull when page comes back from background
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const state = useTournamentStore.getState();
      if (state.id && state.status !== 'dashboard' && state.status !== 'setup') {
        storageService.reconnectRealtime();
        // Pull latest data in case WebSocket missed updates while in background
        _pullFromSupabase();
      }
    }
  });

  // Fallback polling every 10s for mobile browsers where WebSocket is unreliable
  setInterval(() => {
    const state = useTournamentStore.getState();
    if (!document.hidden && state.id && state.status !== 'dashboard' && state.status !== 'setup') {
      _pullFromSupabase();
    }
  }, 10000);
}
