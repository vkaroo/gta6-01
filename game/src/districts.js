// Palmera Bay — the districts that are not downtown. One job: build the
// two areas that give the city a second face, so the map is not one
// neighbourhood photocopied eight times.
//   * the docks (east edge): container yard, warehouses, gantry cranes
//   * the beachfront (north edge): pastel hotels, boardwalk, umbrellas
// Every solid thing here registers a collider, so cars and Danny cannot
// drive through a shipping container.
import { CONTAINER_COLORS, BEACH_PALETTES } from './config.js';
import { range, rangeInt, pick, chance } from './random.js';

function box(THREE, group, w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function addCollider(colliders, x, z, w, d) {
  colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
}

// One dock block: concrete yard, stacked containers, a warehouse, a crane.
export function buildDockBlock(THREE, rng, group, colliders, x0, z0, x1, z1) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const w = x1 - x0, d = z1 - z0;

  const yard = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshLambertMaterial({ color: 0x6a6e72 }));
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(cx, 0.04, cz);
  yard.receiveShadow = true;
  group.add(yard);

  // container stacks: 2-3 high, painted rust red, sea blue, leaf green
  const stacks = rangeInt(rng, 4, 6);
  for (let s = 0; s < stacks; s++) {
    const sx = range(rng, x0 + 5, x1 - 8);
    const sz = range(rng, z0 + 4, z1 - 4);
    const tall = rangeInt(rng, 1, 3);
    const col = pick(rng, CONTAINER_COLORS);
    const along = chance(rng, 0.5);
    for (let k = 0; k < tall; k++) {
      box(THREE, group,
        along ? 6.4 : 2.6, 2.6, along ? 2.6 : 6.4,
        col, sx, 1.3 + k * 2.6, sz);
    }
    addCollider(colliders, sx, sz, along ? 6.4 : 2.6, along ? 2.6 : 6.4);
  }

  // warehouse: one long shed with a striped roof edge
  const wx = cx, wz = chance(rng, 0.5) ? z0 + 7 : z1 - 7;
  box(THREE, group, 24, 8, 12, 0xb8b0a0, wx, 4, wz);
  box(THREE, group, 24.6, 0.8, 12.6, 0x3d5a73, wx, 8.4, wz);
  addCollider(colliders, wx, wz, 24, 12);
  // loading doors on the warehouse face
  for (let i = -1; i <= 1; i++) {
    box(THREE, group, 4, 5, 0.3, 0x4a5560, wx + i * 7, 2.5, wz + 6.1);
  }

  // gantry crane: two legs, a top beam, a hanging hook block
  const kx = x0 + 4, kz = cz;
  box(THREE, group, 1.2, 18, 1.2, 0xe8b93c, kx, 9, kz - 6);
  box(THREE, group, 1.2, 18, 1.2, 0xe8b93c, kx, 9, kz + 6);
  box(THREE, group, 1.4, 1.4, 16, 0xe8b93c, kx, 18, kz);
  box(THREE, group, 1.8, 1.8, 1.8, 0x2b3440, kx + 3, 13, kz);
  addCollider(colliders, kx, kz, 2, 13);

  // oil drums scattered near the yard edge
  const drumMat = new THREE.MeshLambertMaterial({ color: 0x7a4a2e });
  for (let i = 0; i < 5; i++) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 8), drumMat);
    drum.position.set(range(rng, x0 + 3, x1 - 3), 0.7, range(rng, z0 + 3, z1 - 3));
    drum.castShadow = true;
    group.add(drum);
  }
}

// One beachfront block: pastel hotel towers, a pool deck, palms.
export function buildBeachBlock(THREE, rng, group, colliders, x0, z0, x1, z1) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const pal = pick(rng, BEACH_PALETTES);

  // pool deck between the towers
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 10),
    new THREE.MeshLambertMaterial({ color: 0x3fa7c9 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(cx, 0.05, cz + 8);
  pool.receiveShadow = true;
  group.add(pool);

  const towers = rangeInt(rng, 1, 2);
  for (let t = 0; t < towers; t++) {
    const tw = range(rng, 16, 22), td = range(rng, 14, 18);
    const th = range(rng, 26, 44);
    const tx = towers === 1 ? cx : (t === 0 ? x0 + tw / 2 + 2 : x1 - tw / 2 - 2);
    const tz = cz - 6;
    box(THREE, group, tw, th, td, pal.wall, tx, th / 2, tz);
    box(THREE, group, tw + 0.6, 0.7, td + 0.6, pal.roof, tx, th + 0.35, tz);
    // balcony stripes: thin lighter bands every few floors
    for (let f = 6; f < th - 3; f += 8) {
      box(THREE, group, tw + 0.4, 0.5, td + 0.4, 0xffffff, tx, f, tz);
    }
    addCollider(colliders, tx, tz, tw, td);
  }

  // sun loungers by the pool: tiny coloured slabs
  for (let i = 0; i < 4; i++) {
    box(THREE, group, 1.8, 0.4, 0.8, pick(rng, [0xe07a5f, 0x3fa7a0, 0xe8b93c]),
      cx - 6 + i * 4, 0.25, cz + 12);
  }
}

// The beach strip itself: boardwalk, umbrellas, lifeguard tower, extra palms.
// half: half the city size; the sand sits just north of the grid.
export function buildBoardwalk(THREE, rng, group, half, makePalm) {
  const zSand = -half - 13;
  // boardwalk: pale planks between the last street and the sand
  const walk = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 160, 8),
    new THREE.MeshLambertMaterial({ color: 0xc9a06a }));
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(0, 0.03, -half - 4);
  walk.receiveShadow = true;
  group.add(walk);

  // umbrellas in a loose row along the sand
  const umbColors = [0xe07a5f, 0x3fa7a0, 0xe8b93c, 0xb0526e, 0x4a6fa5];
  for (let i = 0; i < 12; i++) {
    const ux = -half + 20 + i * 38 + range(rng, -6, 6);
    const uz = zSand + range(rng, -6, 6);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3, 6),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
    pole.position.set(ux, 1.5, uz);
    group.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 8),
      new THREE.MeshLambertMaterial({ color: pick(rng, umbColors) }));
    top.position.set(ux, 3.4, uz);
    top.castShadow = true;
    group.add(top);
  }

  // lifeguard tower: four legs, a hut, a red roof
  const lx = 40, lz = zSand + 2;
  for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) {
    box(THREE, group, 0.3, 4, 0.3, 0x8a6b46, lx + dx, 2, lz + dz);
  }
  box(THREE, group, 4, 2.4, 4, 0xf2f2f2, lx, 5.2, lz);
  box(THREE, group, 4.6, 0.4, 4.6, 0xc23b2e, lx, 6.6, lz);

  // a double row of palms along the boardwalk
  for (let x = -half + 10; x < half - 10; x += 46) {
    for (const z of [-half - 8, -half + 1]) {
      const palm = makePalm(THREE, rng);
      palm.position.set(x + range(rng, -4, 4), 0, z);
      group.add(palm);
    }
  }
}
