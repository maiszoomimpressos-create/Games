import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { GameDraft } from "../../lib/gameDrafts";
import { createGameDraft, updateGameDraft } from "../../lib/gameDrafts";
import {
  deleteStudioReferenceImage,
  getReferenceImagesFromDraftConfig,
  uploadStudioReferenceImage,
  validateStudioImageFile,
  type StudioReferenceImage,
} from "../../lib/studioUploads";
import {
  getNextPlacementColor,
  parseTrilhaCaptureCounts,
  parseTrilhaGameFromConfig,
  parseTrilhaPlacementsMade,
  TRILHA_PIECES_PER_PLAYER,
  type TrilhaCaptureCounts,
  type TrilhaPieceColor,
  type TrilhaPhase,
} from "../../lib/trilhaPieces";
import type { TrilhaLiveGameState } from "../../lib/trilhaLiveGame";
import { applyTrilhaLiveSlide } from "../../lib/trilhaLiveMove";
import { findMillsContainingNode, getRemovableOpponentNodes, getValidSlideTargets, opponentColor } from "../../lib/trilhaRules";
import { StudioReferenceImagesPanel } from "./StudioReferenceImagesPanel";
import { TrilhaBoardSvg } from "./TrilhaBoardSvg";
import { TrilhaCapturePiles } from "./TrilhaCapturePiles";
import { TrilhaPieceBank } from "./TrilhaPieceBank";
import { TrilhaOnlineSimOverlay } from "./TrilhaOnlineSimOverlay";

type Tool = "board" | "pieces" | "notes" | "theme";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Se vier preenchido, abre o rascunho para continuar a editar. */
  initialDraft?: GameDraft | null;
};

const tools: { id: Tool; label: string; hint: string }[] = [
  { id: "board", label: "Tabuleiro", hint: "Grelha e dimensões do tabuleiro" },
  { id: "pieces", label: "Peças", hint: "Fichas, cartas e conjuntos" },
  { id: "notes", label: "Notas", hint: "Regras e anotações rápidas" },
  { id: "theme", label: "Tema", hint: "Cores e estilo visual" },
];

function parseToolFromConfig(config: Record<string, unknown>): Tool {
  const t = config.studioTool;
  if (t === "board" || t === "pieces" || t === "notes" || t === "theme") return t;
  return "board";
}

function buildStudioConfig(
  activeTool: Tool,
  referenceImages: StudioReferenceImage[],
  trilhaPieces: Partial<Record<string, TrilhaPieceColor>>,
  pieceTurn: TrilhaPieceColor,
  trilhaPhase: TrilhaPhase,
  pendingMillTriad: string[] | null,
  placementsMade: { yellow: number; blue: number },
  captureCounts: TrilhaCaptureCounts,
): Record<string, unknown> {
  const o: Record<string, unknown> = {
    studioTool: activeTool,
    referenceImages,
    trilhaPieces: { ...trilhaPieces },
    trilhaPieceTurn: pieceTurn,
    trilhaPhase,
    trilhaPlacementsMade: { ...placementsMade },
    trilhaCaptureCounts: { ...captureCounts },
  };
  if (trilhaPhase === "remove" && pendingMillTriad && pendingMillTriad.length === 3) {
    o.trilhaPendingMill = [...pendingMillTriad];
  }
  return o;
}

function studioToolCaption(tool: Tool): string {
  switch (tool) {
    case "board":
      return "Três quadrados concêntricos, vinte e quatro casas e ligações nos meios dos lados — o mesmo desenho do jogo físico.";
    case "pieces":
      return "Colocação alternada; três em linha (trilha) permitem retirar uma peça do adversário (fora de trilha, se possível).";
    case "notes":
      return "Usa as notas para regras e ideias; o tabuleiro mantém-se como referência visual.";
    case "theme":
      return "O tema visual (cores e acabamento) poderá ser afinado sem alterar a geometria do tabuleiro.";
    default:
      return "";
  }
}

