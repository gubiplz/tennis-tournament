import { describe, it, expect } from 'vitest'
import {
  pluralize,
  getInitials,
  getAvatarColor,
  parseSetsFromText,
  formatSets,
} from '../helpers'

describe('pluralize', () => {
  it('returns singular form for count 1', () => {
    expect(pluralize(1, 'mecz', 'mecze', 'meczów')).toBe('mecz')
  })

  it('returns "few" form for counts 2-4', () => {
    expect(pluralize(2, 'mecz', 'mecze', 'meczów')).toBe('mecze')
    expect(pluralize(3, 'mecz', 'mecze', 'meczów')).toBe('mecze')
    expect(pluralize(4, 'mecz', 'mecze', 'meczów')).toBe('mecze')
  })

  it('returns "many" form for counts 5-21', () => {
    expect(pluralize(5, 'mecz', 'mecze', 'meczów')).toBe('meczów')
    expect(pluralize(11, 'mecz', 'mecze', 'meczów')).toBe('meczów')
    expect(pluralize(12, 'mecz', 'mecze', 'meczów')).toBe('meczów')
  })

  it('returns "few" form for 22-24 (Polish grammar rule)', () => {
    expect(pluralize(22, 'mecz', 'mecze', 'meczów')).toBe('mecze')
    expect(pluralize(23, 'mecz', 'mecze', 'meczów')).toBe('mecze')
    expect(pluralize(24, 'mecz', 'mecze', 'meczów')).toBe('mecze')
  })

  it('returns "many" form for 0', () => {
    expect(pluralize(0, 'mecz', 'mecze', 'meczów')).toBe('meczów')
  })

  it('handles negative numbers using absolute value', () => {
    expect(pluralize(-1, 'mecz', 'mecze', 'meczów')).toBe('mecz')
    expect(pluralize(-3, 'mecz', 'mecze', 'meczów')).toBe('mecze')
  })
})

describe('getInitials', () => {
  it('returns first letter for single-word name', () => {
    expect(getInitials('Hubert')).toBe('H')
  })

  it('returns two initials for two-word name', () => {
    expect(getInitials('Hubert Krzan')).toBe('HK')
  })

  it('returns "?" for empty or falsy input', () => {
    expect(getInitials('')).toBe('?')
    expect(getInitials(null)).toBe('?')
    expect(getInitials(undefined)).toBe('?')
  })

  it('uppercases the initials', () => {
    expect(getInitials('jan kowalski')).toBe('JK')
  })
})

describe('getAvatarColor', () => {
  it('returns a gradient class string', () => {
    const color = getAvatarColor('Hubert')
    expect(color).toMatch(/^from-.+ to-.+$/)
  })

  it('returns the same color for the same name', () => {
    expect(getAvatarColor('Anna')).toBe(getAvatarColor('Anna'))
  })

  it('handles empty or null name without throwing', () => {
    expect(() => getAvatarColor('')).not.toThrow()
    expect(() => getAvatarColor(null)).not.toThrow()
  })
})

describe('parseSetsFromText', () => {
  it('parses colon-separated sets', () => {
    expect(parseSetsFromText('6:4 3:6 7:5')).toEqual([
      [6, 4],
      [3, 6],
      [7, 5],
    ])
  })

  it('parses dash-separated sets', () => {
    expect(parseSetsFromText('6-4 3-6')).toEqual([
      [6, 4],
      [3, 6],
    ])
  })

  it('parses comma-separated sets', () => {
    expect(parseSetsFromText('6:4,3:6,7:5')).toEqual([
      [6, 4],
      [3, 6],
      [7, 5],
    ])
  })

  it('returns null for empty or invalid input', () => {
    expect(parseSetsFromText('')).toBeNull()
    expect(parseSetsFromText(null)).toBeNull()
    expect(parseSetsFromText('abc')).toBeNull()
  })
})

describe('formatSets', () => {
  it('formats sets array into display string', () => {
    expect(formatSets([[6, 4], [3, 6], [7, 5]])).toBe('6:4, 3:6, 7:5')
  })

  it('returns empty string for null or empty input', () => {
    expect(formatSets(null)).toBe('')
    expect(formatSets([])).toBe('')
  })

  it('filters out 0:0 sets', () => {
    expect(formatSets([[6, 4], [0, 0]])).toBe('6:4')
  })
})
