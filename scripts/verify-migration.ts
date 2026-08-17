import { countExplicitReviewItems } from '../lib/migration/verification.ts'
import { readFile } from 'node:fs/promises'
const path=process.argv[2]??'artifacts/migration/migration-report.json';const report=JSON.parse(await readFile(path,'utf8'))
const failures:string[]=[]
if(report.autoApprovedMembers!==0)failures.push(`autoApprovedMembers=${report.autoApprovedMembers}`)
if(report.autoApprovedStaff!==0)failures.push(`autoApprovedStaff=${report.autoApprovedStaff}`)
for(const [table,counts] of Object.entries(report.tables??{}) as Array<[string,any]>)if((counts.accepted??0)+(counts.rejected??0)!==(counts.source??0))failures.push(`${table}: source count does not reconcile`)
const mediaIds=new Set(Object.values(report.idMap?.media??{}));for(const id of mediaIds)if(typeof id!=='string'||!id)failures.push('invalid media id map entry')
const projectIds=new Set(Object.values(report.idMap?.projects??{}));for(const id of projectIds)if(typeof id!=='string'||!id)failures.push('invalid project id map entry')
if(failures.length){console.error('Migration verification failed:\n'+failures.map(x=>`- ${x}`).join('\n'));process.exit(1)}
console.log(`Migration report verified. ${countExplicitReviewItems(report)} item(s) remain in the explicit reject/review queue; zero accounts were auto-approved.`)
