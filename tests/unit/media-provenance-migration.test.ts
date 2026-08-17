import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest'

const sql=readFileSync(new URL('../../database/migrations/018_media_provenance.sql',import.meta.url),'utf8')

describe('media provenance database enforcement',()=>{
  it('defines the authoritative publish assertion and generated-image QA requirement',()=>{
    expect(sql).toContain('private.assert_publishable_media')
    expect(sql).toContain('GENERATED_IMAGE_QA_REQUIRED')
  })
  it('guards canonical content, page versions, site settings, and live metadata',()=>{
    expect(sql).toContain('enforce_canonical_media_policy')
    expect(sql).toContain('enforce_page_version_media_policy')
    expect(sql).toContain('enforce_site_settings_media_policy')
    expect(sql).toContain('enforce_live_media_metadata_policy')
  })
  it('limits media mutation to staff with the media scope',()=>expect(sql).toContain("private.has_scope('media')"))
})
