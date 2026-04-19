import { useId, useRef } from "react";
import {
  TRILHA_DEFAULT_HALF_SIDES,
  TRILHA_NODE_COUNT,
  TRILHA_NODES_PER_RING,
  trilhaLineSegments,
  trilhaNodeId,
  trilhaPoint,
  type TrilhaRing,
} from "../../lib/trilhaBoardGeometry";
import type { TrilhaPieceColor } from "../../lib/trilhaPieces";

type MoveInteraction = {
  turnColor: TrilhaPieceColor;
  selectedFrom: string | null;
  validTargetIds: string[];
  onSelectFrom: (id: string | null) => void;
  onSlide: (from: string, to: string) => void;
};

type Props = {
  className?: string;
  /** Peças por id de casa `ring-pos`, ex.: `{ "0-1": "yellow" }`. */
  pieces?: Partial<Record<string, TrilhaPieceColor>>;
  /** Permite clicar nas casas (colocação / futuras jogadas). */
  interactive?: boolean;
  onNodeClick?: (nodeId: string) => void;
  /** Casa realçada (ex.: hover ou última jogada). */
  highlightNodeId?: string | null;
  /** Três casas da trilha formada (ordem ao longo da linha), para realçar o segmento. */
  millLineTriad?: string[] | null;
  /** Casas onde é permitido retirar peça (fase de remoção). */
  removableHighlightIds?: string[] | null;
  /** Destinos válidos na fase de movimento (realce verde). */
  slideTargetHighlightIds?: string[] | null;
  /** Peça escolhida para mover (realce). */
  selectedMoveFromId?: string | null;
  /** Fase de movimento: arrastar da própria cor ou tocar casa vazia com peça pré-selecionada. */
  moveInteraction?: MoveInteraction | null;
  /** Se definido, só estas casas recebem área clicável (ex.: só removíveis na fase de retirada). */
  restrictInteractiveNodeIds?: string[] | null;
};

const VB = 100;
const LINE_STROKE = 2.1;
const SOCKET_R = 3.1;
const PIECE_R = 2.45;
const MOVE_TAP_PX = 10;

