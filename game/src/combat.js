// Combat — pistol (click to shoot) + melee punch (F). Simple hitscan, tracers, particles.
export function makeCombat(THREE, scene) {
  return {
    THREE, scene,
    cooldown: 0,
    punchCooldown: 0,
    muzzle: 0,
    tracers: [],
    sparks: [],
  };
}

function addTracer(c, from, to) {
  const geo = new c.THREE.BufferGeometry().setFromPoints([
    new c.THREE.Vector3(from.x, from.y, from.z),
    new c.THREE.Vector3(to.x, to.y, to.z),
  ]);
  const line = new c.THREE.Line(geo,
    new c.THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9 }));
  c.scene.add(line);
  c.tracers.push({ line, life: 0.12 });
}

function addSparks(c, at, n = 8) {
  for (let i = 0; i < n; i++) {
    const s = new c.THREE.Mesh(
      new c.THREE.BoxGeometry(0.14, 0.14, 0.14),
      new c.THREE.MeshBasicMaterial({ color: 0xffc23c }));
    s.position.set(at.x, at.y, at.z);
    c.scene.add(s);
    c.sparks.push({
      mesh: s, life: 0.4,
      vx: (Math.random() - 0.5) * 8, vy: Math.random() * 6, vz: (Math.random() - 0.5) * 8,
    });
  }
}

// Fire the pistol from (ox,oy,oz) along yaw. targets: [{x,z,hit(),label}].
// Returns the target hit (or null).
export function shoot(c, ox, oy, oz, yaw, targets) {
  if (c.cooldown > 0) return null;
  c.cooldown = 0.28;
  c.muzzle = 0.08;
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  const range = 42;
  let best = null, bestD = range;
  for (const t of targets) {
    const tx = t.x - ox, tz = t.z - oz;
    const along = tx * dx + tz * dz;
    if (along < 1 || along > range) continue;
    const perp = Math.abs(tx * dz - tz * dx);
    if (perp < 1.6 && along < bestD) { best = t; bestD = along; }
  }
  const end = best
    ? { x: best.x, y: 1.1, z: best.z }
    : { x: ox + dx * range, y: oy, z: oz + dz * range };
  addTracer(c, { x: ox, y: oy, z: oz }, end);
  if (best) {
    addSparks(c, end, 10);
    best.hit();
  }
  return best;
}

export function punch(c, px, pz, yaw, targets) {
  if (c.punchCooldown > 0) return null;
  c.punchCooldown = 0.45;
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  for (const t of targets) {
    const tx = t.x - px, tz = t.z - pz;
    if (tx * dx + tz * dz > 0 && Math.hypot(tx, tz) < 2.4) {
      addSparks(c, { x: t.x, y: 1.2, z: t.z }, 6);
      t.hit();
      return t;
    }
  }
  return null;
}

export function updateCombat(c, dt) {
  c.cooldown = Math.max(0, c.cooldown - dt);
  c.punchCooldown = Math.max(0, c.punchCooldown - dt);
  c.muzzle = Math.max(0, c.muzzle - dt);
  for (let i = c.tracers.length - 1; i >= 0; i--) {
    const t = c.tracers[i];
    t.life -= dt;
    if (t.life <= 0) {
      c.scene.remove(t.line);
      t.line.geometry.dispose();
      c.tracers.splice(i, 1);
    }
  }
  for (let i = c.sparks.length - 1; i >= 0; i--) {
    const s = c.sparks[i];
    s.life -= dt;
    s.vy -= 18 * dt;
    s.mesh.position.x += s.vx * dt;
    s.mesh.position.y += s.vy * dt;
    s.mesh.position.z += s.vz * dt;
    if (s.life <= 0 || s.mesh.position.y < 0) {
      c.scene.remove(s.mesh);
      c.sparks.splice(i, 1);
    }
  }
}

// Stage a gunshot for a screenshot: a bright tracer from `from` to `to`
// plus a burst of sparks at the impact point, both held for a full minute
// so a headless capture cannot miss them between frames. The tracer is a
// thin glowing box, not a 1px line — a line is invisible at screenshot
// scale. Used only by the staged mission shot — real shots still go
// through shoot() above.
export function stageTracer(c, from, to) {
  addTracer(c, from, to);
  const held = c.tracers[c.tracers.length - 1];
  if (held) held.life = 60;
  const len = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  const beam = new c.THREE.Mesh(
    new c.THREE.BoxGeometry(0.12, 0.12, len),
    new c.THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
  beam.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
  beam.lookAt(to.x, to.y, to.z);
  c.scene.add(beam);
  c.tracers.push({ line: beam, life: 60 });
  addSparks(c, to, 12);
  for (const s of c.sparks) s.life = 60;
}
