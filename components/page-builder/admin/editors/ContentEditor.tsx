'use client'

import type { MediaAsset } from '@/lib/cms/media'
import { getImagePublishBlockReason } from '@/lib/media/imagePolicy'
import type { PageSection } from '@/lib/page-builder/types'
import { MediaPicker } from '@/components/admin/media/MediaPicker'

type EditableContent = Extract<PageSection, { type: 'text_image' | 'statistics' | 'features_grid' | 'rich_text' | 'quote' | 'gallery' }>

export function ContentEditor({ section, mediaAssets, onChange }: { section: PageSection; mediaAssets: MediaAsset[]; onChange: (section: PageSection) => void }) {
  const current = section as EditableContent
  if (current.type === 'quote') return <QuoteEditor section={current} onChange={onChange} />
  if (current.type === 'rich_text') return <RichTextEditor section={current} onChange={onChange} />
  if (current.type === 'statistics') return <StatisticsEditor section={current} onChange={onChange} />
  if (current.type === 'features_grid') return <FeaturesEditor section={current} onChange={onChange} />
  if (current.type === 'gallery') return <GalleryEditor section={current} mediaAssets={mediaAssets} onChange={onChange} />
  if (current.type === 'text_image') return <TextImageEditor section={current} mediaAssets={mediaAssets} onChange={onChange} />
  return null
}

function QuoteEditor({ section, onChange }: { section: Extract<PageSection, { type: 'quote' }>; onChange: (section: PageSection) => void }) {
  return <div className="section-editor-fields"><label>Quote<textarea value={section.quote} onChange={event => onChange({ ...section, quote: event.target.value })} /></label><label>Attribution<input value={section.attribution ?? ''} onChange={event => onChange({ ...section, attribution: event.target.value })} /></label><label>Role<input value={section.role ?? ''} onChange={event => onChange({ ...section, role: event.target.value })} /></label></div>
}

function RichTextEditor({ section, onChange }: { section: Extract<PageSection, { type: 'rich_text' }>; onChange: (section: PageSection) => void }) {
  return <div className="section-editor-fields"><label>Heading<input value={section.heading ?? ''} onChange={event => onChange({ ...section, heading: event.target.value })} /></label><label>Body<textarea rows={12} value={section.body} onChange={event => onChange({ ...section, body: event.target.value })} /></label></div>
}

function StatisticsEditor({ section, onChange }: { section: Extract<PageSection, { type: 'statistics' }>; onChange: (section: PageSection) => void }) {
  const update = (index: number, key: 'value' | 'label' | 'note', value: string) => onChange({ ...section, items: section.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) })
  return <div className="section-editor-fields"><label>Heading<input value={section.heading ?? ''} onChange={event => onChange({ ...section, heading: event.target.value })} /></label>{section.items.map((item, index) => <fieldset key={index}><legend>Item {index + 1}</legend><input aria-label={`Statistic ${index + 1} value`} placeholder="Value" value={item.value} onChange={event => update(index, 'value', event.target.value)} /><input aria-label={`Statistic ${index + 1} label`} placeholder="Label" value={item.label} onChange={event => update(index, 'label', event.target.value)} /><input aria-label={`Statistic ${index + 1} note`} placeholder="Note" value={item.note} onChange={event => update(index, 'note', event.target.value)} /></fieldset>)}<button type="button" onClick={() => onChange({ ...section, items: [...section.items, { value: '1', label: 'Metric', note: '' }] })}>Add item</button></div>
}

