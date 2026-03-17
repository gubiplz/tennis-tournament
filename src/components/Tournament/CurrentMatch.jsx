import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { calculatePlayerStats, calculateStandings, getRestingPlayers } from '../../utils/statistics';
import { ProgressBar } from '../UI/ProgressBar';
import { PlayerAvatar } from '../UI/PlayerAvatar';
import { TennisScoreInput } from '../UI/TennisScoreInput';
import { BatchScoreInput } from '../UI/BatchScoreInput';
import { usePlayerMap } from '../../hooks/usePlayerMap';
import { MAX_SCORE, MIN_SCORE } from '../../constants/tournament';
import { hapticSuccess, hapticCelebration } from '../../utils/haptics';
import { storageService } from '../../services/storageService';

// Guard import of calculateCrossSessionH2H — may not exist yet
let calculateCrossSessionH2H = null;
try {
  const statsModule = await import('../../utils/statistics.js');
  if (statsModule.calculateCrossSessionH2H) {
    calculateCrossSessionH2H = statsModule.calculateCrossSessionH2H;
  }
} catch {
  // statistics.js function not available
}

// Pre-generate confetti pieces to avoid Math.random() during render
const CONFETTI_COLORS = ['#22c55e', '#16a34a', '#fbbf24', '#f59e0b', '#3b82f6', '#ef4444'];
const CONFETTI_PIECES = Array.from({ length: 30 }, (_, i) => ({
  key: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${(i * 37 + 13) % 100}%`,
  delay: `${(i * 0.017) % 0.5}s`,
  duration: `${2 + (i * 0.07) % 2}s`,
  size: `${8 + (i * 0.27) % 8}px`,
  borderRadius: i % 2 === 0 ? '50%' : '2px',
}));

// Confetti component for celebration
function Confetti({ show }) {
  if (!show) return null;

  // Respect prefers-reduced-motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  return (
    <div className="confetti-container" aria-hidden="true">
      {CONFETTI_PIECES.map((piece) => (
        <div
          key={piece.key}
          className="confetti"
          style={{
            left: piece.left,
            width: piece.size,
            height: piece.size,
            background: piece.color,
            borderRadius: piece.borderRadius,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
          }}
        />
      ))}
    </div>
  );
}

// Animated score display
function AnimatedScore({ value, label }) {
  const prevRef = useRef(value);
  const elRef = useRef(null);

  useEffect(() => {
    if (prevRef.current !== value && elRef.current) {
      elRef.current.classList.add('animating');
      const timer = setTimeout(() => {
        elRef.current?.classList.remove('animating');
      }, 400);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center">
      <div ref={elRef} className="score-box">
        <span className="relative z-10">{value}</span>
      </div>
      {label && (
        <span className="mt-2 text-xs font-medium text-gray-600 truncate max-w-[80px]">
          {label}
        </span>
      )}
    </div>
  );
}

// ----------- H2H Section (compact or full) -----------

function H2HSection({ player1Name, player2Name, compact }) {
  const [h2hData, setH2hData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!calculateCrossSessionH2H || !player1Name || !player2Name) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadH2H() {
      try {
        const result = await storageService.loadAllTournaments();
        if (cancelled) return;
        if (result?.data) {
          const data = calculateCrossSessionH2H(player1Name, player2Name, result.data);
          setH2hData(data);
        }
      } catch (err) {
        console.error('Failed to load H2H data:', err);
      }
      if (!cancelled) setLoading(false);
    }

    loadH2H();
    return () => { cancelled = true; };
  }, [player1Name, player2Name]);

  if (loading || !h2hData || h2hData.totalMatches === 0) return null;

  if (compact) {
    return (
      <div className="w-full max-w-xs mt-4 p-3 bg-tennis-50 rounded-xl border border-tennis-200">
        <p className="text-sm text-gray-700 text-center">
          <span className="font-semibold">Wszechczasy:</span>{' '}
          <span className="font-bold text-tennis-700">{player1Name}</span>{' '}
          <span className="font-extrabold">{h2hData.p1Wins}</span>
          <span className="text-gray-400"> - </span>
          <span className="font-extrabold">{h2hData.p2Wins}</span>{' '}
          <span className="font-bold text-tennis-700">{player2Name}</span>
        </p>
        {h2hData.currentStreak?.count > 1 && h2hData.currentStreak?.name && (
          <p className="text-xs text-tennis-600 text-center mt-1 font-medium">
            Seria: {h2hData.currentStreak.name} {h2hData.currentStreak.count} z rzędu!
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs mt-6">
      <h3 className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-semibold">Bilans wszechczasów</h3>
      <div className="p-4 bg-gradient-to-r from-tennis-50 to-tennis-100 rounded-2xl border border-tennis-200">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="text-center">
            <p className="font-bold text-sm text-gray-900">{player1Name}</p>
            <p className="text-2xl font-extrabold text-tennis-700">{h2hData.p1Wins}</p>
          </div>
          <span className="text-gray-400 text-lg font-bold">-</span>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-tennis-700">{h2hData.p2Wins}</p>
            <p className="font-bold text-sm text-gray-900">{player2Name}</p>
          </div>
        </div>
        {h2hData.draws > 0 && (
          <p className="text-xs text-gray-600 text-center">
            {h2hData.draws} {h2hData.draws === 1 ? 'remis' : 'remisów'}
          </p>
        )}
        {h2hData.currentStreak?.count > 1 && h2hData.currentStreak?.name && (
          <div className="mt-2 pt-2 border-t border-tennis-200">
            <p className="text-sm text-tennis-700 text-center font-semibold">
              Aktualna seria: {h2hData.currentStreak.name} {h2hData.currentStreak.count} z rzędu!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------- TournamentAllDone (choice screen for tournament mode) -----------

function TournamentAllDone({ standings, onEndTournament, onAddRound }) {
  return (
    <section className="flex-1 flex flex-col items-center justify-center p-8 text-center fade-in" aria-live="polite">
      <div className="text-5xl mb-4" aria-hidden="true">{'\u{1F3C6}'}</div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
        Wszystkie mecze rozegrane!
      </h2>
      <p className="text-gray-600 mb-6 text-sm">
        Co chcesz zrobić?
      </p>

      {/* Quick standings preview */}
      {standings.length > 0 && (
        <div className="w-full max-w-xs mb-6">
          <div className="space-y-2">
            {standings.slice(0, 3).map((p, i) => (
              <div
                key={p.playerId}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  i === 0 ? 'bg-yellow-50 border-yellow-200' :
                  i === 1 ? 'bg-gray-50 border-gray-200' :
                  'bg-orange-50 border-orange-200'
                }`}
              >
                <span className="text-lg" aria-hidden="true">
                  {i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : '\u{1F949}'}
                </span>
                <span className="flex-1 text-left font-bold text-sm text-gray-900">{p.name}</span>
                <span className="font-extrabold text-tennis-700 text-sm">{p.points}pkt</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onEndTournament}
          className="btn-success w-full py-4 text-lg"
        >
          <span className="flex items-center justify-center gap-2">
            <span aria-hidden="true">{'\u{1F3C6}'}</span>
            Zakończ turniej
          </span>
        </button>
        <button
          onClick={onAddRound}
          className="btn-secondary w-full py-4"
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Dodaj kolejną rundę
          </span>
        </button>
      </div>
    </section>
  );
}

