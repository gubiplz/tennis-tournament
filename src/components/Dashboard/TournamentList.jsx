import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentStore } from '../../store/tournamentStore';
import { storageService } from '../../services/storageService';

function PlayerStatsSection({ tournaments }) {
  const stats = useMemo(() => {
    const playerMap = new Map();

    for (const t of tournaments) {
      if (!t.players || !t.matches) continue;
      const pMap = new Map(t.players.map(p => [p.id, p.name]));

      for (const m of t.matches) {
        if (!m.completed) continue;

        const p1Name = pMap.get(m.player1Id);
        const p2Name = pMap.get(m.player2Id);
        if (!p1Name || !p2Name) continue;

        for (const [name, isP1] of [[p1Name, true], [p2Name, false]]) {
          if (!playerMap.has(name)) {
            playerMap.set(name, { name, played: 0, won: 0, lost: 0, lastPlayed: null });
          }
          const s = playerMap.get(name);
          s.played++;
          const myScore = isP1 ? m.score1 : m.score2;
          const opScore = isP1 ? m.score2 : m.score1;
          if (myScore > opScore) s.won++;
          else if (opScore > myScore) s.lost++;

          const matchDate = m.completedAt || t.createdAt;
          if (matchDate && (!s.lastPlayed || matchDate > s.lastPlayed)) {
            s.lastPlayed = matchDate;
          }
        }
      }
    }

    return Array.from(playerMap.values())
      .sort((a, b) => b.played - a.played)
      .slice(0, 10);
  }, [tournaments]);

  if (stats.length === 0) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Dziś';
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  };

  return (
    <section className="mb-6" aria-label="Statystyki graczy">
      <h2 className="text-tennis-200 text-sm font-semibold uppercase tracking-wider mb-3 px-1">
        Statystyki graczy
      </h2>
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2 text-xs text-tennis-200 font-semibold uppercase tracking-wider border-b border-white/10">
          <span>Gracz</span>
          <span className="text-center">Mecze</span>
          <span className="text-center">W-L</span>
          <span className="text-right">Ostatnio</span>
        </div>
        {stats.map((p, i) => (
          <div
            key={p.name}
            className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2.5 items-center ${
              i < stats.length - 1 ? 'border-b border-white/5' : ''
            }`}
          >
            <span className="text-white font-medium text-sm truncate">{p.name}</span>
            <span className="text-white text-sm text-center font-bold">{p.played}</span>
            <span className="text-sm text-center">
              <span className="text-green-300">{p.won}</span>
              <span className="text-white/40">-</span>
              <span className="text-red-300">{p.lost}</span>
            </span>
            <span className="text-tennis-200 text-xs text-right whitespace-nowrap">{formatDate(p.lastPlayed)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TournamentCard({ tournament, onSelect, isLoading }) {
  const isActive = tournament.status === 'active';
  const isCompleted = tournament.status === 'completed';

  const statusConfig = {
    active: {
      label: 'W toku',
      bg: 'bg-green-100 text-green-800',
      dot: 'bg-green-500'
    },
    completed: {
      label: 'Zakończony',
      bg: 'bg-gray-100 text-gray-700',
      dot: 'bg-gray-400'
    }
  };

  const config = statusConfig[tournament.status] || statusConfig.active;

  return (
    <button
      onClick={() => onSelect(tournament)}
      disabled={isLoading}
      aria-label={`${tournament.name}${tournament.date ? `, ${tournament.date}` : ''}, ${config.label}, ${tournament.playerCount} graczy`}
      className={`
        w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 min-h-[44px]
        hover:shadow-lg active:scale-[0.98] disabled:opacity-50
        ${isActive
          ? 'bg-gradient-to-br from-tennis-50 to-white border-tennis-200 hover:border-tennis-400'
          : 'bg-white border-gray-200 hover:border-gray-300'
        }
        slide-up
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            w-12 h-12 rounded-2xl flex items-center justify-center text-2xl
            ${isActive
              ? 'bg-gradient-to-br from-tennis-400 to-tennis-600 shadow-lg shadow-tennis-500/30'
              : isCompleted
                ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg shadow-yellow-400/30'
                : 'bg-gray-200'
            }
          `} aria-hidden="true">
            {isCompleted ? '\u{1F3C6}' : '\u{1F3BE}'}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg leading-tight">
              {tournament.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {tournament.date && (
                <span className="text-xs text-gray-600">{tournament.date}</span>
              )}
              {tournament.date && tournament.location && (
                <span className="text-xs text-gray-400" aria-hidden="true">&bull;</span>
              )}
              {tournament.location && (
                <span className="text-xs text-gray-600">{tournament.location}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${isActive ? 'animate-pulse' : ''}`} aria-hidden="true" />
            {config.label}
          </span>
          <span className="text-xs text-gray-600">
            {tournament.playerCount} graczy
          </span>
        </div>
      </div>
    </button>
  );
}

export function TournamentList() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const { loadTournamentFromDb } = useTournamentStore();

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await storageService.loadAllTournaments();
      setTournaments(result.data);
      if (result.error) setLoadError(result.error);
    } catch (err) {
      setLoadError('Nie udało się połączyć z serwerem');
      console.error('Failed to load tournaments:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTournaments(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadTournaments]);

  const handleSelect = async (tournament) => {
    setLoadingId(tournament.id);
    const ok = await loadTournamentFromDb(tournament.id);
    if (ok) {
      const prefix = tournament.gameType === 'sparring' ? 'sparing' : 'turniej';
      navigate(`/${prefix}/${tournament.id}`);
    } else {
      setLoadingId(null);
      alert('Nie udało się załadować turnieju');
    }
  };

  const activeTournaments = tournaments.filter((t) => t.status === 'active');
  const completedTournaments = tournaments.filter((t) => t.status === 'completed');

  return (
    <main className="min-h-screen bg-gradient-to-br from-tennis-700 via-tennis-600 to-tennis-800 safe-top safe-bottom">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <div className="w-20 h-20 mx-auto bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl border border-white/20 mb-4" aria-hidden="true">
            <span className="text-5xl">{'\u{1F3BE}'}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">
            Turnieje Tenisowe
          </h1>
          <p className="text-tennis-200 text-sm">
            Wasza wspólna historia rozgrywek
          </p>
        </div>

        {/* New Game Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => navigate('/nowy/sparing')}
            className="p-4 min-h-[44px] rounded-2xl border-2 border-dashed border-white/30 hover:border-white/60 bg-white/5 hover:bg-white/10 transition-all duration-300 active:scale-[0.98] group text-left"
          >
            <div className="text-2xl mb-2" aria-hidden="true">{'\u{1F3BE}'}</div>
            <div className="text-white font-bold text-sm">Sparring</div>
            <div className="text-tennis-200 text-xs mt-0.5">2 osoby, dowolna liczba setów</div>
          </button>
          <button
            onClick={() => navigate('/nowy/turniej')}
            className="p-4 min-h-[44px] rounded-2xl border-2 border-dashed border-white/30 hover:border-white/60 bg-white/5 hover:bg-white/10 transition-all duration-300 active:scale-[0.98] group text-left"
          >
            <div className="text-2xl mb-2" aria-hidden="true">{'\u{1F3C6}'}</div>
            <div className="text-white font-bold text-sm">Turniej</div>
            <div className="text-tennis-200 text-xs mt-0.5">3+ graczy, round-robin</div>
          </button>
        </div>

        {/* Player stats */}
        {!loading && tournaments.length > 0 && (
          <PlayerStatsSection tournaments={tournaments} />
        )}

        {/* Loading -- skeleton cards */}
        {loading && (
          <div className="space-y-3" aria-label="Ładowanie turniejów" role="status">
            <span className="sr-only">Ładowanie listy turniejów...</span>
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-2xl border-2 border-white/10 bg-white/5" aria-hidden="true">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl skeleton bg-white/15" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 rounded skeleton bg-white/15" />
                    <div className="h-3 w-1/2 rounded skeleton bg-white/15" />
                  </div>
                  <div className="h-6 w-16 rounded-full skeleton bg-white/15" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && loadError && (
          <div className="mb-4 p-4 rounded-2xl bg-red-500/20 border border-red-400/30 text-center" role="alert">
            <p className="text-red-100 text-sm mb-2">{loadError}</p>
            <button
              onClick={loadTournaments}
              className="text-white text-sm font-medium px-4 py-2 min-h-[44px] bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {/* Active Tournaments */}
        {!loading && activeTournaments.length > 0 && (
          <section className="mb-6" aria-label="Aktywne turnieje">
            <h2 className="text-tennis-200 text-sm font-semibold uppercase tracking-wider mb-3 px-1">
              Aktywne ({activeTournaments.length})
            </h2>
            <div className="space-y-3">
              {activeTournaments.map((t) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  onSelect={handleSelect}
                  isLoading={loadingId === t.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed Tournaments */}
        {!loading && completedTournaments.length > 0 && (
          <section className="mb-6" aria-label="Zakończone turnieje">
            <h2 className="text-tennis-200 text-sm font-semibold uppercase tracking-wider mb-3 px-1">
              Historia ({completedTournaments.length})
            </h2>
            <div className="space-y-3">
              {completedTournaments.map((t) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  onSelect={handleSelect}
                  isLoading={loadingId === t.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && tournaments.length === 0 && (
          <div className="text-center py-12 fade-in">
            <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-white/10 flex items-center justify-center border border-white/10" aria-hidden="true">
              <span className="text-4xl">{'\u{1F3BE}'}</span>
            </div>
            <p className="text-white font-bold text-lg mb-2">Jeszcze nie macie turniejów</p>
            <p className="text-tennis-200 text-sm mb-6 max-w-xs mx-auto">
              Kliknij "Nowy Turniej" żeby stworzyć pierwszy turniej round-robin dla waszej grupy.
            </p>
            <div className="flex justify-center gap-6 text-tennis-200/80 text-xs">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                2-32 graczy
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Tabela wyników
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-tennis-200/80 text-xs mt-8">
          Dane przechowywane w chmurze &bull; Dostępne dla wszystkich
        </p>
      </div>
    </main>
  );
}
