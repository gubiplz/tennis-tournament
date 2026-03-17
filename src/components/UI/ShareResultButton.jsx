import { useState, useCallback } from 'react';
import { generateResultImage } from '../../utils/shareImage';

/**
 * "Udostępnij wynik" — generuje grafikę PNG i udostępnia/pobiera.
 */
export function ShareResultButton({ gameType, name, date, players, matches, standings }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleShare = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setDone(false);

    try {
      const blob = await generateResultImage({
        gameType,
        name,
        date,
        players,
        matches,
        standings,
      });

      const fileName = gameType === 'sparring'
        ? 'sparring-wynik.png'
        : 'turniej-wynik.png';

      // Try native share with file (mobile)
      if (navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: name || 'Wyniki tenisa',
            });
            setDone(true);
            setTimeout(() => setDone(false), 2000);
            return;
          } catch (err) {
            if (err?.name === 'AbortError') return;
          }
        }
      }

      // Desktop / fallback: open image in new tab + download
      downloadBlob(blob, fileName);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      console.error('Share failed:', err);
      // Fallback: try to at least download what we have
      try {
        const blob = await generateResultImage({ gameType, name, date, players, matches, standings });
        downloadBlob(blob, gameType === 'sparring' ? 'sparring-wynik.png' : 'turniej-wynik.png');
      } catch {
        alert('Nie udało się wygenerować obrazu. Spróbuj ponownie.');
      }
    } finally {
      setLoading(false);
    }
  }, [gameType, name, date, players, matches, standings, loading]);

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className={`
        mt-4 w-full max-w-xs py-3.5 min-h-[48px] rounded-xl font-semibold text-sm
        transition-all duration-300
        flex items-center justify-center gap-2
        ${done
          ? 'bg-tennis-100 text-tennis-700 border border-tennis-300'
          : 'bg-white/90 text-tennis-700 border border-tennis-200 hover:bg-tennis-50 hover:border-tennis-300 active:scale-[0.97]'
        }
        ${loading ? 'opacity-70 cursor-wait' : ''}
      `}
      aria-label="Udostępnij wynik jako obraz"
    >
      {loading ? (
        <>
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Generowanie...</span>
        </>
      ) : done ? (
        <>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Pobrano!</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Udostępnij wynik</span>
        </>
      )}
    </button>
  );
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
