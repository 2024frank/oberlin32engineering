'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { MediaAsset } from '@/lib/cms/media'
import type { PageSection, PageSnapshot } from '@/lib/page-builder/types'
import { EditorDrawer } from '@/components/admin/EditorDrawer'
import { useToast } from '@/components/ui/Toast'
import { PageSectionList } from './PageSectionList'
import { SectionEditor } from './SectionEditor'
import { SectionPicker } from './SectionPicker'

export type PageVersionSummary = {
  id: string
  version_number: number
  published_at: string
  published_by: string | null
  restored_from: string | null
}

export function PageEditor({
  initial,
  versions,
  canPublish,
  mediaAssets
}: {
  initial: PageSnapshot
  versions: PageVersionSummary[]
  canPublish: boolean
  mediaAssets: MediaAsset[]
}) {
  const [page, setPage] = useState(initial)
  const [versionRows, setVersionRows] = useState(versions)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const current = useMemo(() => page.sections.find(section => section.stableKey === editing) ?? null, [page.sections, editing])

  function reorder(keys: string[]) {
    setPage(currentPage => ({ ...currentPage, sections: keys.map(key => currentPage.sections.find(section => section.stableKey === key)!).filter(Boolean) }))
  }

  function visibility(key: string, isVisible: boolean) {
    setPage(currentPage => ({ ...currentPage, sections: currentPage.sections.map(section => section.stableKey === key ? { ...section, isVisible } as PageSection : section) }))
  }

  async function save(): Promise<boolean> {
    setBusy(true)
    try {
      const response = await fetch('/api/admin/pages', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(page) })
      const body = await response.json()
      if (!response.ok) {
        toast(body.error ?? 'Page save failed.', 'error')
        return false
      }
      toast('Page draft saved.')
      return true
    } catch {
      toast('Page save failed.', 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function refreshVersions() {
    const response = await fetch(`/api/admin/pages?slug=${encodeURIComponent(page.slug)}&versions=1`)
    if (!response.ok) return
    const body = await response.json() as { versions?: PageVersionSummary[] }
    if (body.versions) setVersionRows(body.versions)
  }

  async function publish() {
    if (!(await save())) return
    setBusy(true)
    try {
      const response = await fetch('/api/publish/page', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pageId: page.pageId }) })
      const body = await response.json()
      if (!response.ok) return toast(body.error ?? 'Publish failed.', 'error')
      toast('Published to the public site.')
      await refreshVersions()
    } finally {
      setBusy(false)
    }
  }

  async function restore(version: PageVersionSummary) {
    setBusy(true)
    try {
      const response = await fetch('/api/restore/page', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pageId: page.pageId, versionId: version.id }) })
      const body = await response.json()
      if (!response.ok) return toast(body.error ?? 'Restore failed.', 'error')
      toast(`Version ${version.version_number} restored and published.`)
      await refreshVersions()
    } finally {
      setBusy(false)
    }
  }

  return <main className="admin-panel">
    <div className="admin-page-heading">
      <div><p className="eyebrow">Website → Pages</p><h1>{page.title}</h1><p>Reorder, hide, show, and edit approved blocks. No code or CSS access is exposed here.</p></div>
      <div className="page-editor-actions">
        <Link href={`/preview/${page.slug}`}>Preview</Link>
        <button type="button" disabled={busy} onClick={() => void save()}>Save draft</button>
        {canPublish && <button type="button" disabled={busy} onClick={() => void publish()} className="button--cardinal">Publish</button>}
      </div>
    </div>

    <section className="page-meta-editor" aria-labelledby="page-meta-heading">
      <h2 id="page-meta-heading">Page details</h2>
      <label>Page title<input value={page.title} onChange={event => setPage({ ...page, title: event.target.value })} /></label>
      <label>SEO title<input value={page.seoTitle} onChange={event => setPage({ ...page, seoTitle: event.target.value })} /></label>
      <label>SEO description<textarea value={page.seoDescription} onChange={event => setPage({ ...page, seoDescription: event.target.value })} /></label>
    </section>

    <p className="builder-screen-note">Page structure editing is best on a larger screen, but you can still save drafts and make routine edits here.</p><div className="page-builder-head"><h2>Page sections</h2><button type="button" onClick={() => setAdding(true)}>+ Add section</button></div>
    <PageSectionList sections={page.sections} onReorder={reorder} onVisibilityChange={visibility} onEdit={setEditing} onRemove={key => setPage(currentPage => ({ ...currentPage, sections: currentPage.sections.filter(section => section.stableKey !== key) }))} onDuplicate={key => setPage(currentPage => {
      const source = currentPage.sections.find(section => section.stableKey === key)
      if (!source) return currentPage
      const clone = { ...structuredClone(source), stableKey: `${source.stableKey}-copy-${crypto.randomUUID().slice(0, 8)}` } as PageSection
      const index = currentPage.sections.findIndex(section => section.stableKey === key)
      const next = [...currentPage.sections]
      next.splice(index + 1, 0, clone)
      return { ...currentPage, sections: next }
    })} />

    <section className="version-history" aria-labelledby="version-history-heading">
      <div className="page-builder-head"><div><p className="eyebrow">Publishing</p><h2 id="version-history-heading">Version history</h2></div></div>
      {versionRows.length ? <div className="version-list">{versionRows.map(version => <article key={version.id}>
        <div><strong>Version {version.version_number}</strong><span>{new Date(version.published_at).toLocaleString()}</span>{version.restored_from && <small>Created from a restored version</small>}</div>
        {canPublish && <button type="button" disabled={busy} aria-label={`Restore version ${version.version_number}`} onClick={() => void restore(version)}>Restore &amp; publish</button>}
      </article>)}</div> : <p className="empty-copy">This page has not been published yet.</p>}
    </section>

    <EditorDrawer open={Boolean(current)} title={current ? `Edit ${current.type.replaceAll('_', ' ')}` : 'Edit section'} description="Only fields allowed by this block’s design schema are editable." onClose={() => setEditing(null)}>
      {current && <SectionEditor key={current.stableKey} section={current} mediaAssets={mediaAssets} onApply={next => { setPage(currentPage => ({ ...currentPage, sections: currentPage.sections.map(section => section.stableKey === next.stableKey ? next : section) })); setEditing(null) }} />}
    </EditorDrawer>
    <EditorDrawer open={adding} title="Add a section" description="Choose from approved OEC layouts." onClose={() => setAdding(false)}>
      <SectionPicker onPick={section => { setPage(currentPage => ({ ...currentPage, sections: [...currentPage.sections, section] })); setAdding(false); setEditing(section.stableKey) }} />
    </EditorDrawer>
  </main>
}
