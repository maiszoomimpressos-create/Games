import { useCallback, useEffect, useState } from "react";
import { AdminSidebar } from "../components/admin/AdminSidebar";
import { StudioLab } from "../components/admin/StudioLab";
import { isAdminSession } from "../lib/adminSession";
import type { AdminSection } from "../lib/adminRoute";
import { commitAdminHash, parseAdminSection } from "../lib/adminRoute";
import { supabase } from "../supabaseClient";

export function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [section, setSection] = useState<AdminSection>(() => parseAdminSection(window.location.hash));

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) {
        if (alive) setAllowed(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setAllowed(isAdminSession(data.session));
      if (!isAdminSession(data.session)) window.location.hash = "";
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!allowed || !supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isAdminSession(nextSession)) window.location.hash = "";
    });
    return () => subscription.unsubscribe();
  }, [allowed]);

  useEffect(() => {
    const onHash = () => setSection(parseAdminSection(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigateSection = useCallback((href: string) => {
    setSection(commitAdminHash(href));
  }, []);

  if (allowed === null) {
    return (
      <div className="admin-route-inner">
        <p className="admin-page__loading">A verificar permissões…</p>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="admin-shell">
      <AdminSidebar section={section} onNavigate={navigateSection} />
      <main className="admin-main">
        {section === "dashboard" && (
          <div className="admin-panel">
            <h1 className="admin-panel__title">Painel</h1>
            <p className="muted">Visão geral da administração. Conteúdo em construção.</p>
          </div>
        )}
        {section === "studio" && <StudioLab />}
        {section === "users" && (
          <div className="admin-panel">
            <h1 className="admin-panel__title">Utilizadores</h1>
            <p className="muted">Gestão de contas — em breve.</p>
          </div>
        )}
        {section === "settings" && (
          <div className="admin-panel">
            <h1 className="admin-panel__title">Definições</h1>
            <p className="muted">Configurações do sistema — em breve.</p>
          </div>
        )}
      </main>
    </div>
  );
}
