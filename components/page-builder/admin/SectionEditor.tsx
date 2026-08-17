'use client'

import { useState } from 'react'
import type { MediaAsset } from '@/lib/cms/media'
import type { PageSection } from '@/lib/page-builder/types'
import { validateSection } from '@/lib/page-builder/registry'
import { CommunityEditor } from './editors/CommunityEditor'
import { ContentEditor } from './editors/ContentEditor'
import { CtaEditor } from './editors/CtaEditor'
import { EngineeringEditor } from './editors/EngineeringEditor'
import { HeroEditor } from './editors/HeroEditor'

export function SectionEditor({ section, mediaAssets, onApply }: { section: PageSection; mediaAssets: MediaAsset[]; onApply: (section: PageSection) => void }) {
  const [draft, setDraft] = useState(section)
  const [error, setError] = useState('')
  let editor
  if (draft.type === 'hero') editor = <HeroEditor section={draft} mediaAssets={mediaAssets} onChange={setDraft} />
  else if (['text_image', 'statistics', 'features_grid', 'rich_text', 'quote', 'gallery'].includes(draft.type)) editor = <ContentEditor section={draft} mediaAssets={mediaAssets} onChange={setDraft} />
  else if (['project_grid', 'project_spotlight', 'discipline_grid', 'project_timeline'].includes(draft.type)) editor = <EngineeringEditor section={draft} onChange={setDraft} />
  else if (draft.type === 'cta') editor = <CtaEditor section={draft} onChange={setDraft} />
  else editor = <CommunityEditor section={draft} onChange={setDraft} />
  return <div>{editor}{error && <p className="form-error" role="alert">{error}</p>}<button className="button button--cardinal" type="button" onClick={() => { try { onApply(validateSection(draft)); setError('') } catch { setError('Complete the required fields before applying this section.') } }}>Apply section changes</button></div>
}
