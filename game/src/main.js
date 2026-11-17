// Palmera Bay — bootstrap, game loop, input, camera, enter/exit, bust/wasted.
// A complete open-world game: drive, steal cars, dodge the law, run three jobs.
import { CFG } from './config.js';
import { makeRng, pick } from './random.js';
import { buildWorld } from './world.js';
import { makePlayer, updatePlayer } from './player.js';
import { makeCar, driveCar, syncCar } from './vehicles.js';
import { makeTraffic, updateTraffic, pedsNear, removePed } from './traffic.js';
import { makePolice, addWanted, updatePolice } from './police.js';
import { makeMissions, updateMissions, currentMission, currentObjective, targetCoords } from './missions.js';
import { makeCombat, shoot, punch, updateCombat } from './combat.js';
import { makeHud, showToast, showStory, updateHud, drawMinimap } from './hud.js';
import { makeAudio, ensureAudio, updateAudio, playShot, playChime } from './audio.js';
import { saveGame, loadGame } from './save.js';
import { parseShot, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');

function setStatus(t) { if (statusEl) statusEl.textContent = t; }

async function boot() {
  const { shot, seed } = parseShot();
  const rng = makeRng(seed);
  let THREE;
  try {
    THREE = await import('three');
  } catch (e) {
    setStatus('3D failed to load — starting top-down mode.');
    startFallback2D(shot, seed);
    return;
  }

  // --- renderer / scene ---
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  // gradient sky dome: deep blue overhead, warm haze at the horizon
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4; skyCanvas.height = 256;
  const sg = skyCanvas.getContext('2d');
  const grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2f7fc9');
  grad.addColorStop(0.55, '#8ec9e8');
  grad.addColorStop(0.72, '#ffd9a0');
  grad.addColorStop(1, '#e8b07a');
  sg.fillStyle = grad; sg.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(760, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
  scene.add(sky);
  scene.fog = new THREE.Fog(0xe0c49a, 200, 560);
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);
  const sun = new THREE.DirectionalLight(CFG.colors.sun, 2.8);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  // tight shadow frustum that follows the player (see tick): crisp shadows
  // near the action instead of a washed-out map stretched over the city
  sun.shadow.camera.left = -170; sun.shadow.camera.right = 170;
  sun.shadow.camera.top = 170; sun.shadow.camera.bottom = -170;
  sun.shadow.camera.near = 20; sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x9a8a6a, 1.2));

  // --- world + systems ---
  const world = buildWorld(THREE, rng);
  scene.add(world.group);
  const player = makePlayer(THREE, scene);
  player.x = world.spawn.x; player.z = world.spawn.z;
  const traffic = makeTraffic(THREE, rng, world, scene);
  const police = makePolice(THREE, rng, scene, world);
  const missions = makeMissions(THREE, scene, world);
  const combat = makeCombat(THREE, scene);
  const hud = makeHud();
  const audio = makeAudio();

  // parked cars from the lots
  const parkedCars = [];
  for (const spot of world.parkedSpots.slice(0, 10)) {
    const car = makeCar(THREE, rng, { x: spot.x, z: spot.z, angle: spot.angle, parked: true });
    car.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(car.group);
    parkedCars.push(car);
  }
  // shadows only show where something receives them: ground, roads and
  // walls take them, everything else casts them
  scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  sky.castShadow = false; sky.receiveShadow = false; // the dome must never shade the city

  // --- game state ---
  const G = {
    THREE, rng, scene, world, player, traffic, police, missions, combat, hud, audio, sun,
    started: false, shot,
    playerCar: null, looseCars: [],
    camYaw: 0, camPitch: 0.42, camMode: 'follow', camHigh: false,
    camOrbit: null, camLook: null,
    saveTimer: 0, bustedTimer: 0,
    input: { forward: false, back: false, left: false, right: false, run: false },
  };
  G.enterCar = (car, silent) => enterCar(G, car, silent);
  G.spawnWaitingFare = (x, z) => spawnWaitingFare(G, x, z);
  // debug handle for playtests: window.__palmera exposes live game state
  window.__palmera = G;

  // restore save (unless a staged shot overrides it)
  const saved = loadGame();
  if (saved && !shot) {
    player.cash = saved.cash;
    player.x = saved.x; player.z = saved.z;
    player.health = saved.health;
    missions.index = Math.min(saved.missionIndex, 5);
    missions.stage = saved.missionStage || 0;
    missions.target = targetCoords(missions.index, missions.stage);
    // the cab fare's waiting passenger is cosmetic but should be standing
    // at the pickup again after a reload, not vanished
    if (missions.index === 1 && missions.stage === 0) missions.passengerWaiting = true;
    missions.marker.position.set(missions.target.x, 13, missions.target.z);
    missions.ring.position.set(missions.target.x, 0.3, missions.target.z);
    showToast(hud, 'Save loaded — welcome back, Danny.', 4);
  }

  // --- input ---
  const keyMap = {
    KeyW: 'forward', ArrowUp: 'forward',
    KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
  };
  addEventListener('keydown', (e) => {
    if (keyMap[e.code] !== undefined) { G.input[keyMap[e.code]] = true; e.preventDefault(); }
    if (e.code === 'KeyE') tryEnterExit(G);
    if (e.code === 'KeyF') doPunch(G);
    if (e.code === 'KeyM') showStory(hud, missions.message, 8);
  });
  addEventListener('keyup', (e) => {
    if (keyMap[e.code] !== undefined) G.input[keyMap[e.code]] = false;
  });
  let dragging = false, lastX = 0, lastY = 0, downAt = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; downAt = performance.now();
    ensureAudio(audio);
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    G.camYaw -= (e.clientX - lastX) * 0.005;
    G.camPitch = Math.max(0.12, Math.min(1.1, G.camPitch + (e.clientY - lastY) * 0.003));
    lastX = e.clientX; lastY = e.clientY;
  });
  addEventListener('pointerup', (e) => {
    if (dragging && performance.now() - downAt < 220 && G.started) doShoot(G);
    dragging = false;
  });
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // --- start screen ---
  const begin = () => {
    ensureAudio(audio);
    G.started = true;
    if (overlay) overlay.style.display = 'none';
    showStory(hud, missions.message, 9);
    setStatus('Palmera Bay — Danny Reyes. ' + currentObjective(missions));
  };
  if (startBtn) startBtn.addEventListener('click', begin);
  if (shot && shot !== 'start') {
    // staged screenshot: skip the menu, stage the scene, run
    G.started = true;
    if (overlay) overlay.style.display = 'none';
    applyShot(G, shot);
    // no story card in staged shots: it would cover the scene in the screenshot
  }

  // --- main loop ---
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!G.started) {
      renderer.render(scene, camera);
      return;
    }
    tick(G, dt, now / 1000);
    updateCamera(G, camera, dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  setStatus('Palmera Bay loaded. Click Start to play.');
}