export function StudioCanvasShell({ open, onClose, onSaved, initialDraft }: Props) {
  const titleId = useId();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeTool, setActiveTool] = useState<Tool>("board");
  const [referenceImages, setReferenceImages] = useState<StudioReferenceImage[]>([]);
  const [trilhaPieces, setTrilhaPieces] = useState<Partial<Record<string, TrilhaPieceColor>>>({});
  const [pieceTurn, setPieceTurn] = useState<TrilhaPieceColor>("yellow");
  const [trilhaPhase, setTrilhaPhase] = useState<TrilhaPhase>("place");
  const [pendingMillTriad, setPendingMillTriad] = useState<string[] | null>(null);
  const [placementsMade, setPlacementsMade] = useState({ yellow: 0, blue: 0 });
  const [captureCounts, setCaptureCounts] = useState<TrilhaCaptureCounts>({ fromYellow: 0, fromBlue: 0 });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  /** Modo teste interno: ferramenta Peças e regras no Studio. */
  const [testModeActive, setTestModeActive] = useState(false);
  const [testChoiceOpen, setTestChoiceOpen] = useState(false);
  const [onlineSimOpen, setOnlineSimOpen] = useState(false);
  const [selectedMoveFrom, setSelectedMoveFrom] = useState<string | null>(null);
  const testMenuWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setStatusMsg(null);
    if (initialDraft) {
      setTestModeActive(false);
      setTestChoiceOpen(false);
      setOnlineSimOpen(false);
      setDraftId(initialDraft.id);
      setTitle(initialDraft.title);
      setDescription(initialDraft.description ?? "");
      setPublishedAt(initialDraft.published_at ?? null);
      const cfg = initialDraft.config;
      setActiveTool(parseToolFromConfig(cfg));
      setReferenceImages(getReferenceImagesFromDraftConfig(cfg));
      const tg = parseTrilhaGameFromConfig(cfg);
      setTrilhaPieces(tg.board);
      setPieceTurn(tg.turn);
      setTrilhaPhase(tg.phase);
      setPendingMillTriad(tg.pendingMillTriad);
      setPlacementsMade(parseTrilhaPlacementsMade(cfg, tg.board));
      setCaptureCounts(parseTrilhaCaptureCounts(cfg));
    } else {
      setTestModeActive(false);
      setTestChoiceOpen(false);
      setOnlineSimOpen(false);
      setDraftId(null);
      setDescription("");
      setPublishedAt(null);
      setReferenceImages([]);
      setTrilhaPieces({});
      setPieceTurn("yellow");
      setTrilhaPhase("place");
      setPendingMillTriad(null);
      setPlacementsMade({ yellow: 0, blue: 0 });
      setCaptureCounts({ fromYellow: 0, fromBlue: 0 });
      setTitle("");
      setActiveTool("board");
    }
  }, [open, initialDraft]);

  useEffect(() => {
    setSelectedMoveFrom(null);
  }, [trilhaPhase, pieceTurn, open]);

  useEffect(() => {
    if (!open) {
      setTestChoiceOpen(false);
      setOnlineSimOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!testChoiceOpen) return;
    const fn = (e: MouseEvent) => {
      const el = testMenuWrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setTestChoiceOpen(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [testChoiceOpen]);

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      setUploading(true);
      try {
        const next: StudioReferenceImage[] = [];
        for (const file of files) {
          const localErr = validateStudioImageFile(file);
          if (localErr) {
            setError(localErr);
            continue;
          }
          const { image, error: upErr } = await uploadStudioReferenceImage(file, draftId);
          if (upErr) {
            setError(
              upErr.includes("Bucket not found") || upErr.includes("not found")
                ? "Bucket de ficheiros não configurado. Executa supabase/migrations/002_studio_uploads_storage.sql no Supabase."
                : upErr,
            );
            continue;
          }
          if (image) next.push(image);
        }
        if (next.length) {
          setReferenceImages((prev) => [...prev, ...next]);
        }
      } finally {
        setUploading(false);
      }
    },
    [draftId],
  );

  const handleTrilhaNodeClick = useCallback(
    (nodeId: string) => {
      if (activeTool !== "pieces") return;

      if (trilhaPhase === "remove") {
        const removable = getRemovableOpponentNodes(trilhaPieces, pieceTurn);
        if (!removable.includes(nodeId)) return;
        const removedColor = trilhaPieces[nodeId];
        const nextBoard = { ...trilhaPieces };
        delete nextBoard[nodeId];
        setTrilhaPieces(nextBoard);
        const capturedPieceColor: TrilhaPieceColor =
          removedColor === "yellow" || removedColor === "blue"
            ? removedColor
            : opponentColor(pieceTurn);
        if (capturedPieceColor === "yellow") {
          setCaptureCounts((c) => ({ ...c, fromYellow: c.fromYellow + 1 }));
        } else {
          setCaptureCounts((c) => ({ ...c, fromBlue: c.fromBlue + 1 }));
        }
        const placementDone =
          placementsMade.yellow >= TRILHA_PIECES_PER_PLAYER && placementsMade.blue >= TRILHA_PIECES_PER_PLAYER;
        setTrilhaPhase(placementDone ? "move" : "place");
        setPendingMillTriad(null);
        setPieceTurn(opponentColor(pieceTurn));
        return;
      }

      if (trilhaPhase === "move") {
        return;
      }

      if (trilhaPieces[nodeId]) return;
      const nextColor = getNextPlacementColor(placementsMade, pieceTurn);
      if (nextColor === null) return;
      const newBoard = { ...trilhaPieces, [nodeId]: nextColor };
      const mills = findMillsContainingNode(newBoard, nodeId, nextColor);
      const nextPlacements = {
        ...placementsMade,
        [nextColor]: placementsMade[nextColor] + 1,
      };
      setTrilhaPieces(newBoard);
      setPlacementsMade(nextPlacements);
      if (mills.length > 0) {
        setTrilhaPhase("remove");
        setPendingMillTriad([...mills[0]]);
      } else {
        const placementDone =
          nextPlacements.yellow >= TRILHA_PIECES_PER_PLAYER && nextPlacements.blue >= TRILHA_PIECES_PER_PLAYER;
        setPieceTurn(nextColor === "yellow" ? "blue" : "yellow");
        setTrilhaPhase(placementDone ? "move" : "place");
      }
    },
    [activeTool, trilhaPhase, trilhaPieces, pieceTurn, placementsMade],
  );

  const studioLiveState = useCallback((): TrilhaLiveGameState => {
    return {
      v: 1,
      trilhaPieces,
      pieceTurn,
      trilhaPhase,
      pendingMillTriad,
      placementsMade,
      captureCounts,
    };
  }, [trilhaPieces, pieceTurn, trilhaPhase, pendingMillTriad, placementsMade, captureCounts]);

  const handleStudioSlide = useCallback(
    (from: string, to: string) => {
      const next = applyTrilhaLiveSlide(studioLiveState(), from, to);
      if (!next) return;
      setTrilhaPieces(next.trilhaPieces);
      setTrilhaPhase(next.trilhaPhase);
      setPendingMillTriad(next.pendingMillTriad);
      setPieceTurn(next.pieceTurn);
      setPlacementsMade(next.placementsMade);
      setCaptureCounts(next.captureCounts);
      setSelectedMoveFrom(null);
    },
    [studioLiveState],
  );

  const handleResetTrilhaPieces = useCallback(() => {
    setTrilhaPieces({});
    setPieceTurn("yellow");
    setTrilhaPhase("place");
    setPendingMillTriad(null);
    setPlacementsMade({ yellow: 0, blue: 0 });
    setCaptureCounts({ fromYellow: 0, fromBlue: 0 });
    setSelectedMoveFrom(null);
  }, []);

  const handleTestButtonClick = useCallback(() => {
    if (testModeActive) {
      setActiveTool("board");
      setTestModeActive(false);
      setTestChoiceOpen(false);
      return;
    }
    setTestChoiceOpen((v) => !v);
  }, [testModeActive]);

  const handlePickInternalTest = useCallback(() => {
    setTestChoiceOpen(false);
    setOnlineSimOpen(false);
    setTestModeActive(true);
    setActiveTool("pieces");
    setTitle((t) => (t.trim().length >= 2 ? t : "Teste Trilha"));
  }, []);

  const handlePickOnlineTest = useCallback(() => {
    setTestChoiceOpen(false);
    setOnlineSimOpen(true);
  }, []);

  const handleRemoveImage = useCallback(async (path: string) => {
    setError(null);
    const { error: delErr } = await deleteStudioReferenceImage(path);
    if (delErr) {
      setError(delErr);
      return;
    }
    setReferenceImages((prev) => prev.filter((x) => x.path !== path));
  }, []);

  const handleSave = useCallback(async () => {
    const t = title.trim();
    if (t.length < 2) {
      setError("Indica um nome com pelo menos 2 caracteres no topo.");
      return;
    }
    setError(null);
    setSaving(true);
    const config = buildStudioConfig(
      activeTool,
      referenceImages,
      trilhaPieces,
      pieceTurn,
      trilhaPhase,
      pendingMillTriad,
      placementsMade,
      captureCounts,
    );
    try {
      if (draftId) {
        const { error: err } = await updateGameDraft(draftId, {
          title: t,
          description: description.trim() || null,
          config,
        });
        if (err) {
          setError(err);
          return;
        }
        setStatusMsg("Guardado.");
        onSaved();
      } else {
        const { draft, error: err } = await createGameDraft(t, description.trim() || null, config);
        if (err) {
          setError(err);
          return;
        }
        if (draft) {
          setDraftId(draft.id);
          setStatusMsg("Rascunho criado. Continua a desenhar o tabuleiro.");
          onSaved();
        }
      }
    } finally {
      setSaving(false);
    }
  }, [
    draftId,
    title,
    description,
    activeTool,
    referenceImages,
    trilhaPieces,
    pieceTurn,
    trilhaPhase,
    pendingMillTriad,
    placementsMade,
    captureCounts,
    onSaved,
  ]);

  const handlePublish = useCallback(async () => {
    const t = title.trim();
    if (t.length < 2) {
      setError("Indica um nome com pelo menos 2 caracteres antes de publicar.");
      return;
    }
    setError(null);
    setPublishing(true);
    const config = buildStudioConfig(
      activeTool,
      referenceImages,
      trilhaPieces,
      pieceTurn,
      trilhaPhase,
      pendingMillTriad,
      placementsMade,
      captureCounts,
    );
    const now = new Date().toISOString();
    try {
      if (draftId) {
        const { error: err } = await updateGameDraft(draftId, {
          title: t,
          description: description.trim() || null,
          config,
          published_at: now,
        });
        if (err) {
          setError(err);
          return;
        }
        setPublishedAt(now);
        setStatusMsg("Publicado. O estado atual do projeto ficou marcado como visível.");
        onSaved();
      } else {
        const { draft, error: err } = await createGameDraft(t, description.trim() || null, config, now);
        if (err) {
          setError(err);
          return;
        }
        if (draft) {
          setDraftId(draft.id);
          setPublishedAt(draft.published_at ?? now);
          setStatusMsg("Projeto criado e publicado.");
          onSaved();
        }
      }
    } finally {
      setPublishing(false);
    }
  }, [
    draftId,
    title,
    description,
    activeTool,
    referenceImages,
    trilhaPieces,
    pieceTurn,
    trilhaPhase,
    pendingMillTriad,
    placementsMade,
    captureCounts,
    onSaved,
  ]);

  const busy = saving || publishing;

  const yellowHand = Math.max(0, TRILHA_PIECES_PER_PLAYER - placementsMade.yellow);
  const blueHand = Math.max(0, TRILHA_PIECES_PER_PLAYER - placementsMade.blue);
  const nextPlacement = getNextPlacementColor(placementsMade, pieceTurn);
  const removableNodes =
    trilhaPhase === "remove" ? getRemovableOpponentNodes(trilhaPieces, pieceTurn) : [];

  if (!open) return null;

  return (
    <>
    <div className="studio-canvas-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="studio-canvas">
        <header className="studio-canvas__topbar">
          <div className="studio-canvas__brand">
            <span className="studio-canvas__brand-mark" aria-hidden>
              ◆
            </span>
            <span className="studio-canvas__brand-text">Studio</span>
            {testModeActive ? (
              <span className="studio-canvas__test-pill" title="Modo de experimentação das regras (colocação e trilhas)">
                Testes
              </span>
            ) : null}
          </div>
          <div className="studio-canvas__fields">
            <label className="visually-hidden" htmlFor={titleId}>
              Nome do jogo
            </label>
            <input
              id={titleId}
              className="studio-canvas__title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do jogo"
              maxLength={120}
            />
            <input
              className="studio-canvas__desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição curta (opcional)"
              maxLength={240}
            />
          </div>
          <div className="studio-canvas__actions">
            {publishedAt && (
              <span className="studio-canvas__pub-pill" title={publishedAt}>
                Publicado
              </span>
            )}
            <div className="studio-canvas__test-wrap" ref={testMenuWrapRef}>
              <button
                type="button"
                className={testModeActive ? "studio-canvas__btn studio-canvas__btn--test-on" : "studio-canvas__btn studio-canvas__btn--test"}
                disabled={busy}
                aria-expanded={testChoiceOpen}
                aria-haspopup="menu"
                onClick={handleTestButtonClick}
                title={
                  testModeActive
                    ? "Desliga o modo teste interno e volta à ferramenta Tabuleiro"
                    : "Escolhe teste interno no Studio ou simulação online"
                }
              >
                {testModeActive ? "Sair dos testes" : "Testes"}
              </button>
              {testChoiceOpen ? (
                <div className="studio-canvas__test-popover" role="menu" aria-label="Tipo de teste">
                  <button type="button" className="studio-canvas__test-option" role="menuitem" onClick={handlePickInternalTest}>
                    <span className="studio-canvas__test-option-title">Interna</span>
                    <span className="studio-canvas__test-option-desc">
                      Teste no Studio: ferramenta Peças, trilhas e retiradas.
                    </span>
                  </button>
                  <button type="button" className="studio-canvas__test-option" role="menuitem" onClick={handlePickOnlineTest}>
                    <span className="studio-canvas__test-option-title">Real</span>
                    <span className="studio-canvas__test-option-desc">
                      Simula uma partida online (ligação e oponente fictícios).
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
            <button type="button" className="studio-canvas__btn studio-canvas__btn--primary" disabled={busy} onClick={handleSave}>
              {saving ? "A guardar…" : draftId ? "Guardar" : "Guardar rascunho"}
            </button>
            <button
              type="button"
              className="studio-canvas__btn studio-canvas__btn--publish"
              disabled={busy || title.trim().length < 2}
              onClick={handlePublish}
              title="Grava o estado atual e marca o projeto como publicado"
            >
              {publishing ? "A publicar…" : publishedAt ? "Republicar" : "Publicar"}
            </button>
            <button type="button" className="studio-canvas__btn studio-canvas__btn--ghost" disabled={busy} onClick={onClose}>
              Fechar
            </button>
          </div>
        </header>

        {error && (
          <div className="studio-canvas__banner" role="alert">
            {error}
          </div>
        )}
        {statusMsg && !error && <div className="studio-canvas__banner studio-canvas__banner--ok">{statusMsg}</div>}

        <div className="studio-canvas__body">
          <aside className="studio-canvas__rail" aria-label="Ferramentas">
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={`studio-canvas__tool${activeTool === tool.id ? " studio-canvas__tool--on" : ""}`}
                title={tool.hint}
                onClick={() => setActiveTool(tool.id)}
              >
                <span className="studio-canvas__tool-label">{tool.label}</span>
              </button>
            ))}
          </aside>

          <div className="studio-canvas__center">
            <div className="studio-canvas__stage-wrap">
              <div className="studio-canvas__stage">
                <div className="studio-canvas__surface studio-canvas__surface--trilha" aria-label="Área do tabuleiro">
                  {activeTool === "pieces" ? (
                    <div className="studio-canvas__trilha-inner studio-canvas__trilha-inner--pieces">
                      <div className="trilha-setup">
                        <TrilhaPieceBank color="yellow" inHand={yellowHand} label="Jogador amarelo" />
                        <div className="trilha-setup__board">
                          {trilhaPhase === "remove" ? (
                            <p className="trilha-setup__mill-banner" role="status" aria-live="polite">
                              <strong>Trilha!</strong> Escolhe uma peça do adversário para retirar. Prioridade: peças que{" "}
                              <em>não</em> estejam numa trilha; se todas estiverem em trilhas, podes escolher qualquer
                              uma.
                            </p>
                          ) : trilhaPhase === "move" ? (
                            <p className="trilha-setup__mill-banner trilha-setup__mill-banner--move" role="status">
                              <strong>Fase de movimento</strong> — arrasta uma peça para uma casa vazia (verde). Com 3
                              peças, podes mover para qualquer casa vazia.
                            </p>
                          ) : null}
                          <div className="trilha-setup__board-surface">
                            <TrilhaBoardSvg
                              pieces={trilhaPieces}
                              interactive
                              onNodeClick={trilhaPhase === "move" ? undefined : handleTrilhaNodeClick}
                              moveInteraction={
                                trilhaPhase === "move"
                                  ? {
                                      turnColor: pieceTurn,
                                      selectedFrom: selectedMoveFrom,
                                      validTargetIds: selectedMoveFrom
                                        ? getValidSlideTargets(trilhaPieces, selectedMoveFrom, pieceTurn)
                                        : [],
                                      onSelectFrom: setSelectedMoveFrom,
                                      onSlide: handleStudioSlide,
                                    }
                                  : null
                              }
                              slideTargetHighlightIds={
                                trilhaPhase === "move" && selectedMoveFrom
                                  ? getValidSlideTargets(trilhaPieces, selectedMoveFrom, pieceTurn)
                                  : null
                              }
                              selectedMoveFromId={trilhaPhase === "move" ? selectedMoveFrom : null}
                              millLineTriad={trilhaPhase === "remove" ? pendingMillTriad : null}
                              removableHighlightIds={trilhaPhase === "remove" ? removableNodes : null}
                              restrictInteractiveNodeIds={trilhaPhase === "remove" ? removableNodes : null}
                            />
                          </div>
                          <TrilhaCapturePiles
                            capturedFromBlue={captureCounts.fromBlue}
                            capturedFromYellow={captureCounts.fromYellow}
                          />
                          {trilhaPhase === "remove" ? (
                            <p className="trilha-setup__status trilha-setup__status--remove">
                              Vez de <strong>{pieceTurn === "yellow" ? "Amarelo" : "Azul"}</strong> — clica numa peça{" "}
                              <strong>{opponentColor(pieceTurn) === "yellow" ? "amarela" : "azul"}</strong>{" "}
                              (contornadas a laranja) para retirar.
                            </p>
                          ) : trilhaPhase === "move" ? (
                            <p className="trilha-setup__status">
                              Vez de jogar: <strong>{pieceTurn === "yellow" ? "Amarelo" : "Azul"}</strong> — arrasta ou
                              toca peça e depois casa vazia.
                            </p>
                          ) : nextPlacement === null ? (
                            <p className="trilha-setup__status trilha-setup__status--done">
                              Colocação completa: 9 peças amarelas e 9 azuis no tabuleiro.
                            </p>
                          ) : (
                            <p className="trilha-setup__status">
                              Próxima colocação:{" "}
                              <strong>{nextPlacement === "yellow" ? "Amarelo" : "Azul"}</strong> — uma peça de cada vez
                              nas casas vazias.
                            </p>
                          )}
                          <button
                            type="button"
                            className="trilha-setup__reset"
                            onClick={handleResetTrilhaPieces}
                            disabled={busy}
                          >
                            Repor peças
                          </button>
                          <p className="studio-canvas__trilha-caption">{studioToolCaption(activeTool)}</p>
                        </div>
                        <TrilhaPieceBank color="blue" inHand={blueHand} label="Jogador azul" />
                      </div>
                    </div>
                  ) : (
                    <div className="studio-canvas__trilha-inner">
                      <TrilhaBoardSvg pieces={trilhaPieces} />
                      <p className="studio-canvas__trilha-caption">{studioToolCaption(activeTool)}</p>
                    </div>
                  )}
                </div>
              </div>
              <p className="studio-canvas__hint">
                À direita podes carregar <strong>imagens de referência</strong> para mostrares o estilo ou o tabuleiro que
                imaginas. Usa <strong>Guardar</strong> para rascunho e <strong>Publicar</strong> quando quiseres marcar a
                versão atual como publicada.
              </p>
            </div>
          </div>

          <aside className="studio-canvas__refs-aside" aria-label="Referências visuais">
            <StudioReferenceImagesPanel
              images={referenceImages}
              uploading={uploading}
              onUploadFiles={handleUploadFiles}
              onRemove={handleRemoveImage}
            />
          </aside>
        </div>
      </div>
    </div>
    {onlineSimOpen ? <TrilhaOnlineSimOverlay onClose={() => setOnlineSimOpen(false)} /> : null}
    </>
  );
}
