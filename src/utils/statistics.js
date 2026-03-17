/**
 * Calculates comprehensive player statistics from match results
 *
 * @param {string} playerId - Player ID
 * @param {Array} players - All players
 * @param {Array} matches - All matches
 * @param {Object} settings - Tournament settings (points for win/draw/loss)
 * @returns {Object} - Player statistics
 */
export function calculatePlayerStats(playerId, players, matches, settings) {
  const player = players.find(p => p.id === playerId);
  if (!player) return null;

  const playerMatches = matches.filter(
    m => (m.player1Id === playerId || m.player2Id === playerId) && m.completed
  );

  let won = 0;
  let lost = 0;
  let draws = 0;
  let setsWon = 0;
  let setsLost = 0;
  const form = [];

  playerMatches.forEach(match => {
    const isPlayer1 = match.player1Id === playerId;
    const myScore = isPlayer1 ? match.score1 : match.score2;
    const oppScore = isPlayer1 ? match.score2 : match.score1;

    setsWon += myScore;
    setsLost += oppScore;

    if (myScore > oppScore) {
      won++;
      form.push('W');
    } else if (myScore < oppScore) {
      lost++;
      form.push('L');
    } else {
      draws++;
      form.push('D');
    }
  });

  const points =
    won * settings.pointsForWin +
    draws * settings.pointsForDraw +
    lost * settings.pointsForLoss;

  const played = won + lost + draws;
  const winRate = played > 0 ? Math.round((won / played) * 100) : 0;

  return {
    playerId,
    name: player.name,
    played,
    won,
    lost,
    draws,
    setsWon,
    setsLost,
    setsDiff: setsWon - setsLost,
    points,
    winRate,
    form: form.slice(-5) // Last 5 matches
  };
}

/**
 * Calculates head-to-head record between a player and all opponents
 *
 * @param {string} playerId - Player ID
 * @param {Array} players - All players
 * @param {Array} matches - All matches
 * @returns {Array} - Head-to-head records
 */
export function calculateHeadToHead(playerId, players, matches) {
  const records = [];

  players.forEach(opponent => {
    if (opponent.id === playerId) return;

    const h2hMatches = matches.filter(
      m =>
        m.completed &&
        ((m.player1Id === playerId && m.player2Id === opponent.id) ||
          (m.player2Id === playerId && m.player1Id === opponent.id))
    );

    if (h2hMatches.length === 0) {
      records.push({
        opponentId: opponent.id,
        opponentName: opponent.name,
        wins: 0,
        losses: 0,
        draws: 0,
        setsWon: 0,
        setsLost: 0,
        matches: [],
        played: false
      });
      return;
    }

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let setsWon = 0;
    let setsLost = 0;
    const matchResults = [];

    h2hMatches.forEach(match => {
      const isPlayer1 = match.player1Id === playerId;
      const myScore = isPlayer1 ? match.score1 : match.score2;
      const oppScore = isPlayer1 ? match.score2 : match.score1;

      setsWon += myScore;
      setsLost += oppScore;

      const won = myScore > oppScore;
      const draw = myScore === oppScore;

      if (won) wins++;
      else if (draw) draws++;
      else losses++;

      matchResults.push({
        matchId: match.id,
        score: `${myScore}:${oppScore}`,
        sets: match.sets || [],
        won,
        draw
      });
    });

    records.push({
      opponentId: opponent.id,
      opponentName: opponent.name,
      wins,
      losses,
      draws,
      setsWon,
      setsLost,
      matches: matchResults,
      played: true
    });
  });

  // Sort: played first, then by wins
  return records.sort((a, b) => {
    if (a.played !== b.played) return b.played - a.played;
    return b.wins - a.wins;
  });
}

/**
 * Gets remaining matches for a player
 *
 * @param {string} playerId - Player ID
 * @param {Array} players - All players
 * @param {Array} matches - All matches
 * @returns {Array} - Remaining matches
 */
export function getRemainingMatches(playerId, players, matches) {
  return matches.filter(
    m =>
      !m.completed &&
      (m.player1Id === playerId || m.player2Id === playerId)
  ).map(match => {
    const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id;
    const opponent = players.find(p => p.id === opponentId);
    return {
      matchId: match.id,
      opponentName: opponent?.name || 'Unknown'
    };
  });
}

