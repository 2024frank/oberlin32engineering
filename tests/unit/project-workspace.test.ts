import { describe,expect,it } from 'vitest'
import { normalizeTeamUpdateDraft } from '@/lib/projects/workspacePolicy'
describe('project team updates',()=>{it('always begins as private draft pending admin review',()=>expect(normalizeTeamUpdateDraft({title:'Prototype complete',summary:'We finished the first working prototype.',body:''})).toMatchObject({publicationState:'draft',reviewStatus:'PENDING_REVIEW'}));it('requires meaningful update content',()=>expect(()=>normalizeTeamUpdateDraft({title:'Update',summary:'tiny'})).toThrow('PROJECT_UPDATE_CONTENT_REQUIRED'))})
