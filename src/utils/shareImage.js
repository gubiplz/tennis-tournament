/**
 * Generates a result card image using HTML5 Canvas API.
 * Two layouts: sparring (H2H) and tournament (podium).
 * No emoji — uses text and shapes only (emoji don't render on Canvas).
 *
 * @returns {Promise<Blob>} PNG blob
 */
export async function generateResultImage({ gameType, name, date, players, matches, standings }) {
  const W = 1080;
  const H = 1920;
  const FONT = "system-ui, -apple-system, sans-serif";

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // --- Background ---
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0f4c2e');
  bgGrad.addColorStop(0.4, '#166534');
  bgGrad.addColorStop(1, '#0a3520');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow at top
  const glow = ctx.createRadialGradient(W / 2, 200, 50, W / 2, 200, 600);
  glow.addColorStop(0, 'rgba(74, 222, 128, 0.15)');
  glow.addColorStop(1, 'rgba(74, 222, 128, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // --- Inner card ---
  const m = 50;
  roundedRect(ctx, m, m, W - m * 2, H - m * 2, 32);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fill();
  roundedRect(ctx, m, m, W - m * 2, H - m * 2, 32);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // --- Header: tennis ball icon + title ---
  let y = 160;
  drawTennisBall(ctx, W / 2, y, 40);

  y += 80;
  ctx.font = `800 52px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(gameType === 'sparring' ? 'SPARRING' : 'TURNIEJ TENISA', W / 2, y);

  if (name) {
    y += 50;
    ctx.font = `400 32px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(truncateText(ctx, name, W - 200), W / 2, y);
  }

  y += 50;
  drawDivider(ctx, y, W);

  if (gameType === 'sparring') {
    drawSparringCard(ctx, { W, H, FONT, players, matches, y });
  } else {
    drawTournamentCard(ctx, { W, H, FONT, standings, y });
  }

  // --- Footer ---
  drawFooter(ctx, W, H, FONT, date);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

// ─── Helpers ──────────────────────────────────────────────

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

function drawTennisBall(ctx, x, y, r) {
  // Yellow-green ball
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, '#d4e157');
  grad.addColorStop(1, '#9ccc65');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  // Seam line
  ctx.beginPath();
  ctx.arc(x, y, r * 0.7, -0.8, 0.8);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawDivider(ctx, y, W) {
  const padX = 140;
  const grad = ctx.createLinearGradient(padX, y, W - padX, y);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.25)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
  grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.25)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(padX, y, W - padX * 2, 1.5);
}

