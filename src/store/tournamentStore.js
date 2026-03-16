import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { generateRoundRobin } from '../utils/roundRobin';
import { validateImportedState, sanitizePlayerName } from '../utils/validation';
import { DEFAULT_SETTINGS } from '../constants/tournament';
import { storageService } from '../services/storageService';
import { isSupabaseConfigured } from '../lib/supabase';

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
  changeLog: []
});

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
            {
              id: uuidv4(),
              timestamp: createdAt,
              action: 'START',
              details: `Turniej rozpoczęty (${players.length} graczy, ${matches.length} meczów)`
            }
          ]
        });
      },

      // Record match score with sets
      // sets: array of [gems1, gems2] per set, e.g. [[6,4],[3,6],[7,5]]
      // score1/score2: number of sets won (computed from sets)
      recordScore: (matchId, score1, score2, sets) => {
        const state = get();
        const matchIndex = state.matches.findIndex((m) => m.id === matchId);

        if (matchIndex === -1) return;

        const match = state.matches[matchIndex];
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

        // Check if tournament is complete (sparring never auto-completes)
        const allCompleted = state.gameType === 'sparring'
          ? false
          : updatedMatches.every((m) => m.completed);

        const setsStr = sets && sets.length > 0
          ? sets.map(s => `${s[0]}:${s[1]}`).join(', ')
          : `${score1}:${score2}`;

        const logEntry = {
          id: uuidv4(),
          timestamp,
          action: isEdit ? 'EDIT' : 'SCORE',
          details: isEdit
            ? `Mecz #${matchId}: Zmieniono na ${setsStr}`
            : `Mecz #${matchId}: ${player1?.name} vs ${player2?.name} (${setsStr})`,
          matchId,
          previousValue: previousScore,
          newValue: setsStr
        };

        set({
          matches: updatedMatches,
          currentMatchIndex: nextMatchIndex,
          status: allCompleted ? 'completed' : 'active',
          changeLog: [logEntry, ...state.changeLog]
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

        const allCompleted = updatedMatches.every((m) => m.completed);
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
          status: allCompleted ? 'completed' : 'active',
          changeLog: [
            {
              id: uuidv4(),
              timestamp,
              action: 'EDIT',
              details: `Walkover: ${player.name} wycofany z turnieju`
            },
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

        const timestamp = new Date().toISOString();
        const validState = result.state;

        set({
          ...validState,
          changeLog: [
            {
              id: uuidv4(),
              timestamp,
              action: 'IMPORT',
              details: 'Stan turnieju zaimportowany'
            },
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
        set({ ...createInitialState() });
      },

      // Go to setup (new tournament/sparring form)
      goToSetup: (type = 'tournament') => {
        set({ ...createInitialState(), status: 'setup', gameType: type });
      },

      // Load a tournament from Supabase by ID
      loadTournamentFromDb: async (tournamentId) => {
        try {
          const data = await storageService.loadTournament(tournamentId);
          if (data) {
            set({
              ...data,
              // Ensure status is never 'dashboard' or 'setup' for loaded tournaments
              status: data.status === 'setup' ? 'active' : data.status
            });
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

      // End sparring manually
      endSparring: () => {
        const state = get();
        const timestamp = new Date().toISOString();
        set({
          status: 'completed',
          changeLog: [
            { id: uuidv4(), timestamp, action: 'SCORE', details: 'Sparring zakończony' },
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

        set({ syncStatus: 'syncing' });

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
            set({ syncStatus: 'synced' });
            // Reset to idle after 3s
            setTimeout(() => {
              if (get().syncStatus === 'synced') set({ syncStatus: 'idle' });
            }, 3000);
          } else {
            set({ syncStatus: 'error' });
            // Auto-retry after 5s
            setTimeout(() => {
              get()._syncToSupabase();
            }, 5000);
          }
        } catch (err) {
          console.error('Supabase sync failed:', err);
          set({ syncStatus: 'error' });
          // Auto-retry after 5s
          setTimeout(() => {
            get()._syncToSupabase();
          }, 5000);
        }
      }
    }),
    {
      name: 'tennis-tournament-storage',
      version: 4,
      migrate: (persistedState, version) => {
        if (version < 4) {
          persistedState.status = 'dashboard';
          persistedState.location = persistedState.location || '';
          persistedState.date = persistedState.date || '';
          persistedState.gameType = persistedState.gameType || null;
        }
        return persistedState;
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

// Auto-sync to Supabase on state changes (debounced)
let syncTimeout = null;
useTournamentStore.subscribe((state, prevState) => {
  // Skip sync status changes to avoid infinite loop
  if (state.syncStatus !== prevState.syncStatus) return;

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