export function TrilhaBoardSvg({
  className,
  pieces = {},
  interactive = false,
  onNodeClick,
  highlightNodeId = null,
  millLineTriad = null,
  removableHighlightIds = null,
  slideTargetHighlightIds = null,
  selectedMoveFromId = null,
  moveInteraction = null,
  restrictInteractiveNodeIds = null,
}: Props) {
  const suppressMoveClickUntil = useRef(0);
  const gid = useId().replace(/:/g, "");
  const segments = trilhaLineSegments(TRILHA_DEFAULT_HALF_SIDES);
  const idWood = `trilha-wood-${gid}`;
  const idShade = `trilha-shade-${gid}`;
  const idSocket = `trilha-socket-${gid}`;

  return (
    <div className={className ?? "trilha-board-svg-wrap"}>
      <svg
        className="trilha-board-svg"
        viewBox={`0 0 ${VB} ${VB}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Tabuleiro de Trilha com três quadrados concêntricos e vinte e quatro casas"
      >
        <defs>
          <linearGradient id={idWood} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e9cfa8" />
            <stop offset="35%" stopColor="#d4a574" />
            <stop offset="70%" stopColor="#c49660" />
            <stop offset="100%" stopColor="#a67c4a" />
          </linearGradient>
          <linearGradient id={idShade} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
          </linearGradient>
          <radialGradient id={idSocket} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#3d2e24" />
            <stop offset="100%" stopColor="#1a1410" />
          </radialGradient>
        </defs>

        <rect x="4" y="4" width={VB - 8} height={VB - 8} rx="3.5" fill={`url(#${idWood})`} stroke="#5c4030" strokeWidth="0.75" />
        <rect x="4" y="4" width={VB - 8} height={VB - 8} rx="3.5" fill={`url(#${idShade})`} pointerEvents="none" />

        <g className="trilha-board-svg__lines" stroke="#121212" strokeWidth={LINE_STROKE} strokeLinecap="square">
          {segments.map((s, i) => (
            <line key={`ln-${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
          ))}
        </g>

        <g className="trilha-board-svg__sockets">
          {Array.from({ length: TRILHA_NODE_COUNT }, (_, i) => {
            const ring = Math.trunc(i / TRILHA_NODES_PER_RING) as TrilhaRing;
            const pos = i % TRILHA_NODES_PER_RING;
            const pt = trilhaPoint(ring, pos, TRILHA_DEFAULT_HALF_SIDES);
            return (
              <circle
                key={trilhaNodeId(ring, pos)}
                cx={pt.x}
                cy={pt.y}
                r={SOCKET_R}
                fill={`url(#${idSocket})`}
                stroke="#140f0c"
                strokeWidth="0.45"
              />
            );
          })}
        </g>

        {millLineTriad?.length === 3 ? (
          <polyline
            className="trilha-board-svg__mill-line"
            points={millLineTriad
              .map((id) => {
                const [rs, ps] = id.split("-");
                const ring = Number(rs) as TrilhaRing;
                const pos = Number(ps);
                const pt = trilhaPoint(ring, pos, TRILHA_DEFAULT_HALF_SIDES);
                return `${pt.x},${pt.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(255, 210, 72, 0.92)"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        ) : null}

        {slideTargetHighlightIds?.length ? (
          <g className="trilha-board-svg__slide-targets" pointerEvents="none">
            {slideTargetHighlightIds.map((id) => {
              const [rs, ps] = id.split("-");
              const ring = Number(rs) as TrilhaRing;
              const pos = Number(ps);
              const pt = trilhaPoint(ring, pos, TRILHA_DEFAULT_HALF_SIDES);
              return (
                <circle
                  key={`sl-${id}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={PIECE_R + 1.6}
                  fill="none"
                  stroke="rgba(72, 199, 142, 0.9)"
                  strokeWidth="0.55"
                  strokeDasharray="1.1 0.7"
                />
              );
            })}
          </g>
        ) : null}

        {removableHighlightIds?.length ? (
          <g className="trilha-board-svg__removable" pointerEvents="none">
            {removableHighlightIds.map((id) => {
              const [rs, ps] = id.split("-");
              const ring = Number(rs) as TrilhaRing;
              const pos = Number(ps);
              const pt = trilhaPoint(ring, pos, TRILHA_DEFAULT_HALF_SIDES);
              return (
                <circle
                  key={`rm-${id}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={PIECE_R + 1.8}
                  fill="none"
                  stroke="rgba(255, 120, 90, 0.85)"
                  strokeWidth="0.55"
                  strokeDasharray="1.2 0.8"
                />
              );
            })}
          </g>
        ) : null}

        <g className="trilha-board-svg__pieces">
          {Object.entries(pieces).map(([id, color]) => {
            const [rs, ps] = id.split("-");
            const ring = Number(rs) as TrilhaRing;
            const pos = Number(ps);
            if (!Number.isInteger(ring) || ring < 0 || ring > 2 || !Number.isInteger(pos) || pos < 0 || pos > 7) return null;
            const pt = trilhaPoint(ring, pos, TRILHA_DEFAULT_HALF_SIDES);
            const fill = color === "yellow" ? "#f2d03a" : "#2a6ebd";
            const stroke = color === "yellow" ? "#c9a61a" : "#1a4a7a";
            return (
              <circle key={`pc-${id}`} cx={pt.x} cy={pt.y} r={PIECE_R} fill={fill} stroke={stroke} strokeWidth="0.4" />
            );
          })}
        </g>

        {highlightNodeId ? (
          <g className="trilha-board-svg__highlight" pointerEvents="none">
            {(() => {
              const parsed = highlightNodeId.match(/^([0-2])-([0-7])$/);
              if (!parsed) return null;
              const ring = Number(parsed[1]) as TrilhaRing;
              const pos = Number(parsed[2]);
              const pt = trilhaPoint(ring, pos, TRILHA_DEFAULT_HALF_SIDES);
              return (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={SOCKET_R + 1.2}
                  fill="none"
                  stroke="rgba(110, 231, 197, 0.65)"
                  strokeWidth="0.5"
                />
              );
            })()}
          </g>
        ) : null}

        {selectedMoveFromId ? (
          <g className="trilha-board-svg__move-select" pointerEvents="none">
            {(() => {
              const parsed = selectedMoveFromId.match(/^([0-2])-([0-7])$/);
              if (!parsed) return null;
              const ring = Number(parsed[1]) as TrilhaRing;
              const pos = Number(parsed[2]);
              const pt = trilhaPoint(ring, pos, TRILHA_DEFAULT_HALF_SIDES);
              return (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={PIECE_R + 2.1}
                  fill="none"
                  stroke="rgba(110, 200, 255, 0.95)"
                  strokeWidth="0.65"
                />
              );
            })()}
          </g>
        ) : null}

        {interactive && (onNodeClick || moveInteraction) ? (
          <g
            className="trilha-board-svg__hits"
            style={{ cursor: moveInteraction ? "grab" : onNodeClick ? "pointer" : undefined }}
          >
            {(() => {
              const allIds = Array.from({ length: TRILHA_NODE_COUNT }, (_, i) => {
                const ring = Math.trunc(i / TRILHA_NODES_PER_RING) as TrilhaRing;
                const pos = i % TRILHA_NODES_PER_RING;
                return trilhaNodeId(ring, pos);
              });
              const ids = restrictInteractiveNodeIds != null ? restrictInteractiveNodeIds : allIds;
              return ids.map((id) => {
                const [rs, ps] = id.split("-");
                const ring = Number(rs) as TrilhaRing;
                const pos = Number(ps);
                const pt = trilhaPoint(ring, pos, TRILHA_DEFAULT_HALF_SIDES);
                const ownPiece = moveInteraction && pieces[id] === moveInteraction.turnColor;
                return (
                  <circle
                    key={`hit-${id}`}
                    data-trilha-node={id}
                    cx={pt.x}
                    cy={pt.y}
                    r={5.5}
                    fill="transparent"
                    stroke="transparent"
                    role="button"
                    onPointerDown={(e) => {
                      if (!moveInteraction || !ownPiece) return;
                      e.preventDefault();
                      const start = { from: id, x: e.clientX, y: e.clientY };
                      const up = (ev: PointerEvent) => {
                        window.removeEventListener("pointerup", up);
                        const dist = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
                        const el = document.elementFromPoint(ev.clientX, ev.clientY);
                        const hit = el?.closest?.("[data-trilha-node]");
                        const toId = hit?.getAttribute("data-trilha-node") ?? null;
                        if (!toId) return;
                        if (dist < MOVE_TAP_PX && toId === start.from) {
                          moveInteraction.onSelectFrom(moveInteraction.selectedFrom === start.from ? null : start.from);
                          return;
                        }
                        if (!pieces[toId] && toId !== start.from) {
                          suppressMoveClickUntil.current = Date.now() + 400;
                          moveInteraction.onSlide(start.from, toId);
                        }
                      };
                      window.addEventListener("pointerup", up, { once: true });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (moveInteraction) {
                        if (Date.now() < suppressMoveClickUntil.current) return;
                        if (!pieces[id] && moveInteraction.selectedFrom && moveInteraction.validTargetIds.includes(id)) {
                          moveInteraction.onSlide(moveInteraction.selectedFrom, id);
                        }
                        return;
                      }
                      onNodeClick?.(id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (moveInteraction) {
                          if (!pieces[id] && moveInteraction.selectedFrom && moveInteraction.validTargetIds.includes(id)) {
                            moveInteraction.onSlide(moveInteraction.selectedFrom, id);
                          }
                          return;
                        }
                        onNodeClick?.(id);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Casa ${id}`}
                  />
                );
              });
            })()}
          </g>
        ) : null}
      </svg>
    </div>
  );
}
