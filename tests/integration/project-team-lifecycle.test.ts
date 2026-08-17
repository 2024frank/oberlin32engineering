import { describe,expect,it } from 'vitest'
const enabled=Boolean(process.env.TEST_SUPABASE_URL&&process.env.TEST_SUPABASE_SERVICE_ROLE_KEY)
describe.skipIf(!enabled)('project team lifecycle integration',()=>{it('requires isolated Supabase credentials for application/invite acceptance transaction tests',()=>expect(process.env.TEST_SUPABASE_URL).toBeTruthy())})
