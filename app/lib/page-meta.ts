export const pageIds = [
  'index', 'about', 'pathway', 'projects', 'competition', 'leadership', 'events',
  'opportunities', 'resources', 'impact', 'join', 'contact', 'media', '404',
] as const;

export type PageId = (typeof pageIds)[number];

export interface PageMeta {
  title: string;
  description: string;
  robots?: string;
}

export const pageMeta: Record<PageId, PageMeta> = {
  index: {
    title: 'Oberlin 3-2 Engineering Society',
    description: "A student group forming around engineering projects and Oberlin's 3-2 engineering pathway.",
  },
  about: {
    title: 'About the Oberlin 3-2 Engineering Society',
    description: 'Why the Oberlin 3-2 Engineering Society is being formed, what it will focus on, and who it is for.',
  },
  pathway: {
    title: 'Oberlin 3-2 Engineering Pathway: A Student Planning Guide',
    description: "A student planning guide to Oberlin's 3-2 engineering pathway, partner-school requirements, course sequencing, cost, financial aid, and degree timelines.",
  },
  projects: {
    title: 'Engineering Projects · Oberlin 3-2 Engineering Society',
    description: 'Review project selection criteria, technical areas, selected project briefs, and the project idea form.',
  },
  competition: {
    title: 'Competition Status · Oberlin 3-2 Engineering Society',
    description: 'No engineering competition or showcase is scheduled. The society is focusing first on student projects.',
  },
  leadership: {
    title: 'Leadership and Open Roles · Oberlin 3-2 Engineering Society',
    description: 'The students organizing the society, open officer roles, and what each role involves.',
  },
  events: {
    title: 'Events · Oberlin 3-2 Engineering Society | Oberlin College',
    description: 'View confirmed event details, published updates, and the event-interest form.',
  },
  opportunities: {
    title: 'Opportunities · Oberlin 3-2 Engineering Society',
    description: 'Unpaid society roles plus source pages for internships and undergraduate research.',
  },
  resources: {
    title: '3-2 Engineering Resources for Oberlin Students',
    description: 'Checked links for Oberlin 3-2 planning, partner schools, financial aid, internships, research, and technical learning.',
  },
  impact: {
    title: 'First-Year Roadmap · Oberlin 3-2 Engineering Society',
    description: "The society's 2026–27 milestones, including membership recruitment, project selection, and the first event.",
  },
  join: {
    title: 'Join the Oberlin 3-2 Engineering Society',
    description: 'Submit membership interest and choose the meetings, projects, or open roles you want to hear about.',
  },
  contact: {
    title: 'Contact · Oberlin 3-2 Engineering Society',
    description: 'Contact the student organizing team with questions, project ideas, event proposals, or practical offers of help.',
  },
  media: {
    title: 'Media Information · Oberlin 3-2 Engineering Society',
    description: 'Society description, logo files, brand colors, image policy, and media contact instructions.',
  },
  '404': {
    title: 'Page Not Found · Oberlin 3-2 Engineering Society',
    description: 'The requested page could not be found.',
    robots: 'noindex, follow',
  },
};

export function pageUrl(pageId: PageId): string {
  return pageId === 'index' ? '/' : `/${pageId}`;
}
