// Danny Reyes on foot — third-person character, WASD + camera-relative movement.
import { CFG } from './config.js';
import { resolveCollisions } from './world.js';

export function makePlayer(THREE, scene) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98d64 });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x2e8f86 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2b3440 });
  const shoe = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.85, 0.4), shirt);
  torso.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.4), skin);
  head.position.y = 1.82;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.44),
    new THREE.MeshLambertMaterial({ color: 0xe8b93c }));
  cap.position.y = 2.06;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 0.3), pants);
  legL.position.set(-0.19, 0.38, 0);
  const legR = legL.clone();
  legR.position.x = 0.19;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.24), shirt);
  armL.position.set(-0.5, 1.15, 0);
  const armR = armL.clone();
  armR.position.x = 0.5;
  g.add(torso, head, cap, legL, legR, armL, armR);
  scene.add(g);

  const state = {
    group: g, x: 0, z: 0, angle: 0, speed: 0,
    health: CFG.player.health, cash: 250,
    walking: false, running: false, moving: false,
    legL, legR, armL, armR, walkPhase: 0,
  };
  return state;
}

export function updatePlayer(p, input, camYaw, colliders, half, dt) {
  let fx = 0, fz = 0;
  if (input.forward) fz += 1;
  if (input.back) fz -= 1;
  if (input.left) fx -= 1;
  if (input.right) fx += 1;
  const moving = fx !== 0 || fz !== 0;
  p.moving = moving;
  p.running = moving && input.run;
  const speed = p.running ? CFG.player.runSpeed : CFG.player.walkSpeed;
  if (moving) {
    const len = Math.hypot(fx, fz);
    fx /= len; fz /= len;
    // camera-relative: forward is away from camera
    const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    const wx = fx * cos - fz * sin;
    const wz = fx * sin + fz * cos;
    p.x += wx * speed * dt;
    p.z += wz * speed * dt;
    p.x = Math.max(-half, Math.min(half, p.x));
    p.z = Math.max(-half, Math.min(half, p.z));
    const [rx, rz] = resolveCollisions(colliders, p.x, p.z, 0.6);
    p.x = rx; p.z = rz;
    const targetAngle = Math.atan2(wx, wz);
    let d = targetAngle - p.angle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    p.angle += d * Math.min(1, CFG.player.turnSpeed * dt);
    p.speed = speed;
    p.walkPhase += dt * speed * 1.6;
  } else {
    p.speed = 0;
  }
  const swing = moving ? Math.sin(p.walkPhase) * 0.6 : 0;
  p.legL.rotation.x = swing;
  p.legR.rotation.x = -swing;
  p.armL.rotation.x = -swing * 0.8;
  p.armR.rotation.x = swing * 0.8;
  p.group.position.set(p.x, 0, p.z);
  p.group.rotation.y = p.angle;
}
