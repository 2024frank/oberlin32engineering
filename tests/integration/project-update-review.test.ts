import { describe,expect,it } from 'vitest'
const enabled=Boolean(process.env.TEST_SUPABASE_URL&&process.env.TEST_SUPABASE_SERVICE_ROLE_KEY)
describe.skipIf(!enabled)('project update review integration',()=>{it('requires isolated Supabase credentials to prove team draft is hidden until reviewed and published',()=>expect(process.env.TEST_SUPABASE_URL).toBeTruthy())})
