import { z } from 'zod'
import { sectionCommonSchema } from './common'

const listingBase = { eyebrow:z.string().max(80).default(''), heading:z.string().min(1).max(140), limit:z.number().int().min(1).max(12).default(4) }
export const leadershipGridSchema = sectionCommonSchema.extend({ type:z.literal('leadership_grid'), ...listingBase, currentOnly:z.boolean().default(true) })
export const eventListSchema = sectionCommonSchema.extend({ type:z.literal('event_list'), ...listingBase, upcomingOnly:z.boolean().default(true) })
export const opportunityListSchema = sectionCommonSchema.extend({ type:z.literal('opportunity_list'), ...listingBase, featuredOnly:z.boolean().default(false) })
export const newsGridSchema = sectionCommonSchema.extend({ type:z.literal('news_grid'), ...listingBase, featuredOnly:z.boolean().default(false) })
export const sponsorGridSchema = sectionCommonSchema.extend({ type:z.literal('sponsor_grid'), ...listingBase })
