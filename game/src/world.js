// Palmera Bay — procedural coastal city: streets, blocks, buildings, palms, lamps, sea.
// Returns the render group plus the data other systems need (colliders, streets, spawns).
import { CFG, PALETTES } from './config.js';
import { pick, range, rangeInt, chance } from './random.js';
import { buildDockBlock, buildBeachBlock, buildBoardwalk } from './districts.js';

function windowTexture(THREE, rng, warm) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  // light base so the wall colour shows through; windows read as windows
  g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 22) {
    for (let x = 8; x < 120; x += 20) {
      // warm variant: most windows glow amber, like evening lights on.
      // cool variant: most windows are dark blue glass.
      const lit = warm ? rng() < 0.55 : rng() < 0.15;
      g.fillStyle = lit ? '#ffcf5e' : (rng() < 0.5 ? '#7d94a6' : '#5d7488');
      g.fillRect(x, y, 13, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePalm(THREE, rng) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b46 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 6, 6), trunkMat);
  trunk.position.y = 3;
  trunk.rotation.z = range(rng, -0.08, 0.08);
  palm.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.4, 6.4, Math.sin(a) * 1.4);
    leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    leaf.scale.set(1, 1, 0.28);
    palm.add(leaf);
  }
  const nuts = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
  nuts.position.y = 5.9;
  palm.add(nuts);
  palm.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return palm;
}

