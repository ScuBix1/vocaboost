/**
 * Primitives de tirage aléatoire avec générateur injectable (RG-26).
 * Un `Rng` renvoie un nombre dans [0, 1), comme `Math.random`.
 */
export type Rng = () => number;

/** Générateur déterministe (mulberry32) pour les tests et la reproductibilité. */
export function createSeededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Indice entier uniforme dans [0, n). */
function randomIndex(n: number, rng: Rng): number {
  return Math.min(n - 1, Math.floor(rng() * n));
}

/** Mélange de Fisher-Yates ; renvoie une nouvelle liste. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1, rng);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Tirage uniforme sans remise de `count` éléments (au plus `items.length`). */
export function sampleUniform<T>(items: readonly T[], count: number, rng: Rng): T[] {
  return shuffle(items, rng).slice(0, Math.max(0, count));
}

/**
 * Tirage pondéré sans remise : à chaque étape, un élément restant est choisi
 * avec une probabilité proportionnelle à son poids, puis retiré.
 */
export function sampleWeighted<T>(
  items: readonly T[],
  count: number,
  weightOf: (item: T) => number,
  rng: Rng,
): T[] {
  const remaining = [...items];
  const picked: T[] = [];
  while (picked.length < count && remaining.length > 0) {
    const total = remaining.reduce((sum, item) => sum + weightOf(item), 0);
    let target = rng() * total;
    let index = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      target -= weightOf(remaining[i]);
      if (target < 0) {
        index = i;
        break;
      }
    }
    picked.push(remaining[index]);
    remaining.splice(index, 1);
  }
  return picked;
}
