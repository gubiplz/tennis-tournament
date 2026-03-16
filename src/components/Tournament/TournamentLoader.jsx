import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentStore } from '../../store/tournamentStore';
import { storageService } from '../../services/storageService';

/**
 * Wrapper component that loads a tournament by :id from the URL.
 * - If the tournament is already loaded in Zustand, renders children immediately.
 * - If not, fetches from Supabase, shows a loading spinner while waiting.
 * - If not found, shows an error in Polish.
 * - On unmount, unsubscribes from Supabase Realtime.
 */
export function TournamentLoader({ children }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const storeId = useTournamentStore((s) => s.id);
  const loadTournamentFromDb = useTournamentStore((s) => s.loadTournamentFromDb);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Already loaded in store
    if (storeId === id) return;

    let cancelled = false;

    const fetchTournament = async () => {
      setLoading(true);
      setError(null);
      try {
        const ok = await loadTournamentFromDb(id);
        if (cancelled) return;
        if (!ok) {
          setError('Nie znaleziono turnieju. Sprawdź, czy link jest poprawny.');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load tournament:', err);
        setError('Wystąpił błąd podczas ładowania turnieju. Spróbuj ponownie.');
      }
      setLoading(false);
    };

    fetchTournament();

    return () => {
      cancelled = true;
    };
  }, [id, storeId, loadTournamentFromDb]);

  // Clean up realtime subscription when navigating away from the tournament
  useEffect(() => {
    return () => {
      storageService.unsubscribeFromTournament();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tennis-700 via-tennis-600 to-tennis-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white font-semibold text-lg">Ładowanie turnieju...</p>
          <p className="text-tennis-200 text-sm mt-2">Pobieranie danych z serwera</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-tennis-700 via-tennis-600 to-tennis-800 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Nie znaleziono turnieju
          </h2>
          <p className="text-gray-500 mb-6 text-sm">
            {error}
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

  // Tournament is loaded in store — check it matches the URL id
  if (storeId !== id) {
    return null;
  }

  return children;
}
