import { useId, useState } from "react";
import { TrilhaBoardSvg } from "./TrilhaBoardSvg";
import { TrilhaLiveTestPanel } from "./TrilhaLiveTestPanel";

type Props = {
  onClose: () => void;
};

type Tab = "sim" | "live";

export function TrilhaOnlineSimOverlay({ onClose }: Props) {
  const titleId = useId();
  const [tab, setTab] = useState<Tab>("sim");

  return (
    <div
      className="trilha-online-sim-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="trilha-online-sim">
        <header className="trilha-online-sim__head">
          <h2 id={titleId} className="trilha-online-sim__title">
            Teste online
          </h2>
          <p className="trilha-online-sim__subtitle">
            Simulação local ou ambiente Supabase com partida e código de convite (dois jogadores autenticados).
          </p>
        </header>

        <div className="trilha-online-sim__tabs" role="tablist" aria-label="Tipo de teste">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "sim"}
            className={`trilha-online-sim__tab${tab === "sim" ? " trilha-online-sim__tab--on" : ""}`}
            onClick={() => setTab("sim")}
          >
            Simulação
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "live"}
            className={`trilha-online-sim__tab${tab === "live" ? " trilha-online-sim__tab--on" : ""}`}
            onClick={() => setTab("live")}
          >
            Ambiente real
          </button>
        </div>

        {tab === "sim" ? <SimulatedFlow /> : <TrilhaLiveTestPanel />}

        <div className="trilha-online-sim__actions">
          <button type="button" className="trilha-online-sim__btn trilha-online-sim__btn--ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function SimulatedFlow() {
  const [phase, setPhase] = useState<"connecting" | "matched">("connecting");

  return (
    <>
      {phase === "connecting" ? (
        <p className="trilha-online-sim__status" role="status">
          A ligar (simulação)…
        </p>
      ) : (
        <p className="trilha-online-sim__status trilha-online-sim__status--ok" role="status">
          Oponente encontrado: <strong>Jogador #4821</strong> — a tua cor: <strong>amarelo</strong>.
        </p>
      )}

      <div className="trilha-online-sim__board">
        <TrilhaBoardSvg />
      </div>

      <p className="trilha-online-sim__hint">
        Fluxo fictício — sem rede. Usa o separador <strong>Ambiente real</strong> para criar partida no Supabase com
        código de convite.
      </p>

      <div className="trilha-online-sim__sim-actions">
        <button
          type="button"
          className="trilha-online-sim__btn trilha-online-sim__btn--ghost"
          onClick={() => setPhase((p) => (p === "connecting" ? "matched" : "connecting"))}
        >
          {phase === "connecting" ? "Simular oponente encontrado" : "Repor simulação"}
        </button>
      </div>
    </>
  );
}
