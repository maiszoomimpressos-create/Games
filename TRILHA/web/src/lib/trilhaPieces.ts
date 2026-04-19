export type TrilhaPieceColor = "yellow" | "blue";

export const TRILHA_PIECES_PER_PLAYER = 9;

export function countPiecesByColor(
  board: Partial<Record<string, TrilhaPieceColor>>,
  color: TrilhaPieceColor,
): number {
  let n = 0;
  for (const c of Object.values(board)) {
    if (c === color) n += 1;
  }
  return n;
}

export function piecesRemainingInHand(
  board: Partial<Record<string, TrilhaPieceColor>>,
  color: TrilhaPieceColor,
): number {
  return Math.max(0, TRILHA_PIECES_PER_PLAYER - countPiecesByColor(board, color));
}

/** Quem coloca a próxima peça na fase de colocação (usa pilhas colocadas, não só peças no tabuleiro — importa após retiradas). */
export function getNextPlacementColor(
  placementsMade: { yellow: number; blue: number },
  turnPreference: TrilhaPieceColor,
): TrilhaPieceColor | null {
  const y = TRILHA_PIECES_PER_PLAYER - placementsMade.yellow;
  const b = TRILHA_PIECES_PER_PLAYER - placementsMade.blue;
  if (y === 0 && b === 0) return null;
  if (y === 0) return "blue";
  if (b === 0) return "yellow";
  return turnPreference;
}

export function parseTrilhaPiecesFromConfig(config: Record<string, unknown>): {
  board: Partial<Record<string, TrilhaPieceColor>>;
  turn: TrilhaPieceColor;
} {
  const raw = config.trilhaPieces;
  const board: Partial<Record<string, TrilhaPieceColor>> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!/^[0-2]-[0-7]$/.test(k)) continue;
      if (v === "yellow" || v === "blue") board[k] = v;
    }
  }
  const t = config.trilhaPieceTurn;
  const turn: TrilhaPieceColor = t === "blue" ? "blue" : "yellow";
  return { board, turn };
}

export type TrilhaPhase = "place" | "remove" | "move";

/** Peças retiradas do tabuleiro na fase de remoção: cor da peça que saiu. */
export type TrilhaCaptureCounts = { fromYellow: number; fromBlue: number };

export function parseTrilhaCaptureCounts(config: Record<string, unknown>): TrilhaCaptureCounts {
  const raw = config.trilhaCaptureCounts;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const fy = Number(o.fromYellow);
    const fb = Number(o.fromBlue);
    if (Number.isFinite(fy) && Number.isFinite(fb)) {
      return {
        fromYellow: Math.max(0, Math.min(24, Math.floor(fy))),
        fromBlue: Math.max(0, Math.min(24, Math.floor(fb))),
      };
    }
  }
  return { fromYellow: 0, fromBlue: 0 };
}

/** Quantas peças cada lado já colocou a partir da pilha (não diminui com retiradas). */
export function parseTrilhaPlacementsMade(
  config: Record<string, unknown>,
  board: Partial<Record<string, TrilhaPieceColor>>,
): { yellow: number; blue: number } {
  const raw = config.trilhaPlacementsMade;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const y = Number(o.yellow);
    const b = Number(o.blue);
    if (Number.isFinite(y) && Number.isFinite(b)) {
      return {
        yellow: Math.min(TRILHA_PIECES_PER_PLAYER, Math.max(0, y)),
        blue: Math.min(TRILHA_PIECES_PER_PLAYER, Math.max(0, b)),
      };
    }
  }
  return {
    yellow: Math.min(TRILHA_PIECES_PER_PLAYER, countPiecesByColor(board, "yellow")),
    blue: Math.min(TRILHA_PIECES_PER_PLAYER, countPiecesByColor(board, "blue")),
  };
}

export function parseTrilhaGameFromConfig(config: Record<string, unknown>): {
  board: Partial<Record<string, TrilhaPieceColor>>;
  turn: TrilhaPieceColor;
  phase: TrilhaPhase;
  pendingMillTriad: string[] | null;
} {
  const { board, turn } = parseTrilhaPiecesFromConfig(config);
  const ph = config.trilhaPhase;
  const phase: TrilhaPhase =
    ph === "remove" ? "remove" : ph === "move" ? "move" : "place";
  const raw = config.trilhaPendingMill;
  let pendingMillTriad: string[] | null = null;
  if (Array.isArray(raw) && raw.length === 3 && raw.every((x) => typeof x === "string")) {
    pendingMillTriad = raw as string[];
  }
  return { board, turn, phase, pendingMillTriad };
}
