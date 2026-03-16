/**
 * Haptic feedback utilities using the Vibration API.
 * All methods check for API availability and respect reduced-motion preferences.
 */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const canVibrate = () =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

/**
 * Short single buzz for score save / generic tap confirmation.
 */
export function hapticTap() {
  if (prefersReducedMotion() || !canVibrate()) return;
  navigator.vibrate(50);
}

/**
 * Double buzz for match completion.
 */
export function hapticSuccess() {
  if (prefersReducedMotion() || !canVibrate()) return;
  navigator.vibrate([50, 60, 50]);
}

/**
 * Celebration pattern for tournament completion.
 */
export function hapticCelebration() {
  if (prefersReducedMotion() || !canVibrate()) return;
  navigator.vibrate([50, 40, 50, 40, 100]);
}
