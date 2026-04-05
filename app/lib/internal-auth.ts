/**
 * Internal API authentication — machine-to-machine secret validation.
 * Used by all /api/internal/* routes. No Clerk auth required.
 */

export function validateInternalSecret(req: Request): boolean {
  const secret = req.headers.get('x-internal-secret')
  const expected = process.env.INTERNAL_SECRET
  if (!expected) return false
  return !!secret && secret === expected
}
