import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno");
}

// Server-only client. Nunca importar este archivo desde un componente "use client".
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