export function buildWorld(THREE, rng) {
  const { blocks, blockSize, roadWidth, pitch } = CFG.city;
  const size = blocks * pitch;               // 464
  const half = size / 2;
  const group = new THREE.Group();
  const colliders = [];
  const streets = [];                        // street centerline coords (one per axis)
  for (let i = 0; i <= blocks; i++) streets.push(i * pitch - half);
  const parkedSpots = [];
  const parkSpots = [];

  // --- ground, sea, beach ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size + 160, size + 160),
    new THREE.MeshLambertMaterial({ color: CFG.colors.ground }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(size + 400, 220),
    new THREE.MeshLambertMaterial({ color: CFG.colors.sea }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.02, -half - 110);
  group.add(sea);

  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(size + 160, 26),
    new THREE.MeshLambertMaterial({ color: 0xe8d9a8 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0, -half - 13);
  beach.receiveShadow = true;
  group.add(beach);

  // boardwalk, umbrellas and lifeguard tower on the sand
  buildBoardwalk(THREE, rng, group, half, makePalm);

  // --- roads + sidewalks + markings ---
  const roadMat = new THREE.MeshLambertMaterial({ color: CFG.colors.road });
  const walkMat = new THREE.MeshLambertMaterial({ color: CFG.colors.sidewalk });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8c95a });
  for (const s of streets) {
    for (const horizontal of [true, false]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(size, roadWidth), roadMat);
      road.rotation.x = -Math.PI / 2;
      if (!horizontal) road.rotation.z = Math.PI / 2;
      road.position.set(horizontal ? 0 : s, 0.01, horizontal ? s : 0);
      road.receiveShadow = true;
      group.add(road);
      // sidewalks on both sides
      for (const side of [-1, 1]) {
        const walk = new THREE.Mesh(
          new THREE.PlaneGeometry(size, CFG.city.sidewalk), walkMat);
        walk.rotation.x = -Math.PI / 2;
        if (!horizontal) walk.rotation.z = Math.PI / 2;
        const off = side * (roadWidth / 2 + CFG.city.sidewalk / 2);
        walk.position.set(horizontal ? 0 : s + off, 0.02, horizontal ? s + off : 0);
        walk.receiveShadow = true;
        group.add(walk);
      }
      // dashed center line
      for (let t = -half + 6; t < half - 6; t += 12) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.5), lineMat);
        dash.rotation.x = -Math.PI / 2;
        if (!horizontal) dash.rotation.z = Math.PI / 2;
        dash.position.set(horizontal ? t : s, 0.03, horizontal ? s : t);
        group.add(dash);
      }
    }
  }

  // zebra crossings + stop signs at the four central intersections
  const zebraMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  for (const ix of [streets[3], streets[4], streets[5]]) {
    for (const iz of [streets[3], streets[4], streets[5]]) {
      for (let k = -2; k <= 2; k++) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5.5), zebraMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(ix + k * 2.6, 0.03, iz + 9);
        group.add(stripe);
        const stripe2 = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.2), zebraMat);
        stripe2.rotation.x = -Math.PI / 2;
        stripe2.position.set(ix + 9, 0.03, iz + k * 2.6);
        group.add(stripe2);
      }
      // stop sign on the south-east corner of the crossing
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6),
        new THREE.MeshLambertMaterial({ color: 0x8a8f96 }));
      post.position.set(ix + 9, 1.3, iz + 9);
      group.add(post);
      const sign = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 8),
        new THREE.MeshLambertMaterial({ color: 0xc23b2e }));
      sign.rotation.x = Math.PI / 2;
      sign.position.set(ix + 9, 2.8, iz + 9);
      group.add(sign);
    }
  }

  // --- buildings, parks, parking lots ---
  const winWarm = windowTexture(THREE, rng, true);
  const winCool = windowTexture(THREE, rng, false);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let bi = 0; bi < blocks; bi++) {
    for (let bj = 0; bj < blocks; bj++) {
      const x0 = streets[bi] + roadWidth / 2 + CFG.city.sidewalk;
      const z0 = streets[bj] + roadWidth / 2 + CFG.city.sidewalk;
      const x1 = streets[bi + 1] - roadWidth / 2 - CFG.city.sidewalk;
      const z1 = streets[bj + 1] - roadWidth / 2 - CFG.city.sidewalk;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      // east edge is the docks, north row is the beachfront hotels
      if (bi >= 6) { buildDockBlock(THREE, rng, group, colliders, x0, z0, x1, z1); continue; }
      if (bj === 0) { buildBeachBlock(THREE, rng, group, colliders, x0, z0, x1, z1); continue; }
      const roll = rng();
      if (roll < 0.14) {
        // park: palms + grass
        const grass = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0),
          new THREE.MeshLambertMaterial({ color: 0x5da85e }));
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(cx, 0.04, cz);
        grass.receiveShadow = true;
        group.add(grass);
        for (let p = 0; p < 7; p++) {
          const palm = makePalm(THREE, rng);
          palm.position.set(range(rng, x0 + 3, x1 - 3), 0, range(rng, z0 + 3, z1 - 3));
          group.add(palm);
          parkSpots.push({ x: palm.position.x, z: palm.position.z });
        }
        continue;
      }
      if (roll < 0.26) {
        // parking lot with parked cars
        const lot = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0),
          new THREE.MeshLambertMaterial({ color: 0x55585e }));
        lot.rotation.x = -Math.PI / 2;
        lot.position.set(cx, 0.04, cz);
        group.add(lot);
        for (let p = 0; p < 5; p++) {
          parkedSpots.push({
            x: x0 + 5 + p * 7, z: cz - 4, angle: 0,
          });
          parkedSpots.push({
            x: x0 + 5 + p * 7, z: cz + 6, angle: Math.PI,
          });
        }
        continue;
      }
      // buildings: 1 tall tower or 2-4 low blocks
      const pal = pick(rng, PALETTES);
      const tall = chance(rng, 0.3);
      const count = tall ? 1 : rangeInt(rng, 2, 4);
      for (let b = 0; b < count; b++) {
        const w = tall ? range(rng, 20, 26) : range(rng, 10, 16);
        const d = tall ? range(rng, 20, 26) : range(rng, 10, 16);
        const h = tall ? range(rng, 34, 58) : range(rng, 7, 18);
        const bx = count === 1 ? cx : range(rng, x0 + w / 2 + 1, x1 - w / 2 - 1);
        const bz = count === 1 ? cz : range(rng, z0 + d / 2 + 1, z1 - d / 2 - 1);
        const tex = chance(rng, 0.5) ? winWarm : winCool;
        const wallCol = new THREE.Color(pal.wall);
        wallCol.offsetHSL(0, 0, range(rng, -0.05, 0.05));
        const mat = new THREE.MeshLambertMaterial({ color: wallCol, map: tex });
        const mesh = new THREE.Mesh(boxGeo, mat);
        mesh.scale.set(w, h, d);
        mesh.position.set(bx, h / 2, bz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        const roof = new THREE.Mesh(boxGeo,
          new THREE.MeshLambertMaterial({ color: pal.roof }));
        roof.scale.set(w + 0.6, 0.7, d + 0.6);
        roof.position.set(bx, h + 0.35, bz);
        roof.castShadow = true;
        group.add(roof);
        // rooftop clutter: AC box on most roofs, antenna on towers
        if (chance(rng, 0.6)) {
          const ac = new THREE.Mesh(boxGeo,
            new THREE.MeshLambertMaterial({ color: 0x8a8f96 }));
          ac.scale.set(2.2, 1, 2.2);
          ac.position.set(bx + w / 4, h + 1.2, bz);
          ac.castShadow = true;
          group.add(ac);
        }
        if (tall && chance(rng, 0.5)) {
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6, 5),
            new THREE.MeshLambertMaterial({ color: 0x2c2f33 }));
          ant.position.set(bx - w / 4, h + 3.5, bz);
          group.add(ant);
        }
        colliders.push({ minX: bx - w / 2, maxX: bx + w / 2, minZ: bz - d / 2, maxZ: bz + d / 2 });
      }
      // palms along the block edge
      for (let p = 0; p < 2; p++) {
        const palm = makePalm(THREE, rng);
        palm.position.set(range(rng, x0 + 2, x1 - 2), 0, chance(rng, 0.5) ? z0 + 1 : z1 - 1);
        group.add(palm);
      }
    }
  }

  // --- street lamps ---
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2c2f33 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const s of streets) {
    for (let t = -half + 20; t < half - 10; t += 58) {
      for (const [lx, lz] of [[s + 8, t], [t, s - 8]]) {
        if (Math.abs(lx) > half || Math.abs(lz) > half) continue;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), poleMat);
        pole.position.set(lx, 3.5, lz);
        group.add(pole);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
        head.position.set(lx, 7.1, lz);
        group.add(head);
      }
    }
  }

  return {
    group, colliders, streets, parkedSpots, parkSpots,
    half, size,
    spawn: { x: streets[4], z: streets[4] + 3, angle: 0 },
  };
}

// True when (x,z) is inside any building collider (with margin).
export function hitsBuilding(colliders, x, z, margin = 0.6) {
  for (const c of colliders) {
    if (x > c.minX - margin && x < c.maxX + margin &&
        z > c.minZ - margin && z < c.maxZ + margin) return c;
  }
  return null;
}

// Push a circle (x,z,r) out of building colliders. Returns corrected [x, z].
export function resolveCollisions(colliders, x, z, r = 0.6) {
  for (const c of colliders) {
    if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) {
      const dxl = x - (c.minX - r), dxr = (c.maxX + r) - x;
      const dzl = z - (c.minZ - r), dzr = (c.maxZ + r) - z;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) x = c.minX - r;
      else if (m === dxr) x = c.maxX + r;
      else if (m === dzl) z = c.minZ - r;
      else z = c.maxZ + r;
    }
  }
  return [x, z];
}
