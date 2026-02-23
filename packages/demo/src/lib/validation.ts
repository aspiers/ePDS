// Basic email format check (not exhaustive RFC 5322, but practical)
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ATProto handle: alphanumeric segments separated by dots, at least two segments
export function validateHandle(handle: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(
    handle,
  )
}

// Redact sensitive values for logging
export function sanitizeForLog(value: string): string {
  if (!value) return ''
  if (value.startsWith('did:')) {
    return value.length > 16 ? `${value.substring(0, 16)}...` : value
  }
  if (value.includes('@')) {
    const [local, domain] = value.split('@')
    return `${local[0]}***@${domain}`
  }
  if (value.length > 20) {
    return `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
  }
  return value
}
