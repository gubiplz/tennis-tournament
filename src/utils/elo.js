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
 * Calculates the expected score for player A against player B
 * using the standard Elo formula.
 *
 * @param {number} ratingA - Current Elo rating of player A
 * @param {number} ratingB - Current Elo rating of player B
 * @returns {number} - Expected score (0 to 1)
 */
function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Builds a player-ID-to-name lookup map for a single tournament.
 *
 * @param {Array} players - Tournament players array [{id, name}]
 * @returns {Object} - Map of playerId -> normalized name
 */
function buildIdToNameMap(players) {
  const map = {};
  for (const player of players) {
    map[player.id] = normalizeName(player.name);
  }
  return map;
}

/**
 * Collects all completed matches from all tournaments, sorted chronologically.
 * Each returned match carries the normalized names of both players.
 *
 * @param {Array} tournaments - Array of tournament objects
 * @returns {Array} - Sorted array of { name1, name2, score1, score2, completedAt }
 */
function collectAllMatches(tournaments) {
  const allMatches = [];

  for (const tournament of tournaments) {
    const players = tournament.players || [];
    const matches = tournament.matches || [];
    const idToName = buildIdToNameMap(players);

    for (const match of matches) {
      if (!match.completed) continue;

      const name1 = idToName[match.player1Id];
      const name2 = idToName[match.player2Id];

      if (!name1 || !name2) continue;

      allMatches.push({
        name1,
        name2,
        score1: match.score1,
        score2: match.score2,
        completedAt: match.completedAt || null,
      });
    }
  }

  // Sort chronologically — matches without completedAt go first (oldest)
  allMatches.sort((a, b) => {
    if (!a.completedAt && !b.completedAt) return 0;
    if (!a.completedAt) return -1;
    if (!b.completedAt) return 1;
    return new Date(a.completedAt) - new Date(b.completedAt);
  });

  return allMatches;
}

/**
 * Calculates Elo rankings across all tournaments.
 *
 * Players are identified by name (case-insensitive, trimmed) so that
 * the same person appearing in different tournaments is aggregated.
 *
 * Algorithm:
 * - Starting Elo: 1000
 * - K-factor: 32
 * - Winner gains points, loser loses points
 * - On draw, both players adjust toward the average of their ratings
 *
 * @param {Array} tournaments - Array of tournament objects, each with
 *   `players: [{id, name}]` and `matches: [{player1Id, player2Id, score1, score2, completed, completedAt}]`
 * @returns {Array} - Array of `{ name, elo, change }` sorted by elo descending.
 *   `change` is the Elo difference compared to 30 days ago (monthly trend).
 */
export function calculateEloRankings(tournaments) {
  if (!tournaments || tournaments.length === 0) return [];

  const K = 32;
  const START_ELO = 1000;

  const allMatches = collectAllMatches(tournaments);
  if (allMatches.length === 0) return [];

  // Current ratings
  const ratings = {};
  // Display names (preserve original casing from the most recent occurrence)
  const displayNames = {};

  // Snapshot ratings from 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  let snapshotTaken = false;
  const ratingsSnapshot = {};

  // Also collect original-case names from tournaments for display
  for (const tournament of tournaments) {
    for (const player of tournament.players || []) {
      const key = normalizeName(player.name);
      if (key) {
        displayNames[key] = player.name.trim();
      }
    }
  }

  for (const match of allMatches) {
    // Take snapshot just before we process the first match that is after the 30-day cutoff
    if (
      !snapshotTaken &&
      match.completedAt &&
      new Date(match.completedAt) > thirtyDaysAgo
    ) {
      for (const name of Object.keys(ratings)) {
        ratingsSnapshot[name] = ratings[name];
      }
      snapshotTaken = true;
    }

    const { name1, name2, score1, score2 } = match;

    if (!(name1 in ratings)) ratings[name1] = START_ELO;
    if (!(name2 in ratings)) ratings[name2] = START_ELO;

    const r1 = ratings[name1];
    const r2 = ratings[name2];

    const e1 = expectedScore(r1, r2);
    const e2 = expectedScore(r2, r1);

    let s1, s2;
    if (score1 > score2) {
      s1 = 1;
      s2 = 0;
    } else if (score1 < score2) {
      s1 = 0;
      s2 = 1;
    } else {
      s1 = 0.5;
      s2 = 0.5;
    }

    ratings[name1] = Math.round(r1 + K * (s1 - e1));
    ratings[name2] = Math.round(r2 + K * (s2 - e2));
  }

  // If snapshot was never taken (all matches are older than 30 days),
  // snapshot equals current ratings (no change)
  if (!snapshotTaken) {
    for (const name of Object.keys(ratings)) {
      ratingsSnapshot[name] = ratings[name];
    }
  }

  // Build result array
  const result = Object.keys(ratings).map(name => ({
    name: displayNames[name] || name,
    elo: ratings[name],
    change: ratings[name] - (ratingsSnapshot[name] ?? START_ELO),
  }));

  // Sort by elo descending
  result.sort((a, b) => b.elo - a.elo);

  return result;
}
