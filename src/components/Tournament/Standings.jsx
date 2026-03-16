import { useState, useEffect, useMemo, useRef } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { calculateStandings } from '../../utils/statistics';
import { PlayerAvatar } from '../UI/PlayerAvatar';
import { pluralize } from '../../utils/helpers';

// Animated counter component
function AnimatedNumber({ value, className = '' }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 500;
    const steps = 20;
    const stepValue = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span className={className}>{displayValue}</span>;
}

// Score value with pop animation on change
function ScoreValue({ value, className = '' }) {
  const [changed, setChanged] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      setChanged(true);
      const timer = setTimeout(() => setChanged(false), 350);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span className={`score-value-transition ${changed ? 'score-changed' : ''} ${className}`}>
      {value}
    </span>
  );
}

// Rank badge component
function RankBadge({ rank, isCompleted, size = 'normal' }) {
  const sizeClasses = size === 'large'
    ? 'w-12 h-12 text-2xl'
    : 'w-8 h-8 text-lg';

  if (!isCompleted) {
    return (
      <span className={`${sizeClasses} flex items-center justify-center rounded-full bg-gray-100 text-gray-700 font-bold`} aria-label={`Pozycja ${rank}`}>
        {rank}
      </span>
    );
  }

  if (rank === 1) {
    return (
      <div className={`rank-badge gold shine ${sizeClasses} flex items-center justify-center`} aria-label="1. miejsce">
        <span aria-hidden="true">&#129351;</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className={`rank-badge silver ${sizeClasses} flex items-center justify-center`} aria-label="2. miejsce">
        <span aria-hidden="true">&#129352;</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className={`rank-badge bronze ${sizeClasses} flex items-center justify-center`} aria-label="3. miejsce">
        <span aria-hidden="true">&#129353;</span>
      </div>
    );
  }

  return (
    <span className={`${sizeClasses} flex items-center justify-center rounded-full bg-gray-100 text-gray-700 font-bold`} aria-label={`Pozycja ${rank}`}>
      {rank}
    </span>
  );
}

