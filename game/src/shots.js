// ?shot= staged scenes — deterministic setups so headless screenshots are
// reproducible. Names: start | play | chase | mission | city. &seed=1 fixes
// the RNG. Every shot stages a LIVING street: traffic on several roads and
// pedestrians on the sidewalks near the camera, so no frame reads empty.
import { makeCar } from './vehicles.js';
import { addWanted } from './police.js';
import { stageTracer } from './combat.js';

export function parseShot() {
  const q = new URLSearchParams(location.search);
  return {
    shot: q.get('shot') || null,
    seed: parseInt(q.get('seed') || '1', 10) || 1,
  };
}

// Line up a row of traffic cars on one street, moving, with a little
// spacing so they read as a stream rather than a parking lot.
function streamCars(traffic, list) {
  for (let i = 0; i < list.length && i < traffic.cars.length; i++) {
    const c = traffic.cars[i];
    const s = list[i];
    c.x = s.x; c.z = s.z;
    c.horizontal = !!s.horizontal;
    c.street = s.street;
    c.lane = s.lane || 0;
    c.dir = s.dir || 1;
    c.angle = s.angle || 0;
    c.speed = s.speed || 8;
    c.cruise = c.speed;
  }
}

// Scatter pedestrians along a sidewalk stretch near (x0, z0).
function crowdPeds(traffic, x0, z0, count, spread) {
  for (let i = 0; i < count && i < traffic.peds.length; i++) {
    const p = traffic.peds[i];
    const side = i % 2 === 0 ? -1 : 1;
    p.x = x0 + side * 10.5 + (i % 3) * 1.2;
    p.z = z0 + (i - count / 2) * spread;
    p.horizontal = false;
    p.dir = i % 2 === 0 ? 1 : -1;
    p.speed = 1.4;
  }
}

