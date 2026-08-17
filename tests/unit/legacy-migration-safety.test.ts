import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildMigrationSafetyReport,mapLegacyMedia,mapLegacyProject,mapLegacySubmission } from '../../lib/migration/legacyMappers.ts'
import { migrationTablePlan } from '../../lib/migration/plan.ts'
import { countExplicitReviewItems } from '../../lib/migration/verification.ts'

test('legacy identities never auto-create approved member or staff accounts',()=>{
  const report=buildMigrationSafetyReport({
    submissions:[{id:'join-1',email:'student@oberlin.edu'}],
    profiles:[{id:'profile-1',email:'officer@oberlin.edu',role:'admin'}]
  })
  assert.equal(report.autoApprovedMembers,0)
  assert.equal(report.autoApprovedStaff,0)
  assert.equal(migrationTablePlan.find(item=>item.source==='profiles')?.mode,'review_only')
  const forbidden=new Set(['member_profiles','membership_requests','admin_profiles','role_assignments','staff_invites'])
  assert.equal(migrationTablePlan.some(item=>item.target&&forbidden.has(item.target)),false)
})

test('legacy member-looking submissions remain plain new submissions',()=>{
  const mapped=mapLegacySubmission({id:'submission-1',type:'join',name:'Student',email:'student@oberlin.edu'})
  assert.equal(mapped.legacy_source_id,'submission-1')
  assert.equal(mapped.status,'new')
  assert.equal('approved' in mapped,false)
  assert.equal('member_id' in mapped,false)
})

test('migrated content requires a stable legacy source id instead of inventing one',()=>{
  assert.throws(()=>mapLegacyProject({title:'Missing id'}),/LEGACY_SOURCE_ID_MISSING/)
})

test('legacy active projects without a documented lead and next step are downgraded for review',()=>{
  const mapped=mapLegacyProject({id:'project-1',title:'Robot',status:'active',published:true})
  assert.equal(mapped.status,'scoping')
  assert.match(mapped.migration_note,/downgraded/i)
})

test('every legacy_source_id upsert target has a unique conflict index',async()=>{
  const sql=await readFile(new URL('../../database/migrations/019_legacy_migration_tracking.sql',import.meta.url),'utf8')
  const targets=migrationTablePlan
    .filter(item=>item.mode==='migrate'&&item.target&&item.target!=='site_settings')
    .map(item=>item.target as string)
  for(const table of targets){
    assert.match(sql,new RegExp(`create\\s+unique\\s+index[^;]+on\\s+public\\.${table}\\s*\\(legacy_source_id\\)`,'i'),`missing unique legacy_source_id index for ${table}`)
  }
})


test('legacy media keeps its provenance and never self-approves generated imagery',()=>{
  const generated=mapLegacyMedia({id:'gen-1',file_name:'hero-generated.jpg',mime_type:'image/jpeg',alt_text:'Generated workbench',source_type:'generated',rights_note:'Generated with OpenAI image tools',visual_qa_approved:true})
  assert.equal(generated.source_type,'generated')
  assert.equal(generated.visual_qa_approved,false)
  const licensed=mapLegacyMedia({id:'lic-1',file_name:'bench.jpg',mime_type:'image/jpeg',alt_text:'Bench',source_type:'licensed',rights_note:'Unsplash License · Clint Patterson'})
  assert.equal(licensed.source_type,'licensed')
  assert.match(licensed.rights_note,/Unsplash/)
  const unknown=mapLegacyMedia({id:'unk-1',file_name:'x.jpg',mime_type:'image/jpeg',alt_text:'X',source_type:'not-a-type'})
  assert.equal(unknown.source_type,'original')
})

test('migration verification counts review-only records as explicit review work',()=>{
  assert.equal(countExplicitReviewItems({
    rejected:[{table:'projects'}],
    reviewOnly:{profiles:[{id:'p1'}],site_settings:[{key:'seo'}],empty:[]}
  }),3)
})
