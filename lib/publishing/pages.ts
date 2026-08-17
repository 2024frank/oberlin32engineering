import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getDraftPage, validatePageForPublish } from '@/lib/page-builder/pageService'
import type { PageSnapshot } from '@/lib/page-builder/types'
import { assertPublishableMediaIds } from '@/lib/cms/media'
import { collectPageMediaIds } from '@/lib/media/references'

export async function publishPageSnapshot(snapshotInput: PageSnapshot, actorId: string, restoredFrom?: string | null, useAdmin = false) {
  const snapshot = validatePageForPublish(snapshotInput)
  await assertPublishableMediaIds(collectPageMediaIds(snapshot), useAdmin)
  const supabase = useAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('publish_page_snapshot', { p_page_id:snapshot.pageId,p_page_snapshot:{ pageId:snapshot.pageId,slug:snapshot.slug,title:snapshot.title,seoTitle:snapshot.seoTitle,seoDescription:snapshot.seoDescription,ogMediaId:snapshot.ogMediaId },p_sections_snapshot:snapshot.sections,p_restored_from:restoredFrom ?? null })
  if (error) throw new Error(`PAGE_PUBLISH_FAILED:${error.message}`)
  if (useAdmin) await createSupabaseAdminClient().from('audit_log').insert({ actor_id:actorId,action:'SCHEDULED_PUBLISH',entity_type:'page',entity_id:snapshot.pageId,after_snapshot:snapshot })
  return data as string
}

export async function publishPageDraft(pageId: string, actorId: string) {
  return publishPageSnapshot(await getDraftPage(pageId), actorId)
}

export async function restorePageVersion(pageId: string, versionId: string, actorId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: version, error } = await supabase.from('page_versions').select('page_snapshot,sections_snapshot').eq('id',versionId).eq('page_id',pageId).single()
  if (error || !version) throw new Error('PAGE_VERSION_NOT_FOUND')
  return publishPageSnapshot(validatePageForPublish({ ...(version.page_snapshot as object), sections:version.sections_snapshot }), actorId, versionId)
}
