import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { assertPublishableMediaIds } from '@/lib/cms/media'

const safeUrl=z.union([z.literal(''),z.string().url().refine(value=>['http:','https:'].includes(new URL(value).protocol),'Only HTTP(S) URLs are allowed')])
const safeHref=z.string().max(500).refine(value=>!value||value.startsWith('/')&&!value.startsWith('//')||(() => { try { return ['http:','https:'].includes(new URL(value).protocol) } catch { return false } })(),'Announcement links must be internal paths or HTTP(S) URLs')
const nullableUuid=z.union([z.string().uuid(),z.null()])
export const siteSettingsSchema=z.object({
  contactEmail:z.string().email().max(320),
  footerText:z.string().max(240),
  socialLinks:z.object({instagram:safeUrl.default(''),linkedin:safeUrl.default(''),github:safeUrl.default('')}).strict(),
  defaultOgMediaId:nullableUuid,
  seoTitlePattern:z.string().min(1).max(120).refine(value=>value.includes('%s'),'SEO title pattern must contain %s'),
  announcement:z.object({enabled:z.boolean(),text:z.string().max(240),href:safeHref}).strict(),
  brand:z.object({badgeMediaId:nullableUuid,horizontalMediaId:nullableUuid}).strict()
}).strict()
export type SiteSettings=z.infer<typeof siteSettingsSchema>
export const defaultSiteSettings:SiteSettings={contactEmail:'engineering@oberlin.edu',footerText:'Build • Learn • Engineer Together',socialLinks:{instagram:'',linkedin:'',github:''},defaultOgMediaId:null,seoTitlePattern:'%s · Oberlin Engineering Club',announcement:{enabled:false,text:'',href:''},brand:{badgeMediaId:null,horizontalMediaId:null}}
export function parseSiteSettings(input:unknown):SiteSettings{return siteSettingsSchema.parse(input)}

export async function getAdminSiteSettings():Promise<SiteSettings>{
  const s=await createSupabaseServerClient();const{data,error}=await s.from('site_settings').select('key,value').in('key',['contact','footer','social','seo','announcement','brand'])
  if(error)throw new Error(`SITE_SETTINGS_LOAD_FAILED:${error.message}`)
  const values=Object.fromEntries((data??[]).map(row=>[row.key,row.value])) as Record<string,any>
  return parseSiteSettings({
    contactEmail:values.contact?.email??defaultSiteSettings.contactEmail,
    footerText:values.footer?.text??values.contact?.footerText??defaultSiteSettings.footerText,
    socialLinks:{...defaultSiteSettings.socialLinks,...(values.social??{})},
    defaultOgMediaId:values.seo?.defaultOgMediaId??null,
    seoTitlePattern:values.seo?.titlePattern??defaultSiteSettings.seoTitlePattern,
    announcement:{...defaultSiteSettings.announcement,...(values.announcement??{})},
    brand:{badgeMediaId:values.brand?.badgeMediaId??null,horizontalMediaId:values.brand?.horizontalMediaId??null}
  })
}

export async function saveSiteSettings(input:unknown,actorId:string){
  const settings=parseSiteSettings(input);await assertPublishableMediaIds([settings.defaultOgMediaId,settings.brand.badgeMediaId,settings.brand.horizontalMediaId].filter((id):id is string=>Boolean(id)));const s=await createSupabaseServerClient()
  const rows=[
    {key:'contact',value:{email:settings.contactEmail},publication_state:'published',updated_by:actorId},
    {key:'footer',value:{text:settings.footerText},publication_state:'published',updated_by:actorId},
    {key:'social',value:settings.socialLinks,publication_state:'published',updated_by:actorId},
    {key:'seo',value:{defaultOgMediaId:settings.defaultOgMediaId,titlePattern:settings.seoTitlePattern},publication_state:'published',updated_by:actorId},
    {key:'announcement',value:settings.announcement,publication_state:'published',updated_by:actorId},
    {key:'brand',value:settings.brand,publication_state:'published',updated_by:actorId}
  ]
  const{error}=await s.from('site_settings').upsert(rows,{onConflict:'key'});if(error)throw new Error(`SITE_SETTINGS_SAVE_FAILED:${error.message}`)
  await s.from('audit_log').insert({actor_id:actorId,action:'SITE_SETTINGS_UPDATED',entity_type:'site_settings',entity_id:'global',after_snapshot:settings})
}
