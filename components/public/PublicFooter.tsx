import Link from 'next/link'
import { BrandLogo } from '@/components/brand/BrandLogo'

// The footer is set like the title block of an engineering drawing: a ruled
// grid of labelled fields. Each cell carries one real fact about the club.
export function PublicFooter({ contactEmail = 'oberlinengineeringclub@oberlin.edu', footerText = 'Build things. Learn together.', socialLinks = {}, badgeSrc }: { contactEmail?: string; footerText?: string; socialLinks?: Record<string, string>; badgeSrc?: string | null }) {
  const social = Object.entries(socialLinks).filter(([, href]) => href)
  return (
    <footer className="public-footer">
      <div className="shell">
        <div className="titleblock">
          <div className="titleblock__ident">
            <BrandLogo variant="badge" src={badgeSrc} />
            <p className="titleblock__motto">{footerText}</p>
          </div>
          <div className="titleblock__fields">
            <div>
              <span>Organization</span>
              <p>Oberlin Engineering Club</p>
            </div>
            <div>
              <span>Location</span>
              <p>Oberlin College · Oberlin, OH</p>
            </div>
            <div>
              <span>Contact</span>
              <p><a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>
            </div>
            <div>
              <span>Membership</span>
              <p><Link href="/get-involved">Open to all students →</Link></p>
            </div>
            {social.length > 0 && (
              <div className="titleblock__social">
                <span>Elsewhere</span>
                <p>{social.map(([label, href], index) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer">
                    {index > 0 && ' / '}{label[0].toUpperCase() + label.slice(1)}
                  </a>
                ))}</p>
              </div>
            )}
            <div>
              <span>Pathway</span>
              <p><Link href="/pathway">3-2 Engineering →</Link></p>
            </div>
          </div>
        </div>
        <p className="titleblock__baseline">Oberlin Engineering Club · a student organization at Oberlin College</p>
      </div>
    </footer>
  )
}
