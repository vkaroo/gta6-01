// ?shot= staged scenes — deterministic setups so headless screenshots are
// reproducible. Names: start | play | chase | mission | city. &seed=1 fixes the RNG.
import { makeCar } from './vehicles.js';
import { addWanted } from './police.js';

export function parseShot() {
  const q = new URLSearchParams(location.search);
  return {
    shot: q.get('shot') || null,
    seed: parseInt(q.get('seed') || '1', 10) || 1,
  };
}

// G: the game state object built by main.js (player, world, police, missions, ...).
export function applyShot(G, shot) {
  const { THREE, scene, world, player, police, missions, traffic } = G;
  const streets = world.streets;
  const main = streets[4]; // central avenue
  const cross = streets[3];

  if (shot === 'start') {
    // start screen stays up; camera looks down the main avenue at sunset
    G.camMode = 'orbit';
    G.camOrbit = { x: main + 30, y: 26, z: main + 60 };
    G.camLook = { x: main, y: 4, z: main - 20 };
    return;
  }

  if (shot === 'play') {
    // Danny on foot on a busy street, traffic + pedestrians around him
    player.x = main + 2; player.z = cross + 8; player.angle = Math.PI;
    player.group.position.set(player.x, 0, player.z);
    for (let i = 0; i < 3; i++) {
      const c = traffic.cars[i];
      c.x = main - 2 + (i - 1) * 14; c.z = cross + 30 - i * 12;
      c.horizontal = false; c.street = main; c.speed = 0; c.cruise = 0;
    }
    for (let i = 0; i < 6; i++) {
      const p = traffic.peds[i];
      p.x = main + 8 + (i % 3) * 4; p.z = cross + 4 + Math.floor(i / 3) * 8;
    }
    G.camMode = 'follow';
    G.camYaw = Math.PI;
    return;
  }

  if (shot === 'chase') {
    // COVER: Danny driving fast with two police cars behind, wanted 3, mission live
    const car = makeCar(THREE, G.rng, { x: main, z: cross + 40, angle: 0, driver: 'player' });
    scene.add(car.group);
    G.enterCar(car, true);
    car.speed = 26;
    addWanted(police, 3);
    // police cars tucked right behind
    for (let i = 0; i < police.cars.length && i < 2; i++) {
      const pc = police.cars[i];
      pc.x = main + (i === 0 ? -3.5 : 3.5);
      pc.z = cross + 40 - 16 - i * 7;
      pc.angle = 0;
      pc.speed = 26;
    }
    // a couple of traffic cars ahead for depth
    const tc = traffic.cars[0];
    tc.x = main + 3; tc.z = cross - 30; tc.horizontal = false; tc.street = main; tc.speed = 8;
    G.camMode = 'follow';
    G.camYaw = 0;
    // camera from the front, looking back: the two police cars read behind Danny
    G.camYawOverride = Math.PI;
    return;
  }

  if (shot === 'mission') {
    // Mission 2 in progress: Danny in a car at the pickup, passenger waiting
    missions.index = 1;
    missions.stage = 0;
    missions.target = missions.targets.pickup;
    missions.marker.position.set(missions.target.x, 13, missions.target.z);
    missions.ring.position.set(missions.target.x, 0.3, missions.target.z);
    missions.message = 'Cab Fare — Pick up the passenger on Coral Avenue.';
    missions.messageTimer = 30;
    const car = makeCar(THREE, G.rng, {
      x: missions.target.x + 18, z: missions.target.z,
      angle: -Math.PI / 2, driver: 'player',
    });
    scene.add(car.group);
    G.enterCar(car, true);
    car.speed = 0;
    // the waiting passenger, standing at the kerb by the beacon, on the car's side
    const fare = G.spawnWaitingFare(missions.target.x + 5, missions.target.z + 5);
    missions.passenger = fare;
    G.camMode = 'follow';
    G.camYaw = -Math.PI / 2;
    return;
  }

  if (shot === 'city') {
    // Wide driving shot in another district, sun-soaked skyline
    const car = makeCar(THREE, G.rng, {
      x: streets[6], z: streets[2] + 20, angle: Math.PI, driver: 'player',
    });
    scene.add(car.group);
    G.enterCar(car, true);
    car.speed = 18;
    G.camMode = 'follow';
    G.camYaw = Math.PI;
    G.camHigh = true;
    return;
  }
}
