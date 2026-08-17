import type { Metadata } from 'next'
import { CmsPage } from '@/components/public/CmsPage'
import { getPublishedPageBySlug } from '@/lib/page-builder/publicPages'
import { metadataForCmsPage } from '@/lib/seo/metadata'
export async function generateMetadata():Promise<Metadata>{return metadataForCmsPage(await getPublishedPageBySlug('home'))}
export default async function HomePage(){return <CmsPage page={await getPublishedPageBySlug('home')}/>}
