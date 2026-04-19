import { useCallback, useEffect, useState } from "react";
import { updateTrilhaLiveGameState, type TrilhaLiveGameRow } from "../../lib/trilhaLiveGame";
import {
  applyTrilhaLiveNodeClick,
  applyTrilhaLiveSlide,
  canUserActLive,
  liveColorForUser,
  livePlacementSummary,
} from "../../lib/trilhaLiveMove";
import { getRemovableOpponentNodes, getValidSlideTargets, opponentColor } from "../../lib/trilhaRules";
import { TrilhaBoardSvg } from "./TrilhaBoardSvg";
import { TrilhaCapturePiles } from "./TrilhaCapturePiles";
import { TrilhaPieceBank } from "./TrilhaPieceBank";

type Props = {
  game: TrilhaLiveGameRow;
  userId: string;
  onError: (msg: string) => void;
  /** Só anfitrião com partida `waiting`: permite jogar amarelo e azul para testar sozinho. */
  simulateBothWhileWaiting?: boolean;
};

export function TrilhaLivePlayBoard({ game, userId, onError, simulateBothWhileWaiting = false }: Props) {
  const [pushing, setPushing] = useState(false);
  const [selectedMoveFrom, setSelectedMoveFrom] = useState<string | null>(null);
  const st = game.state;
  const myColor = liveColorForUser(userId, game);
  const simOpts = simulateBothWhileWaiting ? { simulateBothWhileWaiting: true } : undefined;
  const canAct = canUserActLive(userId, game, st, simOpts);
  const { yellowHand, blueHand, nextPlacement } = livePlacementSummary(st);
  const removableNodes =
    st.trilhaPhase === "remove" ? getRemovableOpponentNodes(st.trilhaPieces, st.pieceTurn) : [];
  const isHost = userId === game.host_id;
  const waitingNoGuest = game.status === "waiting";
  const inMovePhase = st.trilhaPhase === "move";

  const validSlideTargets =
    inMovePhase && selectedMoveFrom && canAct
      ? getValidSlideTargets(st.trilhaPieces, selectedMoveFrom, st.pieceTurn)
      : [];

  useEffect(() => {
    setSelectedMoveFrom(null);
  }, [st.trilhaPhase, st.pieceTurn, game.id]);

  const pushState = useCallback(
    async (next: typeof st) => {
      setPushing(true);
      onError("");
      const { error } = await updateTrilhaLiveGameState(game.id, next);
      setPushing(false);
      if (error) onError(error);
      else setSelectedMoveFrom(null);
    },
    [game.id, onError],
  );

  const handleNodeClick = useCallback(
    async (nodeId: string) => {
      if (pushing || !canUserActLive(userId, game, st, simOpts)) return;
      const next = applyTrilhaLiveNodeClick(st, nodeId);
      if (!next) return;
      await pushState(next);
    },
    [pushing, userId, game, st, onError, simOpts, pushState],
  );

  const handleSlide = useCallback(
    async (from: string, to: string) => {
      if (pushing || !canUserActLive(userId, game, st, simOpts)) return;
      const next = applyTrilhaLiveSlide(st, from, to);
      if (!next) return;
      await pushState(next);
    },
    [pushing, userId, game, st, onError, simOpts, pushState],
  );

  const roleLine = (() => {
    if (waitingNoGuest && simulateBothWhileWaiting && isHost) {
      return (
        <>
          <strong>Modo simulação</strong> — estás a jogar as duas cores na mesma sessão (só teste). O estado grava-se no
          Supabase.
        </>
      );
    }
    if (waitingNoGuest && isHost) {
      return (
        <>
          Como anfitrião só podes jogar <strong>amarelo</strong> até alguém entrar com o código. Ativa “Simular as duas
          cores” no painel para testar amarelo e azul sozinho.
        </>
      );
    }
    return (
      <>
        Tu és <strong>{myColor === "yellow" ? "Amarelo (anfitrião)" : "Azul (convidado)"}</strong>
        {canAct ? " — é a tua jogada." : " — vez do adversário."}
      </>
    );
  })();

  const boardInteractive =
    (game.status === "active" || (game.status === "waiting" && isHost)) && !pushing && canAct;

  return (
    <div className="trilha-live-play">
      <p className="trilha-live-play__role" role="status">
        {roleLine}
        {pushing ? " A sincronizar…" : null}
      </p>
      <div className="trilha-setup trilha-setup--live">
        <TrilhaPieceBank color="yellow" inHand={yellowHand} label="Anfitrião (amarelo)" />
        <div className="trilha-setup__board">
          {st.trilhaPhase === "remove" ? (
            <p className="trilha-setup__mill-banner" role="status">
              <strong>Trilha!</strong> Retira uma peça do adversário (contornadas a laranja).
            </p>
          ) : null}
          {inMovePhase ? (
            <p className="trilha-setup__mill-banner trilha-setup__mill-banner--move" role="status">
              <strong>Fase de movimento</strong> — arrasta uma peça tua para uma casa vazia (verde). Com 3 peças no
              tabuleiro podes mover para qualquer casa vazia.
            </p>
          ) : null}
          <div className="trilha-setup__board-surface">
            <TrilhaBoardSvg
              pieces={st.trilhaPieces}
              interactive={boardInteractive}
              onNodeClick={inMovePhase ? undefined : handleNodeClick}
              moveInteraction={
                inMovePhase && boardInteractive
                  ? {
                      turnColor: st.pieceTurn,
                      selectedFrom: selectedMoveFrom,
                      validTargetIds: validSlideTargets,
                      onSelectFrom: setSelectedMoveFrom,
                      onSlide: (from, to) => {
                        void handleSlide(from, to);
                      },
                    }
                  : null
              }
              slideTargetHighlightIds={inMovePhase && selectedMoveFrom ? validSlideTargets : null}
              selectedMoveFromId={inMovePhase ? selectedMoveFrom : null}
              millLineTriad={st.trilhaPhase === "remove" ? st.pendingMillTriad : null}
              removableHighlightIds={st.trilhaPhase === "remove" ? removableNodes : null}
              restrictInteractiveNodeIds={st.trilhaPhase === "remove" ? removableNodes : null}
            />
          </div>
          <TrilhaCapturePiles
            capturedFromBlue={st.captureCounts.fromBlue}
            capturedFromYellow={st.captureCounts.fromYellow}
          />
          {st.trilhaPhase === "remove" ? (
            <p className="trilha-setup__status trilha-setup__status--remove">
              Retirar peça <strong>{opponentColor(st.pieceTurn) === "yellow" ? "amarela" : "azul"}</strong>.
            </p>
          ) : inMovePhase ? (
            <p className="trilha-setup__status">
              Vez de jogar: <strong>{st.pieceTurn === "yellow" ? "Amarelo" : "Azul"}</strong>
            </p>
          ) : nextPlacement === null ? (
            <p className="trilha-setup__status trilha-setup__status--done">Colocação completa no tabuleiro.</p>
          ) : (
            <p className="trilha-setup__status">
              Próxima cor a colocar: <strong>{nextPlacement === "yellow" ? "Amarelo" : "Azul"}</strong>
            </p>
          )}
        </div>
        <TrilhaPieceBank color="blue" inHand={blueHand} label="Convidado (azul)" />
      </div>
    </div>
  );
}
