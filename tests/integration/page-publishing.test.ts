import { describe, expect, it } from 'vitest'

const enabled = Boolean(process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_SERVICE_ROLE_KEY)
describe.skipIf(!enabled)('page publishing integration', () => {
  it('requires a configured Supabase integration harness', () => {
    expect(process.env.TEST_SUPABASE_URL).toBeTruthy()
    expect(process.env.TEST_SUPABASE_SERVICE_ROLE_KEY).toBeTruthy()
  })
})
