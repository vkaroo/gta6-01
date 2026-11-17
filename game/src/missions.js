// Missions + story — six jobs for Danny Reyes in Palmera Bay.
// A debt, a fare, a getaway, a hot crate, a stolen coupe, and one last
// ledger that clears the slate. Every job opens with a story beat and
// closes with a payoff line, so the chain reads like a short crime story
// instead of a checklist.
import { MISSION_REWARDS } from './config.js';

const STORY_INTRO =
  'Danny Reyes just rolled into Palmera Bay with $250, a borrowed jacket and a ' +
  'debt to Vic Marino. Six jobs stand between him and a clean slate.';

// Every target sits on a street intersection, so the beacon is always out
// in the open and never buried inside a block behind a tower.
const TARGETS = {
  docks: { x: 174, z: 174 },
  pickup: { x: -174, z: -116 },
  hotel: { x: 174, z: -174 },
  hideout: { x: -174, z: 174 },
  crate: { x: 174, z: 58 },
  marina: { x: 58, z: -232 },
  garage: { x: -232, z: 116 },
  ledger: { x: 174, z: 116 },
};

// stages: each leg of the job. `heat` fires when the leg starts (cops
// notice), `onArrive` fires when Danny reaches the beacon.
export const MISSION_DEFS = [
  {
    id: 'first-job',
    title: 'The First Job',
    brief: 'Vic needs a package at the docks, east side. No questions, no cops. Get it there.',
    outro: 'Package delivered. Vic pays $500. One down, five to go.',
    reward: MISSION_REWARDS[0],
    stages: [
      { target: 'docks', objective: 'Drive to the docks marker' },
    ],
  },
  {
    id: 'cab-fare',
    title: 'Cab Fare',
    brief: 'A fare is waiting on Coral Avenue — a singer who missed her set. Pick her up in a car and drop her at the hotel. She tips well when she is not kept waiting.',
    outro: 'Fare dropped off. $750, and the singer slips Danny her card: "Call me when you need a getaway driver."',
    reward: MISSION_REWARDS[1],
    stages: [
      { target: 'pickup', objective: 'Pick up the passenger', needCar: true },
      { target: 'hotel', objective: 'Drop the passenger at the hotel' },
    ],
  },
  {
    id: 'lose-heat',
    title: 'Lose the Heat',
    brief: 'The job went loud. The whole Palmera Bay PD is on you — three stars and climbing. Reach the hideout on the west side and lay low until it blows over.',
    outro: 'You vanished into the hideout. $1,200. Vic is impressed. The PD is not.',
    reward: MISSION_REWARDS[2],
    heat: 3,
    stages: [
      { target: 'hideout', objective: 'Reach the hideout' },
    ],
  },
  {
    id: 'harbor-crate',
    title: 'The Harbor Crate',
    brief: 'A crate came off a freighter at the docks with no paperwork and a lot of value. Vic wants it at the marina, north side, before the harbourmaster counts the yard. Grab it and the law will notice.',
    outro: 'Crate delivered to the marina. $900. The harbourmaster counts one crate short and decides not to ask.',
    reward: MISSION_REWARDS[3],
    stages: [
      { target: 'crate', objective: 'Pick up the crate at the docks', heat: 1, arrive: 'Crate loaded. The yard alarm is going off — move!' },
      { target: 'marina', objective: 'Deliver the crate to the marina' },
    ],
  },
  {
    id: 'hot-wheels',
    title: 'Hot Wheels',
    brief: 'A yellow coupe is parked by the marina, keys in it, owner on the beach. Ray at the garage will pay good money for it — but the second you touch it, the PD will want a word.',
    outro: 'Coupe delivered to Ray\'s garage. $1,500. Ray grins: "You steal pretty, kid."',
    reward: MISSION_REWARDS[4],
    stages: [
      { target: 'marina', objective: 'Steal the yellow coupe at the marina', needCar: true, heat: 2, arrive: 'You took the coupe! Lose the cops and get it to the garage.' },
      { target: 'garage', objective: 'Deliver the coupe to Ray\'s garage' },
    ],
  },
  {
    id: 'last-debt',
    title: 'The Last Debt',
    brief: 'Vic\'s ledger is sitting in a dock office, and it names every debt in Palmera Bay — including Danny\'s. Grab it at the east docks, then vanish into the hideout with four stars on your tail. Burn the ledger, burn the debt.',
    outro: 'Ledger burned. Debt cleared. $2,500 and a clean slate — Palmera Bay is yours now, Danny.',
    reward: MISSION_REWARDS[5],
    heat: 4,
    stages: [
      { target: 'ledger', objective: 'Grab the ledger at the east docks', arrive: 'Ledger in hand! Now lose four stars of heat.' },
      { target: 'hideout', objective: 'Vanish into the hideout' },
    ],
  },
];

export function makeMissions(THREE, scene, world) {
  // glowing beacon marker + ground ring
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

  const m = {
    defs: MISSION_DEFS,
    targets: TARGETS,
    index: 0,            // current mission
    stage: 0,            // current leg inside the mission
    done: false,
    target: TARGETS.docks,
    marker, ring,
    passenger: null,     // ped mesh waiting at a pickup
    passengerInCar: false,
    passengerWaiting: false,
    message: STORY_INTRO,
    messageTimer: 9,
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
  return m.defs[m.index].stages[m.stage].objective;
}

// Target coordinates for a saved (index, stage) pair, so a loaded game can
// put the beacon back where it belongs.
export function targetCoords(index, stage) {
  const def = MISSION_DEFS[Math.min(index, MISSION_DEFS.length - 1)];
  const leg = def.stages[Math.min(stage, def.stages.length - 1)];
  return TARGETS[leg.target];
}

// ctx: { x, z, inCar, addCash(n), setWanted(n), clearWanted(), toast(text) }
export function updateMissions(m, ctx, dt) {
  if (m.messageTimer > 0) m.messageTimer -= dt;
  m.marker.rotation.y += dt * 1.2;
  const pulse = 1 + Math.sin(performance.now() / 300) * 0.12;
  m.ring.scale.set(pulse, pulse, 1);

  if (m.done) return;
  const d = Math.hypot(ctx.x - m.target.x, ctx.z - m.target.z);
  if (d > 5) return;

  const def = m.defs[m.index];
  const leg = def.stages[m.stage];
  if (leg.needCar && !ctx.inCar) {
    ctx.toast('You need a car for this leg!');
    return;
  }
  if (leg.arrive) ctx.toast(leg.arrive);
  if (leg.heat) ctx.setWanted(leg.heat);
  if (m.index === 1 && m.stage === 0) {
    // the fare climbs in
    m.passengerInCar = true;
    if (m.passenger) m.passenger.visible = false;
  }
  if (m.stage + 1 < def.stages.length) {
    // next leg of the same job
    m.stage += 1;
    const next = def.stages[m.stage];
    m.target = TARGETS[next.target];
    placeMarker(m);
    return;
  }
  // job finished
  if (m.index === 2 || m.index === 5) ctx.clearWanted();
  finishJob(m, ctx, def.outro);
}

function finishJob(m, ctx, text) {
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
    m.message = 'All six jobs done. Debt cleared — Palmera Bay is yours now, Danny.';
    m.messageTimer = 8;
    return;
  }
  const next = m.defs[m.index];
  m.message = next.title + ' — ' + next.brief;
  m.messageTimer = 10;
  m.target = TARGETS[next.stages[0].target];
  if (next.heat) ctx.setWanted(next.heat);
  if (m.index === 1) m.passengerWaiting = true;
  placeMarker(m);
}
