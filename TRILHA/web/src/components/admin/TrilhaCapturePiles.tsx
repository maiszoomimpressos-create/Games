type Props = {
  /** Peças azuis já retiradas (capturadas pelo amarelo). */
  capturedFromBlue: number;
  /** Peças amarelas já retiradas (capturadas pelo azul). */
  capturedFromYellow: number;
};

/**
 * Faixa abaixo do tabuleiro: azuis à esquerda, amarelas à direita (sem sobrepor o desenho).
 */
export function TrilhaCapturePiles({ capturedFromBlue, capturedFromYellow }: Props) {
  if (capturedFromBlue === 0 && capturedFromYellow === 0) return null;

  return (
    <div className="trilha-capture-strip" role="region" aria-label="Peças retiradas do tabuleiro">
      <div
        className="trilha-capture-strip__side trilha-capture-strip__side--left"
        title={
          capturedFromBlue > 0
            ? `${capturedFromBlue} peça(s) azul(is) retirada(s)`
            : undefined
        }
      >
        {capturedFromBlue > 0 ? (
          <div
            className="trilha-capture__pile"
            role="img"
            aria-label={`Peças azuis retiradas: ${capturedFromBlue}`}
          >
            {Array.from({ length: capturedFromBlue }, (_, i) => (
              <span key={`cfb-${i}`} className="trilha-capture__dot trilha-capture__dot--blue" aria-hidden />
            ))}
          </div>
        ) : null}
      </div>
      <div
        className="trilha-capture-strip__side trilha-capture-strip__side--right"
        title={
          capturedFromYellow > 0
            ? `${capturedFromYellow} peça(s) amarela(s) retirada(s)`
            : undefined
        }
      >
        {capturedFromYellow > 0 ? (
          <div
            className="trilha-capture__pile"
            role="img"
            aria-label={`Peças amarelas retiradas: ${capturedFromYellow}`}
          >
            {Array.from({ length: capturedFromYellow }, (_, i) => (
              <span key={`cfy-${i}`} className="trilha-capture__dot trilha-capture__dot--yellow" aria-hidden />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
