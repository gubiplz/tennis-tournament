/**
 * Generates a beautiful result card image using HTML5 Canvas API.
 * Supports two layouts: sparring (H2H) and tournament (podium).
 *
 * @param {Object} data
 * @param {string} data.gameType - 'sparring' | 'tournament'
 * @param {string} data.name - tournament/sparring name
 * @param {string} data.date - display date string
 * @param {Array} data.players - [{name}] (sparring: 2 players)
 * @param {Array} data.matches - completed matches with score1, score2, sets
 * @param {Array} data.standings - sorted standings [{name, points, won, lost, draws}]
 * @returns {Promise<Blob>} PNG blob
 */
export async function generateResultImage({ gameType, name, date, players, matches, standings }) {
  const W = 1080;
  const H = 1920;
  const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // --- Background gradient ---
  const bgGrad = ctx.createLinearGradient(0, 0, W * 0.3, H);
  bgGrad.addColorStop(0, '#166534');
  bgGrad.addColorStop(0.5, '#15803d');
  bgGrad.addColorStop(1, '#14532d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // --- Subtle pattern overlay ---
  drawPatternOverlay(ctx, W, H);

  // --- Rounded inner card ---
  const margin = 60;
  const cardX = margin;
  const cardY = margin;
  const cardW = W - margin * 2;
  const cardH = H - margin * 2;
  const radius = 40;

  // Card background with slight transparency
  ctx.save();
  roundedRect(ctx, cardX, cardY, cardW, cardH, radius);
  ctx.clip();

  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  cardGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
  cardGrad.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
  ctx.fillStyle = cardGrad;
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // Card border
  ctx.restore();
  ctx.save();
  roundedRect(ctx, cardX, cardY, cardW, cardH, radius);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  if (gameType === 'sparring') {
    drawSparringCard(ctx, { W, FONT, name, players, matches });
  } else {
    drawTournamentCard(ctx, { W, FONT, name, standings });
  }

  // --- Watermark at bottom ---
  drawWatermark(ctx, W, H, FONT, date);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

// ─── Drawing helpers ──────────────────────────────────────

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawPatternOverlay(ctx, W, H) {
  // Subtle diagonal lines pattern
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDivider(ctx, y, W) {
  const lineY = y;
  const padX = 160;
  const grad = ctx.createLinearGradient(padX, lineY, W - padX, lineY);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.3)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
  grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(padX, lineY, W - padX * 2, 2);
}

function drawWatermark(ctx, W, H, FONT, date) {
  // Date
  ctx.font = `500 36px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'center';
  ctx.fillText(date || '', W / 2, H - 220);

  // App URL
  ctx.font = `600 30px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillText('tennis-turniej.netlify.app', W / 2, H - 160);

  // Small tennis ball decoration
  ctx.font = `28px ${FONT}`;
  ctx.fillText('\uD83C\uDFBE', W / 2, H - 110);
}

function drawPlayerInitialCircle(ctx, x, y, radius, name, FONT) {
  // Get initials
  const parts = (name || '').trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (name || '?')[0].toUpperCase();

  // Circle
  const circleGrad = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  circleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
  circleGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = circleGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Initials text
  ctx.font = `700 ${Math.round(radius * 0.9)}px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, x, y + 2);
  ctx.textBaseline = 'alphabetic';
}

// ─── Sparring card ────────────────────────────────────────

function drawSparringCard(ctx, { W, FONT, name, players, matches }) {
  const centerX = W / 2;
  const p1Name = players[0]?.name || 'Gracz 1';
  const p2Name = players[1]?.name || 'Gracz 2';

  // Count wins
  const completedMatches = (matches || []).filter(m => m.completed);
  let p1Wins = 0;
  let p2Wins = 0;
  completedMatches.forEach(m => {
    if (m.score1 > m.score2) p1Wins++;
    else if (m.score2 > m.score1) p2Wins++;
  });

  // --- Header ---
  let y = 200;
  ctx.font = `56px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('\uD83C\uDFBE  SPARRING', centerX, y);

  y += 50;
  if (name) {
    ctx.font = `400 34px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(truncateText(ctx, name, W - 200), centerX, y);
    y += 30;
  }

  // --- Divider ---
  y += 30;
  drawDivider(ctx, y, W);

  // --- Player avatars + score ---
  y += 100;
  const avatarRadius = 70;
  const avatarSpacing = 200;

  // Player 1 avatar
  drawPlayerInitialCircle(ctx, centerX - avatarSpacing, y, avatarRadius, p1Name, FONT);

  // Player 2 avatar
  drawPlayerInitialCircle(ctx, centerX + avatarSpacing, y, avatarRadius, p2Name, FONT);

  // Player names under avatars
  y += avatarRadius + 50;
  ctx.font = `700 48px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(truncateText(ctx, p1Name, 320), centerX - avatarSpacing, y);
  ctx.fillText(truncateText(ctx, p2Name, 320), centerX + avatarSpacing, y);

  // Big score between players
  y += 100;
  ctx.font = `800 120px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`${p1Wins}`, centerX - 120, y);

  ctx.font = `300 80px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText(':', centerX, y - 8);

  ctx.font = `800 120px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${p2Wins}`, centerX + 120, y);

  // "mecz/meczy/meczow" label
  y += 45;
  ctx.font = `400 32px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  const totalMatches = completedMatches.length;
  const matchWord = totalMatches === 1 ? 'mecz' :
    (totalMatches >= 2 && totalMatches <= 4) ? 'mecze' : 'meczy';
  ctx.fillText(`${totalMatches} ${matchWord}`, centerX, y);

  // --- Winner highlight ---
  y += 60;
  if (p1Wins !== p2Wins) {
    const winner = p1Wins > p2Wins ? p1Name : p2Name;
    ctx.font = `700 40px ${FONT}`;
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`\uD83C\uDFC6  Wygrywa ${winner}!`, centerX, y);
  } else {
    ctx.font = `700 40px ${FONT}`;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Remis!', centerX, y);
  }

  // --- Divider ---
  y += 60;
  drawDivider(ctx, y, W);

  // --- Match details ---
  y += 60;
  ctx.font = `600 30px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'center';
  ctx.fillText('WYNIKI MECZ\u00D3W', centerX, y);

  y += 20;
  const maxMatchesToShow = Math.min(completedMatches.length, 10);
  for (let i = 0; i < maxMatchesToShow; i++) {
    const match = completedMatches[i];
    y += 55;

    const setsStr = match.sets?.length > 0
      ? match.sets.map(s => `${s[0]}:${s[1]}`).join('  ')
      : `${match.score1}:${match.score2}`;

    // Match number
    ctx.font = `500 28px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'left';
    ctx.fillText(`#${i + 1}`, 160, y);

    // Sets score
    ctx.font = `600 32px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'center';
    ctx.fillText(setsStr, centerX, y);

    // Winner indicator
    if (match.score1 > match.score2) {
      ctx.font = `700 28px ${FONT}`;
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'right';
      ctx.fillText(truncateText(ctx, p1Name, 200), W - 160, y);
    } else if (match.score2 > match.score1) {
      ctx.font = `700 28px ${FONT}`;
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'right';
      ctx.fillText(truncateText(ctx, p2Name, 200), W - 160, y);
    }
  }

  if (completedMatches.length > maxMatchesToShow) {
    y += 50;
    ctx.font = `400 28px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${completedMatches.length - maxMatchesToShow} wi\u0119cej`, centerX, y);
  }
}

// ─── Tournament card ──────────────────────────────────────

function drawTournamentCard(ctx, { W, FONT, name, standings }) {
  const centerX = W / 2;

  // --- Header ---
  let y = 200;
  ctx.font = `56px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('\uD83C\uDFC6  TURNIEJ TENISA', centerX, y);

  y += 55;
  if (name) {
    ctx.font = `400 38px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(truncateText(ctx, name, W - 200), centerX, y);
    y += 30;
  }

  // --- Divider ---
  y += 40;
  drawDivider(ctx, y, W);

  // --- Podium title ---
  y += 70;
  ctx.font = `600 30px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('KLASYFIKACJA', centerX, y);

  // --- Standings ---
  const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
  const medalColors = ['#fbbf24', '#d1d5db', '#f59e0b'];
  const rowHeight = 120;
  const maxPlayers = Math.min(standings?.length || 0, 8);

  y += 40;

  for (let i = 0; i < maxPlayers; i++) {
    const player = standings[i];
    y += rowHeight;

    const rowY = y;
    const rowPadX = 120;
    const rowW = W - rowPadX * 2;
    const rowH = 90;

    // Row background for top 3
    if (i < 3) {
      ctx.save();
      roundedRect(ctx, rowPadX, rowY - rowH + 20, rowW, rowH, 20);
      const rowGrad = ctx.createLinearGradient(rowPadX, rowY, rowPadX + rowW, rowY);
      rowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      rowGrad.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
      ctx.fillStyle = rowGrad;
      ctx.fill();

      // Border
      roundedRect(ctx, rowPadX, rowY - rowH + 20, rowW, rowH, 20);
      ctx.strokeStyle = `${medalColors[i]}40`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Medal or rank number
    if (i < 3) {
      ctx.font = `44px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(medals[i], rowPadX + 20, rowY);
    } else {
      ctx.font = `700 36px ${FONT}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}.`, rowPadX + 24, rowY);
    }

    // Player name
    ctx.font = i < 3 ? `700 44px ${FONT}` : `500 38px ${FONT}`;
    ctx.fillStyle = i < 3 ? '#ffffff' : 'rgba(255, 255, 255, 0.75)';
    ctx.textAlign = 'left';
    ctx.fillText(truncateText(ctx, player.name, 450), rowPadX + 100, rowY);

    // Points
    ctx.font = `800 40px ${FONT}`;
    ctx.fillStyle = i < 3 ? '#4ade80' : 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'right';
    ctx.fillText(`${player.points}pkt`, W - rowPadX - 20, rowY);

    // W/L record
    ctx.font = `400 26px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'right';
    const record = `${player.won}W ${player.draws > 0 ? player.draws + 'D ' : ''}${player.lost}L`;
    ctx.fillText(record, W - rowPadX - 20, rowY + 32);
  }
}

// ─── Text truncation ──────────────────────────────────────

function truncateText(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + '\u2026').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '\u2026';
}
