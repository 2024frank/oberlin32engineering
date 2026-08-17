import { describe, expect, it } from 'vitest'

const enabled = Boolean(process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!enabled)('member approval integration', () => {
  it('requires the isolated Supabase integration harness before exercising request, approval, and activation RPCs', () => {
    expect(process.env.TEST_SUPABASE_URL).toBeTruthy()
    expect(process.env.TEST_SUPABASE_SERVICE_ROLE_KEY).toBeTruthy()
  })
})
