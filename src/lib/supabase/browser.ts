import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "https://ujrudblymdipeihittik.supabase.co";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcnVkYmx5bWRpcGVpaGl0dGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxOTU1NTUsImV4cCI6MjA5Nzc3MTU1NX0.CdQ2iRsAZwLOY8rSkIA8E30dVhQgZSepSn-PHQUgcAs";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
}