/**
 * Calculates standings for all players
 *
 * @param {Array} players - All players
 * @param {Array} matches - All matches
 * @param {Object} settings - Tournament settings
 * @returns {Array} - Sorted standings
 */
export function calculateStandings(players, matches, settings) {
  const stats = players.map(player =>
    calculatePlayerStats(player.id, players, matches, settings)
  );

  // Sort by: points DESC, set difference DESC, sets won DESC, wins DESC
  return stats.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
    if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
    return b.won - a.won;
  });
}

/**
 * Calculates how long each player has been waiting
 *
 * @param {Array} players - All players
 * @param {Array} matches - All matches
 * @param {number} currentMatchIndex - Current match index
 * @returns {Array} - Players with wait counts, sorted by wait time DESC
 */
export function getRestingPlayers(players, matches, currentMatchIndex) {
  const currentMatch = matches[currentMatchIndex];
  if (!currentMatch) return [];

  const playingNow = [currentMatch.player1Id, currentMatch.player2Id];
  const restingPlayers = players.filter(p => !playingNow.includes(p.id));

  return restingPlayers.map(player => {
    let waitCount = 0;

    // Count backwards from current match
    for (let i = currentMatchIndex - 1; i >= 0; i--) {
      const match = matches[i];
      if (!match.completed) continue;

      if (match.player1Id === player.id || match.player2Id === player.id) {
        break;
      }
      waitCount++;
    }

    return {
      ...player,
      waitCount
    };
  }).sort((a, b) => b.waitCount - a.waitCount);
}

// ---------------------------------------------------------------------------
// Cross-session utilities (name-based matching across tournaments)
// ---------------------------------------------------------------------------

/**
 * Normalizes a player name for consistent matching across tournaments.
 *
 * @param {string} name - Raw player name
 * @returns {string} - Lowercased, trimmed name
 */
function normalizeName(name) {
  return (name || '').trim().toLowerCase();
}

/**
 * Collects all completed head-to-head matches between two players
 * across all tournaments, sorted chronologically by completedAt.
 *
 * Players are matched by name (case-insensitive, trimmed).
 *
 * @param {string} playerName1 - First player name
 * @param {string} playerName2 - Second player name
 * @param {Array} tournaments - Array of tournament objects
 * @returns {Array} - Sorted array of { winner, isDraw, completedAt }
 *   where winner is the normalized name of the match winner, or null on draw
 */
function collectH2HMatches(playerName1, playerName2, tournaments) {
  const n1 = normalizeName(playerName1);
  const n2 = normalizeName(playerName2);

  if (!n1 || !n2 || n1 === n2) return [];

  const h2hMatches = [];

  for (const tournament of tournaments) {
    const players = tournament.players || [];
    const matches = tournament.matches || [];

    // Build id -> normalized name map for this tournament
    const idToName = {};
    for (const player of players) {
      idToName[player.id] = normalizeName(player.name);
    }

    for (const match of matches) {
      if (!match.completed) continue;

      const mn1 = idToName[match.player1Id];
      const mn2 = idToName[match.player2Id];

      // Check if this match is between our two target players
      const isH2H =
        (mn1 === n1 && mn2 === n2) || (mn1 === n2 && mn2 === n1);

      if (!isH2H) continue;

      // Determine the winner from the perspective of normalized names
      let winner = null;
      let isDraw = false;

      if (match.score1 > match.score2) {
        winner = mn1;
      } else if (match.score2 > match.score1) {
        winner = mn2;
      } else {
        isDraw = true;
      }

      h2hMatches.push({
        winner,
        isDraw,
        completedAt: match.completedAt || null,
      });
    }
  }

  // Sort chronologically — matches without completedAt go first (oldest)
  h2hMatches.sort((a, b) => {
    if (!a.completedAt && !b.completedAt) return 0;
    if (!a.completedAt) return -1;
    if (!b.completedAt) return 1;
    return new Date(a.completedAt) - new Date(b.completedAt);
  });

  return h2hMatches;
}

