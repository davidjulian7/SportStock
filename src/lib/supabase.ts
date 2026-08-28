import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isConfigured = supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder'

let supabaseClient: SupabaseClient

try {
  if (isConfigured) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  } else {
    supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder')
  }
} catch {
  supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder')
}

export const supabase = supabaseClient
export { isConfigured }
