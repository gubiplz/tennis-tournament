import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storageService } from '../../services/storageService';
import { PlayerAvatar } from '../UI/PlayerAvatar';

function normalizeName(n) { return (n || '').trim().toLowerCase(); }

/**
 * Aggregate all cross-tournament data for a single player.
 */
function aggregatePlayerData(playerName, tournaments) {
  const norm = normalizeName(playerName);
  let played = 0, won = 0, lost = 0, draws = 0;
  const opponentMap = new Map(); // normName -> { name, won, lost, draws }
  const matchHistory = []; // { tournament, date, location, opponent, myScore, opScore, sets, completedAt }

  for (const t of tournaments) {
    if (!t.players || !t.matches) continue;
    const pMap = new Map(t.players.map(p => [p.id, p.name]));

    // Find this player's ID(s) in this tournament
    const playerIds = t.players
      .filter(p => normalizeName(p.name) === norm)
      .map(p => p.id);
    if (playerIds.length === 0) continue;

    for (const m of t.matches) {
      if (!m.completed) continue;
      const isP1 = playerIds.includes(m.player1Id);
      const isP2 = playerIds.includes(m.player2Id);
      if (!isP1 && !isP2) continue;

      const myScore = isP1 ? m.score1 : m.score2;
      const opScore = isP1 ? m.score2 : m.score1;
      const opId = isP1 ? m.player2Id : m.player1Id;
      const opName = pMap.get(opId) || 'Nieznany';

      played++;

      if (myScore > opScore) won++;
      else if (opScore > myScore) lost++;
      else draws++;

      // Opponent aggregation
      const opNorm = normalizeName(opName);
      if (!opponentMap.has(opNorm)) {
        opponentMap.set(opNorm, { name: opName, won: 0, lost: 0, draws: 0 });
      }
      const op = opponentMap.get(opNorm);
      if (myScore > opScore) op.won++;
      else if (opScore > myScore) op.lost++;
      else op.draws++;

      matchHistory.push({
        tournamentId: t.id,
        tournamentName: t.name,
        tournamentDate: t.date,
        location: t.location,
        opponent: opName,
        myScore,
        opScore,
        sets: m.sets || [],
        completedAt: m.completedAt || t.createdAt,
        gameType: t.gameType
      });
    }
  }

  // Sort match history newest first
  matchHistory.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  const opponents = Array.from(opponentMap.values())
    .sort((a, b) => (b.won + b.lost + b.draws) - (a.won + a.lost + a.draws));

  const winRate = played > 0 ? Math.round((won / played) * 100) : 0;

  return { played, won, lost, draws, winRate, opponents, matchHistory };
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'Wszystko' },
  { key: 'tournament', label: 'Turnieje' },
  { key: 'sparring', label: 'Sparringi' },
];

export function GlobalPlayerProfile() {
  const { playerName } = useParams();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const decodedName = decodeURIComponent(playerName);

  useEffect(() => {
    storageService.loadAllTournaments().then(result => {
      setTournaments(result.data || []);
      setLoading(false);
    });
  }, []);

  const filteredTournaments = useMemo(() => {
    if (filterType === 'all') return tournaments;
    return tournaments.filter(t => {
      const type = t.gameType || 'tournament'; // treat null/undefined as tournament
      return type === filterType;
    });
  }, [tournaments, filterType]);

  const data = useMemo(
    () => aggregatePlayerData(decodedName, filteredTournaments),
    [decodedName, filteredTournaments]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tennis-700 via-tennis-600 to-tennis-800 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-tennis-700 via-tennis-600 to-tennis-800 safe-top safe-bottom">
      <div className="relative max-w-lg mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors min-h-[44px] mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Wszystkie turnieje
        </button>

        {/* Player Header */}
        <div className="text-center mb-6 fade-in">
          <PlayerAvatar name={decodedName} size="xl" className="mx-auto mb-3" />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{decodedName}</h1>
          {data.played === 0 && (
            <p className="text-tennis-200 text-sm mt-2">Brak rozegranych meczów</p>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-center gap-1 mb-4 bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilterType(opt.key)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                filterType === opt.key
                  ? 'bg-white text-tennis-700 shadow'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {data.played > 0 && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Mecze', value: data.played },
                { label: 'Wygrane', value: data.won, color: 'text-green-300' },
                { label: 'Przegrane', value: data.lost, color: 'text-red-300' },
                { label: 'Win%', value: `${data.winRate}%`, color: 'text-yellow-300' },
              ].map(s => (
                <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-3 text-center">
                  <div className={`text-2xl font-extrabold ${s.color || 'text-white'}`}>{s.value}</div>
                  <div className="text-tennis-200 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* H2H vs opponents */}
            {data.opponents.length > 0 && (
              <section className="mb-6">
                <h2 className="text-tennis-200 text-sm font-semibold uppercase tracking-wider mb-3 px-1">
                  Przeciwnicy
                </h2>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
                  {data.opponents.map((op, i) => (
                    <button
                      key={op.name}
                      onClick={() => navigate(`/gracz/${encodeURIComponent(op.name)}`)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                        i < data.opponents.length - 1 ? 'border-b border-white/5' : ''
                      }`}
                    >
                      <PlayerAvatar name={op.name} size="sm" />
                      <span className="flex-1 text-left text-white font-medium text-sm truncate">{op.name}</span>
                      <span className="flex items-center gap-1 text-sm">
                        <span className="text-green-300 font-bold">{op.won}</span>
                        <span className="text-white/30">-</span>
                        {op.draws > 0 && <>
                          <span className="text-yellow-300 font-bold">{op.draws}</span>
                          <span className="text-white/30">-</span>
                        </>}
                        <span className="text-red-300 font-bold">{op.lost}</span>
                      </span>
                      <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Match History */}
            <section className="mb-6">
              <h2 className="text-tennis-200 text-sm font-semibold uppercase tracking-wider mb-3 px-1">
                Historia meczów ({data.matchHistory.length})
              </h2>
              <div className="space-y-2">
                {data.matchHistory.map((m, i) => {
                  const isWin = m.myScore > m.opScore;
                  const isLoss = m.opScore > m.myScore;
                  const prefix = m.gameType === 'sparring' ? 'sparing' : 'turniej';
                  return (
                    <button
                      key={i}
                      onClick={() => navigate(`/${prefix}/${m.tournamentId}`)}
                      className="w-full text-left bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-colors active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`w-2 h-2 rounded-full ${isWin ? 'bg-green-400' : isLoss ? 'bg-red-400' : 'bg-yellow-400'}`} />
                        <span className="text-white font-bold text-sm flex-1">
                          vs {m.opponent}
                        </span>
                        <span className={`font-bold text-sm ${isWin ? 'text-green-300' : isLoss ? 'text-red-300' : 'text-yellow-300'}`}>
                          {m.myScore}:{m.opScore}
                        </span>
                      </div>
                      {m.sets.length > 0 && (
                        <p className="text-white/40 text-xs font-mono pl-5 mb-1">
                          {m.sets.map(s => `${s[0]}:${s[1]}`).join(', ')}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-white/30 pl-5">
                        <span>{m.tournamentName}</span>
                        {m.location && <>
                          <span>&bull;</span>
                          <span>{m.location}</span>
                        </>}
                        {m.completedAt && <>
                          <span>&bull;</span>
                          <span>{new Date(m.completedAt).toLocaleDateString('pl-PL')}</span>
                        </>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
