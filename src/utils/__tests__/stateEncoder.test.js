import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  encodeState,
  decodeState,
  generateShareUrl,
  generateShortCode,
  getStateFromUrl,
  clearStateFromUrl,
} from '../stateEncoder'

// ---------------------------------------------------------------------------
// encode / decode round-trip
// ---------------------------------------------------------------------------
describe('encodeState / decodeState round-trip', () => {
  it('round-trips a simple object', () => {
    const state = { id: 'abc', value: 42 }
    const encoded = encodeState(state)
    const decoded = decodeState(encoded)
    expect(decoded).toEqual(state)
  })

  it('round-trips a realistic tournament state', () => {
    const state = {
      id: 'tournament-1',
      status: 'active',
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ],
      matches: [
        { id: 1, player1Id: 'p1', player2Id: 'p2', score1: 2, score2: 1, completed: true },
        { id: 2, player1Id: 'p1', player2Id: 'p3', score1: null, score2: null, completed: false },
      ],
      currentMatchIndex: 1,
      settings: { pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 },
      changeLog: [],
    }
    const decoded = decodeState(encodeState(state))
    expect(decoded).toEqual(state)
  })

  it('round-trips an empty object', () => {
    const state = {}
    expect(decodeState(encodeState(state))).toEqual(state)
  })

  it('round-trips an empty array', () => {
    const state = []
    expect(decodeState(encodeState(state))).toEqual(state)
  })

  it('round-trips strings with Polish diacritics', () => {
    const state = {
      players: [
        { name: 'Łukasz' },
        { name: 'Żółć' },
        { name: 'Ąęłóśżźćń' },
        { name: 'Gąsienica-Janeczek' },
      ],
    }
    expect(decodeState(encodeState(state))).toEqual(state)
  })

  it('round-trips state with special characters', () => {
    const state = { note: 'Hello "world" & <friends> / \\back' }
    expect(decodeState(encodeState(state))).toEqual(state)
  })

  it('round-trips nested and large structures', () => {
    const state = {
      players: Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` })),
      matches: Array.from({ length: 190 }, (_, i) => ({
        id: i + 1,
        player1Id: `p${i % 20}`,
        player2Id: `p${(i + 1) % 20}`,
        score1: Math.floor(Math.random() * 3),
        score2: Math.floor(Math.random() * 3),
        completed: true,
      })),
    }
    expect(decodeState(encodeState(state))).toEqual(state)
  })

  it('encoded string is URL-safe (no +, /, =)', () => {
    const state = { data: 'a'.repeat(500) }
    const encoded = encodeState(state)
    expect(encoded).not.toMatch(/[+/=]/)
  })

  it('encoded output is a non-empty string', () => {
    const encoded = encodeState({ x: 1 })
    expect(typeof encoded).toBe('string')
    expect(encoded.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// decodeState error handling
// ---------------------------------------------------------------------------
describe('decodeState error handling', () => {
  it('throws on completely invalid input', () => {
    expect(() => decodeState('not-valid-base64!!!')).toThrow('Failed to decode tournament state')
  })

  it('throws on empty string', () => {
    expect(() => decodeState('')).toThrow()
  })

  it('throws on corrupted base64 (valid base64 but not pako data)', () => {
    const fakeBase64 = btoa('this is not compressed data')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    expect(() => decodeState(fakeBase64)).toThrow('Failed to decode tournament state')
  })

  it('throws on truncated encoded data', () => {
    const encoded = encodeState({ hello: 'world' })
    const truncated = encoded.slice(0, Math.floor(encoded.length / 2))
    expect(() => decodeState(truncated)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// encodeState error handling
// ---------------------------------------------------------------------------
describe('encodeState error handling', () => {
  it('throws when given a value with circular reference', () => {
    const circular = {}
    circular.self = circular
    expect(() => encodeState(circular)).toThrow('Failed to encode tournament state')
  })
})

// ---------------------------------------------------------------------------
// generateShareUrl
// ---------------------------------------------------------------------------
describe('generateShareUrl', () => {
  beforeEach(() => {
    // Set up window.location for jsdom
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://tennis-turniej.netlify.app',
        pathname: '/',
        search: '',
        href: 'https://tennis-turniej.netlify.app/',
      },
      writable: true,
      configurable: true,
    })
  })

  it('returns a URL containing the encoded state parameter', () => {
    const state = { id: 'test' }
    const url = generateShareUrl(state)
    expect(url).toContain('https://tennis-turniej.netlify.app/')
    expect(url).toContain('?state=')
  })

  it('generated URL can be decoded back to the original state', () => {
    const state = { id: 'roundtrip-test', players: [] }
    const url = generateShareUrl(state)
    const encodedPart = url.split('?state=')[1]
    expect(decodeState(encodedPart)).toEqual(state)
  })
})

// ---------------------------------------------------------------------------
// generateShortCode
// ---------------------------------------------------------------------------
describe('generateShortCode', () => {
  it('returns a code in TURNIEJ-XXXX-XXXX format', () => {
    const code = generateShortCode('abc123de-f456-7890-abcd-ef1234567890')
    expect(code).toMatch(/^TURNIEJ-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  })

  it('strips dashes from the tournament id', () => {
    const code = generateShortCode('a-b-c-d-e-f-g-h')
    // After stripping dashes: 'abcdefgh' -> uppercase 'ABCDEFGH'
    expect(code).toBe('TURNIEJ-ABCD-EFGH')
  })

  it('returns consistent output for the same input', () => {
    const id = 'test-1234-5678'
    expect(generateShortCode(id)).toBe(generateShortCode(id))
  })

  it('handles short tournament IDs gracefully', () => {
    // Shorter than 8 chars after dash removal
    const code = generateShortCode('ab')
    expect(code).toMatch(/^TURNIEJ-/)
  })
})

// ---------------------------------------------------------------------------
// getStateFromUrl
// ---------------------------------------------------------------------------
describe('getStateFromUrl', () => {
  it('returns null when no state param is present', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
      configurable: true,
    })
    expect(getStateFromUrl()).toBeNull()
  })

  it('decodes state from URL search params', () => {
    const state = { id: 'from-url' }
    const encoded = encodeState(state)
    Object.defineProperty(window, 'location', {
      value: { search: `?state=${encoded}` },
      writable: true,
      configurable: true,
    })
    expect(getStateFromUrl()).toEqual(state)
  })

  it('returns null for corrupted state param', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?state=corrupted-data!!!' },
      writable: true,
      configurable: true,
    })
    expect(getStateFromUrl()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// clearStateFromUrl
// ---------------------------------------------------------------------------
describe('clearStateFromUrl', () => {
  it('removes state param from the URL', () => {
    const replaceStateSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com/?state=abc123',
        search: '?state=abc123',
        origin: 'https://example.com',
        pathname: '/',
      },
      writable: true,
      configurable: true,
    })
    window.history.replaceState = replaceStateSpy

    clearStateFromUrl()

    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      '',
      expect.objectContaining({
        // URL object — check that 'state' param was removed
        search: '',
      })
    )
  })
})
