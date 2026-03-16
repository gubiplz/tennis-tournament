/**
 * Generates round-robin tournament schedule using the circle method
 * This ensures optimal scheduling with minimal rest gaps for players
 *
 * @param {Array<{id: string, name: string}>} players - Array of player objects
 * @returns {Array<{id: number, round: number, player1Id: string, player2Id: string, score1: null, score2: null, completed: false}>}
 */
export function generateRoundRobin(players) {
  // If odd number of players, add BYE
  const playerList = players.length % 2 === 0
    ? [...players]
    : [...players, { id: 'BYE', name: 'BYE' }];

  const n = playerList.length;
  const rounds = [];

  // Create a working copy of player IDs
  const ids = playerList.map(p => p.id);

  for (let round = 0; round < n - 1; round++) {
    const roundMatches = [];

    for (let i = 0; i < n / 2; i++) {
      const player1Id = ids[i];
      const player2Id = ids[n - 1 - i];

      // Skip matches with BYE
      if (player1Id !== 'BYE' && player2Id !== 'BYE') {
        roundMatches.push({
          player1Id,
          player2Id,
          round: round + 1
        });
      }
    }

    rounds.push(roundMatches);

    // Rotate: first stays fixed, rest rotate clockwise
    const fixed = ids[0];
    const rotated = [fixed, ids[n - 1], ...ids.slice(1, n - 1)];
    ids.splice(0, n, ...rotated);
  }

  // Optimize match sequence to minimize player wait time
  return optimizeMatchSequence(rounds);
}

/**
 * Optimizes match sequence to ensure players don't wait too long
 * Uses a greedy algorithm to balance rest periods
 *
 * @param {Array} rounds - Array of rounds, each containing matches
 * @returns {Array} - Flattened and optimized match sequence
 */
function optimizeMatchSequence(rounds) {
  const allMatches = [];
  const playerLastMatch = {}; // Track when each player last played

  let matchId = 1;

  // Flatten rounds first
  const flatMatches = rounds.flatMap((round, roundIndex) =>
    round.map(match => ({
      ...match,
      originalRound: roundIndex + 1
    }))
  );

  // Greedy scheduling: pick match where both players have waited longest
  const remaining = [...flatMatches];

  while (remaining.length > 0) {
    let bestMatchIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const match = remaining[i];
      const wait1 = matchId - (playerLastMatch[match.player1Id] || 0);
      const wait2 = matchId - (playerLastMatch[match.player2Id] || 0);

      // Score: prefer matches where both players have waited longer
      // But also ensure we don't create too long waits for others
      const minWait = Math.min(wait1, wait2);
      const score = minWait;

      if (score > bestScore) {
        bestScore = score;
        bestMatchIndex = i;
      }
    }

    const selectedMatch = remaining.splice(bestMatchIndex, 1)[0];

    allMatches.push({
      id: matchId,
      round: selectedMatch.originalRound,
      player1Id: selectedMatch.player1Id,
      player2Id: selectedMatch.player2Id,
      score1: null,
      score2: null,
      completed: false,
      completedAt: null,
      editedAt: null
    });

    playerLastMatch[selectedMatch.player1Id] = matchId;
    playerLastMatch[selectedMatch.player2Id] = matchId;
    matchId++;
  }

  return allMatches;
}

/**
 * Calculates the number of matches for n players
 * @param {number} n - Number of players
 * @returns {number} - Total number of matches
 */
export function calculateMatchCount(n) {
  return (n * (n - 1)) / 2;
}

/**
 * Estimates tournament duration based on match count and average match time
 * @param {number} matchCount - Number of matches
 * @param {number} avgMinutes - Average minutes per match (default: 8)
 * @returns {string} - Formatted duration string
 */
export function estimateDuration(matchCount, avgMinutes = 8) {
  const totalMinutes = matchCount * avgMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `~${minutes} min`;
  }
  if (minutes === 0) {
    return `~${hours}h`;
  }
  return `~${hours}h ${minutes}min`;
}
