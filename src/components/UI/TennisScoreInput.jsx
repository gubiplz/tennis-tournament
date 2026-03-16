import { useState, useEffect } from 'react';
import { hapticTap } from '../../utils/haptics';

export function TennisScoreInput({ matchId, onSave, onCancel, initialScore1, initialScore2, initialSets, player1Name, player2Name }) {
  const [score1, setScore1] = useState(initialScore1 || 0);
  const [score2, setScore2] = useState(initialScore2 || 0);
  const [showDetails, setShowDetails] = useState(false);
  const [sets, setSets] = useState(initialSets || []);

  const p1Label = player1Name || 'Gracz 1';
  const p2Label = player2Name || 'Gracz 2';

  // Reset when match changes
  useEffect(() => {
    setScore1(initialScore1 || 0);
    setScore2(initialScore2 || 0);
    setSets(initialSets || []);
    setShowDetails(false);
  }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    const setsData = sets.length > 0 ? sets.filter(s => !(s[0] === 0 && s[1] === 0)) : [];
    hapticTap();
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
    <fieldset className="space-y-4">
      <legend className="block text-xs font-semibold text-gray-600 mb-2 text-center w-full">
        Wynik w setach
      </legend>

      {/* Main score input */}
      <div>
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center">
            <label htmlFor={`score1-${matchId}`} className="sr-only">
              Sety wygrane przez {p1Label}
            </label>
            <input
              id={`score1-${matchId}`}
              type="text"
              inputMode="numeric"
              value={score1}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setScore1(raw === '' ? 0 : parseInt(raw));
              }}
              aria-label={`Sety wygrane przez ${p1Label}`}
              className={`w-20 h-16 text-center text-3xl font-extrabold rounded-2xl border-3 transition-all
                ${score1 > score2 && hasScore ? 'border-tennis-400 bg-tennis-50 text-tennis-700' :
                  isDraw ? 'border-yellow-400 bg-yellow-50 text-yellow-700' :
                  'border-gray-200'}
                focus:border-tennis-500 focus:ring-2 focus:ring-tennis-500/20`}
            />
            <span className="mt-1 text-xs font-medium text-gray-600 truncate max-w-[80px]">{p1Label}</span>
          </div>
          <span className="text-3xl font-bold text-gray-400" aria-hidden="true">:</span>
          <div className="flex flex-col items-center">
            <label htmlFor={`score2-${matchId}`} className="sr-only">
              Sety wygrane przez {p2Label}
            </label>
            <input
              id={`score2-${matchId}`}
              type="text"
              inputMode="numeric"
              value={score2}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setScore2(raw === '' ? 0 : parseInt(raw));
              }}
              aria-label={`Sety wygrane przez ${p2Label}`}
              className={`w-20 h-16 text-center text-3xl font-extrabold rounded-2xl border-3 transition-all
                ${score2 > score1 && hasScore ? 'border-tennis-400 bg-tennis-50 text-tennis-700' :
                  isDraw ? 'border-yellow-400 bg-yellow-50 text-yellow-700' :
                  'border-gray-200'}
                focus:border-tennis-500 focus:ring-2 focus:ring-tennis-500/20`}
            />
            <span className="mt-1 text-xs font-medium text-gray-600 truncate max-w-[80px]">{p2Label}</span>
          </div>
        </div>
        {isDraw && (
          <p className="text-center text-sm text-yellow-700 mt-2 font-medium" role="status">
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
          className="w-full py-3 min-h-[44px] text-xs font-medium text-gray-600 hover:text-gray-800 rounded-xl transition-colors flex items-center justify-center gap-1"
          aria-expanded={showDetails}
        >
          <svg className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showDetails ? 'Ukryj szczegóły setów' : 'Dodaj szczegóły setów (opcjonalne)'}
        </button>

        {showDetails && (
          <div className="mt-2 space-y-2 slide-up" role="group" aria-label="Szczegóły setów">
            {sets.map((set, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-10" id={`set-label-${matchId}-${i}`}>Set {i + 1}</span>
                <label htmlFor={`set-${matchId}-${i}-p1`} className="sr-only">
                  Set {i + 1}, gemy {p1Label}
                </label>
                <input
                  id={`set-${matchId}-${i}-p1`}
                  type="text"
                  inputMode="numeric"
                  value={set[0]}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    updateSet(i, 0, raw === '' ? 0 : parseInt(raw));
                  }}
                  aria-label={`Set ${i + 1}, gemy ${p1Label}`}
                  className="w-12 h-10 text-center text-sm font-bold rounded-lg border border-gray-200 focus:border-tennis-500 focus:ring-2 focus:ring-tennis-500/20 transition-all"
                />
                <span className="text-gray-400 text-sm" aria-hidden="true">:</span>
                <label htmlFor={`set-${matchId}-${i}-p2`} className="sr-only">
                  Set {i + 1}, gemy {p2Label}
                </label>
                <input
                  id={`set-${matchId}-${i}-p2`}
                  type="text"
                  inputMode="numeric"
                  value={set[1]}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    updateSet(i, 1, raw === '' ? 0 : parseInt(raw));
                  }}
                  aria-label={`Set ${i + 1}, gemy ${p2Label}`}
                  className="w-12 h-10 text-center text-sm font-bold rounded-lg border border-gray-200 focus:border-tennis-500 focus:ring-2 focus:ring-tennis-500/20 transition-all"
                />
                <button
                  onClick={() => removeSet(i)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-red-600 rounded transition-colors"
                  aria-label={`Usuń set ${i + 1}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {sets.length < 10 && (
              <button
                onClick={addSet}
                className="min-h-[44px] text-xs text-tennis-700 hover:text-tennis-800 font-medium flex items-center gap-1 pl-10"
              >
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
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Zapisz wynik
          </span>
        </button>
      </div>
    </fieldset>
  );
}
