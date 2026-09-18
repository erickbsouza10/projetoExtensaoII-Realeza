export function validateEnvironment(env: Record<string, unknown>) {
  const secret = String(env.JWT_SECRET ?? '');
  if (secret.length < 32 || secret.includes('REPLACE_WITH'))
    throw new Error('JWT_SECRET deve ser aleatório e ter pelo menos 32 caracteres.');
  const databaseUrl = String(env.DATABASE_URL ?? '');
  if (!/^postgres(ql)?:\/\//.test(databaseUrl) || databaseUrl.includes('CHANGE_ME'))
    throw new Error('Configure DATABASE_URL para PostgreSQL.');
  const port = Number(env.PORT ?? 3000);
  const ttl = Number(env.JWT_TTL_SECONDS ?? 3600);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
  if (!Number.isInteger(ttl) || ttl < 60 || ttl > 86400)
    throw new Error('JWT_TTL_SECONDS deve estar entre 60 e 86400.');
  const origins = String(env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((value) => value.trim());
  if (
    !origins.length ||
    origins.some((origin) => {
      try {
        return new URL(origin).origin !== origin;
      } catch {
        return true;
      }
    })
  )
    throw new Error('CORS_ORIGINS deve conter origens explícitas separadas por vírgulas.');
  return { ...env, PORT: port, JWT_TTL_SECONDS: ttl, CORS_ORIGINS: origins.join(',') };
}
