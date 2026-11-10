// Drizzle envuelve los errores de PostgreSQL; el código queda en error.cause.
function pgCode(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}

export const isUniqueViolation = (e: unknown) => pgCode(e) === '23505';
