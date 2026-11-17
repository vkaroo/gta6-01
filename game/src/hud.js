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
export function drawMinimap(h, world, player, cars, policeCars, missionTarget) {
  const cv = h.minimap;
  if (!cv) return;
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const half = world.half;
  const toMap = (x, z) => [((x + half) / (2 * half)) * W, ((z + half) / (2 * half)) * H];
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#20262b';
  g.fillRect(0, 0, W, H);
  // sea strip at the north edge
  g.fillStyle = '#2e7fa8';
  g.fillRect(0, 0, W, 8);
  // streets
  g.strokeStyle = '#5a6068';
  g.lineWidth = 4;
  for (const s of world.streets) {
    const [x] = toMap(s, 0);
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    const [, y] = toMap(0, s);
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }
  // mission marker
  if (missionTarget) {
    const [mx, my] = toMap(missionTarget.x, missionTarget.z);
    g.fillStyle = '#ffd23c';
    g.beginPath(); g.arc(mx, my, 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.arc(mx, my, 9, 0, Math.PI * 2); g.stroke();
  }
  // traffic cars
  g.fillStyle = '#cfd6dd';
  for (const c of cars) {
    const [cx, cy] = toMap(c.x, c.z);
    g.fillRect(cx - 2, cy - 2, 4, 4);
  }
  // police cars flash red/blue
  for (const c of policeCars) {
    const [cx, cy] = toMap(c.x, c.z);
    g.fillStyle = Math.floor(performance.now() / 300) % 2 === 0 ? '#ff3333' : '#3388ff';
    g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fill();
  }
  // player arrow
  const [px, py] = toMap(player.x, player.z);
  g.save();
  g.translate(px, py);
  g.rotate(player.angle);
  g.fillStyle = '#2eff8a';
  g.beginPath();
  g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath();
  g.fill();
  g.restore();
}
