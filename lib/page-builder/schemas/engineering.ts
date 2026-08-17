import { z } from 'zod'
import { sectionCommonSchema } from './common'

export const projectGridSchema = sectionCommonSchema.extend({ type:z.literal('project_grid'), eyebrow:z.string().max(80).default(''), heading:z.string().min(1).max(140), limit:z.number().int().min(1).max(12).default(6), featuredOnly:z.boolean().default(false), status:z.enum(['proposed','open_for_interest','scoping','active','complete']).optional() })
export const projectSpotlightSchema = sectionCommonSchema.extend({ type:z.literal('project_spotlight'), eyebrow:z.string().max(80).default(''), heading:z.string().max(140).default(''), projectId:z.string().uuid().nullable().default(null) })
export const disciplineGridSchema = sectionCommonSchema.extend({ type:z.literal('discipline_grid'), heading:z.string().min(1).max(140), items:z.array(z.object({name:z.string().min(1).max(80), description:z.string().max(260).default('')})).min(1).max(12) })
export const projectTimelineSchema = sectionCommonSchema.extend({ type:z.literal('project_timeline'), heading:z.string().min(1).max(140), items:z.array(z.object({label:z.string().min(1).max(80), title:z.string().min(1).max(120), body:z.string().max(400).default('')})).min(1).max(12) })
