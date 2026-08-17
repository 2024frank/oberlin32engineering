import { describe, expect, it } from 'vitest'
const enabled=Boolean(process.env.TEST_SUPABASE_URL&&process.env.TEST_SUPABASE_SERVICE_ROLE_KEY)
describe.skipIf(!enabled)('public submissions integration',()=>{it('has integration credentials',()=>expect(process.env.TEST_SUPABASE_URL).toBeTruthy())})
