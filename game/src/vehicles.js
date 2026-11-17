// Cars — build, drive, enter/exit, steal. One car factory, one drive model.
import { CFG, CAR_COLORS } from './config.js';
import { pick } from './random.js';
import { resolveCollisions } from './world.js';

export function makeCar(THREE, rng, opts = {}) {
  const color = opts.color ?? pick(rng, CAR_COLORS);
  const police = !!opts.police;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: police ? 0xf2f2f2 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.55;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.1),
    new THREE.MeshLambertMaterial({ color: police ? 0x1c2a44 : 0x1e2a33 }));
  cabin.position.set(0, 1.1, -0.25);
  g.add(body, cabin);
  if (police) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 4.42),
      new THREE.MeshLambertMaterial({ color: 0x1c2a44 }));
    stripe.position.y = 0.62;
    g.add(stripe);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x223344 }));
    bar.position.set(0, 1.5, -0.25);
    g.add(bar);
    const lightR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    lightR.position.set(-0.3, 1.5, -0.25);
    const lightB = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    lightB.position.set(0.3, 1.5, -0.25);
    g.add(lightR, lightB);
    g.userData.lightR = lightR; g.userData.lightB = lightB;
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xcc2222 });
  for (const s of [-0.65, 0.65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.08), headMat);
    h.position.set(s, 0.6, 2.22);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.08), tailMat);
    t.position.set(s, 0.6, -2.22);
    g.add(h, t);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    wheels.push(w);
    g.add(w);
  }
  const car = {
    group: g, wheels, police,
    x: opts.x ?? 0, z: opts.z ?? 0, angle: opts.angle ?? 0,
    speed: 0, steer: 0, parked: !!opts.parked,
    driver: opts.driver ?? null,   // 'player' | 'traffic' | 'police' | null
    color,
  };
  g.position.set(car.x, 0, car.z);
  g.rotation.y = car.angle;
  return car;
}

export function syncCar(car) {
  car.group.position.set(car.x, 0, car.z);
  car.group.rotation.y = car.angle;
  const spin = car.speed * 0.016 / 0.38;
  for (const w of car.wheels) w.rotation.x += spin;
}

// Arcade drive model: accel/brake/steer with a little drift.
export function driveCar(car, input, colliders, half, dt) {
  const maxF = CFG.car.maxSpeed, maxR = CFG.car.reverseMax;
  if (input.forward) car.speed += CFG.car.accel * dt;
  else if (input.back) {
    car.speed -= car.speed > 0.5 ? CFG.car.brake * dt : CFG.car.accel * 0.6 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 9 * dt);
  }
  car.speed = Math.max(-maxR, Math.min(maxF, car.speed));
  const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  car.steer += (steerTarget - car.steer) * Math.min(1, 8 * dt);
  const dir = car.speed >= 0 ? 1 : -1;
  car.angle += car.steer * CFG.car.steer * dt * Math.min(1, Math.abs(car.speed) / 8) * dir;
  const nx = car.x + Math.sin(car.angle) * car.speed * dt;
  const nz = car.z + Math.cos(car.angle) * car.speed * dt;
  const [rx, rz] = resolveCollisions(colliders, nx, nz, 1.6);
  if (rx !== nx || rz !== nz) {
    // bumped a building: kill some speed, spark the crash
    car.speed *= 0.55;
  }
  car.x = Math.max(-half, Math.min(half, rx));
  car.z = Math.max(-half, Math.min(half, rz));
  syncCar(car);
  return Math.abs(car.speed);
}
