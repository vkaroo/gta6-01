// Palmera Bay — tuning numbers every system shares. One file, one job:
// the constants. Nothing here touches the scene or the loop.
export const CFG = {
  city: {
    blocks: 8,          // blocks along each side of the grid
    blockSize: 44,      // depth of one building block
    roadWidth: 14,      // street width
    pitch: 58,          // blockSize + roadWidth
    sidewalk: 3,        // pavement strip beside each road
  },
  player: {
    walkSpeed: 7,
    runSpeed: 11,
    turnSpeed: 9,
    health: 100,
  },
  car: {
    accel: 22,
    brake: 34,
    maxSpeed: 34,
    reverseMax: 10,
    steer: 1.9,
    grip: 6,
  },
  traffic: {
    cars: 30,           // cruise cars on the grid
    peds: 52,           // walkers on the sidewalks
    carSpeed: 9,
    pedSpeed: 1.6,
  },
  police: {
    maxCars: 6,         // pursuit cars at full heat
    chaseSpeed: 30,
    ramDamage: 8,
    roadblockAt: 4,     // wanted stars that trigger a roadblock
  },
  wanted: {
    decaySeconds: 18,
    stealCar: 1,
    hitPed: 1,
    shoot: 1,
    hitCop: 2,
  },
  colors: {
    sky: 0x86bfe3,
    sun: 0xffdf9e,
    ground: 0x9a938a,
    road: 0x3a3d42,
    sidewalk: 0xb9b2a4,
    sea: 0x2e7fa8,
  },
};

// Sun-baked coastal palettes: wall, roof, glass. Eight of them so no two
// neighbouring blocks look like the same tower photocopied.
export const PALETTES = [
  { wall: 0xf2e3c6, roof: 0xc96f4a, glass: 0x7fb8c9 },
  { wall: 0xe8c9a0, roof: 0x8a5a3b, glass: 0x9fc7d4 },
  { wall: 0xf7f0dd, roof: 0x4a7a8c, glass: 0x6fa8bd },
  { wall: 0xd9e2e8, roof: 0x3d5a73, glass: 0x5d8ba0 },
  { wall: 0xf0d7b0, roof: 0xb0523c, glass: 0x8fc3d1 },
  { wall: 0xe5d5c3, roof: 0x6b7f5e, glass: 0xa8c8b8 },
  { wall: 0xf3c6b8, roof: 0x7a4a5e, glass: 0x8fb8c9 },
  { wall: 0xcfe0d4, roof: 0x2f6f6a, glass: 0x7fb8a8 },
];

// Pastel beachfront palettes for the north row facing the sea.
export const BEACH_PALETTES = [
  { wall: 0xffe8d6, roof: 0x3fa7a0, glass: 0x9fd8e8 },
  { wall: 0xfff3c9, roof: 0xe07a5f, glass: 0x8fc3d1 },
  { wall: 0xd6ecff, roof: 0x4a6fa5, glass: 0x6fa8d8 },
  { wall: 0xf9d8e0, roof: 0xb0526e, glass: 0xa8c8d8 },
];

export const CAR_COLORS = [
  0xc23b2e, 0x2e6fc2, 0xe8b93c, 0x3aa655, 0xe8e4da,
  0x8a4fbf, 0x22262b, 0xd96a1e, 0x4fc3c9, 0xb03a6e,
  0xf2f2f2, 0x7a4a2e,
];

export const CONTAINER_COLORS = [
  0xc23b2e, 0x2e6fc2, 0x3aa655, 0xe8b93c, 0x8a4fbf, 0xd96a1e,
];

// Six jobs, six paydays. The last one clears Danny's debt for good.
export const MISSION_REWARDS = [500, 750, 1200, 900, 1500, 2500];
