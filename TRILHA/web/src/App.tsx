import { useEffect, useState } from "react";
import { TopNav } from "./components/TopNav";
import { isAdminHash } from "./lib/adminRoute";
import { AdminPage } from "./pages/AdminPage";

function readAdminFromHash(): boolean {
  return isAdminHash(window.location.hash);
}

export function App() {
  const [adminRoute, setAdminRoute] = useState(readAdminFromHash);

  useEffect(() => {
    const onHash = () => setAdminRoute(readAdminFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="app-root">
      <TopNav />
      <div className={adminRoute ? "page page--admin" : "page"}>
        {adminRoute ? (
          <AdminPage />
        ) : (
          <main className="main main--canvas" aria-label="Conteúdo principal" />
        )}
      </div>
    </div>
  );
}