function drawFooter(ctx, W, H, FONT, date) {
  ctx.textAlign = 'center';

  if (date) {
    ctx.font = `500 30px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText(date, W / 2, H - 180);
  }

  ctx.font = `600 28px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillText('tennis-turniej.netlify.app', W / 2, H - 130);

  drawTennisBall(ctx, W / 2, H - 85, 16);
}

function drawAvatar(ctx, x, y, radius, name, FONT, highlight) {
  const initial = (name || '?')[0].toUpperCase();

  // Glow for winner
  if (highlight) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Circle bg
  const grad = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0.06)');
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Initial
  ctx.font = `700 ${Math.round(radius * 0.85)}px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, x, y + 2);
  ctx.textBaseline = 'alphabetic';
}

// ─── Sparring card ────────────────────────────────────────

function drawSparringCard(ctx, { W, FONT, players, matches, y }) {
  const cx = W / 2;
  const p1 = players[0]?.name || 'Gracz 1';
  const p2 = players[1]?.name || 'Gracz 2';

  const completed = (matches || []).filter(m => m.completed);
  let w1 = 0, w2 = 0;
  completed.forEach(m => {
    if (m.score1 > m.score2) w1++;
    else if (m.score2 > m.score1) w2++;
  });

  // Avatars
  y += 90;
  const spacing = 200;
  drawAvatar(ctx, cx - spacing, y, 65, p1, FONT, w1 > w2);
  drawAvatar(ctx, cx + spacing, y, 65, p2, FONT, w2 > w1);

  // Names
  y += 95;
  ctx.font = `700 42px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(truncateText(ctx, p1, 300), cx - spacing, y);
  ctx.fillText(truncateText(ctx, p2, 300), cx + spacing, y);

  // Big score
  y += 110;
  ctx.font = `800 140px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${w1}`, cx - 110, y);

  ctx.font = `300 90px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText(':', cx, y - 10);

  ctx.font = `800 140px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${w2}`, cx + 110, y);

  // Match count
  y += 50;
  ctx.font = `400 30px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  const n = completed.length;
  const word = n === 1 ? 'mecz' : (n >= 2 && n <= 4) ? 'mecze' : 'meczów';
  ctx.fillText(`${n} ${word}`, cx, y);

  // Winner
  y += 65;
  if (w1 !== w2) {
    const winner = w1 > w2 ? p1 : p2;
    ctx.font = `700 38px ${FONT}`;
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`Wygrywa ${winner}!`, cx, y);
  } else {
    ctx.font = `700 38px ${FONT}`;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Remis!', cx, y);
  }

  // Divider
  y += 55;
  drawDivider(ctx, y, W);

  // Match details
  y += 50;
  ctx.font = `600 26px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('WYNIKI MECZÓW', cx, y);

  const maxShow = Math.min(completed.length, 8);
  for (let i = 0; i < maxShow; i++) {
    const match = completed[i];
    y += 52;

    const setsStr = match.sets?.length > 0
      ? match.sets.map(s => `${s[0]}:${s[1]}`).join('   ')
      : `${match.score1}:${match.score2}`;

    // Number
    ctx.font = `500 26px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}.`, 140, y);

    // Winner name
    const winnerName = match.score1 > match.score2 ? p1 : match.score2 > match.score1 ? p2 : '';
    if (winnerName) {
      ctx.font = `600 26px ${FONT}`;
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'left';
      ctx.fillText(truncateText(ctx, winnerName, 200), 185, y);
    }

    // Score
    ctx.font = `600 30px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'right';
    ctx.fillText(setsStr, W - 140, y);
  }

  if (completed.length > maxShow) {
    y += 45;
    ctx.font = `400 26px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${completed.length - maxShow} więcej`, cx, y);
  }
}

// ─── Tournament card ──────────────────────────────────────

function drawTournamentCard(ctx, { W, FONT, standings, y }) {
  const cx = W / 2;
  const max = Math.min(standings?.length || 0, 8);

  y += 60;
  ctx.font = `600 26px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('KLASYFIKACJA', cx, y);

  const medalLabels = ['1.', '2.', '3.'];
  const medalColors = ['#fbbf24', '#cbd5e1', '#f97316'];
  const rowH = 100;

  y += 30;

  for (let i = 0; i < max; i++) {
    const p = standings[i];
    y += rowH;

    const rowPad = 110;
    const rowW = W - rowPad * 2;

    // Row bg for top 3
    if (i < 3) {
      roundedRect(ctx, rowPad, y - 65, rowW, 80, 16);
      ctx.fillStyle = `${medalColors[i]}15`;
      ctx.fill();
      roundedRect(ctx, rowPad, y - 65, rowW, 80, 16);
      ctx.strokeStyle = `${medalColors[i]}30`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Rank
    ctx.font = i < 3 ? `800 42px ${FONT}` : `600 34px ${FONT}`;
    ctx.fillStyle = i < 3 ? medalColors[i] : 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'left';
    ctx.fillText(i < 3 ? medalLabels[i] : `${i + 1}.`, rowPad + 20, y);

    // Name
    ctx.font = i < 3 ? `700 42px ${FONT}` : `500 36px ${FONT}`;
    ctx.fillStyle = i < 3 ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'left';
    ctx.fillText(truncateText(ctx, p.name, 420), rowPad + 90, y);

    // Points
    ctx.font = `800 38px ${FONT}`;
    ctx.fillStyle = i < 3 ? '#4ade80' : 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'right';
    ctx.fillText(`${p.points}pkt`, W - rowPad - 15, y);

    // W/L
    if (i < 5) {
      ctx.font = `400 24px ${FONT}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'right';
      const rec = `${p.won}W ${p.draws > 0 ? p.draws + 'R ' : ''}${p.lost}L`;
      ctx.fillText(rec, W - rowPad - 15, y + 30);
    }
  }
}

// ─── Text truncation ──────────────────────────────────────

function truncateText(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '...').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '...';
}
