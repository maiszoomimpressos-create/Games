import { supabase } from "../supabaseClient";

export type StudioReferenceImage = {
  path: string;
  url: string;
  name: string;
  uploadedAt: string;
};

const BUCKET = "studio-uploads";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function validateStudioImageFile(file: File): string | null {
  if (!ALLOWED.has(file.type)) return "Usa PNG, JPEG, WebP ou GIF.";
  if (file.size > MAX_BYTES) return "Cada imagem pode ter no máximo 5 MB.";
  return null;
}

function parseImagesFromConfig(config: Record<string, unknown>): StudioReferenceImage[] {
  const raw = config.referenceImages;
  if (!Array.isArray(raw)) return [];
  const out: StudioReferenceImage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (
      typeof o.path === "string" &&
      typeof o.url === "string" &&
      typeof o.name === "string" &&
      typeof o.uploadedAt === "string"
    ) {
      out.push({
        path: o.path,
        url: o.url,
        name: o.name,
        uploadedAt: o.uploadedAt,
      });
    }
  }
  return out;
}

export function getReferenceImagesFromDraftConfig(config: Record<string, unknown>): StudioReferenceImage[] {
  return parseImagesFromConfig(config);
}

/**
 * Envia uma imagem para `studio-uploads/{userId}/{draftId|pending}/{uuid}.ext`.
 * Sem rascunho guardado usa a pasta `pending` até o primeiro "Guardar".
 */
export async function uploadStudioReferenceImage(
  file: File,
  draftId: string | null,
): Promise<{ image: StudioReferenceImage | null; error: string | null }> {
  const v = validateStudioImageFile(file);
  if (v) return { image: null, error: v };
  if (!supabase) return { image: null, error: "Supabase não configurado." };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { image: null, error: "Precisas de estar autenticado." };

  const uid = session.user.id;
  const folder = draftId ?? "pending";
  const rawExt = file.name.includes(".") ? file.name.split(".").pop() ?? "png" : "png";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const objectName = `${crypto.randomUUID()}.${ext}`;
  const path = `${uid}/${folder}/${objectName}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (upErr) return { image: null, error: upErr.message };

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    image: {
      path,
      url: pub.publicUrl,
      name: file.name.trim() || objectName,
      uploadedAt: new Date().toISOString(),
    },
    error: null,
  };
}

export async function deleteStudioReferenceImage(path: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase não configurado." };
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return { error: error.message };
  return { error: null };
}
