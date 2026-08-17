import type { ComponentType } from 'react'
import type { ZodTypeAny } from 'zod'
import { heroSchema } from './schemas/hero'
import { textImageSchema, statisticsSchema, featuresGridSchema, richTextSchema, quoteSchema, gallerySchema } from './schemas/content'
import { projectGridSchema, projectSpotlightSchema, disciplineGridSchema, projectTimelineSchema } from './schemas/engineering'
import { leadershipGridSchema, eventListSchema, opportunityListSchema, newsGridSchema, sponsorGridSchema } from './schemas/community'
import { ctaSchema } from './schemas/cta'
import { pageSectionSchema, type PageSection, type PageSectionType } from './types'
import { HeroSection } from '@/components/page-builder/sections/HeroSection'
import { TextImageSection } from '@/components/page-builder/sections/TextImageSection'
import { StatisticsSection } from '@/components/page-builder/sections/StatisticsSection'
import { FeaturesGridSection } from '@/components/page-builder/sections/FeaturesGridSection'
import { RichTextSection } from '@/components/page-builder/sections/RichTextSection'
import { QuoteSection } from '@/components/page-builder/sections/QuoteSection'
import { GallerySection } from '@/components/page-builder/sections/GallerySection'
import { ProjectGridSection } from '@/components/page-builder/sections/ProjectGridSection'
import { ProjectSpotlightSection } from '@/components/page-builder/sections/ProjectSpotlightSection'
import { DisciplineGridSection } from '@/components/page-builder/sections/DisciplineGridSection'
import { ProjectTimelineSection } from '@/components/page-builder/sections/ProjectTimelineSection'
import { LeadershipGridSection } from '@/components/page-builder/sections/LeadershipGridSection'
import { EventListSection } from '@/components/page-builder/sections/EventListSection'
import { OpportunityListSection } from '@/components/page-builder/sections/OpportunityListSection'
import { NewsGridSection } from '@/components/page-builder/sections/NewsGridSection'
import { SponsorGridSection } from '@/components/page-builder/sections/SponsorGridSection'
import { CtaSection } from '@/components/page-builder/sections/CtaSection'

export const sectionRegistry: Record<PageSectionType, { schema: ZodTypeAny; component: ComponentType<any>; label: string }> = {
  hero:{schema:heroSchema,component:HeroSection,label:'Hero'}, text_image:{schema:textImageSchema,component:TextImageSection,label:'Text + image'},
  statistics:{schema:statisticsSchema,component:StatisticsSection,label:'Statistics'}, features_grid:{schema:featuresGridSchema,component:FeaturesGridSection,label:'Features grid'},
  rich_text:{schema:richTextSchema,component:RichTextSection,label:'Rich text'}, quote:{schema:quoteSchema,component:QuoteSection,label:'Quote'}, gallery:{schema:gallerySchema,component:GallerySection,label:'Gallery'},
  project_grid:{schema:projectGridSchema,component:ProjectGridSection,label:'Project grid'}, project_spotlight:{schema:projectSpotlightSchema,component:ProjectSpotlightSection,label:'Project spotlight'},
  discipline_grid:{schema:disciplineGridSchema,component:DisciplineGridSection,label:'Discipline grid'}, project_timeline:{schema:projectTimelineSchema,component:ProjectTimelineSection,label:'Project timeline'},
  leadership_grid:{schema:leadershipGridSchema,component:LeadershipGridSection,label:'Leadership grid'}, event_list:{schema:eventListSchema,component:EventListSection,label:'Event list'},
  opportunity_list:{schema:opportunityListSchema,component:OpportunityListSection,label:'Opportunity list'}, news_grid:{schema:newsGridSchema,component:NewsGridSection,label:'News grid'},
  sponsor_grid:{schema:sponsorGridSchema,component:SponsorGridSection,label:'Sponsor grid'}, cta:{schema:ctaSchema,component:CtaSection,label:'Call to action'}
}

export function validateSection(input: unknown): PageSection { const section=pageSectionSchema.parse(input); if(section.type==='text_image'&&section.imageId&&!section.imageAlt.trim())throw new Error('IMAGE_ALT_REQUIRED'); if(section.type==='hero'&&section.imageId&&!section.imageAlt.trim())throw new Error('IMAGE_ALT_REQUIRED'); return section }