function tick(G, dt, now) {
  const { player, police, missions, combat, hud, audio, world } = G;
  const inCar = !!G.playerCar;

  // sun + shadow frustum follow the player so shadows stay crisp
  G.sun.position.set(player.x + 120, 180, player.z + 60);
  G.sun.target.position.set(player.x, 0, player.z);

  // movement
  if (inCar) {
    const prevSpeed = G.playerCar.speed;
    driveCar(G.playerCar, G.input, world.colliders, world.half, dt);
    if (Math.abs(prevSpeed) > 18 && Math.abs(G.playerCar.speed) < 6) {
      damagePlayer(G, 6); // hard crash
      showToast(hud, 'Crash! Watch the walls, Danny.', 2);
    }
    player.x = G.playerCar.x; player.z = G.playerCar.z;
    player.angle = G.playerCar.angle;
  } else {
    updatePlayer(player, G.input, G.camYaw, world.colliders, world.half, dt);
  }

  // traffic + pedestrians
  updateTraffic(G.traffic, world, dt, { x: player.x, z: player.z });

  // police + wanted (frozen in the staged shootout shot so the frame holds)
  if (!G.freezePolice) {
    updatePolice(police, player, G.playerCar, dt,
      () => busted(G),
      (d) => damagePlayer(G, d));
  }

  // missions
  const cashBefore = player.cash;
  updateMissions(missions, {
    x: player.x, z: player.z, inCar,
    addCash: (n) => { player.cash += n; playChime(audio); },
    setWanted: (n) => addWanted(police, n),
    clearWanted: () => { police.wanted = 0; police.calmTimer = 0; },
    toast: (t) => showToast(hud, t, 4),
  }, dt);
  // mission story beats surface as the card while their timer runs —
  // but never in a staged shot, where the card would cover the scene
  if (!G.shot && missions.messageTimer > 0) showStory(hud, missions.message, missions.messageTimer);
  if (player.cash !== cashBefore) doSave(G);
  if (missions.passengerWaiting && !missions.passenger) {
    missions.passenger = spawnWaitingFare(G, missions.targets.pickup.x - 2, missions.targets.pickup.z + 2);
    missions.passengerWaiting = false;
  }

  // combat timers + particles
  updateCombat(combat, dt);
  // muzzle flash on Danny's pistol while the shot is fresh
  player.gunFlash.visible = combat.muzzle > 0 && !inCar;

  // health regen when calm
  if (police.wanted === 0 && player.health < CFG.player.health) {
    player.health = Math.min(CFG.player.health, player.health + 2 * dt);
  }
  if (player.health <= 0) wasted(G);

  // audio
  const speed01 = inCar ? Math.abs(G.playerCar.speed) / CFG.car.maxSpeed : (player.moving ? 0.25 : 0);
  updateAudio(audio, speed01, police.wanted, now);

  // HUD + minimap
  const mission = currentMission(missions);
  updateHud(hud, {
    health: player.health,
    cash: player.cash,
    wanted: police.wanted,
    objective: currentObjective(missions),
    missionTitle: mission ? mission.title + '  •  $' + mission.reward : 'Free Roam',
    inCar,
    speedKmh: inCar ? G.playerCar.speed * 3.6 : 0,
  }, dt);
  drawMinimap(hud, world, player, G.traffic.cars, police.cars,
    missions.done ? null : missions.target);

  // autosave
  G.saveTimer += dt;
  if (G.saveTimer > 15) { G.saveTimer = 0; doSave(G); }
}

