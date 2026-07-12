import { supabase } from "@/integrations/supabase/client";

export const TAXONOMY_BUCKET = "taxonomy-images";
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // ~10 years

export type UploadResult = { url: string; path: string };

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type)) {
    return "Tipe file tidak didukung. Gunakan JPG, PNG, atau WEBP.";
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `Ukuran file ${mb}MB melebihi batas maksimum 5MB.`;
  }
  return null;
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

export async function uploadTaxonomyImage(
  kind: "thumbnail" | "banner",
  key: string,
  file: File
): Promise<UploadResult> {
  const err = validateImageFile(file);
  if (err) throw new Error(err);
  const path = `${kind}/${slugify(key)}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extFromMime(file.type)}`;
  const { error } = await supabase.storage
    .from(TAXONOMY_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`Upload gagal: ${error.message}`);
  const url = await createSignedUrl(path);
  return { url, path };
}

export async function uploadTaxonomyBlob(
  kind: "thumbnail" | "banner",
  key: string,
  blob: Blob,
  contentType: string
): Promise<UploadResult> {
  const path = `${kind}/${slugify(key)}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extFromMime(contentType)}`;
  const { error } = await supabase.storage
    .from(TAXONOMY_BUCKET)
    .upload(path, blob, { contentType, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`Upload gagal: ${error.message}`);
  const url = await createSignedUrl(path);
  return { url, path };
}

export async function createSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(TAXONOMY_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) throw new Error(`Gagal membuat URL: ${error?.message ?? "unknown"}`);
  return data.signedUrl;
}

export async function deleteTaxonomyImage(path?: string): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(TAXONOMY_BUCKET).remove([path]);
  if (error) console.warn("Gagal menghapus file lama:", error.message);
}

export function isBase64Image(s?: string): boolean {
  return !!s && s.startsWith("data:image/");
}

export async function base64ToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}
