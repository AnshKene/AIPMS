export default () => ({
  port: parseInt(process.env.PORT ?? '3009', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:3008,http://localhost:3009',
  supabase: {
    url: process.env.SUPABASE_URL ?? 'https://dummy.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY ?? 'dummy-anon-key',
  },
  ollama: {
    url: process.env.OLLAMA_URL ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL ?? 'llama3.2',
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS ?? '30000', 10),
  },
});
