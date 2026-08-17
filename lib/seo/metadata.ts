import type { Metadata } from 'next'
import type { PageSnapshot } from '@/lib/page-builder/types'
import { getCmsRenderContext, getPublicSiteSettings } from '@/lib/page-builder/publicPages'
export async function metadataForCmsPage(page:PageSnapshot):Promise<Metadata>{const base=(process.env.NEXT_PUBLIC_SITE_URL??'https://oberlinengineeringclub.org').replace(/\/$/,'');const path=page.slug==='home'?'':`/${page.slug}`;const settings=await getPublicSiteSettings();const rawTitle=page.seoTitle||page.title;
// The home page carries the site name on its own. Applying the "%s · Oberlin
// Engineering Club" pattern to a title that is already the site name produced
// "Oberlin Engineering Club · Oberlin Engineering Club".
const patterned=settings.seo.titlePattern.includes('%s')?settings.seo.titlePattern.replace('%s',rawTitle):rawTitle;
const title=page.slug==='home'?rawTitle:patterned;let image:string|undefined;const mediaId=page.ogMediaId??settings.seo.defaultOgMediaId;if(mediaId&&process.env.NEXT_PUBLIC_SUPABASE_URL){const context=await getCmsRenderContext();image=context.media?.[mediaId]?.url}// `absolute` stops the root layout's title template appending the site name a second
// time: the CMS titlePattern has already applied it, which produced titles like
// "About OEC · Oberlin Engineering Club · Oberlin Engineering Club".
return{title:{absolute:title},description:page.seoDescription||undefined,alternates:{canonical:`${base}${path}`},openGraph:{title,description:page.seoDescription||undefined,url:`${base}${path}`,siteName:'Oberlin Engineering Club',type:'website',images:image?[{url:image}]:undefined}}}
