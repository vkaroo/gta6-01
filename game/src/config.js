// Palmera Bay — shared tuning constants. One job: numbers every system reads.
export const CFG = {
  city: {
    blocks: 8,          // blocks per side
    blockSize: 44,      // building block depth
    roadWidth: 14,      // street width
    pitch: 58,          // blockSize + roadWidth
    sidewalk: 3,        // sidewalk strip along each road
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
    cars: 14,
    peds: 26,
    carSpeed: 9,
    pedSpeed: 1.6,
  },
  police: {
    maxCars: 4,
    chaseSpeed: 30,
    ramDamage: 8,
  },
  wanted: {
    decaySeconds: 18,
    stealCar: 1,
    hitPed: 1,
    shoot: 1,
    hitCop: 2,
  },
  colors: {
    sky: 0x8ec9e8,
    sun: 0xfff2cf,
    ground: 0x9a938a,
    road: 0x3a3d42,
    sidewalk: 0xb9b2a4,
    sea: 0x2e7fa8,
  },
};

// Warm coastal building palettes (walls, roofs, glass).
export const PALETTES = [
  { wall: 0xf2e3c6, roof: 0xc96f4a, glass: 0x7fb8c9 },
  { wall: 0xe8c9a0, roof: 0x8a5a3b, glass: 0x9fc7d4 },
  { wall: 0xf7f0dd, roof: 0x4a7a8c, glass: 0x6fa8bd },
  { wall: 0xd9e2e8, roof: 0x3d5a73, glass: 0x5d8ba0 },
  { wall: 0xf0d7b0, roof: 0xb0523c, glass: 0x8fc3d1 },
  { wall: 0xe5d5c3, roof: 0x6b7f5e, glass: 0xa8c8b8 },
];

export const CAR_COLORS = [
  0xc23b2e, 0x2e6fc2, 0xe8b93c, 0x3aa655, 0xe8e4da,
  0x8a4fbf, 0x22262b, 0xd96a1e, 0x4fc3c9, 0xb03a6e,
];

export const MISSION_REWARDS = [500, 750, 1200];
