import pako from 'pako';

/**
 * Encodes tournament state to a URL-safe string
 * Uses JSON -> pako compression -> base64 encoding
 *
 * @param {Object} state - Tournament state object
 * @returns {string} - URL-safe encoded string
 */
export function encodeState(state) {
  try {
    const json = JSON.stringify(state);
    const compressed = pako.deflate(json);
    const base64 = btoa(String.fromCharCode(...compressed));
    // Make URL-safe
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('Error encoding state:', error);
    throw new Error('Failed to encode tournament state');
  }
}

/**
 * Decodes a URL-safe string back to tournament state
 *
 * @param {string} encoded - URL-safe encoded string
 * @returns {Object} - Tournament state object
 */
export function decodeState(encoded) {
  try {
    // Restore base64 characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    const compressed = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const json = pako.inflate(compressed, { to: 'string' });
    return JSON.parse(json);
  } catch (error) {
    console.error('Error decoding state:', error);
    throw new Error('Failed to decode tournament state');
  }
}

/**
 * Generates a share URL for the tournament
 *
 * @param {Object} state - Tournament state
 * @returns {string} - Full URL with encoded state
 */
export function generateShareUrl(state) {
  const encoded = encodeState(state);
  return `${window.location.origin}${window.location.pathname}?state=${encoded}`;
}

/**
 * Generates a short code for manual entry
 * Format: TURNIEJ-XXXX-XXXX
 *
 * @param {string} tournamentId - Tournament ID
 * @returns {string} - Short code
 */
export function generateShortCode(tournamentId) {
  const hash = tournamentId.replace(/-/g, '').toUpperCase().slice(0, 8);
  return `TURNIEJ-${hash.slice(0, 4)}-${hash.slice(4, 8)}`;
}

/**
 * Extracts state from URL if present
 *
 * @returns {Object|null} - Decoded state or null
 */
export function getStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const encodedState = params.get('state');

  if (encodedState) {
    try {
      return decodeState(encodedState);
    } catch (error) {
      console.error('Failed to decode state from URL:', error);
      return null;
    }
  }

  return null;
}

/**
 * Clears state from URL without page reload
 */
export function clearStateFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url);
}
