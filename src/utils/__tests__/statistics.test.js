import { describe, it, expect } from 'vitest'
import {
  calculatePlayerStats,
  calculateHeadToHead,
  calculateStandings,
  getRemainingMatches,
  getRestingPlayers,
} from '../statistics'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const players = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
  { id: 'p3', name: 'Charlie' },
  { id: 'p4', name: 'Diana' },
]

const defaultSettings = {
  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0,
}

// Alice beats Bob 2:1, Alice beats Charlie 2:0, Bob beats Charlie 2:1
// Diana has no completed matches yet (one incomplete match vs Alice)
const completedMatches = [
  { id: 1, player1Id: 'p1', player2Id: 'p2', score1: 2, score2: 1, completed: true, completedAt: '2026-01-01' },
  { id: 2, player1Id: 'p1', player2Id: 'p3', score1: 2, score2: 0, completed: true, completedAt: '2026-01-01' },
  { id: 3, player1Id: 'p2', player2Id: 'p3', score1: 2, score2: 1, completed: true, completedAt: '2026-01-01' },
  { id: 4, player1Id: 'p1', player2Id: 'p4', score1: null, score2: null, completed: false },
]

// A draw fixture: p2 vs p3 ends 1:1
const matchesWithDraw = [
  ...completedMatches.slice(0, 2),
  { id: 3, player1Id: 'p2', player2Id: 'p3', score1: 1, score2: 1, completed: true, completedAt: '2026-01-01' },
  completedMatches[3],
]

// ---------------------------------------------------------------------------
// calculatePlayerStats
// ---------------------------------------------------------------------------
describe('calculatePlayerStats', () => {
  it('returns null for a non-existent player', () => {
    expect(calculatePlayerStats('unknown', players, completedMatches, defaultSettings)).toBeNull()
  })

  it('calculates correct stats for Alice (2 wins, 0 losses)', () => {
    const stats = calculatePlayerStats('p1', players, completedMatches, defaultSettings)
    expect(stats).toMatchObject({
      playerId: 'p1',
      name: 'Alice',
      played: 2,
      won: 2,
      lost: 0,
      draws: 0,
      setsWon: 4,
      setsLost: 1,
      setsDiff: 3,
      points: 6,
      winRate: 100,
    })
    expect(stats.form).toEqual(['W', 'W'])
  })

  it('calculates correct stats for Bob (1 win, 1 loss)', () => {
    const stats = calculatePlayerStats('p2', players, completedMatches, defaultSettings)
    expect(stats).toMatchObject({
      playerId: 'p2',
      name: 'Bob',
      played: 2,
      won: 1,
      lost: 1,
      draws: 0,
      setsWon: 3,
      setsLost: 3,
      setsDiff: 0,
      points: 3,
      winRate: 50,
    })
    expect(stats.form).toEqual(['L', 'W'])
  })

  it('calculates correct stats for Charlie (0 wins, 2 losses)', () => {
    const stats = calculatePlayerStats('p3', players, completedMatches, defaultSettings)
    expect(stats).toMatchObject({
      played: 2,
      won: 0,
      lost: 2,
      setsWon: 1,
      setsLost: 4,
      setsDiff: -3,
      points: 0,
      winRate: 0,
    })
  })

  it('returns 0s for a player with no completed matches', () => {
    const stats = calculatePlayerStats('p4', players, completedMatches, defaultSettings)
    expect(stats).toMatchObject({
      played: 0,
      won: 0,
      lost: 0,
      draws: 0,
      setsWon: 0,
      setsLost: 0,
      setsDiff: 0,
      points: 0,
      winRate: 0,
    })
    expect(stats.form).toEqual([])
  })

  it('handles draws correctly', () => {
    const stats = calculatePlayerStats('p2', players, matchesWithDraw, defaultSettings)
    expect(stats.draws).toBe(1)
    expect(stats.lost).toBe(1)
    expect(stats.won).toBe(0)
    expect(stats.points).toBe(1) // 0 wins * 3 + 1 draw * 1
    expect(stats.form).toContain('D')
  })

  it('respects custom point settings', () => {
    const customSettings = { pointsForWin: 2, pointsForDraw: 1, pointsForLoss: -1 }
    const stats = calculatePlayerStats('p2', players, completedMatches, customSettings)
    // Bob: 1 win (2pts) + 1 loss (-1pt) = 1pt
    expect(stats.points).toBe(1)
  })

  it('form array is limited to last 5 results', () => {
    // Create 7 matches for p1 so the form should only show last 5
    const manyMatches = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      player1Id: 'p1',
      player2Id: 'p2',
      score1: i % 2 === 0 ? 2 : 0,
      score2: i % 2 === 0 ? 1 : 2,
      completed: true,
    }))
    const stats = calculatePlayerStats('p1', players, manyMatches, defaultSettings)
    expect(stats.form).toHaveLength(5)
  })

  it('returns correct stats with an empty matches array', () => {
    const stats = calculatePlayerStats('p1', players, [], defaultSettings)
    expect(stats).toMatchObject({
      played: 0,
      won: 0,
      lost: 0,
      draws: 0,
      points: 0,
      winRate: 0,
    })
  })
})

