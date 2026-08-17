'use client'

import type { MediaAsset } from '@/lib/cms/media'
import type { PageSection } from '@/lib/page-builder/types'
import { MediaPicker } from '@/components/admin/media/MediaPicker'

type Hero = Extract<PageSection, { type: 'hero' }>

export function HeroEditor({ section, mediaAssets, onChange }: { section: Hero; mediaAssets: MediaAsset[]; onChange: (section: PageSection) => void }) {
  const set = (key: keyof Hero, value: unknown) => onChange({ ...section, [key]: value } as PageSection)
  const cta = (key: 'primaryCta' | 'secondaryCta', field: 'label' | 'href', value: string) => set(key, { ...(section[key] ?? { label: '', href: '' }), [field]: value })
  return <div className="section-editor-fields">
    <label>Layout<select value={section.layout} onChange={event => set('layout', event.target.value)}><option value="image">Image</option><option value="split">Split</option><option value="minimal">Minimal</option></select></label>
    <label>Eyebrow<input value={section.eyebrow ?? ''} onChange={event => set('eyebrow', event.target.value)} /></label>
    <label>Headline<input aria-label="Headline" value={section.headline} onChange={event => set('headline', event.target.value)} /></label>
    <label>Body<textarea rows={5} value={section.body ?? ''} onChange={event => set('body', event.target.value)} /></label>
    <label>Hero image alt text<input value={section.imageAlt ?? ''} onChange={event => set('imageAlt', event.target.value)} /></label><fieldset><legend>Hero media</legend><MediaPicker assets={mediaAssets.filter(asset => asset.mimeType.startsWith('image/'))} value={section.imageId} onChange={id => set('imageId', id)} /></fieldset>
    <fieldset><legend>Primary button</legend><input aria-label="Primary CTA label" placeholder="Label" value={section.primaryCta?.label ?? ''} onChange={event => cta('primaryCta', 'label', event.target.value)} /><input aria-label="Primary CTA URL" placeholder="/path" value={section.primaryCta?.href ?? ''} onChange={event => cta('primaryCta', 'href', event.target.value)} /></fieldset>
    <fieldset><legend>Secondary button</legend><input aria-label="Secondary CTA label" placeholder="Label" value={section.secondaryCta?.label ?? ''} onChange={event => cta('secondaryCta', 'label', event.target.value)} /><input aria-label="Secondary CTA URL" placeholder="/path" value={section.secondaryCta?.href ?? ''} onChange={event => cta('secondaryCta', 'href', event.target.value)} /></fieldset>
  </div>
}
