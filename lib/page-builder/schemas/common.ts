import { z } from 'zod'

export const ctaLinkSchema = z.object({ label: z.string().min(1).max(80), href: z.string().min(1).max(500) })
export const sectionCommonSchema = z.object({ stableKey: z.string().min(1).max(120), isVisible: z.boolean().default(true) })
export const mediaRefSchema = z.object({ mediaId: z.string().uuid().nullable().default(null), alt: z.string().max(240).default('') })
