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
    description: "The student society for Oberlin College's 3-2 engineering program, engineering projects, technical events, and peer planning.",
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
    description: 'Learn how the society will choose and run student projects after the founding membership forms.',
  },
  competition: {
    title: 'Future Engineering Showcase Idea · Oberlin 3-2 Engineering Society',
    description: 'A possible future Oberlin engineering showcase and the team, venue, safety, funding, and access requirements it would need.',
  },
  leadership: {
    title: 'Leadership and Open Roles · Oberlin 3-2 Engineering Society',
    description: 'The students organizing the society, open officer roles, and what each role involves.',
  },
  events: {
    title: 'Events · Oberlin 3-2 Engineering Society | Oberlin College',
    description: 'Planned society meetups, project sessions, 3-2 conversations, and confirmed event details when available.',
  },
  opportunities: {
    title: 'Opportunities · Oberlin 3-2 Engineering Society',
    description: 'Current society roles, project openings, and trusted external starting points for engineering opportunities.',
  },
  resources: {
    title: '3-2 Engineering Resources for Oberlin Students',
    description: 'Checked links for Oberlin 3-2 planning, partner schools, financial aid, internships, research, and technical learning.',
  },
  impact: {
    title: 'Founding Roadmap · Oberlin 3-2 Engineering Society',
    description: "A public roadmap of the society's concrete founding commitments, current status, and future reports.",
  },
  join: {
    title: 'Join the Oberlin 3-2 Engineering Society',
    description: 'Join the engineering community at Oberlin as a member, project contributor, event volunteer, or officer.',
  },
  contact: {
    title: 'Contact · Oberlin 3-2 Engineering Society',
    description: 'Contact the student organizing team with questions, project ideas, event proposals, or practical offers of help.',
  },
  media: {
    title: 'Media Information · Oberlin 3-2 Engineering Society',
    description: 'Accurate boilerplate, logo files, photo guidance, and contact information for the founding society.',
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
