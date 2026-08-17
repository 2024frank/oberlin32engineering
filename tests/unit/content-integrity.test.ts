import { describe, expect, it } from 'vitest'
import { projectPublishSchema } from '@/lib/validation/projects'
import { eventPublishSchema } from '@/lib/validation/events'
import { resourcePublishSchema } from '@/lib/validation/resources'

describe('reality-sensitive publishing validation', () => {
  it('requires active projects to have a real lead and next step', () => {
    expect(() => projectPublishSchema.parse({ slug:'robot-arm',title:'Robot Arm',status:'active',leadName:'',nextStep:'' })).toThrow()
  })
  it('requires a published event to have confirmed start time, organizer, and location/access info', () => {
    expect(() => eventPublishSchema.parse({ slug:'build-night',title:'Build Night',startAt:null,organizerName:'',location:'',accessDetails:'' })).toThrow()
  })
  it('does not allow club-authored guidance to claim official-source status', () => {
    expect(() => resourcePublishSchema.parse({title:'Our 3-2 notes',category:'3-2',sourceKind:'club',officialSource:true,sourceUrl:'https://example.com'})).toThrow()
  })
})
