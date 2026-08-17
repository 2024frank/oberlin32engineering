export type MediaBearingContentType = 'projects' | 'project_updates' | 'events' | 'opportunities' | 'resources' | 'news_posts' | 'leaders' | 'sponsors' | 'documents' | 'partner_schools'

type LooseRecord = Record<string, unknown>

function stringId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function unique(ids: Array<string | null>): string[] {
  return [...new Set(ids.filter((value): value is string => Boolean(value)))]
}

export function collectPageMediaIds(snapshot: { ogMediaId?: unknown; sections?: unknown }): string[] {
  const ids: Array<string | null> = [stringId(snapshot.ogMediaId)]
  const sections = Array.isArray(snapshot.sections) ? snapshot.sections : []
  for (const raw of sections) {
    if (!raw || typeof raw !== 'object') continue
    const section = raw as LooseRecord
    if (section.type === 'hero' || section.type === 'text_image') ids.push(stringId(section.imageId))
    if (section.type === 'gallery' && Array.isArray(section.images)) {
      for (const rawImage of section.images) {
        if (!rawImage || typeof rawImage !== 'object') continue
        ids.push(stringId((rawImage as LooseRecord).mediaId))
      }
    }
  }
  return unique(ids)
}

const fieldByType: Partial<Record<MediaBearingContentType, string>> = {
  projects: 'coverMediaId',
  project_updates: 'mediaId',
  events: 'coverMediaId',
  news_posts: 'coverMediaId',
  leaders: 'photoMediaId',
  sponsors: 'logoMediaId'
}

export function collectContentMediaIds(entityType: MediaBearingContentType, payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return []
  const field = fieldByType[entityType]
  if (!field) return []
  return unique([stringId((payload as LooseRecord)[field])])
}
