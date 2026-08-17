export function prepareFirstSuperAdminBootstrap(input: {
  email: string
  displayName: string
  activeSuperAdminCount: number
}) {
  if (input.activeSuperAdminCount > 0) throw new Error('SUPER_ADMIN_ALREADY_BOOTSTRAPPED')
  const email = input.email.trim().toLowerCase()
  const displayName = input.displayName.trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('VALID_EMAIL_REQUIRED')
  if (displayName.length < 2) throw new Error('DISPLAY_NAME_REQUIRED')
  return { email, displayName }
}
