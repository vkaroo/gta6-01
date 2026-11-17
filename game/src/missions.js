// Missions + story — three jobs for Danny Reyes in Palmera Bay.
// 1. The First Job (delivery)  2. Cab Fare (pick up + drop off)  3. Lose the Heat (escape).
import { MISSION_REWARDS } from './config.js';

const STORY_INTRO =
  'Danny Reyes just rolled into Palmera Bay with $250, a borrowed jacket and a ' +
  'debt to Vic Marino. Three jobs stand between him and a clean slate.';

export const MISSION_DEFS = [
  {
    id: 'first-job',
    title: 'The First Job',
    brief: 'Vic needs a package at the docks, east side. No questions, no cops. Get it there.',
    objective: 'Drive to the docks marker',
    reward: MISSION_REWARDS[0],
  },
  {
    id: 'cab-fare',
    title: 'Cab Fare',
    brief: 'A fare is waiting on Coral Avenue. Pick them up — in a car — and drop them at the hotel.',
    objective: 'Pick up the passenger',
    reward: MISSION_REWARDS[1],
  },
  {
    id: 'lose-heat',
    title: 'Lose the Heat',
    brief: 'The job went loud. The whole Palmera Bay PD is on you. Reach the hideout and lay low.',
    objective: 'Reach the hideout',
    reward: MISSION_REWARDS[2],
  },
];

export function makeMissions(THREE, scene, world) {
  // glowing beacon marker
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0xffd23c, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
  });
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 26, 20, 1, true), markerMat);
  marker.visible = false;
  scene.add(marker);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.22, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23c }));
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const half = world.half;
  // targets sit on street intersections so the beacon is always visible, never
  // hidden inside a block behind a building
  const docks = { x: 174, z: 174 };
  const pickup = { x: -174, z: -116 };
  const hotel = { x: 174, z: -174 };
  const hideout = { x: -174, z: 174 };

  const m = {
    defs: MISSION_DEFS,
    index: 0,            // current mission
    stage: 0,            // 0 = go to first target, 1 = second leg (cab fare)
    done: false,
    target: docks,
    marker, ring,
    passenger: null,     // ped mesh waiting at pickup
    passengerInCar: false,
    message: STORY_INTRO,
    messageTimer: 9,
    targets: { docks, pickup, hotel, hideout },
  };
  placeMarker(m);
  return m;
}

function placeMarker(m) {
  const t = m.target;
  m.marker.position.set(t.x, 13, t.z);
  m.marker.visible = true;
  m.ring.position.set(t.x, 0.3, t.z);
  m.ring.visible = true;
}

export function currentMission(m) {
  return m.done ? null : m.defs[m.index];
}

export function currentObjective(m) {
  if (m.done) return 'All jobs done — Palmera Bay is yours. Free roam!';
  const def = m.defs[m.index];
  if (m.index === 1 && m.stage === 1) return 'Drop the passenger at the hotel';
  return def.objective;
}

// ctx: { x, z, inCar, police, addCash(n), setWanted(n), clearWanted(), toast(text) }
export function updateMissions(m, ctx, dt) {
  if (m.messageTimer > 0) m.messageTimer -= dt;
  m.marker.rotation.y += dt * 1.2;
  const pulse = 1 + Math.sin(performance.now() / 300) * 0.12;
  m.ring.scale.set(pulse, pulse, 1);

  if (m.done) return;
  const d = Math.hypot(ctx.x - m.target.x, ctx.z - m.target.z);
  if (d > 5) return;

  if (m.index === 0) {
    complete(m, ctx, 'Package delivered. Vic pays $500. One down.');
  } else if (m.index === 1) {
    if (m.stage === 0) {
      if (!ctx.inCar) {
        ctx.toast('You need a car to pick up the fare!');
        return;
      }
      m.stage = 1;
      m.passengerInCar = true;
      if (m.passenger) m.passenger.visible = false;
      m.target = m.targets.hotel;
      placeMarker(m);
      ctx.toast('Passenger aboard. To the hotel!');
    } else {
      complete(m, ctx, 'Fare dropped off. $750, plus a tip story for later.');
    }
  } else if (m.index === 2) {
    ctx.clearWanted();
    complete(m, ctx, 'You vanished into the hideout. $1,200. Debt cleared, Danny.');
  }
}

function complete(m, ctx, text) {
  const def = m.defs[m.index];
  ctx.addCash(def.reward);
  ctx.toast(text);
  m.index += 1;
  m.stage = 0;
  m.passengerInCar = false;
  if (m.index >= m.defs.length) {
    m.done = true;
    m.marker.visible = false;
    m.ring.visible = false;
    m.message = 'All three jobs done. Palmera Bay is yours now, Danny.';
    m.messageTimer = 8;
    return;
  }
  const next = m.defs[m.index];
  m.message = next.title + ' — ' + next.brief;
  m.messageTimer = 8;
  if (m.index === 1) {
    m.target = m.targets.pickup;
    spawnPassenger(m);
  } else if (m.index === 2) {
    m.target = m.targets.hideout;
    ctx.setWanted(3);
  }
  placeMarker(m);
}

function spawnPassenger(m) {
  // the waiting fare is built lazily by main.js via missions.passengerTarget
  m.passengerWaiting = true;
}
