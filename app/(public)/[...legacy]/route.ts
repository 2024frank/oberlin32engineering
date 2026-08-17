import { resolveRedirect } from '@/lib/cms/redirects'
export const dynamic='force-dynamic'
export async function GET(request:Request,{params}:{params:Promise<{legacy:string[]}>}){const parts=(await params).legacy;const sourcePath=`/${parts.join('/')}`;const rule=await resolveRedirect(sourcePath);if(!rule)return new Response('Not Found',{status:404,headers:{'content-type':'text/plain; charset=utf-8'}});return Response.redirect(new URL(rule.destination,request.url),rule.statusCode)}
