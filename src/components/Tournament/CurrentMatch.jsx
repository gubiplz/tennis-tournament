import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { calculatePlayerStats, calculateStandings, getRestingPlayers } from '../../utils/statistics';
import { ProgressBar } from '../UI/ProgressBar';
import { PlayerAvatar } from '../UI/PlayerAvatar';
import { TennisScoreInput } from '../UI/TennisScoreInput';
import { usePlayerMap } from '../../hooks/usePlayerMap';
import { MAX_SCORE, MIN_SCORE } from '../../constants/tournament';

// Confetti component for celebration
function Confetti({ show }) {
  if (!show) return null;

  // Respect prefers-reduced-motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  const colors = ['#22c55e', '#16a34a', '#fbbf24', '#f59e0b', '#3b82f6', '#ef4444'];
  const confettiCount = 30;

  return (
    <div className="confetti-container">
      {Array.from({ length: confettiCount }).map((_, i) => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = `${Math.random() * 100}%`;
        const delay = `${Math.random() * 0.5}s`;
        const duration = `${2 + Math.random() * 2}s`;
        const size = `${8 + Math.random() * 8}px`;

        return (
          <div
            key={i}
            className="confetti"
            style={{
              left,
              width: size,
              height: size,
              background: color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animationDelay: delay,
              animationDuration: duration,
            }}
          />
        );
      })}
    </div>
  );
}

// Animated score display
function AnimatedScore({ value, label }) {
  const [animating, setAnimating] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    if (value !== prevValue) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setAnimating(false);
        setPrevValue(value);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  return (
    <div className="flex flex-col items-center">
      <div className={`score-box ${animating ? 'animating' : ''}`}>
        <span className="relative z-10">{value}</span>
      </div>
      {label && (
        <span className="mt-2 text-xs font-medium text-gray-500 truncate max-w-[80px]">
          {label}
        </span>
      )}
    </div>
  );
}

