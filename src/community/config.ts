export const communityEnabled = import.meta.env.VITE_COMMUNITY_ENABLED !== 'false'
export const backendConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