// ---------------------------------------------------------------------------
// calculateStandings
// ---------------------------------------------------------------------------
describe('calculateStandings', () => {
  it('sorts players by points descending, then by set difference', () => {
    const standings = calculateStandings(players, completedMatches, defaultSettings)
    expect(standings[0].name).toBe('Alice')   // 6 pts, setsDiff +3
    expect(standings[1].name).toBe('Bob')     // 3 pts, setsDiff 0
    // Diana 0 pts, setsDiff 0 ranks above Charlie 0 pts, setsDiff -3
    expect(standings[2].name).toBe('Diana')
    expect(standings[3].name).toBe('Charlie')
  })

  it('uses set difference as tiebreaker', () => {
    // Charlie and Diana both have 0 points. Charlie has setsDiff -3, Diana has 0.
    // Diana should rank above Charlie.
    const standings = calculateStandings(players, completedMatches, defaultSettings)
    const charlieIdx = standings.findIndex(s => s.name === 'Charlie')
    const dianaIdx = standings.findIndex(s => s.name === 'Diana')
    expect(dianaIdx).toBeLessThan(charlieIdx)
  })

  it('returns all players even if they have no matches', () => {
    const standings = calculateStandings(players, [], defaultSettings)
    expect(standings).toHaveLength(4)
    standings.forEach(s => {
      expect(s.points).toBe(0)
    })
  })

  it('handles a single player gracefully', () => {
    const singlePlayer = [{ id: 'p1', name: 'Alice' }]
    const standings = calculateStandings(singlePlayer, [], defaultSettings)
    expect(standings).toHaveLength(1)
    expect(standings[0].name).toBe('Alice')
  })

  it('further tiebreaker: setsWon, then wins', () => {
    // Construct a scenario where two players have equal points and equal setsDiff
    const tiedPlayers = [
      { id: 'pa', name: 'Alpha' },
      { id: 'pb', name: 'Beta' },
    ]
    // Both have 1 win, 1 loss => 3 pts each. Alpha has 4 setsWon, Beta has 3.
    const tiedMatches = [
      { id: 1, player1Id: 'pa', player2Id: 'pb', score1: 3, score2: 1, completed: true },
      { id: 2, player1Id: 'pb', player2Id: 'pa', score1: 3, score2: 1, completed: true },
    ]
    // Alpha: 3+1=4 won, 1+3=4 lost, diff=0; Beta: 1+3=4 won, 3+1=4 lost, diff=0
    // Same points(3), same diff(0), same setsWon(4), same wins(1) => stable
    const standings = calculateStandings(tiedPlayers, tiedMatches, defaultSettings)
    expect(standings).toHaveLength(2)
    expect(standings[0].points).toBe(standings[1].points)
  })
})

