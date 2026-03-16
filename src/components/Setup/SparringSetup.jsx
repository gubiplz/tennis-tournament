import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentStore } from '../../store/tournamentStore';

function getTodayDate() {
  return new Date().toLocaleDateString('pl-PL');
}

export function SparringSetup() {
  const { startTournament } = useTournamentStore();
  const navigate = useNavigate();

  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(getTodayDate());
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = () => {
    const p1 = player1.trim();
    const p2 = player2.trim();

    if (!p1 || !p2) {
      setError('Wpisz imiona obu graczy');
      return;
    }
    if (p1.toLowerCase() === p2.toLowerCase()) {
      setError('Gracze muszą mieć różne imiona');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      startTournament([p1, p2], `${p1} vs ${p2}`, location, date, 'sparring');
      // After starting, the store has the new tournament id
      const id = useTournamentStore.getState().id;
      navigate(`/sparing/${id}`, { replace: true });
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-tennis-700 via-tennis-600 to-tennis-800 safe-top safe-bottom flex items-center justify-center p-4">
      {/* Decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Wróć
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{'\u{1F3BE}'}</div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Sparring</h1>
          <p className="text-tennis-200 text-sm mt-1">Mecz 1 na 1, dowolna liczba setów</p>
        </div>

        {/* Form */}
        <div className="card-premium space-y-4">
          <div>
            <label htmlFor="p1" className="block text-sm font-semibold text-gray-700 mb-1">Gracz 1</label>
            <input
              id="p1"
              type="text"
              value={player1}
              onChange={(e) => { setPlayer1(e.target.value); setError(''); }}
              className="input"
              placeholder="Imię"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-center">
            <span className="text-sm font-bold text-gray-400">VS</span>
          </div>

          <div>
            <label htmlFor="p2" className="block text-sm font-semibold text-gray-700 mb-1">Gracz 2</label>
            <input
              id="p2"
              type="text"
              value={player2}
              onChange={(e) => { setPlayer2(e.target.value); setError(''); }}
              className="input"
              placeholder="Imię"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label htmlFor="loc" className="block text-xs font-semibold text-gray-500 mb-1">Lokalizacja</label>
              <input
                id="loc"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input text-sm"
                placeholder="np. Kort"
              />
            </div>
            <div>
              <label htmlFor="dt" className="block text-xs font-semibold text-gray-500 mb-1">Data</label>
              <input
                id="dt"
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input text-sm"
                placeholder={getTodayDate()}
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
              <span>&#9888;&#65039;</span>
              <span className="font-medium">{error}</span>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={!player1.trim() || !player2.trim() || isLoading}
            className="btn-success w-full text-lg py-4"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Przygotowywanie...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {'\u{1F3BE}'} Rozpocznij mecz
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
