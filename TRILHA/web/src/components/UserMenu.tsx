import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { isAdminSession } from "../lib/adminSession";
import { isAdminHash } from "../lib/adminRoute";
import { supabase } from "../supabaseClient";

type Props = {
  session: Session;
};

export function UserMenu({ session }: Props) {
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [navHash, setNavHash] = useState(() => window.location.hash);

  const isAdmin = isAdminSession(session);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    const onHash = () => setNavHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const label =
    session.user.email?.trim() ||
    session.user.phone?.trim() ||
    "Conta ativa";

  const handleSignOut = async () => {
    close();
    if (supabase) await supabase.auth.signOut();
  };

  return (
    <div className="topnav__user-wrap" ref={wrapRef}>
      <button
        type="button"
        className="topnav__burger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="true"
        aria-label="Abrir menu da conta"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="topnav__burger-line" aria-hidden />
        <span className="topnav__burger-line" aria-hidden />
        <span className="topnav__burger-line" aria-hidden />
      </button>

      {open && (
        <div id={menuId} className="topnav__dropdown" role="menu" aria-label="Conta">
          <div className="topnav__dropdown-user" role="none">
            <span className="topnav__dropdown-label">Sessão</span>
            <span className="topnav__dropdown-email" title={label}>
              {label}
            </span>
          </div>
          {isAdmin && (
            <a
              href="#admin"
              className={`topnav__dropdown-item topnav__dropdown-item--admin${isAdminHash(navHash) ? " topnav__dropdown-item--admin-on" : ""}`}
              role="menuitem"
              onClick={close}
            >
              Admin
            </a>
          )}
          <button type="button" className="topnav__dropdown-item" role="menuitem" onClick={handleSignOut}>
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
