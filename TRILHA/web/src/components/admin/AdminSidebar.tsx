import type { AdminSection } from "../../lib/adminRoute";

type Item = {
  id: AdminSection;
  label: string;
  href: string;
};

const items: Item[] = [
  { id: "dashboard", label: "Painel", href: "#admin" },
  { id: "studio", label: "Studio de criação", href: "#admin/studio" },
  { id: "users", label: "Utilizadores", href: "#admin/users" },
  { id: "settings", label: "Definições", href: "#admin/settings" },
];

type Props = {
  section: AdminSection;
  onNavigate: (href: string) => void;
};

export function AdminSidebar({ section, onNavigate }: Props) {
  return (
    <aside className="admin-sidebar" aria-label="Menu de administração">
      <div className="admin-sidebar__head">
        <span className="admin-sidebar__badge">Admin</span>
        <p className="admin-sidebar__subtitle">Consola</p>
      </div>
      <nav className="admin-sidebar__nav">
        <ul className="admin-sidebar__list">
          {items.map((item) => (
            <li key={item.id}>
              <a
                className={`admin-sidebar__link${section === item.id ? " admin-sidebar__link--active" : ""}`}
                href={item.href}
                aria-current={section === item.id ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.href);
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="admin-sidebar__foot">
        <a className="admin-sidebar__exit" href="/">
          ← Voltar ao site
        </a>
      </div>
    </aside>
  );
}
