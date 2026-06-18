import { supabase } from "@/integrations/supabase/client";

export async function uploadPdf(bucket: string, userId: string, file: File, prefix = "") {
  const path = `${userId}/${prefix}${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}