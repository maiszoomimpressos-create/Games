import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { APP_BRAND_NAME } from "../appConfig";
import { isAdminHash } from "../lib/adminRoute";
import { isConfirmedAuthSession } from "../lib/authSession";
import { supabase } from "../supabaseClient";
import { AccountModal } from "./AccountModal";
import { UserMenu } from "./UserMenu";

type NavItem =
  | { id: string; label: string; href: string; active?: boolean }
  | { id: string; label: string; soon: true };

const mainMenu: NavItem[] = [
  { id: "inicio", label: "Início", href: "/", active: true },
  { id: "salas", label: "Salas", soon: true },
];

export function TopNav() {
  const [accountOpen, setAccountOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [navHash, setNavHash] = useState(() => window.location.hash);
  const closeAccount = useCallback(() => setAccountOpen(false), []);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const showUserMenu = Boolean(supabase && isConfirmedAuthSession(session));

  useEffect(() => {
    if (showUserMenu) setAccountOpen(false);
  }, [showUserMenu]);

  useEffect(() => {
    const onHash = () => setNavHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <>
      <nav className="topnav" aria-label="Menu principal">
        <div className="topnav__inner">
          <a className="topnav__brand" href="/">
            <span className="topnav__logo" aria-hidden>
              ◆
            </span>
            {APP_BRAND_NAME}
          </a>
          <ul className="topnav__menu">
            {mainMenu.map((item) => (
              <li key={item.id}>
                {"soon" in item ? (
                  <span className="topnav__link topnav__link--soon" title="Em breve">
                    {item.label}
                  </span>
                ) : (
                  <a
                    className={`topnav__link${item.id === "inicio" && !isAdminHash(navHash) ? " topnav__link--active" : ""}`}
                    href={item.href}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
            <li>
              {showUserMenu && session ? (
                <UserMenu session={session} />
              ) : (
                <button
                  type="button"
                  className="topnav__link topnav__link--btn"
                  onClick={() => setAccountOpen(true)}
                >
                  Conta
                </button>
              )}
            </li>
          </ul>
        </div>
      </nav>
      <AccountModal open={accountOpen} onClose={closeAccount} />
    </>
  );
}
