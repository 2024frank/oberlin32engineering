import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { pageSnapshotSchema, type PageSnapshot, type PageSection } from './types'

export function validatePageForPublish(input: unknown): PageSnapshot {
  try { return pageSnapshotSchema.parse(input) }
  catch { throw new Error('PAGE_VALIDATION_FAILED') }
}

export async function getDraftPage(pageId: string): Promise<PageSnapshot> {
  const supabase = await createSupabaseServerClient()
  const [{ data: page, error: pageError }, { data: draft, error: draftError }, { data: sectionRows, error: sectionsError }] = await Promise.all([
    supabase.from('pages').select('id,slug').eq('id', pageId).single(),
    supabase.from('page_drafts').select('title,seo_title,seo_description,og_media_id').eq('page_id', pageId).single(),
    supabase.from('page_sections').select('stable_key,section_type,sort_order,is_visible,draft_payload').eq('page_id', pageId).order('sort_order')
  ])
  if (pageError || draftError || sectionsError || !page || !draft) throw new Error('PAGE_DRAFT_NOT_FOUND')
  const sections = (sectionRows ?? []).map(row => ({ ...row.draft_payload as Record<string, unknown>, stableKey: row.stable_key, isVisible: row.is_visible, type: row.section_type })) as unknown as PageSection[]
  return { pageId: page.id, slug: page.slug, title: draft.title, seoTitle: draft.seo_title, seoDescription: draft.seo_description, ogMediaId: draft.og_media_id, sections }
}

export async function savePageDraft(input: PageSnapshot, actorId: string): Promise<void> {
  const snapshot = validatePageForPublish(input)
  const supabase = await createSupabaseServerClient()
  const { error: draftError } = await supabase.from('page_drafts').upsert({ page_id:snapshot.pageId,title:snapshot.title,seo_title:snapshot.seoTitle,seo_description:snapshot.seoDescription,og_media_id:snapshot.ogMediaId,updated_by:actorId })
  if (draftError) throw new Error(`PAGE_DRAFT_SAVE_FAILED:${draftError.message}`)
  const { error: deleteError } = await supabase.from('page_sections').delete().eq('page_id', snapshot.pageId)
  if (deleteError) throw new Error(`PAGE_SECTION_SAVE_FAILED:${deleteError.message}`)
  if (snapshot.sections.length) {
    const { error } = await supabase.from('page_sections').insert(snapshot.sections.map((section,index) => ({ page_id:snapshot.pageId,stable_key:section.stableKey,section_type:section.type,sort_order:index,is_visible:section.isVisible,draft_payload:section })))
    if (error) throw new Error(`PAGE_SECTION_SAVE_FAILED:${error.message}`)
  }
}

export async function getPublishedPage(pageId: string): Promise<PageSnapshot | null> {
  const supabase = await createSupabaseServerClient()
  const { data: page } = await supabase.from('pages').select('published_version_id').eq('id',pageId).maybeSingle()
  if (!page?.published_version_id) return null
  const { data: version, error } = await supabase.from('page_versions').select('page_snapshot,sections_snapshot').eq('id',page.published_version_id).single()
  if (error || !version) return null
  return validatePageForPublish({ ...(version.page_snapshot as object), sections: version.sections_snapshot })
}

export async function getDraftPageBySlug(slug:string):Promise<PageSnapshot>{const s=await createSupabaseServerClient();const{data,error}=await s.from('pages').select('id').eq('slug',slug).single();if(error||!data)throw new Error('PAGE_DRAFT_NOT_FOUND');return getDraftPage(data.id)}
export async function listAdminPages(){const s=await createSupabaseServerClient();const{data,error}=await s.from('pages').select('id,slug,published_version_id,updated_at,page_drafts(title,seo_title,seo_description,updated_at)').order('slug');if(error)throw new Error(`PAGES_LOAD_FAILED:${error.message}`);return data??[]}
export async function listPageVersions(pageId:string){const s=await createSupabaseServerClient();const{data,error}=await s.from('page_versions').select('id,version_number,published_at,published_by,restored_from').eq('page_id',pageId).order('version_number',{ascending:false});if(error)throw new Error(error.message);return data??[]}
