/**
 * Generates a result card image using HTML5 Canvas API.
 * Matches the app's visual style: same avatar colors and initials.
 *
 * @returns {Promise<Blob>} PNG blob
 */

// Same colors as in helpers.js AVATAR_COLORS, mapped to hex pairs [from, to]
const AVATAR_HEX = [
  ['#60a5fa', '#2563eb'], // blue
  ['#c084fc', '#9333ea'], // purple
  ['#f472b6', '#db2777'], // pink
  ['#f87171', '#dc2626'], // red
  ['#fb923c', '#ea580c'], // orange
  ['#fbbf24', '#d97706'], // amber
  ['#34d399', '#059669'], // emerald
  ['#2dd4bf', '#0d9488'], // teal
  ['#22d3ee', '#0891b2'], // cyan
  ['#818cf8', '#4f46e5'], // indigo
  ['#a78bfa', '#7c3aed'], // violet
  ['#fb7185', '#e11d48'], // rose
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getColorPair(name) {
  return AVATAR_HEX[hashString(name || '') % AVATAR_HEX.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
}

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

  // Radial glow
  const glow = ctx.createRadialGradient(W / 2, 300, 50, W / 2, 300, 500);
  glow.addColorStop(0, 'rgba(74, 222, 128, 0.12)');
  glow.addColorStop(1, 'rgba(74, 222, 128, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Inner card
  const m = 50;
  roundedRect(ctx, m, m, W - m * 2, H - m * 2, 32);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fill();
  roundedRect(ctx, m, m, W - m * 2, H - m * 2, 32);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header
  let y = 180;
  ctx.font = `800 52px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(gameType === 'sparring' ? 'SPARRING' : 'TURNIEJ TENISA', W / 2, y);

  if (name) {
    y += 48;
    ctx.font = `400 32px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillText(truncateText(ctx, name, W - 200), W / 2, y);
  }

  y += 50;
  drawDivider(ctx, y, W);

  if (gameType === 'sparring') {
    drawSparringCard(ctx, { W, FONT, players, matches, y });
  } else {
    drawTournamentCard(ctx, { W, FONT, standings, y });
  }

  // Footer
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
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(date, W / 2, H - 160);
  }
  ctx.font = `600 26px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillText('tennis-turniej.netlify.app', W / 2, H - 110);
}

function drawAvatar(ctx, x, y, radius, name, FONT) {
  const [c1, c2] = getColorPair(name);
  const initials = getInitials(name);

  // Gradient circle matching app colors
  const grad = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // White border like in app
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Shadow
  ctx.beginPath();
  ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Initials
  ctx.font = `700 ${Math.round(radius * 0.85)}px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, x, y + 2);
  ctx.textBaseline = 'alphabetic';
}

// ─── Sparring ─────────────────────────────────────────────

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
  y += 100;
  const spacing = 220;
  drawAvatar(ctx, cx - spacing, y, 75, p1, FONT);
  drawAvatar(ctx, cx + spacing, y, 75, p2, FONT);

  // Names under avatars
  y += 110;
  ctx.font = `700 44px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(truncateText(ctx, p1, 320), cx - spacing, y);
  ctx.fillText(truncateText(ctx, p2, 320), cx + spacing, y);

  // Big score — shifted down more from players
  y += 130;
  ctx.font = `800 160px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`${w1}`, cx - 120, y);

  ctx.font = `300 100px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillText(':', cx, y - 12);

  ctx.font = `800 160px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${w2}`, cx + 120, y);

  // Match count
  y += 55;
  ctx.font = `400 30px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  const n = completed.length;
  const word = n === 1 ? 'mecz' : (n >= 2 && n <= 4) ? 'mecze' : 'meczów';
  ctx.fillText(`${n} ${word}`, cx, y);

  // Winner
  y += 70;
  if (w1 !== w2) {
    const winner = w1 > w2 ? p1 : p2;
    ctx.font = `700 40px ${FONT}`;
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`Wygrywa ${winner}!`, cx, y);
  } else {
    ctx.font = `700 40px ${FONT}`;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Remis!', cx, y);
  }

  // Divider
  y += 60;
  drawDivider(ctx, y, W);

  // Match details
  y += 50;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
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
    ctx.font = `500 24px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}.`, 140, y);

    // Winner name
    const winnerName = match.score1 > match.score2 ? p1 : match.score2 > match.score1 ? p2 : '';
    if (winnerName) {
      ctx.font = `600 26px ${FONT}`;
      ctx.fillStyle = '#4ade80';
      ctx.textAlign = 'left';
      ctx.fillText(truncateText(ctx, winnerName, 220), 190, y);
    }

    // Score
    ctx.font = `600 28px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'right';
    ctx.fillText(setsStr, W - 140, y);
  }

  if (completed.length > maxShow) {
    y += 45;
    ctx.font = `400 24px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${completed.length - maxShow} więcej`, cx, y);
  }
}

// ─── Tournament ───────────────────────────────────────────

function drawTournamentCard(ctx, { W, FONT, standings, y }) {
  const cx = W / 2;
  const max = Math.min(standings?.length || 0, 8);

  y += 60;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.textAlign = 'center';
  ctx.fillText('KLASYFIKACJA', cx, y);

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
      roundedRect(ctx, rowPad, y - 60, rowW, 75, 16);
      ctx.fillStyle = `${medalColors[i]}12`;
      ctx.fill();
      roundedRect(ctx, rowPad, y - 60, rowW, 75, 16);
      ctx.strokeStyle = `${medalColors[i]}25`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Small avatar for top 3
    if (i < 3) {
      drawAvatar(ctx, rowPad + 40, y - 22, 22, p.name, FONT);
    }

    // Rank
    ctx.font = i < 3 ? `800 36px ${FONT}` : `600 30px ${FONT}`;
    ctx.fillStyle = i < 3 ? medalColors[i] : 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}.`, i < 3 ? rowPad + 75 : rowPad + 20, y);

    // Name
    ctx.font = i < 3 ? `700 40px ${FONT}` : `500 34px ${FONT}`;
    ctx.fillStyle = i < 3 ? '#ffffff' : 'rgba(255, 255, 255, 0.65)';
    ctx.textAlign = 'left';
    ctx.fillText(truncateText(ctx, p.name, 380), i < 3 ? rowPad + 120 : rowPad + 70, y);

    // Points
    ctx.font = `800 36px ${FONT}`;
    ctx.fillStyle = i < 3 ? '#4ade80' : 'rgba(255, 255, 255, 0.45)';
    ctx.textAlign = 'right';
    ctx.fillText(`${p.points}pkt`, W - rowPad - 15, y);

    // W/L
    if (i < 5) {
      ctx.font = `400 22px ${FONT}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.textAlign = 'right';
      const rec = `${p.won}W ${p.draws > 0 ? p.draws + 'R ' : ''}${p.lost}L`;
      ctx.fillText(rec, W - rowPad - 15, y + 28);
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
