export type StaffAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED'

export function assertStaffRecoveryEligible(input: {
  requestedEmail: string
  authEmail: string
  active: boolean
  status: StaffAccountStatus
}) {
  const requestedEmail = input.requestedEmail.trim().toLowerCase()
  const authEmail = input.authEmail.trim().toLowerCase()
  if (!requestedEmail || requestedEmail !== authEmail || !input.active || input.status !== 'ACTIVE') {
    throw new Error('ACTIVE_STAFF_REQUIRED')
  }
}