/**
 * Calculates win streaks between two players from a chronological list of matches.
 *
 * Processes matches in order and tracks consecutive wins for each player.
 * Draws reset the streak for both players.
 *
 * @param {string} playerName1 - First player name
 * @param {string} playerName2 - Second player name
 * @param {Array} tournaments - Array of tournament objects
 * @returns {{ currentStreak: { name: string|null, count: number }, longestStreak: { name: string|null, count: number } }}
 *   - currentStreak: who is winning consecutively right now (most recent)
 *   - longestStreak: all-time longest win streak between these two
 */
export function calculateStreak(playerName1, playerName2, tournaments) {
  const n1 = normalizeName(playerName1);
  const n2 = normalizeName(playerName2);

  const emptyResult = {
    currentStreak: { name: null, count: 0 },
    longestStreak: { name: null, count: 0 },
  };

  if (!n1 || !n2 || n1 === n2) return emptyResult;

  const h2hMatches = collectH2HMatches(playerName1, playerName2, tournaments);
  if (h2hMatches.length === 0) return emptyResult;

  // Collect display names (preserve original casing)
  const displayNames = {};
  for (const tournament of tournaments) {
    for (const player of tournament.players || []) {
      const key = normalizeName(player.name);
      if (key === n1 || key === n2) {
        displayNames[key] = player.name.trim();
      }
    }
  }

  let currentName = null;
  let currentCount = 0;
  let longestName = null;
  let longestCount = 0;

  for (const match of h2hMatches) {
    if (match.isDraw) {
      // Draw resets streak
      currentName = null;
      currentCount = 0;
      continue;
    }

    if (match.winner === currentName) {
      currentCount++;
    } else {
      currentName = match.winner;
      currentCount = 1;
    }

    if (currentCount > longestCount) {
      longestCount = currentCount;
      longestName = currentName;
    }
  }

  return {
    currentStreak: {
      name: currentName ? (displayNames[currentName] || currentName) : null,
      count: currentCount,
    },
    longestStreak: {
      name: longestName ? (displayNames[longestName] || longestName) : null,
      count: longestCount,
    },
  };
}

/**
 * Calculates cross-session head-to-head record between two players
 * across all tournaments and sparring sessions.
 *
 * Players are matched by name (case-insensitive, trimmed) so that the
 * same person appearing in different tournaments is aggregated.
 *
 * @param {string} playerName1 - First player name
 * @param {string} playerName2 - Second player name
 * @param {Array} tournaments - Array of tournament objects, each with
 *   `players: [{id, name}]` and `matches: [{player1Id, player2Id, score1, score2, completed, completedAt}]`
 * @returns {{ p1Wins: number, p2Wins: number, draws: number, totalMatches: number,
 *             currentStreak: { name: string|null, count: number },
 *             longestStreak: { name: string|null, count: number } }}
 */
export function calculateCrossSessionH2H(playerName1, playerName2, tournaments) {
  const n1 = normalizeName(playerName1);
  const n2 = normalizeName(playerName2);

  const emptyResult = {
    p1Wins: 0,
    p2Wins: 0,
    draws: 0,
    totalMatches: 0,
    currentStreak: { name: null, count: 0 },
    longestStreak: { name: null, count: 0 },
  };

  if (!n1 || !n2 || n1 === n2 || !tournaments || tournaments.length === 0) {
    return emptyResult;
  }

  const h2hMatches = collectH2HMatches(playerName1, playerName2, tournaments);
  if (h2hMatches.length === 0) return emptyResult;

  let p1Wins = 0;
  let p2Wins = 0;
  let draws = 0;

  for (const match of h2hMatches) {
    if (match.isDraw) {
      draws++;
    } else if (match.winner === n1) {
      p1Wins++;
    } else {
      p2Wins++;
    }
  }

  const { currentStreak, longestStreak } = calculateStreak(
    playerName1,
    playerName2,
    tournaments
  );

  return {
    p1Wins,
    p2Wins,
    draws,
    totalMatches: h2hMatches.length,
    currentStreak,
    longestStreak,
  };
}
