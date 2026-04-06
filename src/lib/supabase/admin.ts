import { createClient } from '@supabase/supabase-js'

// Lazy admin client — only instantiated at request time, not module load time
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
