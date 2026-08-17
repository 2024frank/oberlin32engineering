import { z } from 'zod'
import { ctaLinkSchema, sectionCommonSchema } from './common'

export const textImageSchema = sectionCommonSchema.extend({ type:z.literal('text_image'), layout:z.enum(['image_left','image_right']).default('image_right'), eyebrow:z.string().max(80).default(''), heading:z.string().min(1).max(140), body:z.string().max(4000).default(''), imageId:z.string().uuid().nullable().default(null), imageAlt:z.string().max(240).default(''), cta:ctaLinkSchema.optional() })
export const statisticsSchema = sectionCommonSchema.extend({ type:z.literal('statistics'), heading:z.string().max(140).default(''), items:z.array(z.object({value:z.string().min(1).max(40), label:z.string().min(1).max(100), note:z.string().max(180).default('')})).max(8) })
export const featuresGridSchema = sectionCommonSchema.extend({ type:z.literal('features_grid'), eyebrow:z.string().max(80).default(''), heading:z.string().min(1).max(140), body:z.string().max(500).default(''), items:z.array(z.object({title:z.string().min(1).max(100), body:z.string().max(400).default(''), icon:z.string().max(40).default('')})).min(1).max(12) })
export const richTextSchema = sectionCommonSchema.extend({ type:z.literal('rich_text'), heading:z.string().max(140).default(''), body:z.string().min(1).max(12000) })
export const quoteSchema = sectionCommonSchema.extend({ type:z.literal('quote'), quote:z.string().min(1).max(800), attribution:z.string().max(160).default(''), role:z.string().max(160).default('') })
export const gallerySchema = sectionCommonSchema.extend({ type:z.literal('gallery'), heading:z.string().max(140).default(''), images:z.array(z.object({mediaId:z.string().uuid(), alt:z.string().min(1).max(240), caption:z.string().max(240).default('')})).max(12) })
