/**
 * Generates a result card image matching the app's light UI style.
 * Clean white background, colored player cards with medals, avatar circles.
 */

const AVATAR_HEX = [
  ['#60a5fa', '#2563eb'],
  ['#c084fc', '#9333ea'],
  ['#f472b6', '#db2777'],
  ['#f87171', '#dc2626'],
  ['#fb923c', '#ea580c'],
  ['#fbbf24', '#d97706'],
  ['#34d399', '#059669'],
  ['#2dd4bf', '#0d9488'],
  ['#22d3ee', '#0891b2'],
  ['#818cf8', '#4f46e5'],
  ['#a78bfa', '#7c3aed'],
  ['#fb7185', '#e11d48'],
];

// Card colors per rank: [bgFill, borderStroke]
const RANK_COLORS = [
  ['#fefce8', '#fde047'],  // 1st — yellow
  ['#f9fafb', '#d1d5db'],  // 2nd — gray
  ['#fff7ed', '#fdba74'],  // 3rd — orange
];

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

function getColors(name) { return AVATAR_HEX[hashStr(name || '') % AVATAR_HEX.length]; }

function getInitials(name) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name[0].toUpperCase();
}

export async function generateResultImage({ gameType, name, date, players, matches, standings }) {
  const W = 1080;
  const F = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const cx = W / 2;
  const PAD = 80;

  // Calculate dynamic height based on content
  let estimatedH;
  if (gameType === 'sparring') {
    const done = (matches || []).filter(m => m.completed);
    const matchRows = Math.min(done.length, 10);
    estimatedH = 900 + matchRows * 70 + 200;
  } else {
    const count = Math.min(standings?.length || 0, 10);
    estimatedH = 650 + count * 160 + 200;
  }
  const H = Math.max(1400, Math.min(1920, estimatedH));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Light background ──
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#f8faf9');
  bg.addColorStop(0.5, '#ffffff');
  bg.addColorStop(1, '#f1f5f3');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle green accent glow at top
  const gl = ctx.createRadialGradient(cx, 0, 50, cx, 0, 500);
  gl.addColorStop(0, 'rgba(22, 163, 74, 0.04)');
  gl.addColorStop(1, 'transparent');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, W, 400);

  let endY;
  if (gameType === 'sparring') {
    endY = drawSparring(ctx, { W, H, F, cx, PAD, name, date, players, matches });
  } else {
    endY = drawTournament(ctx, { W, H, F, cx, PAD, name, date, standings, matches });
  }

  drawFooter(ctx, { W, H, F, cx, endY });

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
  });
}

// ── Avatar ──

