import { useState, useCallback } from 'react';
import { generateResultImage } from '../../utils/shareImage';

/**
 * "Udostepnij wynik" button that generates a canvas image
 * and shares it via Web Share API (with file), falls back to
 * text share, or downloads the image.
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

      const file = new File([blob], fileName, { type: 'image/png' });

      // Try sharing with file (mobile Safari, Chrome, etc.)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: name || 'Wyniki',
            text: gameType === 'sparring'
              ? `Sparring: ${players?.[0]?.name} vs ${players?.[1]?.name}`
              : `Turniej: ${name || 'Turniej Tenisa'}`,
          });
          setDone(true);
          setTimeout(() => setDone(false), 2000);
          return;
        } catch (err) {
          // AbortError means user cancelled — not a real error
          if (err?.name === 'AbortError') {
            return;
          }
          // Fall through to other methods
        }
      }

      // Fallback 1: share text (no file support)
      if (navigator.share) {
        try {
          await navigator.share({
            title: name || 'Wyniki',
            text: gameType === 'sparring'
              ? `Sparring: ${players?.[0]?.name} vs ${players?.[1]?.name}`
              : `Turniej: ${name || 'Turniej Tenisa'}`,
            url: window.location.href,
          });
          setDone(true);
          setTimeout(() => setDone(false), 2000);

          // Also trigger download so user gets the image
          downloadBlob(blob, fileName);
          return;
        } catch (err) {
          if (err?.name === 'AbortError') return;
        }
      }

      // Fallback 2: just download
      downloadBlob(blob, fileName);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      console.error('Share image generation failed:', err);
      // Silent fail — the button just resets
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
      aria-label="Udostepnij wynik jako obraz"
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
          <span>Gotowe!</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Udost\u0119pnij wynik</span>
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
  // Revoke after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
