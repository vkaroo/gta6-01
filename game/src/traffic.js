// Traffic AI cars on the street grid + pedestrians on the sidewalks.
import { CFG } from './config.js';
import { makeCar, syncCar } from './vehicles.js';
import { range, rangeInt, pick } from './random.js';
import { resolveCollisions } from './world.js';

export function makeTraffic(THREE, rng, world, scene) {
  const cars = [];
  const peds = [];
  const pedColors = [0xd96a4a, 0x4a7ad9, 0x7ad94a, 0xd9c24a, 0x9a4ad9, 0xe8e4da, 0x4ad9c2];
  // traffic cars: each owns a street (axis + line) and a lane offset
  for (let i = 0; i < CFG.traffic.cars; i++) {
    const horizontal = rng() < 0.5;
    const street = pick(rng, world.streets);
    const lane = range(rng, -3.4, 3.4);
    const car = makeCar(THREE, rng, {
      x: horizontal ? range(rng, -world.half, world.half) : street + lane,
      z: horizontal ? street + lane : range(rng, -world.half, world.half),
      angle: horizontal ? (lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (lane > 0 ? Math.PI : 0),
      driver: 'traffic',
    });
    car.horizontal = horizontal;
    car.street = street;
    car.lane = lane;
    car.dir = rng() < 0.5 ? 1 : -1;
    car.speed = range(rng, 7, 11);
    car.cruise = car.speed;
    scene.add(car.group);
    cars.push(car);
  }
  // pedestrians: walk along sidewalks, turn at corners
  for (let i = 0; i < CFG.traffic.peds; i++) {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, pedColors) });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), shirt);
    body.position.y = 1.05;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.36),
      new THREE.MeshLambertMaterial({ color: pick(rng, [0xc98d64, 0x8a5a3b, 0xe8b88a, 0x6b4a2a]) }));
    head.position.y = 1.65;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.26),
      new THREE.MeshLambertMaterial({ color: 0x2b3440 }));
    legL.position.set(-0.15, 0.35, 0);
    const legR = legL.clone(); legR.position.x = 0.15;
    g.add(body, head, legL, legR);
    const horizontal = rng() < 0.5;
    const street = pick(rng, world.streets);
    const side = rng() < 0.5 ? 1 : -1;
    const off = CFG.city.roadWidth / 2 + CFG.city.sidewalk / 2;
    const ped = {
      group: g, legL, legR, phase: range(rng, 0, 6),
      x: horizontal ? range(rng, -world.half, world.half) : street + side * off,
      z: horizontal ? street + side * off : range(rng, -world.half, world.half),
      horizontal, dir: rng() < 0.5 ? 1 : -1,
      speed: range(rng, 1.2, 2.1),
    };
    g.position.set(ped.x, 0, ped.z);
    scene.add(g);
    peds.push(ped);
  }
  return { cars, peds };
}

function nearestStreet(streets, v) {
  let best = streets[0], bd = Infinity;
  for (const s of streets) {
    const d = Math.abs(s - v);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

export function updateTraffic(t, world, dt, playerPos) {
  const { half, streets } = world;
  for (const car of t.cars) {
    // slow down if a car ahead on the same street is close
    let target = car.cruise;
    for (const other of t.cars) {
      if (other === car || other.horizontal !== car.horizontal) continue;
      if (Math.abs(other.street - car.street) > 2) continue;
      const along = car.horizontal ? other.x - car.x : other.z - car.z;
      if (along * car.dir > 0 && along * car.dir < 12) { target = 0; break; }
    }
    // slow near the player so screenshots stay readable
    if (playerPos) {
      const d = Math.hypot(car.x - playerPos.x, car.z - playerPos.z);
      if (d < 9 && Math.abs(car.speed) > 2) target = Math.min(target, 2);
    }
    car.speed += (target - car.speed) * Math.min(1, 2 * dt);
    const step = car.speed * car.dir * dt;
    if (car.horizontal) car.x += step; else car.z += step;
    const along = car.horizontal ? car.x : car.z;
    if (along > half - 4 || along < -half + 4) {
      // reached the edge: turn onto a crossing street or reverse direction
      const cross = nearestStreet(streets, car.horizontal ? car.z : car.x);
      if (Math.random() < 0.6) {
        car.horizontal = !car.horizontal;
        car.street = cross;
        if (car.horizontal) { car.z = cross + car.lane; car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
        else { car.x = cross + car.lane; car.angle = car.dir > 0 ? Math.PI : 0; }
      } else {
        car.dir *= -1;
        car.angle += Math.PI;
      }
      if (car.horizontal) car.x = Math.max(-half + 4, Math.min(half - 4, car.x));
      else car.z = Math.max(-half + 4, Math.min(half - 4, car.z));
    }
    syncCar(car);
  }
  for (const ped of t.peds) {
    const step = ped.speed * ped.dir * dt;
    if (ped.horizontal) ped.x += step; else ped.z += step;
    const along = ped.horizontal ? ped.x : ped.z;
    if (along > half - 4 || along < -half + 4) {
      ped.dir *= -1;
      const cross = nearestStreet(streets, ped.horizontal ? ped.z : ped.x);
      if (Math.random() < 0.5) {
        ped.horizontal = !ped.horizontal;
        const off = CFG.city.roadWidth / 2 + CFG.city.sidewalk / 2;
        const side = Math.random() < 0.5 ? 1 : -1;
        if (ped.horizontal) { ped.z = cross + side * off; } else { ped.x = cross + side * off; }
      }
      if (ped.horizontal) ped.x = Math.max(-half + 4, Math.min(half - 4, ped.x));
      else ped.z = Math.max(-half + 4, Math.min(half - 4, ped.z));
    }
    ped.phase += dt * ped.speed * 4;
    const swing = Math.sin(ped.phase) * 0.5;
    ped.legL.rotation.x = swing;
    ped.legR.rotation.x = -swing;
    ped.group.position.set(ped.x, 0, ped.z);
    ped.group.rotation.y = ped.horizontal
      ? (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
      : (ped.dir > 0 ? 0 : Math.PI);
  }
}

// Pedestrians near (x,z) within radius — used by combat / wanted.
export function pedsNear(t, x, z, radius) {
  return t.peds.filter((p) => Math.hypot(p.x - x, p.z - z) < radius);
}

export function removePed(t, scene, ped) {
  scene.remove(ped.group);
  const i = t.peds.indexOf(ped);
  if (i >= 0) t.peds.splice(i, 1);
}