function doSave(G) {
  saveGame({
    cash: G.player.cash,
    missionIndex: G.missions.index,
    missionStage: G.missions.stage,
    x: G.player.x, z: G.player.z,
    health: G.player.health,
  });
}

function nearestCar(G, maxD) {
  const { player } = G;
  let best = null, bestD = maxD;
  const all = [...G.traffic.cars, ...G.looseCars];
  for (const c of all) {
    const d = Math.hypot(c.x - player.x, c.z - player.z);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

function tryEnterExit(G) {
  if (!G.started) return;
  if (G.playerCar) {
    // exit: step out to the side
    const car = G.playerCar;
    G.playerCar = null;
    car.driver = null;
    G.looseCars.push(car);
    G.player.x = car.x + Math.cos(car.angle) * 2.4;
    G.player.z = car.z - Math.sin(car.angle) * 2.4;
    G.player.group.position.set(G.player.x, 0, G.player.z);
    G.player.group.visible = true;
    return;
  }
  const car = nearestCar(G, 4.2);
  if (!car || car.police) {
    if (car && car.police) showToast(G.hud, 'That one belongs to the PD. Pick another.', 2);
    return;
  }
  enterCar(G, car, false);
}

function enterCar(G, car, silent) {
  // stealing a car the player does not own draws the law
  if (!silent && car.driver !== 'player') {
    addWanted(G.police, 1);
    showToast(G.hud, 'You stole a car! The law is coming.', 3);
  }
  const ti = G.traffic.cars.indexOf(car);
  if (ti >= 0) G.traffic.cars.splice(ti, 1);
  const pi = G.looseCars.indexOf(car);
  if (pi >= 0) G.looseCars.splice(pi, 1);
  car.driver = 'player';
  car.parked = false;
  G.playerCar = car;
  G.player.group.visible = false;
}

function spawnWaitingFare(G, x, z) {
  const THREE = G.THREE;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35),
    new THREE.MeshLambertMaterial({ color: 0xd9c24a }));
  body.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.36),
    new THREE.MeshLambertMaterial({ color: 0x8a5a3b }));
  head.position.y = 1.65;
  g.add(body, head);
  g.position.set(x, 0, z);
  G.scene.add(g);
  return g;
}

