/** Rotas internas da área admin (hash). */
export type AdminSection = "dashboard" | "studio" | "users" | "settings";

export function isAdminHash(hash: string): boolean {
  if (hash === "#admin") return true;
  return /^#admin\//.test(hash);
}

export function parseAdminSection(hash: string): AdminSection {
  if (hash.startsWith("#admin/users")) return "users";
  if (hash.startsWith("#admin/studio")) return "studio";
  if (hash.startsWith("#admin/settings")) return "settings";
  return "dashboard";
}

/**
 * Atualiza `location.hash` a partir de um href (`#admin/...`) e devolve a secção.
 * Usar no clique da sidebar para o painel atualizar de imediato (não depender só de `hashchange`).
 */
export function commitAdminHash(href: string): AdminSection {
  const h = href.startsWith("#") ? href : `#${href}`;
  window.location.hash = h.slice(1);
  return parseAdminSection(h);
}
