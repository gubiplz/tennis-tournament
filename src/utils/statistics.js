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
