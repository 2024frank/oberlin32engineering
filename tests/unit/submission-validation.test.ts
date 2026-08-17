import { describe, expect, it } from 'vitest'
import { isSpam, submissionSchema } from '@/lib/submissions/schema'

describe('public submissions',()=>{
  it('rejects invalid identity fields',()=>expect(()=>submissionSchema.parse({type:'join_club',fullName:'',email:'bad'})).toThrow())
  it('detects a filled honeypot',()=>expect(isSpam({honeypot:'filled',formStartedAt:Date.now()-5000})).toBe(true))
  it('accepts a normal elapsed form',()=>expect(isSpam({honeypot:'',formStartedAt:Date.now()-5000})).toBe(false))
})
