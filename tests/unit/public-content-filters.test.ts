import { describe, expect, it } from 'vitest'
import { parseProjectFilters } from '@/lib/content/projects'
import { parseOpportunityFilters } from '@/lib/content/opportunities'

describe('public content URL filters',()=>{
  it('parses project filters deterministically',()=>expect(parseProjectFilters(new URLSearchParams('status=active&discipline=robotics'))).toEqual({status:'active',discipline:'robotics',recruiting:undefined,skills:[]}))
  it('parses opportunity filters',()=>expect(parseOpportunityFilters(new URLSearchParams('type=internship'))).toEqual({type:'internship',openOnly:true}))
})
