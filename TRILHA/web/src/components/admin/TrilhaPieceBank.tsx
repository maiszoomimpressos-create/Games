import type { TrilhaPieceColor } from "../../lib/trilhaPieces";
import { TRILHA_PIECES_PER_PLAYER } from "../../lib/trilhaPieces";

type Props = {
  color: TrilhaPieceColor;
  /** Quantas peças ainda não foram colocadas no tabuleiro. */
  inHand: number;
  label: string;
};

export function TrilhaPieceBank({ color, inHand, label }: Props) {
  const safe = Math.min(TRILHA_PIECES_PER_PLAYER, Math.max(0, inHand));
  return (
    <div className={`trilha-piece-bank trilha-piece-bank--${color}`}>
      <p className="trilha-piece-bank__label">{label}</p>
      <p className="trilha-piece-bank__count">
        Por colocar: <strong>{safe}</strong> / {TRILHA_PIECES_PER_PLAYER}
      </p>
      <div className="trilha-piece-bank__grid" role="list" aria-label={`Peças ${label}`}>
        {Array.from({ length: TRILHA_PIECES_PER_PLAYER }, (_, i) => {
          const filled = i < safe;
          return (
            <span
              key={i}
              className={`trilha-piece-bank__dot${filled ? " trilha-piece-bank__dot--on" : ""}`}
              role="listitem"
              aria-hidden
            />
          );
        })}
      </div>
    </div>
  );
}
