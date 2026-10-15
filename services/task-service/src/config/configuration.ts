export default () => ({
  port: parseInt(process.env.PORT ?? '3004', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:3004',
  supabase: {
    url: process.env.SUPABASE_URL ?? 'https://dummy.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY ?? 'dummy-anon-key',
  },
});
