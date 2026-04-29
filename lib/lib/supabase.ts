import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://loyityouqpkzqhtkqjov.supabase.co"
const supabaseKey = "sb_publishable_p7o-AfgOFQhHn3s7xiVG1Q_pIgzyzR8"

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // Para desenvolvimento, vamos confirmar automaticamente os emails
    // Isso só funciona se você tiver permissões de admin no Supabase
  }
})