export function CurrentMatch({ onPlayerClick }) {
  const { matches, players, currentMatchIndex, settings, recordScore, status, gameType, addSparringMatch, endSparring } = useTournamentStore();
  const isSparring = gameType === 'sparring';

  const currentMatch = matches[currentMatchIndex];
  const completedCount = useMemo(() => matches.filter((m) => m.completed).length, [matches]);
  const playerMap = usePlayerMap(players);

  const [showConfetti, setShowConfetti] = useState(false);
  const [saveAnimation, setSaveAnimation] = useState(false);
  const [undoData, setUndoData] = useState(null);

  const player1 = playerMap.get(currentMatch?.player1Id);
  const player2 = playerMap.get(currentMatch?.player2Id);

  const stats1 = useMemo(
    () => calculatePlayerStats(player1?.id, players, matches, settings),
    [player1?.id, players, matches, settings]
  );
  const stats2 = useMemo(
    () => calculatePlayerStats(player2?.id, players, matches, settings),
    [player2?.id, players, matches, settings]
  );

  const restingPlayers = useMemo(
    () => getRestingPlayers(players, matches, currentMatchIndex),
    [players, matches, currentMatchIndex]
  );

  const nextMatches = useMemo(
    () => matches.slice(currentMatchIndex + 1).filter((m) => !m.completed).slice(0, 2),
    [matches, currentMatchIndex]
  );

  const standings = useMemo(
    () => calculateStandings(players, matches, settings),
    [players, matches, settings]
  );

  // Auto-hide undo toast after 5 seconds
  useEffect(() => {
    if (!undoData) return;
    const timer = setTimeout(() => setUndoData(null), 5000);
    return () => clearTimeout(timer);
  }, [undoData]);

  const handleSaveScore = useCallback((score1, score2, sets) => {
    if (!currentMatch) return;
    const prevScore1 = currentMatch.score1 ?? 0;
    const prevScore2 = currentMatch.score2 ?? 0;
    const prevSets = currentMatch.sets || [];

    setSaveAnimation(true);
    setShowConfetti(true);

    setTimeout(() => {
      recordScore(currentMatch.id, score1, score2, sets);
      setSaveAnimation(false);
      setUndoData({ matchId: currentMatch.id, score1: prevScore1, score2: prevScore2, sets: prevSets });
    }, 300);

    setTimeout(() => {
      setShowConfetti(false);
    }, 3000);
  }, [currentMatch, recordScore]);

  const handleUndo = useCallback(() => {
    if (!undoData) return;
    recordScore(undoData.matchId, undoData.score1, undoData.score2, undoData.sets);
    setUndoData(null);
  }, [undoData, recordScore]);

  if (status === 'completed') {
    // Sparring completed
    if (isSparring && player1 && player2 && stats1 && stats2) {
      const winner = stats1.won > stats2.won ? player1 : stats2.won > stats1.won ? player2 : null;
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center fade-in">
          <div className="text-5xl mb-4">{'\u{1F3BE}'}</div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
            Sparring zakończony!
          </h2>
          <div className="flex items-center gap-6 mb-4">
            <div className="text-center">
              <PlayerAvatar name={player1.name} size="lg" className={winner === player1 ? 'ring-4 ring-tennis-400' : ''} />
              <p className="font-bold mt-2 text-gray-900 dark:text-gray-100">{player1.name}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{stats1.won}:{stats2.won}</p>
              <p className="text-xs text-gray-400">meczów</p>
            </div>
            <div className="text-center">
              <PlayerAvatar name={player2.name} size="lg" className={winner === player2 ? 'ring-4 ring-tennis-400' : ''} />
              <p className="font-bold mt-2 text-gray-900 dark:text-gray-100">{player2.name}</p>
            </div>
          </div>
          {winner && <p className="text-tennis-600 font-bold text-lg mb-4">Wygrywa {winner.name}!</p>}
          {!winner && <p className="text-yellow-600 font-bold text-lg mb-4">Remis!</p>}
        </div>
      );
    }

    // Tournament completed — podium
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center fade-in" aria-live="assertive">
        <div className="trophy-animation text-6xl mb-4">
          <span role="img" aria-label="Trophy">&#127942;</span>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">
          Turniej zakończony!
        </h2>
        {standings.length > 0 && (
          <div className="space-y-3 w-full max-w-xs">
            {standings.slice(0, 3).map((p, i) => (
              <div
                key={p.playerId}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${
                  i === 0 ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700' :
                  i === 1 ? 'bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-600' :
                  'bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700'
                }`}
              >
                <span className="text-2xl">{i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : '\u{1F949}'}</span>
                <PlayerAvatar name={p.name} size="sm" />
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-900 dark:text-gray-100">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.won}W {p.draws > 0 ? `${p.draws}D ` : ''}{p.lost}L</p>
                </div>
                <span className="font-extrabold text-lg text-tennis-600">{p.points}pkt</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-gray-400 text-sm mt-4">Sprawdź pełną tabelę w zakładce "Tabela"</p>
      </div>
    );
  }

  // Sparring: current match is completed but sparring continues
  const sparringMatchDone = isSparring && currentMatch?.completed && status !== 'completed';

  if (sparringMatchDone) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center fade-in">
        <div className="text-5xl mb-4">{'\u{2705}'}</div>
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
          Wynik zapisany!
        </h2>
        <p className="text-gray-500 mb-6">
          {player1?.name} {currentMatch.score1}:{currentMatch.score2} {player2?.name}
        </p>
        <div className="flex items-center gap-6 mb-8">
          <div className="text-center">
            <PlayerAvatar name={player1?.name} size="md" />
            <p className="font-bold mt-1 text-sm">{stats1?.won}W {stats1?.draws > 0 ? `${stats1.draws}D ` : ''}{stats1?.lost}L</p>
          </div>
          <div className="text-center">
            <PlayerAvatar name={player2?.name} size="md" />
            <p className="font-bold mt-1 text-sm">{stats2?.won}W {stats2?.draws > 0 ? `${stats2.draws}D ` : ''}{stats2?.lost}L</p>
          </div>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={addSparringMatch} className="btn-success flex-1">
            Następny mecz
          </button>
          <button onClick={endSparring} className="btn-secondary flex-1">
            Zakończ
          </button>
        </div>
      </div>
    );
  }

  if (!currentMatch) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-2xl">&#127934;</span>
          </div>
          <p className="text-gray-500 font-medium">Brak meczu do wyświetlenia</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <Confetti show={showConfetti} />

      {/* Progress Section */}
      <div className="px-5 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <ProgressBar current={completedCount} total={matches.length} />
      </div>

      {/* Match Card */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <div className={`card-premium mb-4 slide-up ${saveAnimation ? 'celebration-glow' : ''}`}>
          {/* Match Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-tennis-100 to-tennis-50 rounded-full border border-tennis-200 shadow-sm">
              <span className="text-tennis-600">&#127934;</span>
              <span className="font-bold text-tennis-800">Mecz #{currentMatch.id}</span>
            </div>

          </div>

          {/* Players */}
          <div className="flex items-stretch justify-between gap-4 mb-8">
            {/* Player 1 */}
            <button
              onClick={() => onPlayerClick?.(player1?.id)}
              className="flex-1 group p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-tennis-200 hover:shadow-lg transition-all duration-300 active:scale-[0.98]"
            >
              <PlayerAvatar name={player1?.name} size="md" className="mx-auto mb-3 group-hover:scale-110 group-hover:rotate-6" />
              <div className="font-bold text-lg text-gray-900 mb-1 truncate">
                {player1?.name}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-sm">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                  {stats1?.won}W
                </span>
                {stats1?.draws > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                    {stats1?.draws}D
                  </span>
                )}
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                  {stats1?.lost}L
                </span>
              </div>
            </button>

            {/* VS Badge */}
            <div className="flex items-center">
              <div className="vs-badge">VS</div>
            </div>

            {/* Player 2 */}
            <button
              onClick={() => onPlayerClick?.(player2?.id)}
              className="flex-1 group p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-tennis-200 hover:shadow-lg transition-all duration-300 active:scale-[0.98]"
            >
              <PlayerAvatar name={player2?.name} size="md" className="mx-auto mb-3 group-hover:scale-110 group-hover:-rotate-6" />
              <div className="font-bold text-lg text-gray-900 mb-1 truncate">
                {player2?.name}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-sm">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                  {stats2?.won}W
                </span>
                {stats2?.draws > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                    {stats2?.draws}D
                  </span>
                )}
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                  {stats2?.lost}L
                </span>
              </div>
            </button>
          </div>

          {/* Tennis Score Input */}
          <div aria-live="polite" aria-atomic="true">
            <TennisScoreInput
              matchId={currentMatch.id}
              initialSets={currentMatch.sets}
              onSave={handleSaveScore}
            />
          </div>
        </div>

        {/* Resting Players */}
        {restingPlayers.length > 0 && (
          <div className="card mb-4 slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 text-gray-600 mb-3">
              <span className="text-xl">&#129681;</span>
              <span className="font-semibold">Odpoczywają</span>
              <span className="text-sm text-gray-400">({restingPlayers.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {restingPlayers.map((player, index) => (
                <button
                  key={player.id}
                  onClick={() => onPlayerClick?.(player.id)}
                  className="group px-4 py-2 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-tennis-50 hover:to-tennis-100 rounded-full text-sm font-medium text-gray-700 hover:text-tennis-700 transition-all duration-200 active:scale-95 border border-gray-200 hover:border-tennis-200"
                  style={{ animationDelay: `${0.05 * index}s` }}
                >
                  {player.name}
                  {player.waitCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-gray-200 group-hover:bg-tennis-200 rounded-full text-xs text-gray-500 group-hover:text-tennis-600">
                      {player.waitCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Next Matches */}
        {nextMatches.length > 0 && (
          <div className="card slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 text-gray-600 mb-3">
              <span className="text-xl">&#128203;</span>
              <span className="font-semibold">Następne mecze</span>
            </div>
            <div className="space-y-2">
              {nextMatches.map((match, index) => {
                const p1 = playerMap.get(match.player1Id);
                const p2 = playerMap.get(match.player2Id);
                return (
                  <div
                    key={match.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100
                      transition-all duration-200
                      ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-transparent border-yellow-200' : ''}
                    `}
                  >
                    <span className={`
                      w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold
                      ${index === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-200 text-gray-600'
                      }
                    `}>
                      #{match.id}
                    </span>
                    <div className="flex-1 text-sm">
                      <span className="font-medium text-gray-900">{p1?.name}</span>
                      <span className="text-gray-400 mx-2">vs</span>
                      <span className="font-medium text-gray-900">{p2?.name}</span>
                    </div>
                    {index === 0 && (
                      <span className="status-badge current">Następny</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Undo Toast */}
      {undoData && (
        <div className="fixed bottom-24 xl:bottom-8 left-1/2 -translate-x-1/2 z-50 slide-up">
          <div className="flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-2xl shadow-2xl">
            <span className="text-sm">Wynik zapisany</span>
            <button
              onClick={handleUndo}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors"
            >
              Cofnij
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
