import 'server-only'

// JSON-LD so search engines can identify the club as an entity rather than inferring it
// from page text: name, canonical URL, logo, contact address and linked social profiles.
export function OrganizationSchema({ siteUrl, contactEmail, socialLinks }: { siteUrl: string; contactEmail: string; socialLinks: Record<string, string> }) {
  const base = siteUrl.replace(/\/$/, '')
  const sameAs = Object.values(socialLinks).filter(Boolean)

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: 'Oberlin Engineering Club',
        alternateName: 'OEC',
        url: base,
        email: contactEmail,
        logo: { '@type': 'ImageObject', url: `${base}/brand/oec-badge-circle.png` },
        description: 'A student group at Oberlin College for students who build things, and for anyone considering the 3-2 engineering pathway.',
        ...(sameAs.length ? { sameAs } : {}),
        memberOf: { '@type': 'CollegeOrUniversity', name: 'Oberlin College', url: 'https://www.oberlin.edu' }
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: 'Oberlin Engineering Club',
        publisher: { '@id': `${base}/#organization` },
        inLanguage: 'en-US'
      }
    ]
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}
