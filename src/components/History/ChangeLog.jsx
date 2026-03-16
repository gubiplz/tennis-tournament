import { useState } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';

export function ChangeLog() {
  const { changeLog, name, createdAt } = useTournamentStore();
  const [expanded, setExpanded] = useState(false);

  const displayedLogs = expanded ? changeLog : changeLog.slice(0, 10);

  const getActionConfig = (action) => {
    switch (action) {
      case 'START':
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-blue-100',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: '\u{1F535}',
          iconBg: 'bg-blue-500'
        };
      case 'SCORE':
        return {
          bg: 'bg-gradient-to-r from-green-50 to-green-100',
          border: 'border-green-200',
          text: 'text-green-700',
          icon: '\u{1F7E2}',
          iconBg: 'bg-green-500'
        };
      case 'EDIT':
        return {
          bg: 'bg-gradient-to-r from-yellow-50 to-yellow-100',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          icon: '\u{1F7E1}',
          iconBg: 'bg-yellow-500'
        };
      case 'RESET':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-red-100',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: '\u{1F534}',
          iconBg: 'bg-red-500'
        };
      case 'IMPORT':
        return {
          bg: 'bg-gradient-to-r from-purple-50 to-purple-100',
          border: 'border-purple-200',
          text: 'text-purple-700',
          icon: '\u{1F7E3}',
          iconBg: 'bg-purple-500'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-50 to-gray-100',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: '\u26AA',
          iconBg: 'bg-gray-400'
        };
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Tournament Info */}
      <div className="card-premium mb-4 fade-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-tennis-400 to-tennis-600 flex items-center justify-center shadow-lg shadow-tennis-500/30">
              <span className="text-2xl text-white" role="img" aria-label="Trophy">&#127942;</span>
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{name}</h2>
              <span className="text-xs text-gray-500">
                {createdAt && formatDate(createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Zsynchronizowano
          </span>
          {changeLog.length > 0 && (
            <span className="text-gray-400">
              &bull; Ostatnia zmiana: {formatTime(changeLog[0].timestamp)}
            </span>
          )}
        </div>
      </div>


      {/* Change Log */}
      <div className="card slide-up">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
          <span className="w-8 h-8 bg-tennis-100 rounded-lg flex items-center justify-center">
            <span role="img" aria-label="Scroll">&#128220;</span>
          </span>
          <span>Historia zmian</span>
          <span className="ml-auto text-sm font-normal text-gray-400">
            ({changeLog.length})
          </span>
        </h3>

        {changeLog.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-2xl text-gray-400">&#128220;</span>
            </div>
            <p className="text-gray-500 font-medium">Brak historii zmian</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedLogs.map((entry, index) => {
              const config = getActionConfig(entry.action);
              return (
                <div
                  key={entry.id}
                  className={`
                    p-4 rounded-xl border transition-all duration-200
                    ${config.bg} ${config.border}
                    slide-in-right
                  `}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 ${config.iconBg} rounded-full flex items-center justify-center text-white text-sm`}>
                      {config.icon}
                    </div>
                    <span className={`font-bold text-sm uppercase tracking-wide ${config.text}`}>
                      {entry.action}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  <div className={`text-sm ${config.text} pl-11`}>
                    {entry.details}
                  </div>
                </div>
              );
            })}

            {changeLog.length > 10 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full py-3 text-sm font-medium text-tennis-700 hover:text-tennis-800 hover:bg-tennis-50 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                {expanded ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Pokaż mniej
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Pokaż więcej ({changeLog.length - 10})
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