function drawAvatar(ctx, x, y, r, name, F) {
  const [c1, c2] = getColors(name);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = r * 0.3;
  ctx.shadowOffsetY = r * 0.08;

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  // Initials
  ctx.font = `700 ${Math.round(r * 0.75)}px ${F}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getInitials(name), x, y + 1);
  ctx.textBaseline = 'alphabetic';
}

// ── Footer ──

function drawFooter(ctx, { H, F, cx, endY }) {
  const fy = Math.max(endY + 60, H - 80);
  ctx.textAlign = 'center';
  ctx.font = `400 22px ${F}`;
  ctx.fillStyle = '#b0b8b4';
  ctx.fillText('tennis-turniej.netlify.app', cx, fy);
}

// ── Sparring ──

function drawSparring(ctx, { W, F, cx, PAD, name, date, players, matches }) {
  const p1 = players[0]?.name || 'Gracz 1';
  const p2 = players[1]?.name || 'Gracz 2';
  const done = (matches || []).filter(m => m.completed);
  let w1 = 0, w2 = 0;
  done.forEach(m => { if (m.score1 > m.score2) w1++; else if (m.score2 > m.score1) w2++; });

  let y = 100;

  // Title
  ctx.textAlign = 'center';
  ctx.font = `800 52px ${F}`;
  ctx.fillStyle = '#111827';
  ctx.fillText('Sparring', cx, y);

  // Name & date
  if (name) {
    y += 45;
    ctx.font = `500 30px ${F}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(trunc(ctx, name, W - 200), cx, y);
  }
  if (date) {
    y += 35;
    ctx.font = `400 26px ${F}`;
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(date, cx, y);
  }

  // ── VS Section ──
  y += 70;
  const spacing = 210;

  drawAvatar(ctx, cx - spacing, y, 60, p1, F);
  drawAvatar(ctx, cx + spacing, y, 60, p2, F);

  // "vs"
  ctx.textAlign = 'center';
  ctx.font = `300 26px ${F}`;
  ctx.fillStyle = '#d1d5db';
  ctx.fillText('vs', cx, y + 5);

  // Names
  y += 85;
  ctx.font = `700 34px ${F}`;
  ctx.fillStyle = '#111827';
  ctx.fillText(trunc(ctx, p1, spacing - 10), cx - spacing, y);
  ctx.fillText(trunc(ctx, p2, spacing - 10), cx + spacing, y);

  // ── Big Score ──
  y += 90;
  const scoreBoxW = 400;
  const scoreBoxH = 140;
  roundedRect(ctx, cx - scoreBoxW / 2, y - scoreBoxH / 2, scoreBoxW, scoreBoxH, 28);
  ctx.fillStyle = '#f9fafb';
  ctx.fill();
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = `800 100px ${F}`;
  ctx.fillStyle = w1 > w2 ? '#16a34a' : '#111827';
  ctx.fillText(`${w1}`, cx - 100, y + 32);

  ctx.font = `300 60px ${F}`;
  ctx.fillStyle = '#d1d5db';
  ctx.fillText(':', cx, y + 22);

  ctx.font = `800 100px ${F}`;
  ctx.fillStyle = w2 > w1 ? '#16a34a' : '#111827';
  ctx.fillText(`${w2}`, cx + 100, y + 32);

  // Winner
  y += scoreBoxH / 2 + 45;
  if (w1 !== w2) {
    const winner = w1 > w2 ? p1 : p2;
    ctx.font = `600 30px ${F}`;
    ctx.fillStyle = '#16a34a';
    ctx.fillText(`Wygrywa ${winner}`, cx, y);
  } else if (done.length > 0) {
    ctx.font = `600 30px ${F}`;
    ctx.fillStyle = '#d97706';
    ctx.fillText('Remis', cx, y);
  }

  // ── Match Results ──
  y += 55;
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(PAD + 60, y, W - (PAD + 60) * 2, 1);

  y += 40;
  ctx.font = `600 22px ${F}`;
  ctx.fillStyle = '#9ca3af';
  ctx.fillText(`WYNIKI MECZÓW`, cx, y);

  y += 15;
  const maxShow = Math.min(done.length, 10);

  for (let i = 0; i < maxShow; i++) {
    const m = done[i];
    y += 62;

    roundedRect(ctx, PAD + 20, y - 32, W - (PAD + 20) * 2, 52, 14);
    ctx.fillStyle = i % 2 === 0 ? '#f9fafb' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    ctx.stroke();

    const setsStr = m.sets?.length > 0
      ? m.sets.map(s => `${s[0]}:${s[1]}`).join('  ')
      : `${m.score1}:${m.score2}`;

    // Match number
    ctx.font = `500 20px ${F}`;
    ctx.fillStyle = '#d1d5db';
    ctx.textAlign = 'left';
    ctx.fillText(`#${i + 1}`, PAD + 40, y - 3);

    // Winner name
    const isP1Win = m.score1 > m.score2;
    const isP2Win = m.score2 > m.score1;
    const winName = isP1Win ? p1 : isP2Win ? p2 : '';

    if (winName) {
      const [wc] = getColors(winName);
      ctx.beginPath();
      ctx.arc(PAD + 90, y - 7, 5, 0, Math.PI * 2);
      ctx.fillStyle = wc;
      ctx.fill();

      ctx.font = `600 24px ${F}`;
      ctx.fillStyle = '#374151';
      ctx.textAlign = 'left';
      ctx.fillText(trunc(ctx, winName, 320), PAD + 108, y - 1);
    } else {
      ctx.font = `500 24px ${F}`;
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'left';
      ctx.fillText('Remis', PAD + 90, y - 1);
    }

    // Score
    ctx.font = `600 24px ${F}`;
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'right';
    ctx.fillText(setsStr, W - PAD - 40, y - 1);
  }

  if (done.length > maxShow) {
    y += 45;
    ctx.font = `400 22px ${F}`;
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${done.length - maxShow} więcej`, cx, y);
  }

  return y;
}

// ── Tournament ──

function drawTournament(ctx, { W, F, cx, PAD, name, date, standings, matches }) {
  const max = Math.min(standings?.length || 0, 10);
  if (max === 0) return 200;

  let y = 120;

  // Trophy emoji (text rendering)
  ctx.textAlign = 'center';
  ctx.font = `400 90px ${F}`;
  ctx.fillText('\u{1F3C6}', cx, y);

  // Title
  y += 65;
  ctx.font = `800 52px ${F}`;
  ctx.fillStyle = '#111827';
  ctx.fillText('Turniej zakończony!', cx, y);

  // Tournament name
  if (name) {
    y += 45;
    ctx.font = `500 30px ${F}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(trunc(ctx, name, W - 200), cx, y);
  }
  if (date) {
    y += 35;
    ctx.font = `400 26px ${F}`;
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(date, cx, y);
  }

  // ── Player Cards ──
  y += 50;
  const MEDAL = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
  const cardPad = PAD;
  const cardW = W - cardPad * 2;
  const cardH = 120;
  const cardGap = 24;

  for (let i = 0; i < max; i++) {
    const p = standings[i];
    y += cardH + cardGap;

    const cardY = y - cardH;
    const [bgColor, borderColor] = i < 3 ? RANK_COLORS[i] : ['#f9fafb', '#e5e7eb'];

    // Card shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.06)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    roundedRect(ctx, cardPad, cardY, cardW, cardH, 24);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.restore();

    // Card border
    roundedRect(ctx, cardPad, cardY, cardW, cardH, 24);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const cardCy = cardY + cardH / 2;

    // Medal emoji or rank number
    ctx.textAlign = 'center';
    if (i < 3) {
      ctx.font = `400 44px ${F}`;
      ctx.fillText(MEDAL[i], cardPad + 50, cardCy + 14);
    } else {
      ctx.font = `700 32px ${F}`;
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`${i + 1}`, cardPad + 50, cardCy + 10);
    }

    // Avatar
    drawAvatar(ctx, cardPad + 120, cardCy, 32, p.name, F);

    // Player name
    ctx.textAlign = 'left';
    ctx.font = `700 34px ${F}`;
    ctx.fillStyle = '#111827';
    ctx.fillText(trunc(ctx, p.name, 380), cardPad + 170, cardCy - 8);

    // W/L stats
    ctx.font = `400 24px ${F}`;
    ctx.fillStyle = '#9ca3af';
    const stat = `${p.won}W ${p.draws > 0 ? p.draws + 'R ' : ''}${p.lost}L`;
    ctx.fillText(stat, cardPad + 170, cardCy + 25);

    // Points
    ctx.textAlign = 'right';
    ctx.font = `800 38px ${F}`;
    ctx.fillStyle = '#16a34a';
    ctx.fillText(`${p.points}pkt`, W - cardPad - 30, cardCy + 12);
  }

  // ── Match count ──
  const completedCount = (matches || []).filter(m => m.completed).length;
  if (completedCount > 0) {
    y += 30;
    ctx.textAlign = 'center';
    ctx.font = `400 24px ${F}`;
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(`Rozegrano ${completedCount} ${completedCount === 1 ? 'mecz' : completedCount < 5 ? 'mecze' : 'meczów'}`, cx, y);
  }

  return y;
}

// ── Helpers ──

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

function trunc(ctx, text, maxW) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '...').width > maxW) t = t.slice(0, -1);
  return t + '...';
}
