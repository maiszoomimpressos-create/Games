/**
 * Tabuleiro de Trilha (Nine Men's Morris): 3 quadrados concêntricos,
 * 24 casas (8 por anel), ligações ao longo de cada quadrado e 4 radiais
 * nos meios dos lados (sem diagonais pelo centro).
 */

export const TRILHA_RING_COUNT = 3;
export const TRILHA_NODES_PER_RING = 8;
export const TRILHA_NODE_COUNT = TRILHA_RING_COUNT * TRILHA_NODES_PER_RING;

/** Índices que ligam os 3 anéis (meios dos lados: topo, direita, fundo, esquerda). */
export const TRILHA_RADIAL_POSITIONS = [1, 3, 5, 7] as const;

export type TrilhaRing = 0 | 1 | 2;
export type TrilhaPos = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Meia largura de cada quadrado (distância do centro ao lado), em unidades do viewBox. */
export const TRILHA_DEFAULT_HALF_SIDES: readonly [number, number, number] = [38, 25, 12];

const CENTER = 50;

/** Ordem: canto sup-esq, meio-topo, canto sup-dir, meio-dir, … (sentido horário). */
const OFFSETS: readonly [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
];

export function trilhaNodeId(ring: TrilhaRing, pos: number): string {
  return `${ring}-${pos % TRILHA_NODES_PER_RING}`;
}

export function parseTrilhaNodeId(id: string): { ring: TrilhaRing; pos: number } | null {
  const m = /^([0-2])-([0-7])$/.exec(id.trim());
  if (!m) return null;
  return { ring: Number(m[1]) as TrilhaRing, pos: Number(m[2]) };
}

export function trilhaPoint(
  ring: TrilhaRing,
  pos: number,
  halfSides: readonly [number, number, number] = TRILHA_DEFAULT_HALF_SIDES,
): { x: number; y: number } {
  const s = halfSides[ring];
  const [kx, ky] = OFFSETS[pos % TRILHA_NODES_PER_RING]!;
  return {
    x: CENTER + kx * s,
    y: CENTER + ky * s,
  };
}

/** Segmentos únicos para desenho (cada par ordenado por coordenada do nó). */
export function trilhaLineSegments(
  halfSides: readonly [number, number, number] = TRILHA_DEFAULT_HALF_SIDES,
): { x1: number; y1: number; x2: number; y2: number }[] {
  const segs: { x1: number; y1: number; x2: number; y2: number }[] = [];

  for (let r = 0; r < TRILHA_RING_COUNT; r++) {
    const ring = r as TrilhaRing;
    for (let i = 0; i < TRILHA_NODES_PER_RING; i++) {
      const a = trilhaPoint(ring, i, halfSides);
      const b = trilhaPoint(ring, (i + 1) % TRILHA_NODES_PER_RING, halfSides);
      segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }

  for (const pos of TRILHA_RADIAL_POSITIONS) {
    for (let r = 0; r < TRILHA_RING_COUNT - 1; r++) {
      const a = trilhaPoint(r as TrilhaRing, pos, halfSides);
      const b = trilhaPoint((r + 1) as TrilhaRing, pos, halfSides);
      segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }

  return segs;
}

/** Vizinhos no grafo do jogo (movimentos válidos na fase de movimento). */
export function trilhaNeighbors(ring: TrilhaRing, pos: number): { ring: TrilhaRing; pos: number }[] {
  const p = pos % TRILHA_NODES_PER_RING;
  const out: { ring: TrilhaRing; pos: number }[] = [];

  out.push({ ring, pos: (p + 1) % TRILHA_NODES_PER_RING });
  out.push({ ring, pos: (p + TRILHA_NODES_PER_RING - 1) % TRILHA_NODES_PER_RING });

  if (TRILHA_RADIAL_POSITIONS.includes(p as (typeof TRILHA_RADIAL_POSITIONS)[number])) {
    if (ring > 0) out.push({ ring: (ring - 1) as TrilhaRing, pos: p });
    if (ring < TRILHA_RING_COUNT - 1) out.push({ ring: (ring + 1) as TrilhaRing, pos: p });
  }

  return out;
}

export function allTrilhaNodeKeys(): string[] {
  const keys: string[] = [];
  for (let r = 0; r < TRILHA_RING_COUNT; r++) {
    for (let p = 0; p < TRILHA_NODES_PER_RING; p++) {
      keys.push(trilhaNodeId(r as TrilhaRing, p));
    }
  }
  return keys;
}
