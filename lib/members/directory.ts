export type DirectorySourceMember = {
  userId: string
  displayName: string
  oberlinEmail: string
  classYear?: number | null
  major?: string | null
  disciplines?: string[] | null
  skills?: string[] | null
  projectInterests?: string[] | null
  availability?: string | null
  portfolioUrl?: string | null
  githubUrl?: string | null
  linkedinUrl?: string | null
}

export type DirectoryPrivacy = {
  directoryVisible: boolean
  visibleFields: string[]
  shareContact: boolean
}

export type DirectoryMember = {
  userId: string
  displayName?: string
  classYear?: number
  major?: string
  disciplines?: string[]
  skills?: string[]
  projectInterests?: string[]
  availability?: string
  portfolioUrl?: string
  githubUrl?: string
  linkedinUrl?: string
  contactEmail?: string
}

const fieldMap = {
  display_name: 'displayName',
  class_year: 'classYear',
  major: 'major',
  disciplines: 'disciplines',
  skills: 'skills',
  project_interests: 'projectInterests',
  availability: 'availability',
  portfolio_url: 'portfolioUrl',
  github_url: 'githubUrl',
  linkedin_url: 'linkedinUrl',
} as const

export const directoryVisibleFields = Object.keys(fieldMap)

export function sanitizeDirectoryMember(profile: DirectorySourceMember, privacy: DirectoryPrivacy): DirectoryMember | null {
  if (!privacy.directoryVisible) return null
  const result: DirectoryMember = { userId: profile.userId }
  const visible = new Set(privacy.visibleFields)
  for (const [privacyKey, resultKey] of Object.entries(fieldMap)) {
    if (!visible.has(privacyKey)) continue
    const value = profile[resultKey as keyof DirectorySourceMember]
    if (value === null || value === undefined || value === '') continue
    ;(result as Record<string, unknown>)[resultKey] = Array.isArray(value) ? [...value] : value
  }
  if (privacy.shareContact) result.contactEmail = profile.oberlinEmail
  return result
}

function mapDirectoryRow(row: Record<string, unknown>): DirectoryMember {
  const member: DirectoryMember = { userId: String(row.user_id) }
  const copy = <K extends keyof DirectoryMember>(key: K, value: unknown) => {
    if (value !== null && value !== undefined && value !== '') (member as Record<string, unknown>)[key] = value
  }
  copy('displayName', row.display_name)
  copy('classYear', row.class_year)
  copy('major', row.major)
  copy('disciplines', row.disciplines)
  copy('skills', row.skills)
  copy('projectInterests', row.project_interests)
  copy('availability', row.availability)
  copy('portfolioUrl', row.portfolio_url)
  copy('githubUrl', row.github_url)
  copy('linkedinUrl', row.linkedin_url)
  copy('contactEmail', row.contact_email)
  return member
}

export async function searchMemberDirectory(query = ''): Promise<DirectoryMember[]> {
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('search_member_directory', { p_query: query.trim() || null, p_limit: 100 })
  if (error) throw new Error(`MEMBER_DIRECTORY_FAILED:${error.message}`)
  return (data ?? []).map((row: Record<string, unknown>) => mapDirectoryRow(row))
}

export function filterDirectoryMembers(
  members: DirectoryMember[],
  filters: { discipline?: string; skill?: string; major?: string; classYear?: string; interest?: string; availability?: string },
) {
  const normalize = (value: string | undefined) => value?.trim().toLowerCase() ?? ''
  const has = (values: string[] | undefined, target: string) => !target || Boolean(values?.some((value) => value.toLowerCase() === target))
  return members.filter((member) => {
    if (normalize(filters.discipline) && !has(member.disciplines, normalize(filters.discipline))) return false
    if (normalize(filters.skill) && !has(member.skills, normalize(filters.skill))) return false
    if (normalize(filters.interest) && !has(member.projectInterests, normalize(filters.interest))) return false
    if (normalize(filters.major) && normalize(member.major) !== normalize(filters.major)) return false
    if (filters.classYear && String(member.classYear ?? '') !== filters.classYear) return false
    if (normalize(filters.availability) && !normalize(member.availability).includes(normalize(filters.availability))) return false
    return true
  })
}
