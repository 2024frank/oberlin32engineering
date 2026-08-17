import { describe, expect, it } from 'vitest'
import { getPublishedPageBySlug, type PublishedPageRepository } from '@/lib/page-builder/publicPages'

describe('public CMS page loader',()=>{
  it('returns only the version referenced by published_version_id',async()=>{
    const repo:PublishedPageRepository={async getPublished(slug){return {pageId:'00000000-0000-4000-8000-000000000001',slug,title:'Home',seoTitle:'Home',seoDescription:'',ogMediaId:null,sections:[{stableKey:'hero',isVisible:true,type:'hero',layout:'minimal',eyebrow:'',headline:'Published headline',body:'',imageId:null,imageAlt:''}]}}}
    const page=await getPublishedPageBySlug('home',repo)
    expect(page.sections[0]).toMatchObject({headline:'Published headline'})
    expect(JSON.stringify(page)).not.toContain('Unpublished draft headline')
  })
})
