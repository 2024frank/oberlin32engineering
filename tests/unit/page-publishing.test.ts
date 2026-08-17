import { describe, expect, it } from 'vitest'
import { validatePageForPublish } from '@/lib/page-builder/pageService'

describe('page publishing validation', () => {
  it('refuses to publish a page with an invalid visible section', () => {
    expect(() => validatePageForPublish({ pageId:'00000000-0000-4000-8000-000000000001', slug:'home', title:'Home', seoTitle:'', seoDescription:'', ogMediaId:null, sections:[{stableKey:'hero',isVisible:true,type:'hero',layout:'split',headline:'',body:''}] })).toThrow('PAGE_VALIDATION_FAILED')
  })
})
