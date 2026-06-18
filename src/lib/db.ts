import { supabase } from "@/integrations/supabase/client";

// Typed-free wrapper so we can write tables before regenerating Supabase types.
export const db = supabase as unknown as {
  from: (table: string) => any;
  storage: typeof supabase.storage;
  auth: typeof supabase.auth;
};