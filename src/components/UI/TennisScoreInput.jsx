import { useState, useEffect } from 'react';

export function TennisScoreInput({ matchId, onSave, onCancel, initialScore1, initialScore2, initialSets }) {
  const [score1, setScore1] = useState(initialScore1 || 0);
  const [score2, setScore2] = useState(initialScore2 || 0);
  const [showDetails, setShowDetails] = useState(false);
  const [sets, setSets] = useState(initialSets || []);

  // Reset when match changes
  useEffect(() => {
    setScore1(initialScore1 || 0);
    setScore2(initialScore2 || 0);
    setSets(initialSets || []);
    setShowDetails(false);
  }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    const setsData = sets.length > 0 ? sets.filter(s => !(s[0] === 0 && s[1] === 0)) : [];
    onSave(score1, score2, setsData);
  };

  const isDraw = score1 === score2 && score1 > 0;
  const hasScore = score1 > 0 || score2 > 0;

  // Set details helpers
  const addSet = () => setSets([...sets, [0, 0]]);
  const removeSet = (i) => setSets(sets.filter((_, idx) => idx !== i));
  const updateSet = (i, player, val) => {
    setSets(sets.map((s, idx) => idx === i ? (player === 0 ? [val, s[1]] : [s[0], val]) : s));
  };

  return (
    <div className="space-y-4">
      {/* Main score input */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 text-center">
          Wynik w setach
        </label>
        <div className="flex items-center justify-center gap-4">
          <input
            type="text"
            inputMode="numeric"
            value={score1}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              setScore1(raw === '' ? 0 : parseInt(raw));
            }}
            className={`w-20 h-16 text-center text-3xl font-extrabold rounded-2xl border-3 transition-all
              ${score1 > score2 && hasScore ? 'border-tennis-400 bg-tennis-50 text-tennis-700 dark:bg-tennis-900/30 dark:text-tennis-400' :
                isDraw ? 'border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'}
              focus:border-tennis-500 focus:ring-2 focus:ring-tennis-500/20`}
          />
          <span className="text-3xl font-bold text-gray-300 dark:text-gray-600">:</span>
          <input
            type="text"
            inputMode="numeric"
            value={score2}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              setScore2(raw === '' ? 0 : parseInt(raw));
            }}
            className={`w-20 h-16 text-center text-3xl font-extrabold rounded-2xl border-3 transition-all
              ${score2 > score1 && hasScore ? 'border-tennis-400 bg-tennis-50 text-tennis-700 dark:bg-tennis-900/30 dark:text-tennis-400' :
                isDraw ? 'border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'}
              focus:border-tennis-500 focus:ring-2 focus:ring-tennis-500/20`}
          />
        </div>
        {isDraw && (
          <p className="text-center text-sm text-yellow-600 dark:text-yellow-400 mt-2 font-medium">
            Remis
          </p>
        )}
      </div>

      {/* Optional set details */}
      <div>
        <button
          onClick={() => {
            setShowDetails(!showDetails);
            if (!showDetails && sets.length === 0) addSet();
          }}
          className="w-full py-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl transition-colors flex items-center justify-center gap-1"
        >
          <svg className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showDetails ? 'Ukryj szczegóły setów' : 'Dodaj szczegóły setów (opcjonalne)'}
        </button>

        {showDetails && (
          <div className="mt-2 space-y-2 slide-up">
            {sets.map((set, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-10">Set {i + 1}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={set[0]}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    updateSet(i, 0, raw === '' ? 0 : parseInt(raw));
                  }}
                  className="w-12 h-10 text-center text-sm font-bold rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:border-tennis-500 transition-all"
                />
                <span className="text-gray-300 text-sm">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={set[1]}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    updateSet(i, 1, raw === '' ? 0 : parseInt(raw));
                  }}
                  className="w-12 h-10 text-center text-sm font-bold rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:border-tennis-500 transition-all"
                />
                <button onClick={() => removeSet(i)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 rounded transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {sets.length < 10 && (
              <button onClick={addSet} className="text-xs text-tennis-600 hover:text-tennis-700 flex items-center gap-1 pl-10">
                + Dodaj set
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button onClick={onCancel} className="btn-secondary flex-1">
            Anuluj
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!hasScore}
          className="btn-success flex-1"
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Zapisz wynik
          </span>
        </button>
      </div>
    </div>
  );
}