// ---------------------------------------------------------------------------
// calculateHeadToHead
// ---------------------------------------------------------------------------
describe('calculateHeadToHead', () => {
  it('returns correct h2h record for Alice vs Bob (Alice won)', () => {
    const records = calculateHeadToHead('p1', players, completedMatches)
    const vsBob = records.find(r => r.opponentId === 'p2')
    expect(vsBob).toMatchObject({
      opponentName: 'Bob',
      wins: 1,
      losses: 0,
      draws: 0,
      setsWon: 2,
      setsLost: 1,
      played: true,
    })
    expect(vsBob.matches).toHaveLength(1)
    expect(vsBob.matches[0].score).toBe('2:1')
    expect(vsBob.matches[0].won).toBe(true)
  })

  it('returns correct h2h from the losing side (Bob vs Alice)', () => {
    const records = calculateHeadToHead('p2', players, completedMatches)
    const vsAlice = records.find(r => r.opponentId === 'p1')
    expect(vsAlice).toMatchObject({
      wins: 0,
      losses: 1,
      setsWon: 1,
      setsLost: 2,
      played: true,
    })
    expect(vsAlice.matches[0].won).toBe(false)
  })

  it('marks unplayed opponents with played: false', () => {
    const records = calculateHeadToHead('p4', players, completedMatches)
    // Diana has no completed matches against anyone
    records.forEach(r => {
      expect(r.played).toBe(false)
      expect(r.wins).toBe(0)
      expect(r.losses).toBe(0)
      expect(r.matches).toEqual([])
    })
  })

  it('does not include the player themselves in records', () => {
    const records = calculateHeadToHead('p1', players, completedMatches)
    expect(records.find(r => r.opponentId === 'p1')).toBeUndefined()
  })

  it('sorts played opponents before unplayed, then by wins', () => {
    const records = calculateHeadToHead('p1', players, completedMatches)
    // p2 and p3 are played (both with 1 win for Alice), p4 is unplayed
    const lastRecord = records[records.length - 1]
    expect(lastRecord.played).toBe(false)
  })

  it('handles draws in h2h', () => {
    const records = calculateHeadToHead('p2', players, matchesWithDraw)
    const vsCharlie = records.find(r => r.opponentId === 'p3')
    expect(vsCharlie.draws).toBe(1)
    expect(vsCharlie.wins).toBe(0)
    expect(vsCharlie.losses).toBe(0)
    expect(vsCharlie.matches[0].draw).toBe(true)
  })

  it('returns empty records array with an empty match list', () => {
    const records = calculateHeadToHead('p1', players, [])
    expect(records).toHaveLength(3) // 3 opponents
    records.forEach(r => {
      expect(r.played).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// getRemainingMatches
// ---------------------------------------------------------------------------
describe('getRemainingMatches', () => {
  it('returns incomplete matches for a player', () => {
    const remaining = getRemainingMatches('p1', players, completedMatches)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toMatchObject({
      matchId: 4,
      opponentName: 'Diana',
    })
  })

  it('returns empty array when all matches are completed', () => {
    const allCompleted = completedMatches.map(m => ({ ...m, completed: true }))
    const remaining = getRemainingMatches('p1', players, allCompleted)
    expect(remaining).toHaveLength(0)
  })

  it('returns empty array for a player not in any match', () => {
    const remaining = getRemainingMatches('unknown', players, completedMatches)
    expect(remaining).toHaveLength(0)
  })

  it('returns "Unknown" for opponent not found in players list', () => {
    const matchesWithMissing = [
      { id: 1, player1Id: 'p1', player2Id: 'missing_player', completed: false },
    ]
    const remaining = getRemainingMatches('p1', players, matchesWithMissing)
    expect(remaining[0].opponentName).toBe('Unknown')
  })
})

// ---------------------------------------------------------------------------
// getRestingPlayers
// ---------------------------------------------------------------------------
describe('getRestingPlayers', () => {
  const allMatches = [
    { id: 1, player1Id: 'p1', player2Id: 'p2', completed: true },
    { id: 2, player1Id: 'p3', player2Id: 'p4', completed: true },
    { id: 3, player1Id: 'p1', player2Id: 'p3', completed: false },
  ]

  it('returns players not in the current match', () => {
    // Current match index 2 (p1 vs p3) => resting: p2, p4
    const resting = getRestingPlayers(players, allMatches, 2)
    const restingIds = resting.map(p => p.id)
    expect(restingIds).toContain('p2')
    expect(restingIds).toContain('p4')
    expect(restingIds).not.toContain('p1')
    expect(restingIds).not.toContain('p3')
  })

  it('sorts by wait count descending', () => {
    const resting = getRestingPlayers(players, allMatches, 2)
    // p2 last played in match index 0, so wait since then: match index 1 is completed and p2 not in it => waitCount = 1
    // p4 last played in match index 1 => waitCount = 0
    expect(resting[0].id).toBe('p2')
    expect(resting[0].waitCount).toBeGreaterThanOrEqual(resting[1].waitCount)
  })

  it('returns empty array for invalid current match index', () => {
    const resting = getRestingPlayers(players, allMatches, 99)
    expect(resting).toEqual([])
  })

  it('returns all other players with waitCount 0 when it is the first match', () => {
    const resting = getRestingPlayers(players, allMatches, 0)
    // Current match is p1 vs p2 => resting: p3, p4 with waitCount 0
    resting.forEach(p => {
      expect(p.waitCount).toBe(0)
    })
  })
})
