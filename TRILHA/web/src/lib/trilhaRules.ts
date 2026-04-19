import {
  allTrilhaNodeKeys,
  parseTrilhaNodeId,
  trilhaNeighbors,
  trilhaNodeId,
} from "./trilhaBoardGeometry";
import { countPiecesByColor, type TrilhaPieceColor } from "./trilhaPieces";

/** Todas as linhas de 3 casas que contam como trilha (lados dos 3 quadrados + 4 radiais). */
export const TRILHA_MILL_TRIADS: readonly (readonly [string, string, string])[] = [
  ...([0, 1, 2] as const).flatMap((r) =>
    [
      [`${r}-0`, `${r}-1`, `${r}-2`],
      [`${r}-2`, `${r}-3`, `${r}-4`],
      [`${r}-4`, `${r}-5`, `${r}-6`],
      [`${r}-6`, `${r}-7`, `${r}-0`],
    ] as [string, string, string][],
  ),
  ...([1, 3, 5, 7] as const).map((pos) => [`0-${pos}`, `1-${pos}`, `2-${pos}`] as [string, string, string]),
];

export function opponentColor(c: TrilhaPieceColor): TrilhaPieceColor {
  return c === "yellow" ? "blue" : "yellow";
}

/** A peça nesta casa faz parte de alguma trilha completa desta cor? */
export function pieceInActiveMill(
  board: Partial<Record<string, TrilhaPieceColor>>,
  nodeId: string,
  color: TrilhaPieceColor,
): boolean {
  for (const triad of TRILHA_MILL_TRIADS) {
    if (!triad.includes(nodeId)) continue;
    if (triad.every((id) => board[id] === color)) return true;
  }
  return false;
}

/**
 * Trilhas completadas que incluem a casa `nodeId` (após a última jogada).
 */
export function findMillsContainingNode(
  board: Partial<Record<string, TrilhaPieceColor>>,
  nodeId: string,
  color: TrilhaPieceColor,
): [string, string, string][] {
  const out: [string, string, string][] = [];
  for (const triad of TRILHA_MILL_TRIADS) {
    if (!triad.includes(nodeId)) continue;
    if (triad.every((id) => board[id] === color)) {
      out.push([triad[0], triad[1], triad[2]]);
    }
  }
  return out;
}

/**
 * Casas do adversário que podem ser retiradas: fora de trilha, se existirem;
 * se todas as peças do adversário estiverem em trilhas, qualquer uma.
 */
export function getRemovableOpponentNodes(
  board: Partial<Record<string, TrilhaPieceColor>>,
  removerColor: TrilhaPieceColor,
): string[] {
  const opp = opponentColor(removerColor);
  const oppNodes: string[] = [];
  for (const [id, c] of Object.entries(board)) {
    if (c === opp) oppNodes.push(id);
  }
  if (oppNodes.length === 0) return [];
  const notInMill = oppNodes.filter((id) => !pieceInActiveMill(board, id, opp));
  if (notInMill.length > 0) return notInMill;
  return oppNodes;
}

/**
 * Casas vazias para onde o jogador pode mover a peça em `from` (vizinhas; com exatamente 3 peças no tabuleiro, pode “voar” para qualquer casa vazia).
 */
export function getValidSlideTargets(
  board: Partial<Record<string, TrilhaPieceColor>>,
  from: string,
  moverColor: TrilhaPieceColor,
): string[] {
  if (board[from] !== moverColor) return [];
  const onBoard = countPiecesByColor(board, moverColor);
  const flying = onBoard === 3;
  const emptyNodes = allTrilhaNodeKeys().filter((id) => !board[id]);
  if (flying) return emptyNodes;
  const parsed = parseTrilhaNodeId(from);
  if (!parsed) return [];
  const neigh = trilhaNeighbors(parsed.ring, parsed.pos).map(({ ring, pos }) => trilhaNodeId(ring, pos));
  return neigh.filter((id) => !board[id]);
}
