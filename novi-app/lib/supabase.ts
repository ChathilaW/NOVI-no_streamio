import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Shared Supabase client — used by all API routes and client hooks.
 * Using anon key is fine here since RLS is not enforced for internal API routes
 * (requests come from our own Next.js server, not direct from browsers).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