// G: the game state object built by main.js (player, world, police, missions, ...).
export function applyShot(G, shot) {
  const { THREE, scene, world, player, police, missions, traffic } = G;
  const streets = world.streets;
  const main = streets[4]; // central avenue (x = 0)
  const cross = streets[3]; // cross street (z = -58)

  if (shot === 'start') {
    // start screen stays up; camera looks down the main avenue at sunset
    G.camMode = 'orbit';
    G.camOrbit = { x: main + 30, y: 26, z: main + 60 };
    G.camLook = { x: main, y: 4, z: main - 20 };
    return;
  }

  if (shot === 'play') {
    // Danny on foot on a busy street: walkers close on both sidewalks,
    // traffic rolling past on the avenue and the cross street.
    player.x = main + 2; player.z = cross + 8; player.angle = Math.PI;
    player.group.position.set(player.x, 0, player.z);
    streamCars(traffic, [
      { x: main - 3.5, z: cross - 20, street: main, lane: -3.5, angle: 0, speed: 9 },
      { x: main + 3.5, z: cross - 45, street: main, lane: 3.5, angle: Math.PI, dir: -1, speed: 8 },
      { x: main - 3.5, z: cross + 34, street: main, lane: -3.5, angle: 0, speed: 9 },
      { x: main + 3.5, z: cross + 60, street: main, lane: 3.5, angle: Math.PI, dir: -1, speed: 8 },
      { x: cross + 40, z: cross - 3.5, horizontal: true, street: cross, lane: -3.5, angle: -Math.PI / 2, speed: 9 },
      { x: cross - 55, z: cross + 3.5, horizontal: true, street: cross, lane: 3.5, angle: Math.PI / 2, dir: -1, speed: 9 },
    ]);
    crowdPeds(traffic, main, cross + 8, 12, 5);
    G.camMode = 'follow';
    G.camYaw = Math.PI;
    return;
  }

  if (shot === 'chase') {
    // COVER: Danny driving fast with three police cars on his tail, four
    // stars, a live mission, traffic ahead and walkers on the kerbs.
    const car = makeCar(THREE, G.rng, {
      x: main, z: cross + 40, angle: 0, driver: 'player', color: 0xd96a1e,
    });
    scene.add(car.group);
    G.enterCar(car, true);
    car.speed = 26;
    addWanted(police, 4);
    // three pursuit cars tucked right behind, fanned across the road so
    // none of them hides behind Danny's car
    for (let i = 0; i < police.cars.length && i < 3; i++) {
      const pc = police.cars[i];
      pc.x = main + (i === 0 ? -5 : i === 1 ? 5 : 0);
      pc.z = cross + 40 - 13 - i * 7;
      pc.angle = 0;
      pc.speed = 26;
      pc.pursuitLane = i === 0 ? -5 : i === 1 ? 5 : 0;
    }
    // traffic ahead on the avenue, plus a car crossing the intersection
    streamCars(traffic, [
      { x: main + 3, z: cross - 25, street: main, lane: 3, angle: Math.PI, dir: -1, speed: 8 },
      { x: main - 3, z: cross - 55, street: main, lane: -3, angle: 0, speed: 9 },
      { x: main + 3, z: cross - 85, street: main, lane: 3, angle: Math.PI, dir: -1, speed: 8 },
      { x: main - 3, z: cross - 115, street: main, lane: -3, angle: 0, speed: 9 },
      { x: cross + 70, z: cross - 3.5, horizontal: true, street: cross, lane: -3.5, angle: -Math.PI / 2, speed: 9 },
      { x: streets[5] + 3, z: cross - 40, street: streets[5], lane: 3, angle: Math.PI, dir: -1, speed: 8 },
    ]);
    crowdPeds(traffic, main, cross + 20, 8, 7);
    G.camMode = 'follow';
    G.camYaw = 0;
    // camera from the front, looking back: the pursuit reads behind Danny
    G.camYawOverride = Math.PI;
    return;
  }

  if (shot === 'mission') {
    // SHOOTOUT: mission 6, "The Last Debt". Danny on foot at the east
    // docks, pistol out, a tracer in the air, officers closing in and the
    // gold beacon burning behind them. Police are frozen in place so the
    // staged frame holds; the real game chases for real.
    missions.index = 5;
    missions.stage = 0;
    missions.target = missions.targets.ledger;
    missions.marker.position.set(missions.target.x, 13, missions.target.z);
    missions.ring.position.set(missions.target.x, 0.3, missions.target.z);
    missions.message = 'The Last Debt — Grab the ledger at the east docks.';
    missions.messageTimer = 30;
    // Danny stands on the dock road itself, facing north up the street
    // toward the beacon, containers stacked on both sides.
    const dockRoad = streets[7]; // x = 174, between the dock blocks
    player.x = dockRoad; player.z = missions.target.z + 24;
    player.angle = Math.PI; // facing north, toward the beacon
    player.group.position.set(player.x, 0, player.z);
    addWanted(police, 4);
    // officers staged between Danny and the beacon, close enough to read
    const posts = [
      { x: dockRoad - 3, z: missions.target.z + 6 },
      { x: dockRoad + 3, z: missions.target.z + 3 },
      { x: dockRoad - 4, z: missions.target.z + 11 },
    ];
    for (let i = 0; i < police.officers.length && i < posts.length; i++) {
      const o = police.officers[i];
      o.x = posts[i].x; o.z = posts[i].z;
      o.spawned = true;
      o.group.position.set(o.x, 0, o.z);
      o.group.rotation.y = Math.atan2(player.x - o.x, player.z - o.z);
    }
    // pursuit cars staged on the dock road: one parked across it just
    // past the beacon, two more rolling in beyond it
    const carPosts = [
      { x: dockRoad + 6, z: missions.target.z - 4, angle: Math.PI / 2 },
      { x: dockRoad - 3, z: missions.target.z - 22, angle: 0 },
      { x: dockRoad + 3, z: missions.target.z - 38, angle: 0 },
    ];
    for (let i = 0; i < police.cars.length && i < carPosts.length; i++) {
      const pc = police.cars[i];
      pc.x = carPosts[i].x; pc.z = carPosts[i].z;
      pc.angle = carPosts[i].angle; pc.speed = 0;
    }
    // a tracer from Danny's pistol to the nearest officer, held for the shot
    stageTracer(G.combat,
      { x: player.x + 1, y: 1.4, z: player.z },
      { x: posts[0].x, y: 1.2, z: posts[0].z });
    // a couple of dock workers fleeing along the sidewalk
    crowdPeds(traffic, dockRoad, missions.target.z + 18, 4, 6);
    streamCars(traffic, [
      { x: dockRoad - 3, z: missions.target.z + 46, street: dockRoad, lane: -3, angle: 0, speed: 7 },
      { x: dockRoad + 3, z: missions.target.z - 46, street: dockRoad, lane: 3, angle: Math.PI, dir: -1, speed: 7 },
    ]);
    G.freezePolice = true;
    G.camMode = 'follow';
    G.camYaw = Math.PI; // behind Danny, looking north at the officers
    return;
  }

  if (shot === 'city') {
    // Wide driving shot through the DOCKS district, not downtown: container
    // stacks and a yellow gantry crane on both sides, the sea on the horizon.
    const dockStreet = streets[7]; // x = 174, between the dock blocks
    const car = makeCar(THREE, G.rng, {
      x: dockStreet, z: streets[2] + 20, angle: Math.PI, driver: 'player', color: 0xd96a1e,
    });
    scene.add(car.group);
    G.enterCar(car, true);
    car.speed = 18;
    streamCars(traffic, [
      { x: dockStreet - 3, z: streets[2] - 30, street: dockStreet, lane: -3, angle: 0, speed: 8 },
      { x: dockStreet + 3, z: streets[2] - 70, street: dockStreet, lane: 3, angle: Math.PI, dir: -1, speed: 8 },
      { x: streets[2] - 60, z: streets[2] - 3.5, horizontal: true, street: streets[2], lane: -3.5, angle: -Math.PI / 2, speed: 8 },
      { x: streets[6] - 3, z: streets[2] + 55, street: streets[6], lane: -3, angle: 0, speed: 8 },
    ]);
    crowdPeds(traffic, dockStreet, streets[2] + 10, 6, 8);
    G.camMode = 'follow';
    G.camYaw = Math.PI;
    G.camHigh = true;
    return;
  }
}
