import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Map JS camelCase state → Supabase snake_case columns.
 * Only includes columns that exist in the DB schema.
 */
function toDbRow(state) {
  const row = {
    id: state.id,
    name: state.name,
    location: state.location || null,
    date: state.date || null,
    created_at: state.createdAt,
    status: state.status,
    players: state.players || [],
    matches: state.matches || [],
    current_match_index: state.currentMatchIndex || 0,
    settings: state.settings || {},
    change_log: state.changeLog || []
  };
  // game_type is optional — column may not exist
  if (state.gameType) row.game_type = state.gameType;
  return row;
}

/**
 * Map Supabase snake_case row → JS camelCase state with validation.
 */
function fromDbRow(row) {
  return {
    id: row.id,
    name: row.name || '',
    gameType: row.game_type || 'tournament',
    location: row.location || '',
    date: row.date || '',
    createdAt: row.created_at,
    status: row.status || 'active',
    players: Array.isArray(row.players) ? row.players : [],
    matches: Array.isArray(row.matches) ? row.matches : [],
    currentMatchIndex: typeof row.current_match_index === 'number' ? row.current_match_index : 0,
    settings: row.settings && typeof row.settings === 'object' ? row.settings : { pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 },
    changeLog: Array.isArray(row.change_log) ? row.change_log : []
  };
}

// ---------------------------------------------------------------------------
// Realtime subscription state
// ---------------------------------------------------------------------------
let _activeChannel = null;

export const storageService = {
  async saveTournament(tournamentState) {
    if (!isSupabaseConfigured() || !tournamentState.id) return null;

    const row = toDbRow(tournamentState);

    let { error } = await supabase
      .from('tournaments')
      .upsert(row, { onConflict: 'id' });

    // If a column doesn't exist (e.g., game_type), retry without it
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
      const { game_type: _game_type, ...rowWithout } = row;
      const result = await supabase
        .from('tournaments')
        .upsert(rowWithout, { onConflict: 'id' });
      error = result.error;
    }

    if (error) {
      console.error('Supabase save error:', error.message);
      return null;
    }

    return true;
  },

  async loadTournament(tournamentId) {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (error) {
      console.error('Supabase load error:', error.message);
      return null;
    }

    return fromDbRow(data);
  },

  async loadAllTournaments() {
    if (!isSupabaseConfigured()) return { data: [], error: null };

    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase load all error:', error.message);
      return { data: [], error: error.message };
    }

    return {
      data: data.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        gameType: row.game_type || 'tournament',
        createdAt: row.created_at,
        playerCount: row.players?.length || 0,
        players: row.players || [],
        matches: row.matches || [],
        location: row.location || '',
        date: row.date || ''
      })),
      error: null
    };
  },

  async deleteTournament(tournamentId) {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (error) {
      console.error('Supabase delete error:', error.message);
      return false;
    }
    return true;
  },

  /**
   * Subscribe to realtime changes on a specific tournament row.
   * Calls `onUpdate(mappedData)` whenever an UPDATE event arrives.
   * Returns void — use `unsubscribeFromTournament()` to clean up.
   */
  // Store callback and tournamentId for reconnection
  _realtimeCallback: null,
  _realtimeTournamentId: null,

  subscribeToTournament(tournamentId, onUpdate) {
    if (!isSupabaseConfigured() || !tournamentId) return;

    // Store for reconnection
    this._realtimeCallback = onUpdate;
    this._realtimeTournamentId = tournamentId;

    // Clean up any previous subscription first
    this.unsubscribeFromTournament();

    const channelName = `tournament-${tournamentId}-${Date.now()}`;

    _activeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`
        },
        (payload) => {
          if (payload.new) {
            const mapped = fromDbRow(payload.new);
            onUpdate(mapped);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to tournament ${tournamentId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime] ${status} — will retry on next visibility change`);
          // Clean up broken channel
          if (_activeChannel) {
            supabase.removeChannel(_activeChannel);
            _activeChannel = null;
          }
        }
      });
  },

  /**
   * Reconnect realtime if we have a stored callback (e.g., after mobile resume).
   */
  reconnectRealtime() {
    if (this._realtimeTournamentId && this._realtimeCallback) {
      console.log('[Realtime] Reconnecting...');
      this.subscribeToTournament(this._realtimeTournamentId, this._realtimeCallback);
    }
  },

  /**
   * Unsubscribe from any active realtime channel.
   */
  unsubscribeFromTournament() {
    this._realtimeCallback = null;
    this._realtimeTournamentId = null;
    if (_activeChannel) {
      supabase.removeChannel(_activeChannel);
      _activeChannel = null;
      console.log('[Realtime] Unsubscribed from tournament channel');
    }
  }
};
