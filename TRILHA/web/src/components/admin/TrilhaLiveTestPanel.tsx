import { useCallback, useEffect, useState } from "react";
import {
  createTrilhaLiveGame,
  joinTrilhaLiveGameByCode,
  subscribeTrilhaLiveGame,
  type TrilhaLiveGameRow,
} from "../../lib/trilhaLiveGame";
import { supabase } from "../../supabaseClient";
import { TrilhaLivePlayBoard } from "./TrilhaLivePlayBoard";

export function TrilhaLiveTestPanel() {
  const [authChecked, setAuthChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [game, setGame] = useState<TrilhaLiveGameRow | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Só anfitrião em `waiting`: jogar amarelo e azul na mesma sessão (teste). */
  const [simulateBothWhileWaiting, setSimulateBothWhileWaiting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setUserId(data.session?.user?.id ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(Boolean(session));
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!game?.id || !supabase) return;
    return subscribeTrilhaLiveGame(game.id, setGame);
  }, [game?.id]);

  useEffect(() => {
    setSimulateBothWhileWaiting(false);
  }, [game?.id]);

  useEffect(() => {
    if (game?.status === "active") setSimulateBothWhileWaiting(false);
  }, [game?.status]);

  const handleCreate = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const { game: g, error: err } = await createTrilhaLiveGame();
      if (err) {
        setError(err);
        return;
      }
      setGame(g);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleJoin = useCallback(async () => {
    setError(null);
    const c = joinCode.trim();
    if (c.length < 4) {
      setError("Indica o código da partida.");
      return;
    }
    setBusy(true);
    try {
      const { game: g, error: err } = await joinTrilhaLiveGameByCode(c);
      if (err) {
        setError(err);
        return;
      }
      setGame(g);
    } finally {
      setBusy(false);
    }
  }, [joinCode]);

  const copyCode = useCallback(() => {
    if (!game?.invite_code) return;
    void navigator.clipboard.writeText(game.invite_code);
  }, [game?.invite_code]);

  if (!authChecked) {
    return <p className="trilha-live-test__status">A verificar sessão…</p>;
  }

  if (!supabase) {
    return (
      <p className="trilha-live-test__status">
        Configura <code className="trilha-live-test__code">VITE_SUPABASE_URL</code> e{" "}
        <code className="trilha-live-test__code">VITE_SUPABASE_ANON_KEY</code> no ambiente de testes.
      </p>
    );
  }

  if (!hasSession) {
    return (
      <p className="trilha-live-test__status">
        Para testes com base de dados real, inicia sessão na conta (canto superior). Dois jogadores precisam de
        contas distintas: um cria a partida e partilha o código, o outro entra com o código.
      </p>
    );
  }

  if (game) {
    const isHost = userId === game.host_id;
    const showBoard =
      Boolean(userId) &&
      ((game.status === "waiting" && isHost) || (game.status === "active" && Boolean(game.guest_id)));

    return (
      <div className="trilha-live-test__session">
        <p className="trilha-live-test__status trilha-live-test__status--ok" role="status">
          {game.status === "waiting"
            ? "Partida criada — como anfitrião já podes usar o tabuleiro (amarelo) ou simular as duas cores. Envia o código ao segundo jogador."
            : "Dois jogadores ligados — joga no tabuleiro abaixo (Realtime)."}
        </p>
        <div className="trilha-live-test__code-row">
          <span className="trilha-live-test__code-label">Código</span>
          <strong className="trilha-live-test__code-value" translate="no">
            {game.invite_code}
          </strong>
          <button type="button" className="trilha-live-test__copy" onClick={copyCode} title="Copiar código">
            Copiar
          </button>
        </div>
        {game.status === "waiting" && isHost ? (
          <label className="trilha-live-test__simulate">
            <input
              type="checkbox"
              checked={simulateBothWhileWaiting}
              onChange={(e) => setSimulateBothWhileWaiting(e.target.checked)}
            />
            <span>Simular as duas cores (teste) — permite jogar amarelo e azul sozinho até alguém entrar.</span>
          </label>
        ) : null}
        {error ? (
          <p className="trilha-live-test__err" role="alert">
            {error}
          </p>
        ) : null}
        {showBoard ? (
          <TrilhaLivePlayBoard
            game={game}
            userId={userId!}
            onError={setError}
            simulateBothWhileWaiting={simulateBothWhileWaiting}
          />
        ) : (
          <p className="trilha-live-test__hint">
            Estado no servidor: <strong>{game.status}</strong>
            {game.status === "waiting"
              ? ". Só o anfitrião vê o tabuleiro nesta fase; quando o convidado entrar com o código, o tabuleiro fica ativo para os dois."
              : "."}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="trilha-live-test__lobby">
      <p className="trilha-live-test__status">
        Usa o teu projeto Supabase com a migração <code className="trilha-live-test__code">004_trilha_live_games.sql</code>{" "}
        aplicada. Ativa Realtime para a tabela <code className="trilha-live-test__code">trilha_live_games</code> se o
        painel não atualizar sozinho.
      </p>
      {error ? (
        <p className="trilha-live-test__err" role="alert">
          {error}
        </p>
      ) : null}
      <div className="trilha-live-test__actions">
        <button type="button" className="trilha-live-test__btn" disabled={busy} onClick={handleCreate}>
          {busy ? "A criar…" : "Criar partida de teste"}
        </button>
      </div>
      <p className="trilha-live-test__join-label">Ou entra com o código do anfitrião</p>
      <div className="trilha-live-test__join-row">
        <input
          className="trilha-live-test__input"
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="Ex.: A3K7M2"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={8}
        />
        <button type="button" className="trilha-live-test__btn trilha-live-test__btn--ghost" disabled={busy} onClick={handleJoin}>
          Entrar
        </button>
      </div>
    </div>
  );
}
