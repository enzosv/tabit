import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

declare global {
  interface Window {
    supabase: SupabaseClient;
  }
}
