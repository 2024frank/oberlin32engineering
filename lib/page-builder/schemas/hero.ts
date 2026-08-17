import { z } from 'zod'
import { ctaLinkSchema, sectionCommonSchema } from './common'

export const heroSchema = sectionCommonSchema.extend({
  type: z.literal('hero'), layout: z.enum(['image','split','minimal']), eyebrow: z.string().max(80).default(''),
  headline: z.string().min(1).max(140), body: z.string().max(700).default(''), imageId: z.string().uuid().nullable().default(null), imageAlt: z.string().max(240).default(''),
  primaryCta: ctaLinkSchema.optional(), secondaryCta: ctaLinkSchema.optional()
})
