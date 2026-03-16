import { useMemo } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import {
  calculatePlayerStats,
  calculateHeadToHead,
  getRemainingMatches,
  calculateStandings
} from '../../utils/statistics';
import { Modal } from '../UI/Modal';
import { PlayerAvatar } from '../UI/PlayerAvatar';
import { formatSets } from '../../utils/helpers';

// Form indicator component
function FormIndicator({ result }) {
  const config = {
    W: { class: 'form-indicator win', label: 'Win', symbol: '\u2713' },
    L: { class: 'form-indicator loss', label: 'Loss', symbol: '\u2717' },
    D: { class: 'form-indicator draw', label: 'Draw', symbol: '=' }
  };

  const { class: className, label, symbol } = config[result] || config.D;

  return (
    <span className={className} title={label}>
      {symbol}
    </span>
  );
}

// Stat card component
function StatCard({ value, label, colorClass, delay = 0 }) {
  return (
    <div
      className={`text-center p-4 rounded-2xl ${colorClass} slide-up`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="text-2xl font-extrabold mb-1">{value}</div>
      <div className="text-xs font-medium opacity-75">{label}</div>
    </div>
  );
}

export function PlayerProfile({ playerId, isOpen, onClose }) {
  const { players, matches, settings, walkoverPlayer } = useTournamentStore();

  const player = players.find((p) => p.id === playerId);

  const stats = useMemo(
    () => playerId ? calculatePlayerStats(playerId, players, matches, settings) : null,
    [playerId, players, matches, settings]
  );
  const headToHead = useMemo(
    () => playerId ? calculateHeadToHead(playerId, players, matches) : [],
    [playerId, players, matches]
  );
  const remainingMatches = useMemo(
    () => playerId ? getRemainingMatches(playerId, players, matches) : [],
    [playerId, players, matches]
  );
  const standings = useMemo(
    () => calculateStandings(players, matches, settings),
    [players, matches, settings]
  );
  const rank = standings.findIndex((s) => s.playerId === playerId) + 1;

  if (!playerId || !isOpen || !player) return null;

  const getRankDisplay = () => {
    if (rank === 1) return { badge: '\u{1F947}', text: '#1', class: 'text-yellow-600' };
    if (rank === 2) return { badge: '\u{1F948}', text: '#2', class: 'text-gray-500' };
    if (rank === 3) return { badge: '\u{1F949}', text: '#3', class: 'text-orange-600' };
    return { badge: null, text: `#${rank}`, class: 'text-gray-600' };
  };

  const rankInfo = getRankDisplay();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center pb-6 border-b border-gray-100 fade-in">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <PlayerAvatar name={player.name} size="xl" />

            {/* Rank badge */}
            {rankInfo.badge && (
              <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-2xl">
                {rankInfo.badge}
              </div>
            )}
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {player.name}
          </h2>
          <div className={`text-lg font-bold ${rankInfo.class}`}>
            {rankInfo.badge} {rankInfo.text} miejsce
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            value={stats?.played || 0}
            label="Mecze"
            colorClass="bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700"
            delay={0.05}
          />
          <StatCard
            value={stats?.won || 0}
            label="Wygrane"
            colorClass="bg-gradient-to-br from-green-50 to-green-100 text-green-700"
            delay={0.1}
          />
          <StatCard
            value={stats?.lost || 0}
            label="Przegrane"
            colorClass="bg-gradient-to-br from-red-50 to-red-100 text-red-700"
            delay={0.15}
          />
          <StatCard
            value={stats?.points || 0}
            label="Punkty"
            colorClass="bg-gradient-to-br from-tennis-50 to-tennis-100 text-tennis-700"
            delay={0.2}
          />
        </div>

        {/* Extended Stats */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Sety:</span>
            <span className="font-bold text-gray-900">
              {stats?.setsWon || 0}:{stats?.setsLost || 0}
            </span>
            <span className={`
              px-2 py-0.5 rounded-full text-xs font-bold
              ${(stats?.setsDiff || 0) > 0
                ? 'bg-green-100 text-green-700'
                : (stats?.setsDiff || 0) < 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-200 text-gray-600'
              }
            `}>
              {(stats?.setsDiff || 0) > 0 ? '+' : ''}{stats?.setsDiff || 0}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Win rate:</span>
            <span className={`
              px-3 py-1 rounded-full font-bold
              ${(stats?.winRate || 0) >= 50
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
              }
            `}>
              {stats?.winRate || 0}%
            </span>
          </div>
        </div>

        {/* Form */}
        {stats?.form && stats.form.length > 0 && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl slide-up" style={{ animationDelay: '0.3s' }}>
            <span className="text-sm font-medium text-gray-500">Forma:</span>
            <div className="flex gap-1.5">
              {stats.form.map((result, i) => (
                <FormIndicator key={i} result={result} />
              ))}
            </div>
          </div>
        )}

        {/* Head to Head Section */}
        <div className="border-t border-gray-100 pt-6 slide-up" style={{ animationDelay: '0.35s' }}>
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <span className="w-8 h-8 bg-tennis-100 rounded-lg flex items-center justify-center">
              <span role="img" aria-label="Swords">&#9876;&#65039;</span>
            </span>
            <span>HEAD-TO-HEAD</span>
          </h3>

          <div className="space-y-3">
            {headToHead.map((h2h, index) => (
              <div
                key={h2h.opponentId}
                className={`
                  p-4 rounded-2xl border transition-all duration-200
                  ${h2h.played
                    ? 'bg-white border-gray-200 hover:border-tennis-200 hover:shadow-md'
                    : 'bg-gray-50/50 border-gray-100'
                  }
                  slide-up
                `}
                style={{ animationDelay: `${0.4 + index * 0.05}s` }}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar name={h2h.opponentName} size="sm" />
                    <span className="font-semibold text-gray-900">vs {h2h.opponentName}</span>
                  </div>
                  {h2h.played && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg font-bold">
                        {h2h.wins}W
                      </span>
                      {h2h.draws > 0 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg font-bold">
                          {h2h.draws}D
                        </span>
                      )}
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg font-bold">
                        {h2h.losses}L
                      </span>
                    </div>
                  )}
                </div>

                {h2h.played ? (
                  <>
                    <div className="text-xs text-gray-500 mb-2">
                      Sety: {h2h.setsWon}:{h2h.setsLost}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {h2h.matches.map((match) => (
                        <span
                          key={match.matchId}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-bold
                            ${match.won
                              ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border border-green-200'
                              : match.draw
                                ? 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border border-gray-200'
                                : 'bg-gradient-to-r from-red-100 to-red-50 text-red-700 border border-red-200'
                            }
                          `}
                        >
                          {match.sets && match.sets.length > 0
                            ? `${formatSets(match.sets)} (${match.score})`
                            : match.score
                          } {match.won ? '\u2713' : match.draw ? '=' : '\u2717'}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-400 italic">Jeszcze nie grali</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Remaining Matches */}
        {remainingMatches.length > 0 && (
          <div className="border-t border-gray-100 pt-6 slide-up" style={{ animationDelay: '0.6s' }}>
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <span className="w-8 h-8 bg-tennis-100 rounded-lg flex items-center justify-center">
                <span role="img" aria-label="Calendar">&#128197;</span>
              </span>
              <span>POZOSTAŁE MECZE</span>
              <span className="text-sm font-normal text-gray-400">({remainingMatches.length})</span>
            </h3>

            <div className="space-y-2">
              {remainingMatches.map((match, index) => (
                <div
                  key={match.matchId}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 slide-up"
                  style={{ animationDelay: `${0.65 + index * 0.05}s` }}
                >
                  <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                    #{match.matchId}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    vs {match.opponentName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          {remainingMatches.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`Walkover: ${player.name} przegra wszystkie pozostałe mecze (0:3). Kontynuować?`)) {
                  walkoverPlayer(playerId);
                  onClose();
                }
              }}
              className="btn-danger flex-1 text-sm"
            >
              Wycofaj gracza
            </button>
          )}
          <button onClick={onClose} className="btn-secondary flex-1">
            Zamknij
          </button>
        </div>
      </div>
    </Modal>
  );
}
