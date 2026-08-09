/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly NEXT_PUBLIC_ENABLE_PORTAL?: string;
  readonly NEXT_PUBLIC_USE_DATABASE?: string;
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly SUPABASE_STORAGE_BUCKET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
