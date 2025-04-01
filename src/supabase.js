import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jhwzvdnorzzbtgyuvrag.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impod3p2ZG5vcnp6YnRneXV2cmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNTE0MDQsImV4cCI6MjA1ODkyNzQwNH0.gejV-rVDAbUJRz4_DG-KCXRYFy06sxsouCFsVwRW0v0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
