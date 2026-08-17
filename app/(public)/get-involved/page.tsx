import type { Metadata } from 'next'
import { metadataForCmsPage } from '@/lib/seo/metadata'
import { getPublishedPageBySlug } from '@/lib/page-builder/publicPages'
import { DirectoryHero } from '@/components/public/DirectoryHero'
import { GetInvolvedForm } from '@/components/forms/GetInvolvedForm'
import { PageRenderer } from '@/components/page-builder/PageRenderer'
import { getCmsRenderContext } from '@/lib/page-builder/publicPages'
export async function generateMetadata():Promise<Metadata>{return metadataForCmsPage(await getPublishedPageBySlug("get-involved"))}
export default async function GetInvolvedPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const [p,page,cmsContext]=await Promise.all([searchParams,getPublishedPageBySlug('get-involved'),getCmsRenderContext()]);
// Hero is rendered by DirectoryHero above, so skip it here and render the rest of the
// page's CMS sections (for example the open founding roles).
const extraSections=(page?.sections??[]).filter((x:any)=>x.type!=='hero');const type=typeof p.type==='string'?p.type:'join_club';const project=typeof p.project==='string'?p.project:'';return <><DirectoryHero slug={"get-involved"} eyebrow={"Get Involved"} title={"Ways to join in."} description={"Join the club, propose a project, or help run something. No account needed to get in touch."} imageSlug={"get-involved-campus-conversation"}/><section className="form-section"><div className="shell form-layout"><aside><p className="eyebrow">Open to you</p><h2>You do not need to be in 3-2.</h2><p>OEC is for students interested in engineering from any major, experience level, or career direction.</p><ul><li>Join the club</li><li>Join or propose a project</li><li>Help with events</li><li>Explore leadership</li><li>Partner or collaborate</li></ul></aside><GetInvolvedForm defaultType={type} defaultProject={project}/></div></section>{extraSections.length>0&&<PageRenderer sections={extraSections} context={cmsContext}/>}</>}
