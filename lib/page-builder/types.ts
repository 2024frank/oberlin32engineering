import { z } from 'zod'
import { heroSchema } from './schemas/hero'
import { textImageSchema, statisticsSchema, featuresGridSchema, richTextSchema, quoteSchema, gallerySchema } from './schemas/content'
import { projectGridSchema, projectSpotlightSchema, disciplineGridSchema, projectTimelineSchema } from './schemas/engineering'
import { leadershipGridSchema, eventListSchema, opportunityListSchema, newsGridSchema, sponsorGridSchema } from './schemas/community'
import { ctaSchema } from './schemas/cta'

export const pageSectionSchema = z.discriminatedUnion('type', [heroSchema,textImageSchema,statisticsSchema,featuresGridSchema,richTextSchema,quoteSchema,gallerySchema,projectGridSchema,projectSpotlightSchema,disciplineGridSchema,projectTimelineSchema,leadershipGridSchema,eventListSchema,opportunityListSchema,newsGridSchema,sponsorGridSchema,ctaSchema])
export type PageSection = z.infer<typeof pageSectionSchema>
export type PageSectionType = PageSection['type']

export const pageSnapshotSchema = z.object({
  pageId: z.string().uuid(), slug:z.string().min(1).max(120), title:z.string().min(1).max(160),
  seoTitle:z.string().max(160).default(''), seoDescription:z.string().max(320).default(''), ogMediaId:z.string().uuid().nullable().default(null),
  sections:z.array(pageSectionSchema)
})
export type PageSnapshot = z.infer<typeof pageSnapshotSchema>

export type PageRenderContext = {
  projects?: Array<Record<string, unknown>>
  events?: Array<Record<string, unknown>>
  opportunities?: Array<Record<string, unknown>>
  news?: Array<Record<string, unknown>>
  leaders?: Array<Record<string, unknown>>
  sponsors?: Array<Record<string, unknown>>
  media?: Record<string, { url: string; alt: string }>
}
