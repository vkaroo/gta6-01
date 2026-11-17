// HUD — health, cash, wanted stars, objective, speed, toasts, and the 2D minimap.
export function makeHud() {
  const $ = (id) => document.getElementById(id);
  return {
    healthFill: $('health-fill'),
    healthText: $('health-text'),
    cash: $('cash'),
    stars: $('stars'),
    objective: $('objective'),
    objectiveTitle: $('objective-title'),
    speed: $('speed'),
    toast: $('toast'),
    story: $('story'),
    minimap: $('minimap'),
    crosshair: $('crosshair'),
    toastTimer: 0,
    storyTimer: 0,
  };
}

export function showToast(h, text, seconds = 3) {
  if (!h.toast) return;
  h.toast.textContent = text;
  h.toast.style.opacity = '1';
  h.toastTimer = seconds;
}

export function showStory(h, text, seconds = 8) {
  if (!h.story) return;
  h.story.textContent = text;
  h.story.style.opacity = '1';
  h.storyTimer = seconds;
}

export function updateHud(h, s, dt) {
  if (h.healthFill) h.healthFill.style.width = Math.max(0, s.health) + '%';
  if (h.healthText) h.healthText.textContent = Math.ceil(Math.max(0, s.health));
  if (h.cash) h.cash.textContent = '$' + Math.floor(s.cash).toLocaleString('en-US');
  if (h.stars) {
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < s.wanted ? '★' : '☆';
    h.stars.textContent = stars;
    h.stars.style.color = s.wanted > 0 ? '#ffd23c' : '#888';
  }
  if (h.objective) h.objective.textContent = s.objective;
  if (h.objectiveTitle) h.objectiveTitle.textContent = s.missionTitle;
  if (h.speed) {
    h.speed.textContent = s.inCar ? Math.round(Math.abs(s.speedKmh)) + ' km/h' : '';
  }
  // crosshair only on foot, where the pistol is out
  if (h.crosshair) h.crosshair.style.display = s.inCar ? 'none' : 'block';
  if (h.toastTimer > 0) {
    h.toastTimer -= dt;
    if (h.toastTimer <= 0 && h.toast) h.toast.style.opacity = '0';
  }
  if (h.storyTimer > 0) {
    h.storyTimer -= dt;
    if (h.storyTimer <= 0 && h.story) h.story.style.opacity = '0';
  }
}

// Top-down minimap: streets, player arrow, cars, police, mission marker.
// Drawn bright on purpose — a dark map nobody can read is decoration.
export function drawMinimap(h, world, player, cars, policeCars, missionTarget) {
  const cv = h.minimap;
  if (!cv) return;
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const half = world.half;
  const toMap = (x, z) => [((x + half) / (2 * half)) * W, ((z + half) / (2 * half)) * H];
  g.clearRect(0, 0, W, H);
  // light slate ground so the streets and dots pop
  g.fillStyle = '#46545e';
  g.fillRect(0, 0, W, H);
  // sea strip at the north edge
  g.fillStyle = '#3fa7c9';
  g.fillRect(0, 0, W, 10);
  // docks tint on the east edge
  g.fillStyle = 'rgba(232, 185, 60, 0.25)';
  g.fillRect(W * 0.75, 0, W * 0.25, H);
  // streets, wide and pale
  g.strokeStyle = '#d7dde2';
  g.lineWidth = 5;
  for (const s of world.streets) {
    const [x] = toMap(s, 0);
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    const [, y] = toMap(0, s);
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }
  // mission marker, pulsing gold with a white ring
  if (missionTarget) {
    const [mx, my] = toMap(missionTarget.x, missionTarget.z);
    const r = 7 + Math.sin(performance.now() / 250) * 2;
    g.fillStyle = '#ffd23c';
    g.beginPath(); g.arc(mx, my, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(mx, my, r + 3, 0, Math.PI * 2); g.stroke();
  }
  // traffic cars
  g.fillStyle = '#ffffff';
  for (const c of cars) {
    const [cx, cy] = toMap(c.x, c.z);
    g.fillRect(cx - 2.5, cy - 2.5, 5, 5);
  }
  // police cars flash red/blue, bigger than traffic
  for (const c of policeCars) {
    const [cx, cy] = toMap(c.x, c.z);
    g.fillStyle = Math.floor(performance.now() / 300) % 2 === 0 ? '#ff3333' : '#3388ff';
    g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.stroke();
  }
  // player arrow, green with a white outline so it never gets lost
  const [px, py] = toMap(player.x, player.z);
  g.save();
  g.translate(px, py);
  g.rotate(player.angle);
  g.fillStyle = '#2eff8a';
  g.strokeStyle = '#fff';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath();
  g.fill();
  g.stroke();
  g.restore();
  // north tick
  g.fillStyle = '#fff';
  g.font = 'bold 13px sans-serif';
  g.fillText('N', 8, 20);
}
