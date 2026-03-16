import { describe, it, expect } from 'vitest'
import {
  validateTennisSet,
  validateTennisMatch,
  sanitizePlayerName,
  validateImportedState,
} from '../validation'
import { MAX_PLAYERS, MAX_SCORE, MAX_PLAYER_NAME_LENGTH } from '../../constants/tournament'

// ---------------------------------------------------------------------------
// Helper: build a minimal valid tournament state
// ---------------------------------------------------------------------------
function makeValidState(overrides = {}) {
  return {
    id: 'test-tournament-id',
    status: 'active',
    players: [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ],
    matches: [
      { id: 1, player1Id: 'p1', player2Id: 'p2', score1: null, score2: null, completed: false },
    ],
    currentMatchIndex: 0,
    settings: { pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// validateTennisSet
// ---------------------------------------------------------------------------
describe('validateTennisSet', () => {
  it('accepts 0:0 as valid (empty set)', () => {
    expect(validateTennisSet(0, 0)).toEqual({ valid: true })
  })

  it('accepts standard winning scores', () => {
    const standardWins = [
      [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 5], [7, 6],
    ]
    standardWins.forEach(([g1, g2]) => {
      expect(validateTennisSet(g1, g2)).toEqual({ valid: true })
      // Also reversed (losing side)
      expect(validateTennisSet(g2, g1)).toEqual({ valid: true })
    })
  })

  it('rejects draws (equal non-zero scores)', () => {
    const result = validateTennisSet(5, 5)
    expect(result.valid).toBe(false)
    expect(result.warning).toBeDefined()
  })

  it('allows non-standard but valid scores with a warning', () => {
    // e.g. 8:6 is non-standard but has a winner
    const result = validateTennisSet(8, 6)
    expect(result.valid).toBe(true)
    expect(result.warning).toBeDefined()
    expect(result.warning).toContain('8:6')
  })
})

// ---------------------------------------------------------------------------
// validateTennisMatch
// ---------------------------------------------------------------------------
describe('validateTennisMatch', () => {
  it('rejects null or empty sets', () => {
    expect(validateTennisMatch(null).valid).toBe(false)
    expect(validateTennisMatch([]).valid).toBe(false)
  })

  it('rejects when all sets are 0:0', () => {
    const result = validateTennisMatch([[0, 0], [0, 0]])
    expect(result.valid).toBe(false)
  })

  it('accepts a valid single-set match', () => {
    const result = validateTennisMatch([[6, 4]])
    expect(result.valid).toBe(true)
  })

  it('accepts a valid 3-set match', () => {
    const result = validateTennisMatch([[6, 4], [3, 6], [7, 5]])
    expect(result.valid).toBe(true)
  })

  it('flags sets that end in a draw', () => {
    const result = validateTennisMatch([[6, 4], [5, 5]])
    expect(result.valid).toBe(false)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('remis')
  })

  it('ignores trailing 0:0 sets', () => {
    const result = validateTennisMatch([[6, 4], [0, 0]])
    expect(result.valid).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// sanitizePlayerName
// ---------------------------------------------------------------------------
describe('sanitizePlayerName', () => {
  it('trims whitespace', () => {
    expect(sanitizePlayerName('  Alice  ')).toBe('Alice')
  })

  it('removes control characters', () => {
    expect(sanitizePlayerName('Al\x00ice\x1F')).toBe('Alice')
  })

  it('enforces max length', () => {
    const longName = 'A'.repeat(100)
    expect(sanitizePlayerName(longName)).toHaveLength(MAX_PLAYER_NAME_LENGTH)
  })

  it('returns empty string for non-string input', () => {
    expect(sanitizePlayerName(null)).toBe('')
    expect(sanitizePlayerName(undefined)).toBe('')
    expect(sanitizePlayerName(123)).toBe('')
    expect(sanitizePlayerName({})).toBe('')
  })

  it('preserves Polish diacritics', () => {
    expect(sanitizePlayerName('Łukasz Żółciński')).toBe('Łukasz Żółciński')
  })

  it('handles XSS payloads by stripping control chars only', () => {
    const xss = '<script>alert("xss")</script>'
    const result = sanitizePlayerName(xss)
    // The function does not strip HTML — it only strips control characters.
    // The result preserves the HTML-like content (sanitization happens at render).
    expect(result).toBe(xss)
    expect(result).not.toContain('\x00')
  })
})

// ---------------------------------------------------------------------------
// validateImportedState
// ---------------------------------------------------------------------------
describe('validateImportedState', () => {
  // ---- valid state ----

  it('accepts a valid minimal state', () => {
    const result = validateImportedState(makeValidState())
    expect(result.valid).toBe(true)
    expect(result.state).toBeDefined()
    expect(result.state.id).toBe('test-tournament-id')
  })

  it('sanitizes player names in the returned state', () => {
    const state = makeValidState({
      players: [
        { id: 'p1', name: '  Alice\x00  ' },
        { id: 'p2', name: 'Bob' },
      ],
    })
    const result = validateImportedState(state)
    expect(result.valid).toBe(true)
    expect(result.state.players[0].name).toBe('Alice')
  })

  it('initializes changeLog to empty array if missing', () => {
    const state = makeValidState()
    delete state.changeLog
    const result = validateImportedState(state)
    expect(result.valid).toBe(true)
    expect(result.state.changeLog).toEqual([])
  })

  it('preserves existing changeLog', () => {
    const log = [{ action: 'test', timestamp: '2026-01-01' }]
    const result = validateImportedState(makeValidState({ changeLog: log }))
    expect(result.state.changeLog).toEqual(log)
  })

  // ---- null / non-object ----

  it('rejects null input', () => {
    expect(validateImportedState(null)).toMatchObject({ valid: false })
  })

  it('rejects non-object input', () => {
    expect(validateImportedState('string')).toMatchObject({ valid: false })
    expect(validateImportedState(42)).toMatchObject({ valid: false })
    expect(validateImportedState(undefined)).toMatchObject({ valid: false })
  })

  // ---- missing / invalid id ----

  it('rejects state without id', () => {
    const state = makeValidState()
    delete state.id
    expect(validateImportedState(state)).toMatchObject({ valid: false, error: expect.stringContaining('identyfikatora') })
  })

  it('rejects state with non-string id', () => {
    expect(validateImportedState(makeValidState({ id: 123 }))).toMatchObject({ valid: false })
  })

  // ---- invalid status ----

  it('rejects invalid status', () => {
    expect(validateImportedState(makeValidState({ status: 'invalid' }))).toMatchObject({ valid: false })
  })

  it('accepts all valid statuses', () => {
    ;['dashboard', 'setup', 'active', 'completed'].forEach(status => {
      const result = validateImportedState(makeValidState({ status }))
      expect(result.valid).toBe(true)
    })
  })

  // ---- players ----

  it('rejects when players is not an array', () => {
    expect(validateImportedState(makeValidState({ players: 'not array' }))).toMatchObject({ valid: false })
  })

  it('rejects when players exceeds MAX_PLAYERS', () => {
    const tooMany = Array.from({ length: MAX_PLAYERS + 1 }, (_, i) => ({
      id: `p${i}`,
      name: `Player ${i}`,
    }))
    expect(validateImportedState(makeValidState({ players: tooMany }))).toMatchObject({ valid: false })
  })

  it('rejects player with missing id', () => {
    const state = makeValidState({
      players: [{ name: 'Alice' }, { id: 'p2', name: 'Bob' }],
    })
    expect(validateImportedState(state)).toMatchObject({ valid: false })
  })

  it('rejects player with non-string name', () => {
    const state = makeValidState({
      players: [
        { id: 'p1', name: 123 },
        { id: 'p2', name: 'Bob' },
      ],
    })
    expect(validateImportedState(state)).toMatchObject({ valid: false })
  })

  // ---- matches ----

  it('rejects when matches is not an array', () => {
    expect(validateImportedState(makeValidState({ matches: null }))).toMatchObject({ valid: false })
  })

  it('rejects match with undefined id', () => {
    const state = makeValidState({
      matches: [{ player1Id: 'p1', player2Id: 'p2' }],
    })
    expect(validateImportedState(state)).toMatchObject({ valid: false })
  })

  it('rejects negative score', () => {
    const state = makeValidState({
      matches: [{ id: 1, player1Id: 'p1', player2Id: 'p2', score1: -1, score2: 0, completed: true }],
    })
    expect(validateImportedState(state)).toMatchObject({ valid: false })
  })

  it('rejects score exceeding MAX_SCORE', () => {
    const state = makeValidState({
      matches: [{ id: 1, player1Id: 'p1', player2Id: 'p2', score1: MAX_SCORE + 1, score2: 0, completed: true }],
    })
    expect(validateImportedState(state)).toMatchObject({ valid: false })
  })

  it('accepts score at MAX_SCORE boundary', () => {
    const state = makeValidState({
      matches: [{ id: 1, player1Id: 'p1', player2Id: 'p2', score1: MAX_SCORE, score2: 0, completed: true }],
    })
    expect(validateImportedState(state).valid).toBe(true)
  })

  it('accepts null scores (incomplete match)', () => {
    const state = makeValidState({
      matches: [{ id: 1, player1Id: 'p1', player2Id: 'p2', score1: null, score2: null, completed: false }],
    })
    expect(validateImportedState(state).valid).toBe(true)
  })

  // ---- currentMatchIndex ----

  it('rejects negative currentMatchIndex', () => {
    expect(validateImportedState(makeValidState({ currentMatchIndex: -1 }))).toMatchObject({ valid: false })
  })

  it('rejects non-number currentMatchIndex', () => {
    expect(validateImportedState(makeValidState({ currentMatchIndex: 'abc' }))).toMatchObject({ valid: false })
  })

  // ---- settings ----

  it('rejects missing settings', () => {
    const state = makeValidState()
    delete state.settings
    expect(validateImportedState(state)).toMatchObject({ valid: false })
  })

  it('rejects non-object settings', () => {
    expect(validateImportedState(makeValidState({ settings: 'not object' }))).toMatchObject({ valid: false })
  })

  // ---- adversarial inputs ----

  it('handles XSS in player names by sanitizing', () => {
    const state = makeValidState({
      players: [
        { id: 'p1', name: '<img src=x onerror=alert(1)>' },
        { id: 'p2', name: 'Bob' },
      ],
    })
    const result = validateImportedState(state)
    expect(result.valid).toBe(true)
    // Name is preserved but trimmed — HTML sanitization is a rendering concern
    expect(result.state.players[0].name).toBe('<img src=x onerror=alert(1)>')
  })

  it('truncates extremely long player names', () => {
    const state = makeValidState({
      players: [
        { id: 'p1', name: 'A'.repeat(1000) },
        { id: 'p2', name: 'Bob' },
      ],
    })
    const result = validateImportedState(state)
    expect(result.valid).toBe(true)
    expect(result.state.players[0].name).toHaveLength(MAX_PLAYER_NAME_LENGTH)
  })

  it('rejects null inside players array', () => {
    const state = makeValidState({
      players: [null, { id: 'p2', name: 'Bob' }],
    })
    expect(validateImportedState(state)).toMatchObject({ valid: false })
  })

  it('rejects null inside matches array', () => {
    const state = makeValidState({
      matches: [null],
    })
    expect(validateImportedState(state)).toMatchObject({ valid: false })
  })
})
