import { useState, useEffect } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';
import { calculateMatchCount, estimateDuration } from '../../utils/roundRobin';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../constants/tournament';

const DRAFT_KEY = 'tennis-tournament-draft';

function getTodayDate() {
  return new Date().toLocaleDateString('pl-PL');
}

function loadDraft(defaultPlayers) {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { name: '', location: '', date: getTodayDate(), players: defaultPlayers.join('\n') };
}

function saveDraft(data) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch { /* ignore */ }
}

export function TournamentSetup() {
  const store = useTournamentStore();
  const { startTournament, getDefaultPlayers, goToDashboard } = store;

  const [draft] = useState(() => loadDraft(getDefaultPlayers()));
  const [tournamentName, setTournamentName] = useState(draft.name);
  const [tournamentLocation, setTournamentLocation] = useState(draft.location);
  const [tournamentDate, setTournamentDate] = useState(draft.date || getTodayDate());
  const [playersText, setPlayersText] = useState(draft.players);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Persist draft to sessionStorage
  useEffect(() => {
    saveDraft({ name: tournamentName, location: tournamentLocation, date: tournamentDate, players: playersText });
  }, [tournamentName, tournamentLocation, tournamentDate, playersText]);

  const players = playersText
    .split('\n')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  const uniquePlayers = [...new Set(players)];
  const duplicates = players.length - uniquePlayers.length;

  const matchCount = uniquePlayers.length >= 2 ? calculateMatchCount(uniquePlayers.length) : 0;
  const duration = matchCount > 0 ? estimateDuration(matchCount) : '';

  const handleStart = () => {
    if (uniquePlayers.length < 3) {
      if (uniquePlayers.length === 2) {
        setError('Dla 2 graczy użyj trybu Sparring');
      } else {
        setError('Potrzebujesz minimum 3 graczy');
      }
      return;
    }
    if (uniquePlayers.length > MAX_PLAYERS) {
      setError(`Maksymalnie ${MAX_PLAYERS} graczy`);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      startTournament(uniquePlayers, tournamentName, tournamentLocation, tournamentDate, 'tournament');
      clearDraft();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-tennis-700 via-tennis-600 to-tennis-800 safe-top safe-bottom">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-tennis-400/10 rounded-full blur-3xl" />
      </div>

      {/* Desktop Layout Container */}
      <div className="lg:flex lg:min-h-screen">
        {/* Hero Banner - Full width on mobile, left side on desktop */}
        <div className="lg:w-1/2 xl:w-2/5 lg:sticky lg:top-0 lg:h-screen">
          <div className="relative w-full h-64 sm:h-80 lg:h-full overflow-hidden">
            <img
              src="./image-turniej.jpeg"
              alt="Turniej Tenisowy"
              className="w-full h-full object-cover object-top lg:object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-tennis-800/90 lg:bg-gradient-to-t lg:from-tennis-900/70 lg:via-transparent lg:to-black/30" />

            <div className="absolute bottom-4 left-4 right-4 lg:hidden text-center">
              <h1 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-lg">
                Nowy Turniej
              </h1>
              <p className="text-tennis-200 text-sm drop-shadow">
                Skonfiguruj i rozpocznij
              </p>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="lg:w-1/2 xl:w-3/5 lg:overflow-y-auto p-4">
          <div className="max-w-md mx-auto relative lg:py-8">
            {/* Desktop Header */}
            <div className="hidden lg:block text-center py-8 fade-in">
              <div className="inline-block mb-4">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl border border-white/20">
                  <span className="text-5xl" role="img" aria-label="Tenis">&#127934;</span>
                </div>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                Nowy Turniej
              </h1>
              <p className="text-tennis-200 text-sm">
                Skonfiguruj i rozpocznij
              </p>
            </div>

            {/* Back button */}
            <div className="pt-2 pb-2">
              <button
                onClick={goToDashboard}
                className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                Wszystkie turnieje
              </button>
            </div>

            {/* Main Card */}
            <div className="card-premium space-y-6 slide-up">
              {/* Tournament Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="flex items-center gap-2">
                    <span role="img" aria-label="Puchar">&#127942;</span>
                    Nazwa turnieju
                  </span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  className="input"
                  placeholder="np. Turniej Świąteczny 2026"
                />
              </div>

              {/* Location & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <span role="img" aria-label="Lokalizacja">&#128205;</span>
                      Lokalizacja
                    </span>
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={tournamentLocation}
                    onChange={(e) => setTournamentLocation(e.target.value)}
                    className="input"
                    placeholder="np. Kort Miejski"
                  />
                </div>
                <div>
                  <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <span role="img" aria-label="Kalendarz">&#128197;</span>
                      Data
                    </span>
                  </label>
                  <input
                    id="date"
                    type="text"
                    value={tournamentDate}
                    onChange={(e) => setTournamentDate(e.target.value)}
                    className="input"
                    placeholder={getTodayDate()}
                  />
                </div>
              </div>

              {/* Players */}
              <div>
                <label htmlFor="players" className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="flex items-center gap-2">
                    <span role="img" aria-label="Gracze">&#128101;</span>
                    Uczestnicy (jeden w linii)
                  </span>
                </label>
                <textarea
                  id="players"
                  value={playersText}
                  onChange={(e) => {
                    setPlayersText(e.target.value);
                    setError('');
                  }}
                  className="input min-h-[180px] resize-none font-mono text-sm"
                  placeholder={"Hubert\nBartek\nJasiu..."}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'form-error' : undefined}
                />

                {/* Stats preview */}
                {uniquePlayers.length >= 2 && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-tennis-50 to-tennis-100 rounded-2xl border border-tennis-200 slide-up">
                    <div className="flex items-center gap-3 text-tennis-800">
                      <div className="w-10 h-10 bg-tennis-200 rounded-xl flex items-center justify-center">
                        <span role="img" aria-label="Wykres">&#128200;</span>
                      </div>
                      <div>
                        <div className="font-bold">
                          {uniquePlayers.length} graczy
                        </div>
                        <div className="text-sm text-tennis-600">
                          {matchCount} meczów &bull; ok. {duration}
                        </div>
                      </div>
                    </div>
                    {duplicates > 0 && (
                      <div className="flex items-center gap-2 mt-3 text-sm text-orange-600 bg-orange-50 p-2 rounded-lg">
                        <span role="img" aria-label="Uwaga">&#9888;&#65039;</span>
                        <span>{duplicates} duplikat(ów) zostanie usunięty</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div
                  id="form-error"
                  role="alert"
                  className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 fade-in"
                >
                  <span className="text-xl">&#9888;&#65039;</span>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {/* Start Button */}
              <button
                onClick={handleStart}
                disabled={uniquePlayers.length < 2 || isLoading}
                className="btn-success w-full text-lg py-4 shine"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Przygotowywanie...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span role="img" aria-label="Rakieta">&#128640;</span>
                    Rozpocznij Turniej
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
