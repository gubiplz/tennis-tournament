import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useTournamentStore } from './store/tournamentStore';
import { getStateFromUrl, clearStateFromUrl } from './utils/stateEncoder';
import { TournamentList } from './components/Dashboard/TournamentList';

// Lazy-loaded route components (named exports wrapped for React.lazy)
const TournamentSetup = lazy(() =>
  import('./components/Setup/TournamentSetup').then((m) => ({ default: m.TournamentSetup }))
);
const SparringSetup = lazy(() =>
  import('./components/Setup/SparringSetup').then((m) => ({ default: m.SparringSetup }))
);
const TournamentLoader = lazy(() =>
  import('./components/Tournament/TournamentLoader').then((m) => ({ default: m.TournamentLoader }))
);
const TournamentView = lazy(() =>
  import('./components/Tournament/TournamentView').then((m) => ({ default: m.TournamentView }))
);

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-tennis-700 via-tennis-600 to-tennis-800 flex items-center justify-center p-4">
      <div className="text-center">
        <div
          className="w-12 h-12 mx-auto mb-4 border-4 border-white/20 border-t-white rounded-full animate-spin"
          aria-hidden="true"
        />
        <p className="text-white font-semibold">Ładowanie...</p>
      </div>
    </div>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-tennis-700 via-tennis-600 to-tennis-800 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-3xl">{'\u{1F3BE}'}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Strona nie znaleziona
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          Podany adres nie istnieje. Sprawdź, czy link jest poprawny.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 px-4 bg-tennis-600 text-white font-semibold rounded-xl hover:bg-tennis-700 transition-colors"
        >
          Wróć do listy turniejów
        </button>
      </div>
    </div>
  );
}

function App() {
  const importState = useTournamentStore((s) => s.importState);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle backwards-compatible ?state= pako URL imports
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('state')) return;

    const urlState = getStateFromUrl();
    if (urlState) {
      if (window.confirm('Znaleziono turniej w linku. Czy chcesz go zaimportować?')) {
        try {
          importState(urlState);
          // Navigate to the imported tournament
          const gameType = urlState.gameType || 'tournament';
          const prefix = gameType === 'sparring' ? 'sparing' : 'turniej';
          navigate(`/${prefix}/${urlState.id}`, { replace: true });
          return;
        } catch (e) {
          window.alert(e.message || 'Nie udało się zaimportować turnieju');
        }
      }
      clearStateFromUrl();
      navigate('/', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<TournamentList />} />
        <Route path="/nowy/sparing" element={<SparringSetup />} />
        <Route path="/nowy/turniej" element={<TournamentSetup />} />
        <Route
          path="/turniej/:id"
          element={
            <TournamentLoader type="tournament">
              <TournamentView />
            </TournamentLoader>
          }
        />
        <Route
          path="/sparing/:id"
          element={
            <TournamentLoader type="sparring">
              <TournamentView />
            </TournamentLoader>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
