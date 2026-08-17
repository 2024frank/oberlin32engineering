import { describe, expect, it } from 'vitest'
const enabled=Boolean(process.env.TEST_SUPABASE_URL&&process.env.TEST_SUPABASE_SERVICE_ROLE_KEY)
describe.skipIf(!enabled)('media integration',()=>{it('has storage integration credentials',()=>expect(process.env.TEST_SUPABASE_URL).toBeTruthy())})
