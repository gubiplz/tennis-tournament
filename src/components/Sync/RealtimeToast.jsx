import { useEffect } from 'react';
import { useTournamentStore } from '../../store/tournamentStore';

/**
 * A small toast notification that appears briefly when tournament data
 * is updated from another device via Supabase Realtime.
 *
 * Renders at the top-center of the screen, auto-dismisses after 3 seconds.
 * Mobile-first: uses safe insets and small footprint.
 */
export function RealtimeToast() {
  const show = useTournamentStore((s) => s._realtimeToast);
  const dismiss = useTournamentStore((s) => s.dismissRealtimeToast);

  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      dismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [show, dismiss]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-slide-down"
    >
      <div className="flex items-center gap-2 bg-tennis-700 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-tennis-900/20 text-sm font-medium">
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>Dane zaktualizowane</span>
        <button
          onClick={dismiss}
          className="ml-1 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/20 rounded transition-colors -mr-2"
          aria-label="Zamknij powiadomienie"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
