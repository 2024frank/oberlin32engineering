import { describe, expect, it } from 'vitest'
import { validateSection } from '@/lib/page-builder/registry'

describe('page builder schemas', () => {
  it('rejects a hero with an empty headline', () => {
    const invalidHero = { stableKey: 'hero', isVisible: true, type: 'hero', layout: 'split', headline: '', primaryCta: { label: '', href: '' } }
    expect(() => validateSection(invalidHero)).toThrow()
  })

  it('accepts the approved hero layouts', () => {
    expect(validateSection({ stableKey: 'hero', isVisible: true, type: 'hero', layout: 'image', headline: 'Build together', body: '' }).type).toBe('hero')
  })
})

it('accepts a newly added gallery before media is selected', () => {
  expect(validateSection({ stableKey: 'gallery-new', isVisible: true, type: 'gallery', heading: 'Gallery', images: [] }).type).toBe('gallery')
})

it('requires alt text when a content image is selected', () => {
  expect(() => validateSection({ stableKey:'text-with-image',isVisible:true,type:'text_image',layout:'image_right',heading:'Workshop',body:'',imageId:'00000000-0000-4000-8000-000000000099',imageAlt:'' })).toThrow()
  expect(() => validateSection({ stableKey:'hero-with-image',isVisible:true,type:'hero',layout:'image',headline:'Build together',body:'',imageId:'00000000-0000-4000-8000-000000000099',imageAlt:'' })).toThrow()
})
