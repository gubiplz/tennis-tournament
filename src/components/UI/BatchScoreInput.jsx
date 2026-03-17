import { useState } from 'react';
import { hapticTap } from '../../utils/haptics';

const MAX_ROWS = 20;

/**
 * BatchScoreInput - modal for entering multiple sparring match scores at once.
 *
 * @param {Object} props
 * @param {string} props.player1Name - Name of player 1
 * @param {string} props.player2Name - Name of player 2
 * @param {(scores: Array<{score1: number, score2: number, sets: Array}>) => void} props.onSave
 * @param {() => void} props.onCancel
 */
export function BatchScoreInput({ player1Name, player2Name, onSave, onCancel }) {
  const [rows, setRows] = useState([{ score1: 0, score2: 0, sets: [], showSets: false }]);

  const p1Label = player1Name || 'Gracz 1';
  const p2Label = player2Name || 'Gracz 2';

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return;
    setRows([...rows, { score1: 0, score2: 0, sets: [], showSets: false }]);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateScore = (index, field, value) => {
    setRows(rows.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const toggleSets = (index) => {
    setRows(rows.map((row, i) => {
      if (i !== index) return row;
      const showSets = !row.showSets;
      return {
        ...row,
        showSets,
        sets: showSets && row.sets.length === 0 ? [[0, 0]] : row.sets
      };
    }));
  };

  const addSet = (index) => {
    setRows(rows.map((row, i) => {
      if (i !== index) return row;
      if (row.sets.length >= 10) return row;
      return { ...row, sets: [...row.sets, [0, 0]] };
    }));
  };

  const removeSet = (rowIndex, setIndex) => {
    setRows(rows.map((row, i) => {
      if (i !== rowIndex) return row;
      return { ...row, sets: row.sets.filter((_, si) => si !== setIndex) };
    }));
  };

  const updateSet = (rowIndex, setIndex, player, value) => {
    setRows(rows.map((row, i) => {
      if (i !== rowIndex) return row;
      return {
        ...row,
        sets: row.sets.map((s, si) => {
          if (si !== setIndex) return s;
          return player === 0 ? [value, s[1]] : [s[0], value];
        })
      };
    }));
  };

  const hasValidScores = rows.some(r => r.score1 > 0 || r.score2 > 0);

  const handleSave = () => {
    hapticTap();
    const validScores = rows
      .filter(r => r.score1 > 0 || r.score2 > 0)
      .map(r => ({
        score1: r.score1,
        score2: r.score2,
        sets: r.sets.filter(s => !(s[0] === 0 && s[1] === 0))
      }));
    onSave(validScores);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Wpisz wiele wyników">
      <div className="w-full max-w-md max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden slide-up safe-bottom">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />
          <h2 className="text-lg font-extrabold text-gray-900 text-center mb-1">
            Wpisz wiele wyników
          </h2>
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="font-bold text-tennis-700 truncate max-w-[120px]">{p1Label}</span>
            <span className="text-gray-400">vs</span>
            <span className="font-bold text-tennis-700 truncate max-w-[120px]">{p2Label}</span>
          </div>
        </div>

        {/* Scrollable rows */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar">
          {rows.map((row, index) => (
            <div key={index} className="bg-gray-50 rounded-2xl border border-gray-100 p-3">
              {/* Row header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">Mecz #{index + 1}</span>
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(index)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={`Usuń mecz ${index + 1}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Score inputs */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <label htmlFor={`batch-s1-${index}`} className="sr-only">
                    Sety wygrane przez {p1Label}, mecz {index + 1}
                  </label>
                  <input
                    id={`batch-s1-${index}`}
                    type="text"
                    inputMode="numeric"
                    value={row.score1}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      updateScore(index, 'score1', raw === '' ? 0 : parseInt(raw));
                    }}
                    className={`w-16 h-14 text-center text-2xl font-extrabold rounded-xl border-2 transition-all
                      ${row.score1 > row.score2 && (row.score1 > 0 || row.score2 > 0) ? 'border-tennis-400 bg-tennis-50 text-tennis-700' :
                        row.score1 === row.score2 && row.score1 > 0 ? 'border-yellow-400 bg-yellow-50 text-yellow-700' :
                        'border-gray-200 bg-white'}
                      focus:border-tennis-500 focus:ring-2 focus:ring-tennis-500/20`}
                  />
                  <span className="mt-1 text-xs font-medium text-gray-500 truncate max-w-[64px]">{p1Label}</span>
                </div>
                <span className="text-2xl font-bold text-gray-300" aria-hidden="true">:</span>
                <div className="flex flex-col items-center">
                  <label htmlFor={`batch-s2-${index}`} className="sr-only">
                    Sety wygrane przez {p2Label}, mecz {index + 1}
                  </label>
                  <input
                    id={`batch-s2-${index}`}
                    type="text"
                    inputMode="numeric"
                    value={row.score2}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      updateScore(index, 'score2', raw === '' ? 0 : parseInt(raw));
                    }}
                    className={`w-16 h-14 text-center text-2xl font-extrabold rounded-xl border-2 transition-all
                      ${row.score2 > row.score1 && (row.score1 > 0 || row.score2 > 0) ? 'border-tennis-400 bg-tennis-50 text-tennis-700' :
                        row.score1 === row.score2 && row.score1 > 0 ? 'border-yellow-400 bg-yellow-50 text-yellow-700' :
                        'border-gray-200 bg-white'}
                      focus:border-tennis-500 focus:ring-2 focus:ring-tennis-500/20`}
                  />
                  <span className="mt-1 text-xs font-medium text-gray-500 truncate max-w-[64px]">{p2Label}</span>
                </div>
              </div>

              {/* Set details toggle */}
              <button
                onClick={() => toggleSets(index)}
                className="w-full mt-2 py-2 min-h-[44px] text-xs font-medium text-gray-500 hover:text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-1"
                aria-expanded={row.showSets}
              >
                <svg className={`w-3 h-3 transition-transform ${row.showSets ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {row.showSets ? 'Ukryj sety' : 'Szczegóły setów'}
              </button>

              {/* Set details */}
              {row.showSets && (
                <div className="mt-1 space-y-1.5 slide-up">
                  {row.sets.map((s, si) => (
                    <div key={si} className="flex items-center gap-2 pl-2">
                      <span className="text-xs text-gray-500 w-8">S{si + 1}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={s[0]}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          updateSet(index, si, 0, raw === '' ? 0 : parseInt(raw));
                        }}
                        aria-label={`Mecz ${index + 1}, set ${si + 1}, gemy ${p1Label}`}
                        className="w-10 h-10 text-center text-sm font-bold rounded-lg border border-gray-200 focus:border-tennis-500 focus:ring-1 focus:ring-tennis-500/20"
                      />
                      <span className="text-gray-300 text-xs" aria-hidden="true">:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={s[1]}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          updateSet(index, si, 1, raw === '' ? 0 : parseInt(raw));
                        }}
                        aria-label={`Mecz ${index + 1}, set ${si + 1}, gemy ${p2Label}`}
                        className="w-10 h-10 text-center text-sm font-bold rounded-lg border border-gray-200 focus:border-tennis-500 focus:ring-1 focus:ring-tennis-500/20"
                      />
                      <button
                        onClick={() => removeSet(index, si)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500"
                        aria-label={`Usuń set ${si + 1}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {row.sets.length < 10 && (
                    <button
                      onClick={() => addSet(index)}
                      className="min-h-[44px] text-xs text-tennis-700 hover:text-tennis-800 font-medium flex items-center gap-1 pl-10"
                    >
                      + Dodaj set
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-3 shrink-0">
          {rows.length < MAX_ROWS && (
            <button
              onClick={addRow}
              className="w-full min-h-[44px] py-3 text-sm font-semibold text-tennis-700 bg-tennis-50 hover:bg-tennis-100 rounded-xl border border-tennis-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Dodaj mecz ({rows.length}/{MAX_ROWS})
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="btn-secondary flex-1"
            >
              Anuluj
            </button>
            <button
              onClick={handleSave}
              disabled={!hasValidScores}
              className="btn-success flex-1"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Zapisz wszystkie
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