function FeaturesEditor({ section, onChange }: { section: Extract<PageSection, { type: 'features_grid' }>; onChange: (section: PageSection) => void }) {
  const update = (index: number, key: 'title' | 'body' | 'icon', value: string) => onChange({ ...section, items: section.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) })
  return <div className="section-editor-fields"><label>Eyebrow<input value={section.eyebrow ?? ''} onChange={event => onChange({ ...section, eyebrow: event.target.value })} /></label><label>Heading<input value={section.heading ?? ''} onChange={event => onChange({ ...section, heading: event.target.value })} /></label><label>Body<textarea value={section.body ?? ''} onChange={event => onChange({ ...section, body: event.target.value })} /></label>{section.items.map((item, index) => <fieldset key={index}><legend>Item {index + 1}</legend><input placeholder="Title" value={item.title} onChange={event => update(index, 'title', event.target.value)} /><textarea placeholder="Description" value={item.body} onChange={event => update(index, 'body', event.target.value)} /><input placeholder="Icon label" value={item.icon} onChange={event => update(index, 'icon', event.target.value)} /></fieldset>)}<button type="button" onClick={() => onChange({ ...section, items: [...section.items, { title: 'Feature', body: '', icon: '' }] })}>Add item</button></div>
}

function TextImageEditor({ section, mediaAssets, onChange }: { section: Extract<PageSection, { type: 'text_image' }>; mediaAssets: MediaAsset[]; onChange: (section: PageSection) => void }) {
  return <div className="section-editor-fields"><label>Layout<select value={section.layout} onChange={event => onChange({ ...section, layout: event.target.value as 'image_left' | 'image_right' })}><option value="image_right">Image right</option><option value="image_left">Image left</option></select></label><label>Eyebrow<input value={section.eyebrow ?? ''} onChange={event => onChange({ ...section, eyebrow: event.target.value })} /></label><label>Heading<input value={section.heading} onChange={event => onChange({ ...section, heading: event.target.value })} /></label><label>Body<textarea rows={8} value={section.body ?? ''} onChange={event => onChange({ ...section, body: event.target.value })} /></label><label>Image alt text<input value={section.imageAlt ?? ''} onChange={event => onChange({ ...section, imageAlt: event.target.value })} /></label><fieldset><legend>Section image</legend><MediaPicker assets={mediaAssets.filter(asset => asset.mimeType.startsWith('image/'))} value={section.imageId} onChange={id => onChange({ ...section, imageId: id })} /></fieldset></div>
}

function GalleryEditor({ section, mediaAssets, onChange }: { section: Extract<PageSection, { type: 'gallery' }>; mediaAssets: MediaAsset[]; onChange: (section: PageSection) => void }) {
  const selected = new Map(section.images.map(image => [image.mediaId, image]))
  function toggle(asset: MediaAsset) {
    if (selected.has(asset.id)) return onChange({ ...section, images: section.images.filter(image => image.mediaId !== asset.id) })
    if (section.images.length >= 12) return
    onChange({ ...section, images: [...section.images, { mediaId: asset.id, alt: asset.altText || asset.fileName, caption: asset.caption || '' }] })
  }
  function update(mediaId: string, field: 'alt' | 'caption', value: string) {
    onChange({ ...section, images: section.images.map(image => image.mediaId === mediaId ? { ...image, [field]: value } : image) })
  }
  return <div className="section-editor-fields"><label>Heading<input value={section.heading ?? ''} onChange={event => onChange({ ...section, heading: event.target.value })} /></label><fieldset><legend>Gallery images</legend><div className="media-grid">{mediaAssets.filter(asset => asset.mimeType.startsWith('image/')).map(asset => { const blocked=getImagePublishBlockReason(asset); const isSelected=selected.has(asset.id); return <button type="button" key={asset.id} className={`${isSelected?'selected ':''}${blocked?'media-blocked':''}`.trim()} disabled={Boolean(blocked)&&!isSelected} onClick={() => toggle(asset)}><img src={asset.publicUrl} alt="" /><span>{isSelected ? 'Selected · ' : ''}{asset.fileName}{blocked&&<small> · Media QA required</small>}</span></button> })}</div></fieldset>{section.images.map((image, index) => <fieldset key={image.mediaId}><legend>Image {index + 1}</legend><label>Alt text<input value={image.alt} onChange={event => update(image.mediaId, 'alt', event.target.value)} /></label><label>Caption<input value={image.caption} onChange={event => update(image.mediaId, 'caption', event.target.value)} /></label></fieldset>)}</div>
}
