import { neonTetra } from './neon-tetra.js';
import { guppy } from './guppy.js';
import { rainbowfish } from './rainbowfish.js';
import { discus } from './discus.js';
import { angelfish } from './angelfish.js';
import { pleco } from './pleco.js';

export const SPECIES = [neonTetra, guppy, rainbowfish, discus, angelfish, pleco];

/** How many of each are stocked into the tank. */
export const STOCK = [
  { species: neonTetra, count: 12 },
  { species: rainbowfish, count: 7 },
  { species: guppy, count: 5 },
  { species: angelfish, count: 2 },
  { species: discus, count: 2 },
  { species: pleco, count: 2 },
];
