import { useCallback, useEffect, useState } from "react";
import type { GameDraft } from "../../lib/gameDrafts";
import { fetchMyDrafts } from "../../lib/gameDrafts";
import { supabase } from "../../supabaseClient";
import { StudioCanvasShell } from "./StudioCanvasShell";

const modulesAfterNew = [
  {
    key: "rules",
    icon: "◇",
    title: "Regras & tabuleiro",
    desc: "Definir turnos, vitória, grelha e movimentos.",
  },
  {
    key: "pieces",
    icon: "◆",
    title: "Peças & baralhos",
    desc: "Criar conjuntos de peças, cartas e fichas.",
  },
  {
    key: "assets",
    icon: "▣",
    title: "Assets visuais",
    desc: "Imagens, ícones e tema para o tabuleiro.",
  },
  {
    key: "playtest",
    icon: "◎",
    title: "Testar em sala",
    desc: "Abrir uma sala de teste com o teu rascunho.",
  },
  {
    key: "publish",
    icon: "↑",
    title: "Publicar",
    desc: "Tornar o jogo disponível aos jogadores (quando estiver pronto).",
  },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function StudioLab() {
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasDraft, setCanvasDraft] = useState<GameDraft | null>(null);
  const [drafts, setDrafts] = useState<GameDraft[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const loadDrafts = useCallback(async () => {
    if (!supabase) {
      setLoadError("Configura o Supabase no .env para guardar rascunhos.");
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    setLoadError(null);
    const { drafts: list, error } = await fetchMyDrafts();
    setDrafts(list);
    if (error) setLoadError(error);
    setLoadingList(false);
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const openNewCanvas = () => {
    setCanvasDraft(null);
    setCanvasOpen(true);
  };

  const openDraftCanvas = (d: GameDraft) => {
    setCanvasDraft(d);
    setCanvasOpen(true);
  };

  return (
    <div className="studio-lab">
      <header className="studio-lab__hero">
        <p className="studio-lab__eyebrow">Laboratório de jogos</p>
        <h1 className="studio-lab__title">Studio de criação</h1>
        <p className="studio-lab__lead">
          <strong>Novo projeto</strong> abre um ambiente em ecrã completo (estilo Canva) para desenhares o tabuleiro e
          preparares o jogo. No Studio, <strong>Testes</strong> oferece <strong>Interna</strong> (regras no editor) ou{" "}
          <strong>Real</strong> (simulação de partida online). Guarda o rascunho na base (SQL em{" "}
          <code className="studio-lab__code">supabase/migrations</code>).
        </p>
      </header>

      <section className="studio-lab__section" aria-labelledby="studio-modules-heading">
        <h2 id="studio-modules-heading" className="studio-lab__h2">
          Módulos do laboratório
        </h2>
        <ul className="studio-lab__grid">
          <li>
            <button
              type="button"
              className="studio-card studio-card--active"
              onClick={openNewCanvas}
              aria-describedby="studio-mod-new"
            >
              <span className="studio-card__icon" aria-hidden>
                ＋
              </span>
              <span className="studio-card__title">Novo projeto</span>
              <span id="studio-mod-new" className="studio-card__desc">
                Abre o editor visual em ecrã completo: tabuleiro, ferramentas à esquerda e gravação do rascunho.
              </span>
              <span className="studio-card__badge studio-card__badge--ok">Disponível</span>
            </button>
          </li>
          {modulesAfterNew.map((m) => (
            <li key={m.key}>
              <button type="button" className="studio-card" disabled aria-describedby={`studio-mod-${m.key}`}>
                <span className="studio-card__icon" aria-hidden>
                  {m.icon}
                </span>
                <span className="studio-card__title">{m.title}</span>
                <span id={`studio-mod-${m.key}`} className="studio-card__desc">
                  {m.desc}
                </span>
                <span className="studio-card__badge">Em breve</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="studio-lab__section studio-lab__workspace" aria-labelledby="studio-ws-heading">
        <h2 id="studio-ws-heading" className="studio-lab__h2">
          Área de trabalho
        </h2>
        {loadError && (
          <p className="studio-lab__warn" role="alert">
            {loadError}
            {loadError.includes("relation") || loadError.includes("schema cache") ? (
              <>
                {" "}
                — Executa o ficheiro <code className="studio-lab__code">supabase/migrations/001_game_drafts.sql</code>{" "}
                no SQL Editor do Supabase.
              </>
            ) : null}
          </p>
        )}
        <div className="studio-workspace">
          {loadingList ? (
            <p className="studio-workspace__loading">A carregar rascunhos…</p>
          ) : drafts.length === 0 ? (
            <div className="studio-workspace__empty">
              <p className="studio-workspace__empty-title">Nenhum rascunho ainda</p>
              <p className="studio-workspace__empty-text">
                Clica em <strong>Novo projeto</strong> para abrir o editor e, depois de guardares, o rascunho aparece
                aqui.
              </p>
            </div>
          ) : (
            <ul className="studio-draft-list">
              {drafts.map((d) => (
                <li key={d.id}>
                  <article className="studio-draft-card">
                    <div className="studio-draft-card__body">
                      <div className="studio-draft-card__title-row">
                        <h3 className="studio-draft-card__title">{d.title}</h3>
                        {d.published_at ? (
                          <span className="studio-draft-card__published" title={`Publicado em ${formatDate(d.published_at)}`}>
                            Publicado
                          </span>
                        ) : null}
                      </div>
                      {d.description ? (
                        <p className="studio-draft-card__desc">{d.description}</p>
                      ) : (
                        <p className="studio-draft-card__desc studio-draft-card__desc--muted">Sem descrição</p>
                      )}
                      <p className="studio-draft-card__meta">Atualizado: {formatDate(d.updated_at)}</p>
                    </div>
                    <button type="button" className="studio-draft-card__open studio-draft-card__open--active" onClick={() => openDraftCanvas(d)}>
                      Abrir
                    </button>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <StudioCanvasShell
        open={canvasOpen}
        initialDraft={canvasDraft}
        onClose={() => {
          setCanvasOpen(false);
          setCanvasDraft(null);
        }}
        onSaved={loadDrafts}
      />
    </div>
  );
}
