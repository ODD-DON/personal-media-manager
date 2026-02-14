import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any

export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not set. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

export type Database = {
  public: {
    Tables: {
      pmp_projects: {
        Row: {
          id: string
          title: string
          brand: string
          type: string
          description: string
          deadline: string
          priority: number
          status: string
          created_at: string
          files: any[]
        }
        Insert: {
          id?: string
          title: string
          brand: string
          type: string
          description: string
          deadline: string
          priority: number
          status?: string
          created_at?: string
          files?: any[]
        }
        Update: {
          id?: string
          title?: string
          brand?: string
          type?: string
          description?: string
          deadline?: string
          priority?: number
          status?: string
          created_at?: string
          files?: any[]
        }
      }
    }
  }
}
