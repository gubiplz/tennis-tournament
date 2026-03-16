import { useState } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { Modal } from '../UI/Modal';
import { TennisScoreInput } from '../UI/TennisScoreInput';
import { usePlayerMap } from '../../hooks/usePlayerMap';

export function Schedule({ onPlayerClick }) {
  const { matches, players, currentMatchIndex, recordScore, goToMatch } = useTournamentStore();
  const playerMap = usePlayerMap(players);

  const [editingMatch, setEditingMatch] = useState(null);
  const [filter, setFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(20);

  const allFiltered = matches.filter((match) => {
    if (filter === 'completed') return match.completed;
    if (filter === 'pending') return !match.completed;
    return true;
  });
  const filteredMatches = allFiltered.slice(0, visibleCount);
  const hasMore = allFiltered.length > visibleCount;

  const openEditModal = (match) => {
    setEditingMatch(match);
  };

  const saveEdit = (score1, score2, sets) => {
    if (editingMatch) {
      recordScore(editingMatch.id, score1, score2, sets);
      setEditingMatch(null);
    }
  };

  const getMatchStatus = (match, index) => {
    if (match.completed) return 'completed';
    if (index === currentMatchIndex) return 'current';
    return 'pending';
  };

  const statusConfig = {
    completed: {
      bg: 'bg-gradient-to-r from-green-50 to-transparent',
      border: 'border-green-200',
      icon: (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ),
      label: null
    },
    current: {
      bg: 'bg-gradient-to-r from-yellow-50 via-yellow-50/50 to-transparent',
      border: 'border-yellow-300 ring-2 ring-yellow-400/50',
      icon: (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/30 animate-pulse">
          <span className="text-white font-bold text-sm">&#9658;</span>
        </div>
      ),
      label: (
        <span className="status-badge current">
          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
          TERAZ
        </span>
      )
    },
    pending: {
      bg: 'bg-gray-50/50',
      border: 'border-gray-200',
      icon: (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
          <span className="text-gray-500 text-sm">&#9203;</span>
        </div>
      ),
      label: null
    }
  };

  const filterTabs = [
    { id: 'all', label: 'Wszystkie', count: matches.length },
    { id: 'completed', label: 'Rozegrane', count: matches.filter(m => m.completed).length },
    { id: 'pending', label: 'Pozostałe', count: matches.filter(m => !m.completed).length }
  ];

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Filter Tabs */}
      <div className="flex bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setFilter(tab.id); setVisibleCount(20); }}
            className={`
              flex-1 py-3.5 text-sm font-medium transition-all duration-300 relative
              ${filter === tab.id
                ? 'text-tennis-700'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <span className="flex items-center justify-center gap-2">
              {tab.label}
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-bold
                ${filter === tab.id
                  ? 'bg-tennis-100 text-tennis-700'
                  : 'bg-gray-100 text-gray-500'
                }
              `}>
                {tab.count}
              </span>
            </span>

            {/* Active indicator */}
            {filter === tab.id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-tennis-500 to-tennis-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Match List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="space-y-3">
          {filteredMatches.map((match, filteredIndex) => {
            const index = matches.findIndex((m) => m.id === match.id);
            const status = getMatchStatus(match, index);
            const player1 = playerMap.get(match.player1Id);
            const player2 = playerMap.get(match.player2Id);
            const config = statusConfig[status];

            return (
              <div
                key={match.id}
                className={`
                  match-card card p-4 ${config.bg} border ${config.border}
                  ${status === 'current' ? 'current' : ''}
                  slide-up
                `}
                style={{ animationDelay: `${filteredIndex * 0.03}s` }}
              >
                <div className="flex items-center gap-4">
                  {/* Status Icon */}
                  {config.icon}

                  {/* Match Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-400">#{match.id}</span>
                      {config.label}
                    </div>
                    <div className="font-semibold text-gray-900">
                      <button
                        onClick={() => onPlayerClick?.(player1?.id)}
                        className="hover:text-tennis-700 transition-colors"
                      >
                        {player1?.name}
                      </button>
                      <span className="text-gray-400 mx-2">vs</span>
                      <button
                        onClick={() => onPlayerClick?.(player2?.id)}
                        className="hover:text-tennis-700 transition-colors"
                      >
                        {player2?.name}
                      </button>
                    </div>
                  </div>

                  {/* Score / Actions */}
                  <div className="flex items-center gap-2">
                    {match.completed ? (
                      <>
                        <div className="flex items-center gap-2">
                          {/* Sets won */}
                          <div className="flex items-center gap-1">
                            <span className={`text-xl font-extrabold ${match.score1 > match.score2 ? 'text-tennis-600' : 'text-gray-400'}`}>
                              {match.score1}
                            </span>
                            <span className="text-lg font-bold text-gray-300">:</span>
                            <span className={`text-xl font-extrabold ${match.score2 > match.score1 ? 'text-tennis-600' : 'text-gray-400'}`}>
                              {match.score2}
                            </span>
                          </div>
                          {/* Set scores as badges */}
                          {match.sets && match.sets.length > 0 && (
                            <div className="flex gap-1">
                              {match.sets.filter(s => !(s[0]===0 && s[1]===0)).map((s, si) => (
                                <span
                                  key={si}
                                  className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                    s[0] > s[1]
                                      ? 'bg-tennis-100 text-tennis-700 dark:bg-tennis-900/30 dark:text-tennis-400'
                                      : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                  }`}
                                >
                                  {s[0]}:{s[1]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => openEditModal(match)}
                          className="p-2 text-gray-400 hover:text-tennis-700 hover:bg-tennis-50 rounded-lg transition-all duration-200"
                          aria-label="Edytuj wynik"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-gray-300">-:-</span>
                    )}
                  </div>
                </div>

                {/* Go to match button for pending matches */}
                {status === 'pending' && (
                  <button
                    onClick={() => goToMatch(index)}
                    className="mt-3 w-full py-2 text-sm font-medium text-tennis-700 hover:text-tennis-800 hover:bg-tennis-50 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    Przejdź do tego meczu
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {hasMore && (
          <button
            onClick={() => setVisibleCount((c) => c + 20)}
            className="w-full mt-4 py-3 text-sm font-medium text-tennis-700 hover:text-tennis-800 hover:bg-tennis-50 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Załaduj więcej ({allFiltered.length - visibleCount} pozostałych)
          </button>
        )}

        {filteredMatches.length === 0 && (
          <div className="text-center py-12 fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-2xl text-gray-400">&#128203;</span>
            </div>
            <p className="text-gray-500 font-medium">Brak meczów do wyświetlenia</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
        <div className="flex flex-wrap gap-4 justify-center text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            Rozegrany
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
              <span className="text-white text-xs">&#9658;</span>
            </span>
            Aktualny
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <span className="text-gray-500 text-xs">&#9203;</span>
            </span>
            Oczekuje
          </span>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingMatch}
        onClose={() => setEditingMatch(null)}
        title={`Edytuj Mecz #${editingMatch?.id}`}
      >
        {editingMatch && (
          <TennisScoreInput
            matchId={editingMatch.id}
            initialScore1={editingMatch.score1}
            initialScore2={editingMatch.score2}
            initialSets={editingMatch.sets}
            onSave={saveEdit}
            onCancel={() => setEditingMatch(null)}
          />
        )}
      </Modal>
    </div>
  );
}