// Mobile card component for each player
function PlayerCard({ player, rank, isCompleted, onClick, animationDelay }) {
  const getCardStyle = () => {
    if (!isCompleted) return 'bg-white border-gray-200';
    if (rank === 1) return 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300 shadow-lg shadow-yellow-100';
    if (rank === 2) return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300';
    if (rank === 3) return 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300';
    return 'bg-white border-gray-200';
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 rounded-2xl border-2 text-left min-h-[44px]
        transition-all duration-300 hover:shadow-lg active:scale-[0.98]
        slide-in-right ${getCardStyle()}
      `}
      style={{ animationDelay: `${animationDelay}s` }}
      aria-label={`${rank}. ${player.name}: ${player.points} punktów, ${player.won} wygranych, ${player.lost} przegranych. Kliknij aby zobaczyć profil.`}
    >
      {/* Top row: Rank, Name, Points */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <RankBadge rank={rank} isCompleted={isCompleted} size="large" />
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{player.name}</h3>
            <span className="text-sm text-gray-600">{player.played} {pluralize(player.played, 'mecz', 'mecze', 'meczów')}</span>
          </div>
        </div>
        <div className={`
          px-4 py-2 rounded-xl font-extrabold text-xl
          ${rank === 1 && isCompleted
            ? 'bg-gradient-to-r from-tennis-500 to-tennis-400 text-white shadow-lg'
            : 'bg-tennis-100 text-tennis-700'
          }
        `}>
          <ScoreValue value={player.points} /> <span className="text-sm font-medium">pkt</span>
        </div>
      </div>

      {/* Stats row - with draws */}
      <div className="grid grid-cols-4 gap-2" aria-hidden="true">
        <div className="flex flex-col items-center justify-center py-2 bg-green-50 rounded-xl">
          <ScoreValue value={player.won} className="font-bold text-green-800 text-lg" />
          <span className="text-green-700 font-medium text-xs">Wygr.</span>
        </div>
        <div className="flex flex-col items-center justify-center py-2 bg-yellow-50 rounded-xl">
          <ScoreValue value={player.draws || 0} className="font-bold text-yellow-800 text-lg" />
          <span className="text-yellow-700 font-medium text-xs">Remis</span>
        </div>
        <div className="flex flex-col items-center justify-center py-2 bg-red-50 rounded-xl">
          <ScoreValue value={player.lost} className="font-bold text-red-800 text-lg" />
          <span className="text-red-700 font-medium text-xs">Przegr.</span>
        </div>
        <div className="flex flex-col items-center justify-center py-2 bg-gray-50 rounded-xl">
          <span className="font-bold text-gray-700">{player.setsWon}:{player.setsLost}</span>
          <span className={`
            text-xs font-bold px-1.5 py-0.5 rounded mt-0.5
            ${player.setsDiff > 0 ? 'bg-green-200 text-green-800' : player.setsDiff < 0 ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-700'}
          `}>
            {player.setsDiff > 0 ? '+' : ''}{player.setsDiff}
          </span>
        </div>
      </div>
    </button>
  );
}

export function Standings({ onPlayerClick }) {
  const { players, matches, settings, status } = useTournamentStore();
  const [animateIn, setAnimateIn] = useState(false);

  const standings = useMemo(
    () => calculateStandings(players, matches, settings),
    [players, matches, settings]
  );
  const isCompleted = status === 'completed';
  const completedCount = useMemo(() => matches.filter((m) => m.completed).length, [matches]);
  const remainingCount = matches.length - completedCount;
  const progressPct = matches.length > 0 ? Math.round((completedCount / matches.length) * 100) : 0;

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getRowStyle = (index) => {
    if (!isCompleted) return '';
    if (index === 0) return 'bg-gradient-to-r from-yellow-50 via-yellow-50/50 to-transparent border-l-4 border-l-yellow-400';
    if (index === 1) return 'bg-gradient-to-r from-gray-100 via-gray-50 to-transparent border-l-4 border-l-gray-400';
    if (index === 2) return 'bg-gradient-to-r from-orange-50 via-orange-50/50 to-transparent border-l-4 border-l-orange-400';
    return '';
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-bounce p-4 bg-gradient-to-b from-gray-50 to-white">
      {/* Desktop container */}
      <div className="max-w-5xl mx-auto">
        {/* Header for completed tournament */}
        {isCompleted && (
          <div className="text-center mb-8 fade-in">
            <div className="inline-block">
              <div className="trophy-animation text-6xl mb-4" aria-hidden="true">
                <span>&#127942;</span>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
                Wyniki końcowe
              </h2>
              <div className="flex items-center justify-center gap-2" aria-hidden="true">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-tennis-400" />
                <span className="text-tennis-600 font-medium">Gratulacje!</span>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-tennis-400" />
              </div>
            </div>
          </div>
        )}

        {/* Mobile View - Cards */}
        <div className="lg:hidden space-y-3" role="list" aria-label="Tabela wyników">
          {standings.map((player, index) => (
            <div role="listitem" key={player.playerId}>
              <PlayerCard
                player={player}
                rank={index + 1}
                isCompleted={isCompleted}
                onClick={() => onPlayerClick?.(player.playerId)}
                animationDelay={index * 0.05}
              />
            </div>
          ))}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden lg:block card-premium overflow-hidden" role="table" aria-label="Tabela wyników">
          {/* Table Header */}
          <div className="grid grid-cols-[60px_1fr_80px_80px_80px_80px_120px_100px] gap-4 p-5 bg-gradient-to-r from-tennis-700 to-tennis-600 text-white text-sm font-semibold uppercase tracking-wider" role="row">
            <div className="text-center" role="columnheader">#</div>
            <div role="columnheader">Gracz</div>
            <div className="text-center" role="columnheader">Mecze</div>
            <div className="text-center" role="columnheader">Wygr.</div>
            <div className="text-center" role="columnheader">Remisy</div>
            <div className="text-center" role="columnheader">Przegr.</div>
            <div className="text-center" role="columnheader">Sety</div>
            <div className="text-center" role="columnheader">Punkty</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100" role="rowgroup">
            {standings.map((player, index) => (
              <button
                key={player.playerId}
                onClick={() => onPlayerClick?.(player.playerId)}
                role="row"
                aria-label={`${index + 1}. ${player.name}: ${player.points} punktów`}
                className={`
                  w-full grid grid-cols-[60px_1fr_80px_80px_80px_80px_120px_100px] gap-4 p-5 text-left min-h-[44px]
                  transition-all duration-300 hover:bg-tennis-50
                  ${getRowStyle(index)}
                  ${animateIn ? 'slide-in-right' : 'opacity-0'}
                `}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Rank */}
                <div className="flex items-center justify-center" role="cell">
                  <RankBadge rank={index + 1} isCompleted={isCompleted} />
                </div>

                {/* Player name */}
                <div className="flex items-center" role="cell">
                  <div className="flex items-center gap-4">
                    <PlayerAvatar name={player.name} size="md" />
                    <span className="font-bold text-gray-900 text-lg">
                      {player.name}
                    </span>
                  </div>
                </div>

                {/* Matches */}
                <div className="flex items-center justify-center" role="cell">
                  <span className="text-gray-700 font-semibold text-lg">{player.played}</span>
                </div>

                {/* Wins */}
                <div className="flex items-center justify-center" role="cell">
                  <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-xl font-bold text-lg">
                    <ScoreValue value={player.won} />
                  </span>
                </div>

                {/* Draws */}
                <div className="flex items-center justify-center" role="cell">
                  <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-xl font-bold text-lg">
                    <ScoreValue value={player.draws || 0} />
                  </span>
                </div>

                {/* Losses */}
                <div className="flex items-center justify-center" role="cell">
                  <span className="px-3 py-1.5 bg-red-100 text-red-800 rounded-xl font-bold text-lg">
                    <ScoreValue value={player.lost} />
                  </span>
                </div>

                {/* Sets */}
                <div className="flex items-center justify-center" role="cell">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-semibold text-lg">
                      {player.setsWon}:{player.setsLost}
                    </span>
                    <span className={`
                      text-sm font-bold px-2 py-1 rounded-lg
                      ${player.setsDiff > 0
                        ? 'bg-green-100 text-green-800'
                        : player.setsDiff < 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-600'
                      }
                    `}>
                      {player.setsDiff > 0 ? '+' : ''}{player.setsDiff}
                    </span>
                  </div>
                </div>

                {/* Points */}
                <div className="flex items-center justify-center" role="cell">
                  <div className={`
                    px-4 py-2 rounded-xl font-extrabold text-xl
                    ${index === 0 && isCompleted
                      ? 'bg-gradient-to-r from-tennis-500 to-tennis-400 text-white shadow-lg shadow-tennis-500/30'
                      : 'bg-tennis-50 text-tennis-700'
                    }
                  `}>
                    {animateIn ? (
                      <AnimatedNumber value={player.points} />
                    ) : (
                      player.points
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Legend - Desktop only */}
        <div className="hidden lg:block card mt-6 slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center font-bold text-green-800" aria-hidden="true">W</span>
                <span className="text-gray-700">Wygrane</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center font-bold text-yellow-800" aria-hidden="true">R</span>
                <span className="text-gray-700">Remisy</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center font-bold text-red-800" aria-hidden="true">P</span>
                <span className="text-gray-700">Przegrane</span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-700">Punktacja:</span>
              {' '}Wygrana = {settings.pointsForWin} pkt, Remis = {settings.pointsForDraw} pkt
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <section className="card mt-4 slide-up" style={{ animationDelay: '0.4s' }} aria-label="Statystyki turnieju">
          <div className="flex items-center gap-2 text-gray-700 font-semibold mb-4">
            <svg className="w-5 h-5 text-tennis-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3>Statystyki turnieju</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative overflow-hidden p-4 bg-gradient-to-br from-tennis-50 to-tennis-100 rounded-2xl border border-tennis-200">
              <div className="relative z-10">
                <div className="text-3xl font-extrabold text-tennis-700 mb-1">
                  {animateIn ? (
                    <AnimatedNumber value={completedCount} />
                  ) : (
                    completedCount
                  )}
                </div>
                <div className="text-sm text-tennis-700 font-medium">rozegrane</div>
              </div>
              <div className="absolute -right-4 -bottom-4 text-6xl opacity-10" aria-hidden="true">
                <span>&#9989;</span>
              </div>
            </div>

            <div className="relative overflow-hidden p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
              <div className="relative z-10">
                <div className="text-3xl font-extrabold text-gray-700 mb-1">
                  {animateIn ? (
                    <AnimatedNumber value={remainingCount} />
                  ) : (
                    remainingCount
                  )}
                </div>
                <div className="text-sm text-gray-700 font-medium">pozostałe</div>
              </div>
              <div className="absolute -right-4 -bottom-4 text-6xl opacity-10" aria-hidden="true">
                <span>&#9203;</span>
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-700">Postęp</span>
              <span className="font-bold text-tennis-700">
                {progressPct}%
              </span>
            </div>
            <div className="progress-track" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Postęp turnieju">
              <div
                className="progress-fill"
                style={{
                  width: `${progressPct}%`
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
