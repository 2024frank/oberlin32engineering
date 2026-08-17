import { z } from 'zod'
import { ctaLinkSchema, sectionCommonSchema } from './common'

export const ctaSchema = sectionCommonSchema.extend({ type:z.literal('cta'), tone:z.enum(['cream','cardinal','charcoal']).default('cardinal'), eyebrow:z.string().max(80).default(''), heading:z.string().min(1).max(140), body:z.string().max(700).default(''), primaryCta:ctaLinkSchema, secondaryCta:ctaLinkSchema.optional() })
