import type { TrilhaLiveGameRow, TrilhaLiveGameState } from "./trilhaLiveGame";
import { getNextPlacementColor, TRILHA_PIECES_PER_PLAYER, type TrilhaPieceColor } from "./trilhaPieces";
import {
  findMillsContainingNode,
  getRemovableOpponentNodes,
  getValidSlideTargets,
  opponentColor,
} from "./trilhaRules";

/** Anfitrião = amarelo, convidado = azul. */
export function liveColorForUser(userId: string, game: TrilhaLiveGameRow): TrilhaPieceColor | null {
  if (userId === game.host_id) return "yellow";
  if (game.guest_id && userId === game.guest_id) return "blue";
  return null;
}

/**
 * Quem pode jogar: em `waiting` só o anfitrião, e só como amarelo (até o convidado entrar).
 * Com `simulateBothWhileWaiting`, o anfitrião em `waiting` pode jogar as duas cores (teste local).
 */
export function canUserActLive(
  userId: string,
  game: TrilhaLiveGameRow,
  state: TrilhaLiveGameState,
  opts?: { simulateBothWhileWaiting?: boolean },
): boolean {
  if (opts?.simulateBothWhileWaiting && game.status === "waiting" && userId === game.host_id) {
    return true;
  }

  if (game.status === "waiting") {
    if (userId !== game.host_id) return false;
    if (state.trilhaPhase === "remove") {
      return state.pieceTurn === "yellow";
    }
    if (state.trilhaPhase === "move") {
      return state.pieceTurn === "yellow";
    }
    const next = getNextPlacementColor(state.placementsMade, state.pieceTurn);
    if (next === null) return false;
    return next === "yellow";
  }

  if (game.status !== "active" || !game.guest_id) return false;
  const my = liveColorForUser(userId, game);
  if (!my) return false;
  if (state.trilhaPhase === "remove") {
    return state.pieceTurn === my;
  }
  if (state.trilhaPhase === "move") {
    return state.pieceTurn === my;
  }
  const next = getNextPlacementColor(state.placementsMade, state.pieceTurn);
  return next === my;
}

/**
 * Aplica uma jogada ao estado (mesma lógica que o Studio na ferramenta Peças).
 * Devolve null se a jogada for inválida.
 */
export function applyTrilhaLiveNodeClick(state: TrilhaLiveGameState, nodeId: string): TrilhaLiveGameState | null {
  const trilhaPieces = state.trilhaPieces;
  const pieceTurn = state.pieceTurn;
  const trilhaPhase = state.trilhaPhase;
  const placementsMade = state.placementsMade;
  let captureCounts = state.captureCounts;
  const pendingMillTriad = state.pendingMillTriad;

  if (trilhaPhase === "move") {
    return null;
  }

  if (trilhaPhase === "remove") {
    const removable = getRemovableOpponentNodes(trilhaPieces, pieceTurn);
    if (!removable.includes(nodeId)) return null;
    const removedColor = trilhaPieces[nodeId];
    const nextBoard = { ...trilhaPieces };
    delete nextBoard[nodeId];
    const capturedPieceColor: TrilhaPieceColor =
      removedColor === "yellow" || removedColor === "blue" ? removedColor : opponentColor(pieceTurn);
    if (capturedPieceColor === "yellow") {
      captureCounts = { ...captureCounts, fromYellow: captureCounts.fromYellow + 1 };
    } else {
      captureCounts = { ...captureCounts, fromBlue: captureCounts.fromBlue + 1 };
    }
    const afterPlacement = getNextPlacementColor(placementsMade, pieceTurn) === null;
    return {
      ...state,
      v: 1,
      trilhaPieces: nextBoard,
      trilhaPhase: afterPlacement ? "move" : "place",
      pendingMillTriad: null,
      pieceTurn: opponentColor(pieceTurn),
      placementsMade: { ...placementsMade },
      captureCounts,
    };
  }

  if (trilhaPieces[nodeId]) return null;
  const nextColor = getNextPlacementColor(placementsMade, pieceTurn);
  if (nextColor === null) return null;
  const newBoard = { ...trilhaPieces, [nodeId]: nextColor };
  const mills = findMillsContainingNode(newBoard, nodeId, nextColor);
  const nextPlacements = {
    ...placementsMade,
    [nextColor]: placementsMade[nextColor] + 1,
  };
  if (mills.length > 0) {
    return {
      ...state,
      v: 1,
      trilhaPieces: newBoard,
      placementsMade: nextPlacements,
      trilhaPhase: "remove",
      pendingMillTriad: [...mills[0]!],
      pieceTurn: nextColor,
    };
  }
  const placementDone = getNextPlacementColor(nextPlacements, pieceTurn) === null;
  return {
    ...state,
    v: 1,
    trilhaPieces: newBoard,
    placementsMade: nextPlacements,
    pieceTurn: nextColor === "yellow" ? "blue" : "yellow",
    trilhaPhase: placementDone ? "move" : "place",
    pendingMillTriad,
  };
}

/**
 * Fase de movimento: deslizar uma peça da própria cor para uma casa vazia (vizinha ou voo com 3 peças).
 */
export function applyTrilhaLiveSlide(
  state: TrilhaLiveGameState,
  from: string,
  to: string,
): TrilhaLiveGameState | null {
  if (state.trilhaPhase !== "move" || from === to) return null;
  const mover = state.pieceTurn;
  const board = state.trilhaPieces;
  if (board[from] !== mover || board[to]) return null;
  const valid = getValidSlideTargets(board, from, mover);
  if (!valid.includes(to)) return null;

  const newBoard = { ...board };
  delete newBoard[from];
  newBoard[to] = mover;

  const mills = findMillsContainingNode(newBoard, to, mover);
  if (mills.length > 0) {
    return {
      ...state,
      v: 1,
      trilhaPieces: newBoard,
      trilhaPhase: "remove",
      pendingMillTriad: [...mills[0]!],
      pieceTurn: mover,
      placementsMade: { ...state.placementsMade },
    };
  }
  return {
    ...state,
    v: 1,
    trilhaPieces: newBoard,
    trilhaPhase: "move",
    pendingMillTriad: null,
    pieceTurn: opponentColor(mover),
    placementsMade: { ...state.placementsMade },
  };
}

export function livePlacementSummary(state: TrilhaLiveGameState): {
  yellowHand: number;
  blueHand: number;
  nextPlacement: TrilhaPieceColor | null;
} {
  const y = Math.max(0, TRILHA_PIECES_PER_PLAYER - state.placementsMade.yellow);
  const b = Math.max(0, TRILHA_PIECES_PER_PLAYER - state.placementsMade.blue);
  const nextPlacement = getNextPlacementColor(state.placementsMade, state.pieceTurn);
  return { yellowHand: y, blueHand: b, nextPlacement };
}
