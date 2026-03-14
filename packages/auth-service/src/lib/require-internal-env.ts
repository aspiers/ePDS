/**
 * Validate that PDS_INTERNAL_URL and EPDS_INTERNAL_SECRET are set.
 *
 * Called at router-creation time so the process fails fast at startup
 * rather than at first request.  The error message names exactly which
 * variable(s) are missing.
 */
export function requireInternalEnv(): {
  pdsUrl: string
  internalSecret: string
} {
  const pdsUrl = process.env.PDS_INTERNAL_URL
  const internalSecret = process.env.EPDS_INTERNAL_SECRET
  if (!pdsUrl || !internalSecret) {
    const missing = [
      ...(!pdsUrl ? ['PDS_INTERNAL_URL'] : []),
      ...(!internalSecret ? ['EPDS_INTERNAL_SECRET'] : []),
    ]
    throw new Error(`${missing.join(' and ')} must be set`)
  }
  return { pdsUrl, internalSecret }
}