// ----------- Main component -----------

export function CurrentMatch({ onPlayerClick }) {
  const {
    matches, players, currentMatchIndex, settings,
    recordScore, recordBatchScores, status, gameType,
    addSparringMatch, endTournament, addRound
  } = useTournamentStore();
  const isSparring = gameType === 'sparring';
  const isTournament = gameType === 'tournament';

  const currentMatch = matches[currentMatchIndex];
  const completedCount = useMemo(() => matches.filter((m) => m.completed).length, [matches]);
  const allMatchesCompleted = useMemo(() => matches.length > 0 && matches.every(m => m.completed), [matches]);
  const playerMap = usePlayerMap(players);

  const [showConfetti, setShowConfetti] = useState(false);
  const [saveAnimation, setSaveAnimation] = useState(false);
  const [undoData, setUndoData] = useState(null);
  const [showBatchInput, setShowBatchInput] = useState(false);
  // Track which player won the last saved match for avatar pulse
  const [winnerPulseId, setWinnerPulseId] = useState(null);

  const player1 = playerMap.get(currentMatch?.player1Id);
  const player2 = playerMap.get(currentMatch?.player2Id);

  // For sparring, always use the first two players for names in H2H
  const sparringP1 = isSparring && players.length >= 2 ? players[0] : null;
  const sparringP2 = isSparring && players.length >= 2 ? players[1] : null;

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

  // Fire celebration haptic once when tournament completes
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== 'completed' && status === 'completed') {
      hapticCelebration();
    }
    prevStatusRef.current = status;
  }, [status]);

  // Auto-hide undo toast after 5 seconds
  useEffect(() => {
    if (!undoData) return;
    const timer = setTimeout(() => setUndoData(null), 5000);
    return () => clearTimeout(timer);
  }, [undoData]);

  // Clear winner pulse after animation
  useEffect(() => {
    if (!winnerPulseId) return;
    const timer = setTimeout(() => setWinnerPulseId(null), 700);
    return () => clearTimeout(timer);
  }, [winnerPulseId]);

  const handleSaveScore = useCallback((score1, score2, sets) => {
    if (!currentMatch) return;
    const prevScore1 = currentMatch.score1 ?? 0;
    const prevScore2 = currentMatch.score2 ?? 0;
    const prevSets = currentMatch.sets || [];

    setSaveAnimation(true);
    setShowConfetti(true);

    // Determine winner for avatar pulse
    if (score1 > score2 && player1) {
      setWinnerPulseId(player1.id);
    } else if (score2 > score1 && player2) {
      setWinnerPulseId(player2.id);
    }

    // Double haptic buzz for match completion
    hapticSuccess();

    setTimeout(() => {
      recordScore(currentMatch.id, score1, score2, sets);
      setSaveAnimation(false);
      setUndoData({ matchId: currentMatch.id, score1: prevScore1, score2: prevScore2, sets: prevSets });
    }, 300);

    setTimeout(() => {
      setShowConfetti(false);
    }, 3000);
  }, [currentMatch, recordScore, player1, player2]);

  const handleUndo = useCallback(() => {
    if (!undoData) return;
    recordScore(undoData.matchId, undoData.score1, undoData.score2, undoData.sets);
    setUndoData(null);
  }, [undoData, recordScore]);

  const handleBatchSave = useCallback((scores) => {
    if (scores && scores.length > 0) {
      recordBatchScores(scores);
    }
    setShowBatchInput(false);
  }, [recordBatchScores]);

  // ----------- Tournament mode: all matches done but not yet "completed" -----------
  if (isTournament && allMatchesCompleted && status === 'active') {
    return (
      <TournamentAllDone
        standings={standings}
        onEndTournament={endTournament}
        onAddRound={addRound}
      />
    );
  }

  if (status === 'completed') {
    // Sparring completed
    if (isSparring && sparringP1 && sparringP2 && stats1 && stats2) {
      const winner = stats1.won > stats2.won ? sparringP1 : stats2.won > stats1.won ? sparringP2 : null;
      return (
        <section className="flex-1 flex flex-col items-center justify-center p-8 text-center fade-in overflow-y-auto" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">{'\u{1F3BE}'}</div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
            Sparring zakończony!
          </h2>
          <div className="flex items-center gap-6 mb-4">
            <div className="text-center">
              <PlayerAvatar name={sparringP1.name} size="lg" className={winner === sparringP1 ? 'ring-4 ring-tennis-400' : ''} />
              <p className="font-bold mt-2 text-gray-900">{sparringP1.name}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-gray-900">{stats1.won}:{stats2.won}</p>
              <p className="text-xs text-gray-600">meczów</p>
            </div>
            <div className="text-center">
              <PlayerAvatar name={sparringP2.name} size="lg" className={winner === sparringP2 ? 'ring-4 ring-tennis-400' : ''} />
              <p className="font-bold mt-2 text-gray-900">{sparringP2.name}</p>
            </div>
          </div>
          {winner && <p className="text-tennis-600 font-bold text-lg mb-4">Wygrywa {winner.name}!</p>}
          {!winner && <p className="text-yellow-600 font-bold text-lg mb-4">Remis!</p>}

          {/* Lista meczów z detalami setów */}
          {matches.filter(m => m.completed).length > 0 && (
            <div className="w-full max-w-xs mt-2">
              <h3 className="text-xs text-gray-600 uppercase tracking-wider mb-2 font-semibold">Wyniki meczów</h3>
              <div className="space-y-2">
                {matches.filter(m => m.completed).map((match, idx) => {
                  return (
                    <div key={match.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl text-sm">
                      <span className="text-gray-400 text-xs w-5 shrink-0">#{idx + 1}</span>
                      <span className={`flex-1 text-right ${match.score1 > match.score2 ? 'font-bold text-tennis-700' : 'text-gray-600'}`}>
                        {sparringP1?.name}
                      </span>
                      <span className="font-mono font-bold text-gray-900 px-1">
                        {match.sets?.length > 0
                          ? match.sets.map(s => `${s[0]}:${s[1]}`).join(', ')
                          : `${match.score1}:${match.score2}`
                        }
                      </span>
                      <span className={`flex-1 text-left ${match.score2 > match.score1 ? 'font-bold text-tennis-700' : 'text-gray-600'}`}>
                        {sparringP2?.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* H2H cross-session section */}
          <H2HSection player1Name={sparringP1?.name} player2Name={sparringP2?.name} compact={false} />
        </section>
      );
    }

    // Tournament completed -- podium with enhanced celebration
    return (
      <section className="flex-1 flex flex-col items-center justify-center p-8 text-center fade-in" aria-live="assertive">
        <Confetti show={true} />
        <div className="trophy-entrance text-6xl mb-4" aria-hidden="true">
          <span>&#127942;</span>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-6 tracking-tight">
          Turniej zakończony!
        </h2>
        {standings.length > 0 && (
          <ol className="space-y-3 w-full max-w-xs" aria-label="Podium">
            {standings.slice(0, 3).map((p, i) => (
              <li
                key={p.playerId}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 slide-up ${
                  i === 0 ? 'bg-yellow-50 border-yellow-300' :
                  i === 1 ? 'bg-gray-50 border-gray-300' :
                  'bg-orange-50 border-orange-300'
                }`}
                style={{ animationDelay: `${0.15 + i * 0.1}s` }}
              >
                <span className="text-2xl" aria-hidden="true">{i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : '\u{1F949}'}</span>
                <PlayerAvatar name={p.name} size="sm" />
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-600">{p.won}W {p.draws > 0 ? `${p.draws}D ` : ''}{p.lost}L</p>
                </div>
                <span className="font-extrabold text-lg text-tennis-700">{p.points}pkt</span>
              </li>
            ))}
          </ol>
        )}
        <p className="text-gray-600 text-sm mt-4">Sprawdź pełną tabelę w zakładce "Tabela"</p>
      </section>
    );
  }

  // Sparring: current match is completed but sparring continues
  const sparringMatchDone = isSparring && currentMatch?.completed && status !== 'completed';

  if (sparringMatchDone) {
    return (
      <section className="flex-1 flex flex-col items-center justify-center p-8 text-center fade-in overflow-y-auto" aria-live="polite">
        <div className="text-5xl mb-4" aria-hidden="true">{'\u{2705}'}</div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
          Wynik zapisany!
        </h2>
        <p className="text-gray-600 mb-2">
          {player1?.name} {currentMatch.score1}:{currentMatch.score2} {player2?.name}
        </p>
        {currentMatch.sets?.length > 0 && (
          <p className="text-sm font-mono text-gray-500 mb-4">
            ({currentMatch.sets.map(s => `${s[0]}:${s[1]}`).join(', ')})
          </p>
        )}
        <div className="flex items-center gap-6 mb-4">
          <div className="text-center">
            <PlayerAvatar name={player1?.name} size="md" />
            <p className="font-bold mt-1 text-sm">{stats1?.won}W {stats1?.draws > 0 ? `${stats1.draws}D ` : ''}{stats1?.lost}L</p>
          </div>
          <div className="text-center">
            <PlayerAvatar name={player2?.name} size="md" />
            <p className="font-bold mt-1 text-sm">{stats2?.won}W {stats2?.draws > 0 ? `${stats2.draws}D ` : ''}{stats2?.lost}L</p>
          </div>
        </div>

        {/* Compact H2H */}
        <H2HSection player1Name={sparringP1?.name} player2Name={sparringP2?.name} compact={true} />

        <div className="flex gap-3 w-full max-w-xs mt-6">
          <button onClick={addSparringMatch} className="btn-success flex-1">
            Następny mecz
          </button>
          <button onClick={endTournament} className="btn-secondary flex-1">
            Zakończ
          </button>
        </div>
      </section>
    );
  }

  if (!currentMatch) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center" aria-hidden="true">
            <span className="text-2xl">&#127934;</span>
          </div>
          <p className="text-gray-600 font-medium">Brak meczu do wyświetlenia</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Confetti show={showConfetti} />

      {/* Batch Score Input Modal */}
      {showBatchInput && (
        <BatchScoreInput
          player1Name={player1?.name}
          player2Name={player2?.name}
          onSave={handleBatchSave}
          onCancel={() => setShowBatchInput(false)}
        />
      )}

      {/* Progress Section */}
      <div className="px-5 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <ProgressBar current={completedCount} total={matches.length} />
      </div>

      {/* Match Card */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <section
          className={`card-premium mb-4 slide-up ${saveAnimation ? 'celebration-glow' : ''}`}
          aria-label={`Mecz ${currentMatch.id}: ${player1?.name} vs ${player2?.name}`}
        >
          {/* Match Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-tennis-100 to-tennis-50 rounded-full border border-tennis-200 shadow-sm">
              <span className="text-tennis-600" aria-hidden="true">&#127934;</span>
              <span className="font-bold text-tennis-800">Mecz #{currentMatch.id}</span>
            </div>
          </div>

          {/* Players */}
          <div className="flex items-stretch justify-between gap-4 mb-8">
            {/* Player 1 */}
            <button
              onClick={() => onPlayerClick?.(player1?.id)}
              className="flex-1 group p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-tennis-200 hover:shadow-lg transition-all duration-300 active:scale-[0.98] min-h-[44px]"
              aria-label={`${player1?.name}: ${stats1?.won} wygranych, ${stats1?.lost} przegranych. Kliknij aby zobaczyć profil.`}
            >
              <PlayerAvatar
                name={player1?.name}
                size="md"
                className={`mx-auto mb-3 group-hover:scale-110 group-hover:rotate-6 ${winnerPulseId === player1?.id ? 'player-avatar-winner' : ''}`}
              />
              <div className="font-bold text-lg text-gray-900 mb-1 truncate">
                {player1?.name}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-sm">
                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-medium">
                  {stats1?.won}W
                </span>
                {stats1?.draws > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                    {stats1?.draws}D
                  </span>
                )}
                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full font-medium">
                  {stats1?.lost}L
                </span>
              </div>
            </button>

            {/* VS Badge */}
            <div className="flex items-center" aria-hidden="true">
              <div className="vs-badge">VS</div>
            </div>

            {/* Player 2 */}
            <button
              onClick={() => onPlayerClick?.(player2?.id)}
              className="flex-1 group p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-tennis-200 hover:shadow-lg transition-all duration-300 active:scale-[0.98] min-h-[44px]"
              aria-label={`${player2?.name}: ${stats2?.won} wygranych, ${stats2?.lost} przegranych. Kliknij aby zobaczyć profil.`}
            >
              <PlayerAvatar
                name={player2?.name}
                size="md"
                className={`mx-auto mb-3 group-hover:scale-110 group-hover:-rotate-6 ${winnerPulseId === player2?.id ? 'player-avatar-winner' : ''}`}
              />
              <div className="font-bold text-lg text-gray-900 mb-1 truncate">
                {player2?.name}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-sm">
                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-medium">
                  {stats2?.won}W
                </span>
                {stats2?.draws > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                    {stats2?.draws}D
                  </span>
                )}
                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full font-medium">
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
              player1Name={player1?.name}
              player2Name={player2?.name}
            />
          </div>

          {/* Batch input button (sparring only) */}
          {isSparring && (
            <button
              onClick={() => setShowBatchInput(true)}
              className="w-full mt-3 py-3 min-h-[44px] text-sm font-medium text-tennis-700 hover:text-tennis-800 bg-tennis-50 hover:bg-tennis-100 rounded-xl border border-tennis-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Wpisz wiele wyników
            </button>
          )}
        </section>

        {/* Resting Players */}
        {restingPlayers.length > 0 && (
          <section className="card mb-4 slide-up" style={{ animationDelay: '0.1s' }} aria-label="Odpoczywający gracze">
            <div className="flex items-center gap-2 text-gray-700 mb-3">
              <span className="text-xl" aria-hidden="true">&#129681;</span>
              <h3 className="font-semibold">Odpoczywają</h3>
              <span className="text-sm text-gray-600">({restingPlayers.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {restingPlayers.map((player, index) => (
                <button
                  key={player.id}
                  onClick={() => onPlayerClick?.(player.id)}
                  className="group px-4 py-2 min-h-[44px] bg-gradient-to-br from-gray-50 to-gray-100 hover:from-tennis-50 hover:to-tennis-100 rounded-full text-sm font-medium text-gray-700 hover:text-tennis-700 transition-all duration-200 active:scale-95 border border-gray-200 hover:border-tennis-200"
                  style={{ animationDelay: `${0.05 * index}s` }}
                  aria-label={`${player.name}${player.waitCount > 0 ? `, czeka ${player.waitCount} meczów` : ''}. Kliknij aby zobaczyć profil.`}
                >
                  {player.name}
                  {player.waitCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-gray-200 group-hover:bg-tennis-200 rounded-full text-xs text-gray-600 group-hover:text-tennis-700" aria-hidden="true">
                      {player.waitCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Next Matches */}
        {nextMatches.length > 0 && (
          <section className="card slide-up" style={{ animationDelay: '0.2s' }} aria-label="Następne mecze">
            <div className="flex items-center gap-2 text-gray-700 mb-3">
              <span className="text-xl" aria-hidden="true">&#128203;</span>
              <h3 className="font-semibold">Następne mecze</h3>
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
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-200 text-gray-700'
                      }
                    `} aria-hidden="true">
                      #{match.id}
                    </span>
                    <div className="flex-1 text-sm">
                      <span className="font-medium text-gray-900">{p1?.name}</span>
                      <span className="text-gray-500 mx-2">vs</span>
                      <span className="font-medium text-gray-900">{p2?.name}</span>
                    </div>
                    {index === 0 && (
                      <span className="status-badge current">Następny</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Undo Toast */}
      {undoData && (
        <div className="fixed bottom-24 xl:bottom-8 left-1/2 -translate-x-1/2 z-50 slide-up" role="status" aria-live="polite">
          <div className="flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-2xl shadow-2xl">
            <span className="text-sm">Wynik zapisany</span>
            <button
              onClick={handleUndo}
              className="px-4 py-2 min-h-[44px] bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors"
            >
              Cofnij
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
