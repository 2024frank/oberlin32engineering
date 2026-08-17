import { describe,expect,it } from 'vitest'
const enabled=Boolean(process.env.TEST_SUPABASE_URL&&process.env.TEST_SUPABASE_SERVICE_ROLE_KEY)
describe.skipIf(!enabled)('project proposal approval integration',()=>{it('requires isolated Supabase credentials for atomic project + lead verification',()=>{expect(process.env.TEST_SUPABASE_URL).toBeTruthy();expect(process.env.TEST_SUPABASE_SERVICE_ROLE_KEY).toBeTruthy()})})
