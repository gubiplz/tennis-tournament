/**
 * Generates a premium result card image using HTML5 Canvas API.
 * Clean, minimalist design with proper spacing.
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
  const H = 1920;
  const F = "system-ui, -apple-system, sans-serif";
  const cx = W / 2;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Background ──
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d3b23');
  bg.addColorStop(0.5, '#155e3b');
  bg.addColorStop(1, '#0a2e1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Glow
  const gl = ctx.createRadialGradient(cx, H * 0.35, 100, cx, H * 0.35, 600);
  gl.addColorStop(0, 'rgba(74, 222, 128, 0.08)');
  gl.addColorStop(1, 'transparent');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, W, H);

  // ── Top accent line ──
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(cx - 30, 80, 60, 4);

  // ── Header ──
  ctx.textAlign = 'center';
  ctx.font = `300 28px ${F}`;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText(gameType === 'sparring' ? 'SPARRING' : 'TURNIEJ', cx, 130);

  if (name) {
    ctx.font = `600 36px ${F}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(trunc(ctx, name, W - 200), cx, 178);
  }

  if (gameType === 'sparring') {
    drawSparring(ctx, { W, F, players, matches });
  } else {
    drawTournament(ctx, { W, F, standings });
  }

  // ── Footer ──
  const fy = H - 120;
  ctx.textAlign = 'center';
  if (date) {
    ctx.font = `400 26px ${F}`;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(date, cx, fy);
  }
  ctx.font = `500 22px ${F}`;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillText('tennis-turniej.netlify.app', cx, fy + 40);

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
  });
}

// ── Avatar ──

function drawAvatar(ctx, x, y, r, name, F) {
  const [c1, c2] = getColors(name);

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  // White ring
  ctx.beginPath();
  ctx.arc(x, y, r + 3, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Initials
  ctx.font = `700 ${Math.round(r * 0.75)}px ${F}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getInitials(name), x, y + 1);
  ctx.textBaseline = 'alphabetic';
}

// ── Sparring ──

function drawSparring(ctx, { W, F, players, matches }) {
  const cx = W / 2;
  const p1 = players[0]?.name || 'Gracz 1';
  const p2 = players[1]?.name || 'Gracz 2';

  const done = (matches || []).filter(m => m.completed);
  let w1 = 0, w2 = 0;
  done.forEach(m => { if (m.score1 > m.score2) w1++; else if (m.score2 > m.score1) w2++; });

  const sp = 200;

  // ── Avatars ── y=340
  drawAvatar(ctx, cx - sp, 340, 70, p1, F);
  drawAvatar(ctx, cx + sp, 340, 70, p2, F);

  // ── Names ── well below avatars
  ctx.textAlign = 'center';
  ctx.font = `600 38px ${F}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(trunc(ctx, p1, 280), cx - sp, 450);
  ctx.fillText(trunc(ctx, p2, 280), cx + sp, 450);

  // ── "vs" ──
  ctx.font = `300 28px ${F}`;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillText('vs', cx, 395);

  // ── Score ── centered, big gap from names
  ctx.font = `800 180px ${F}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${w1}`, cx - 130, 640);

  ctx.font = `200 120px ${F}`;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillText(':', cx, 620);

  ctx.font = `800 180px ${F}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${w2}`, cx + 130, 640);

  // ── Winner / Draw ──
  let wy = 720;
  if (w1 !== w2) {
    const winner = w1 > w2 ? p1 : p2;
    ctx.font = `600 34px ${F}`;
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`Wygrywa ${winner}`, cx, wy);
  } else {
    ctx.font = `600 34px ${F}`;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Remis', cx, wy);
  }

  // ── Thin line ──
  wy += 50;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(cx - 200, wy, 400, 1);

  // ── Match results ──
  wy += 50;
  ctx.font = `500 22px ${F}`;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('WYNIKI MECZÓW', cx, wy);

  const maxShow = Math.min(done.length, 8);
  for (let i = 0; i < maxShow; i++) {
    const m = done[i];
    wy += 60;

    // Row background
    roundedRect(ctx, 120, wy - 35, W - 240, 50, 12);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)';
    ctx.fill();

    const setsStr = m.sets?.length > 0
      ? m.sets.map(s => `${s[0]}:${s[1]}`).join('   ')
      : `${m.score1}:${m.score2}`;

    // Left: winner name with colored dot
    const isP1Win = m.score1 > m.score2;
    const winName = isP1Win ? p1 : m.score2 > m.score1 ? p2 : '';
    const [wc1] = winName ? getColors(winName) : ['#666'];

    // Colored dot
    if (winName) {
      ctx.beginPath();
      ctx.arc(150, wy - 10, 6, 0, Math.PI * 2);
      ctx.fillStyle = wc1;
      ctx.fill();
    }

    ctx.font = `600 26px ${F}`;
    ctx.fillStyle = winName ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'left';
    ctx.fillText(winName ? trunc(ctx, winName, 250) : 'Remis', 170, wy - 3);

    // Right: score
    ctx.font = `500 26px ${F}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'right';
    ctx.fillText(setsStr, W - 140, wy - 3);
  }

  if (done.length > maxShow) {
    wy += 50;
    ctx.font = `400 22px ${F}`;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${done.length - maxShow} więcej`, cx, wy);
  }
}

// ── Tournament ──

function drawTournament(ctx, { W, F, standings }) {
  const cx = W / 2;
  const max = Math.min(standings?.length || 0, 8);
  const medalColors = ['#fbbf24', '#94a3b8', '#f97316'];

  let y = 280;

  // Winner highlight
  if (max > 0) {
    const winner = standings[0];
    drawAvatar(ctx, cx, y, 80, winner.name, F);

    y += 110;
    ctx.textAlign = 'center';
    ctx.font = `700 44px ${F}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(trunc(ctx, winner.name, 500), cx, y);

    y += 45;
    ctx.font = `600 32px ${F}`;
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`${winner.points} punktów`, cx, y);

    y += 15;
    ctx.font = `400 24px ${F}`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(`${winner.won}W ${winner.draws > 0 ? winner.draws + 'R ' : ''}${winner.lost}L`, cx, y + 25);
  }

  // Divider
  y += 70;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(cx - 200, y, 400, 1);

  // Rest of standings
  y += 30;
  for (let i = 1; i < max; i++) {
    const p = standings[i];
    y += 75;

    const rowPad = 130;

    // Row bg
    roundedRect(ctx, rowPad, y - 40, W - rowPad * 2, 60, 14);
    ctx.fillStyle = i < 3 ? `${medalColors[i]}10` : 'rgba(255,255,255,0.03)';
    ctx.fill();

    // Mini avatar
    drawAvatar(ctx, rowPad + 30, y - 10, 20, p.name, F);

    // Rank
    ctx.font = `700 28px ${F}`;
    ctx.fillStyle = i < 3 ? medalColors[i] : 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}`, rowPad + 65, y);

    // Name
    ctx.font = `600 30px ${F}`;
    ctx.fillStyle = i < 3 ? '#ffffff' : 'rgba(255,255,255,0.6)';
    ctx.fillText(trunc(ctx, p.name, 350), rowPad + 105, y);

    // Points
    ctx.font = `700 28px ${F}`;
    ctx.fillStyle = i < 3 ? '#4ade80' : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'right';
    ctx.fillText(`${p.points}pkt`, W - rowPad - 15, y);
  }
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
