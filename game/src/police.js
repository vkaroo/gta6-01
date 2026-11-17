// Wanted level (0–5 stars) + police pursuit: patrol cars that chase and ram,
// foot officers that chase on foot. Wanted decays when the player stays calm.
import { CFG } from './config.js';
import { makeCar, syncCar } from './vehicles.js';

export function makePolice(THREE, rng, scene, world) {
  return {
    THREE, rng, scene, world,
    wanted: 0,
    calmTimer: 0,
    cars: [],       // police cars on the road
    officers: [],   // foot police
    flash: 0,
  };
}

export function addWanted(pol, n) {
  pol.wanted = Math.max(0, Math.min(5, pol.wanted + n));
  pol.calmTimer = 0;
  if (pol.wanted > 0) spawnPolice(pol);
}

function spawnPolice(pol) {
  const want = Math.min(CFG.police.maxCars, 1 + Math.floor(pol.wanted / 2));
  while (pol.cars.length < want) {
    const car = makeCar(pol.THREE, pol.rng, {
      x: (Math.random() < 0.5 ? -1 : 1) * (pol.world.half - 20),
      z: (Math.random() < 0.5 ? -1 : 1) * (pol.world.half - 20),
      police: true, driver: 'police',
    });
    car.speed = 10;
    pol.scene.add(car.group);
    pol.cars.push(car);
  }
  while (pol.wanted >= 2 && pol.officers.length < pol.wanted - 1) {
    const g = new pol.THREE.Group();
    const body = new pol.THREE.Mesh(new pol.THREE.BoxGeometry(0.7, 0.85, 0.4),
      new pol.THREE.MeshLambertMaterial({ color: 0x1c2a44 }));
    body.position.y = 1.15;
    const head = new pol.THREE.Mesh(new pol.THREE.BoxGeometry(0.4, 0.4, 0.38),
      new pol.THREE.MeshLambertMaterial({ color: 0xc98d64 }));
    head.position.y = 1.8;
    const cap = new pol.THREE.Mesh(new pol.THREE.BoxGeometry(0.44, 0.14, 0.42),
      new pol.THREE.MeshLambertMaterial({ color: 0x1c2a44 }));
    cap.position.y = 2.02;
    g.add(body, head, cap);
    g.position.set(0, 0, 0);
    pol.scene.add(g);
    pol.officers.push({ group: g, x: 0, z: 0, angle: 0, phase: 0, spawned: false });
  }
}

export function updatePolice(pol, player, playerCar, dt, onBusted, onDamage) {
  pol.flash += dt * 6;
  const target = playerCar ?? player;
  const tx = playerCar ? playerCar.x : player.x;
  const tz = playerCar ? playerCar.z : player.z;

  // wanted decay: calm for a while and the heat drops a star
  if (pol.wanted > 0) {
    pol.calmTimer += dt;
    if (pol.calmTimer > CFG.wanted.decaySeconds) {
      pol.wanted -= 1;
      pol.calmTimer = 0;
    }
  }
  if (pol.wanted === 0) {
    for (const car of pol.cars) pol.scene.remove(car.group);
    pol.cars.length = 0;
    for (const o of pol.officers) pol.scene.remove(o.group);
    pol.officers.length = 0;
    return;
  }
  spawnPolice(pol);

  // police cars: steer toward the player, ram on contact
  for (const car of pol.cars) {
    const dx = tx - car.x, dz = tz - car.z;
    const dist = Math.hypot(dx, dz) || 1;
    const wantAngle = Math.atan2(dx, dz);
    let d = wantAngle - car.angle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    car.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, d));
    const speed = Math.min(CFG.police.chaseSpeed, 8 + pol.wanted * 4.5);
    car.speed += (speed - car.speed) * Math.min(1, 1.5 * dt);
    car.x += Math.sin(car.angle) * car.speed * dt;
    car.z += Math.cos(car.angle) * car.speed * dt;
    syncCar(car);
    // flashing light bar
    const on = Math.sin(pol.flash) > 0;
    car.group.userData.lightR.material.color.setHex(on ? 0xff2222 : 0x551111);
    car.group.userData.lightB.material.color.setHex(on ? 0x111155 : 0x2266ff);
    if (dist < 3.2) {
      // ram: push the player car, damage the player on foot
      if (playerCar) {
        playerCar.speed *= 0.7;
        playerCar.x += (dx / dist) * -1.2;
        playerCar.z += (dz / dist) * -1.2;
      } else if (onDamage) {
        onDamage(CFG.police.ramDamage * dt * 3);
      }
      if (playerCar) car.speed *= 0.5;
    }
  }

  // foot officers: spawn near the player, chase on foot
  for (const o of pol.officers) {
    if (!o.spawned) {
      o.x = tx + (Math.random() < 0.5 ? -18 : 18);
      o.z = tz + (Math.random() < 0.5 ? -18 : 18);
      o.spawned = true;
    }
    const dx = player.x - o.x, dz = player.z - o.z;
    const dist = Math.hypot(dx, dz) || 1;
    const sp = 6.5;
    o.x += (dx / dist) * sp * dt;
    o.z += (dz / dist) * sp * dt;
    o.angle = Math.atan2(dx, dz);
    o.phase += dt * 9;
    o.group.position.set(o.x, 0, o.z);
    o.group.rotation.y = o.angle;
    if (dist < 1.4 && !playerCar) {
      if (onBusted) onBusted();
    }
  }
}
