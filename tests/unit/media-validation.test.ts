import { describe, expect, it } from 'vitest'
import { validateMediaUpload } from '@/lib/cms/media'

describe('media validation',()=>{
  it('accepts supported images within the limit',()=>expect(validateMediaUpload({mime:'image/png',size:2_000_000})).toEqual({ok:true}))
  it('rejects executable content',()=>expect(validateMediaUpload({mime:'application/x-msdownload',size:1_000})).toEqual({ok:false,reason:'UNSUPPORTED_TYPE'}))
  it('rejects oversized files',()=>expect(validateMediaUpload({mime:'image/jpeg',size:16_000_000})).toEqual({ok:false,reason:'FILE_TOO_LARGE'}))
})