function combatTargets(G) {
  const targets = [];
  const px = G.player.x, pz = G.player.z;
  for (const p of G.traffic.peds) {
    targets.push({
      x: p.x, z: p.z,
      hit: () => {
        removePed(G.traffic, G.scene, p);
        addWanted(G.police, CFG.wanted.hitPed);
        showToast(G.hud, 'You hit a pedestrian! Wanted up.', 2);
      },
    });
  }
  for (const o of G.police.officers) {
    targets.push({
      x: o.x, z: o.z,
      hit: () => {
        G.scene.remove(o.group);
        const i = G.police.officers.indexOf(o);
        if (i >= 0) G.police.officers.splice(i, 1);
        addWanted(G.police, CFG.wanted.hitCop);
      },
    });
  }
  for (const c of G.police.cars) {
    targets.push({
      x: c.x, z: c.z,
      hit: () => { c.speed *= 0.4; addWanted(G.police, 1); },
    });
  }
  return targets;
}

function doShoot(G) {
  if (G.playerCar) return; // drive-bys are a later patch; keep shooting on foot
  const p = G.player;
  const yaw = G.camYaw + Math.PI;
  const hit = shoot(G.combat, p.x, 1.5, p.z, yaw, combatTargets(G));
  playShot(G.audio);
  if (hit) addWanted(G.police, CFG.wanted.shoot);
}

function doPunch(G) {
  if (G.playerCar) return;
  const p = G.player;
  const hit = punch(G.combat, p.x, p.z, p.angle, combatTargets(G));
  if (hit) addWanted(G.police, CFG.wanted.shoot);
}

function damagePlayer(G, d) {
  G.player.health -= d;
  if (G.player.health < 0) G.player.health = 0;
}

function busted(G) {
  if (G.bustedTimer > 0) return;
  G.bustedTimer = 3;
  G.player.cash = Math.max(0, G.player.cash - 100);
  G.police.wanted = 0;
  G.player.health = CFG.player.health;
  if (G.playerCar) { G.playerCar.driver = null; G.looseCars.push(G.playerCar); G.playerCar = null; }
  G.player.x = G.world.spawn.x; G.player.z = G.world.spawn.z;
  G.player.group.visible = true;
  showToast(G.hud, 'BUSTED! The PD took $100 and dropped you at the station.', 5);
  setTimeout(() => { G.bustedTimer = 0; }, 3000);
  doSave(G);
}

function wasted(G) {
  G.player.cash = Math.max(0, G.player.cash - 150);
  G.police.wanted = 0;
  G.player.health = CFG.player.health;
  if (G.playerCar) { G.playerCar.driver = null; G.looseCars.push(G.playerCar); G.playerCar = null; }
  G.player.x = G.world.spawn.x; G.player.z = G.world.spawn.z;
  G.player.group.visible = true;
  showToast(G.hud, 'WASTED! You woke up at the clinic, $150 lighter.', 5);
  doSave(G);
}

