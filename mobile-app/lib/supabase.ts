import { createClient } from '@supabase/supabase-js'

// URL construite à partir de ton Project ID
const supabaseUrl = "https://xudajyohpaotcqniqeft.supabase.co"

// Publishable Key
const supabaseKey = "sb_publishable_Uc8HOJDJahFwS6UvFDnO8g_xNamclk_"

export const supabase = createClient(supabaseUrl, supabaseKey)