function updateCamera(G, camera, dt) {
  const { player } = G;
  if (G.camMode === 'orbit' && G.camOrbit) {
    camera.position.set(G.camOrbit.x, G.camOrbit.y, G.camOrbit.z);
    camera.lookAt(G.camLook.x, G.camLook.y, G.camLook.z);
    return;
  }
  const dist = G.playerCar ? (G.camHigh ? 17 : 12.5) : 9;
  const height = G.playerCar ? (G.camHigh ? 9 : 5) : 4.2;
  // camYawOverride (used by the chase shot) points the camera from the front,
  // so the pursuing police are in frame behind the player car.
  const yaw = G.camYawOverride != null ? G.camYawOverride : (G.playerCar ? G.playerCar.angle : G.camYaw);
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const tx = player.x, tz = player.z;
  const cx = tx - fx * dist, cz = tz - fz * dist;
  if (G.shot) {
    // staged screenshot: snap the camera at once, no lerp (headless runs few frames)
    camera.position.set(cx, height, cz);
    camera.lookAt(tx + fx * 5, 1.6, tz + fz * 5);
    return;
  }
  const k = 1 - Math.exp(-6 * dt);
  camera.position.x += (cx - camera.position.x) * k;
  camera.position.y += (height - camera.position.y) * k;
  camera.position.z += (cz - camera.position.z) * k;
  camera.lookAt(tx + fx * 5, 1.6, tz + fz * 5);
}

// --- 2D fallback: top-down Palmera Bay (GTA 1/2 style) if WebGL/three fails ---
function startFallback2D(shot, seed) {
  const ctx2d = canvas.getContext('2d');
  canvas.width = innerWidth; canvas.height = innerHeight;
  const rng = makeRng(seed);
  const px = { x: 400, y: 300, a: 0, car: false, speed: 0 };
  const cars = [];
  for (let i = 0; i < 12; i++) cars.push({ x: rng() * 800, y: rng() * 600, c: ['red', 'blue', 'yellow', 'white'][i % 4] });
  const keys = {};
  addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'KeyE') px.car = !px.car; });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  if (overlay) overlay.style.display = 'none';
  setStatus('Palmera Bay — top-down mode. WASD to move, E to enter a car.');
  function loop() {
    requestAnimationFrame(loop);
    const sp = px.car ? 4 : 2;
    if (keys.KeyW) px.y -= sp; if (keys.KeyS) px.y += sp;
    if (keys.KeyA) px.x -= sp; if (keys.KeyD) px.x += sp;
    ctx2d.fillStyle = '#3a3d42'; ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    ctx2d.strokeStyle = '#5a6068'; ctx2d.lineWidth = 18;
    for (let i = 0; i < 10; i++) {
      ctx2d.beginPath(); ctx2d.moveTo(i * 90, 0); ctx2d.lineTo(i * 90, canvas.height); ctx2d.stroke();
      ctx2d.beginPath(); ctx2d.moveTo(0, i * 90); ctx2d.lineTo(canvas.width, i * 90); ctx2d.stroke();
    }
    for (const c of cars) { ctx2d.fillStyle = c.c; ctx2d.fillRect(c.x - 10, c.y - 6, 20, 12); }
    ctx2d.fillStyle = '#ffd23c'; ctx2d.beginPath(); ctx2d.arc(700, 500, 10, 0, 7); ctx2d.fill();
    ctx2d.fillStyle = '#2eff8a'; ctx2d.beginPath(); ctx2d.arc(px.x, px.y, 8, 0, 7); ctx2d.fill();
    ctx2d.fillStyle = '#fff'; ctx2d.font = '20px sans-serif';
    ctx2d.fillText('PALMERA BAY — top-down mode. Reach the gold marker. WASD move, E car.', 20, 30);
  }
  loop();
}

boot();
