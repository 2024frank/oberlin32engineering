import type { ReactElement } from 'react'

// Hand-drawn icon set in the site's drafting language: 32px grid, 1.6px
// cardinal linework, one gold accent per mark (class="ti-accent"). Drawn for
// this site — not a stock icon library.
const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Svg({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 32 32" aria-hidden="true" {...STROKE}>{children}</svg>
}

/* Mechanical: a machined gear — eight cut teeth, center bore, gold datum dot. */
function GearIcon() {
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2
    const x1 = 16 + Math.cos(a) * 9.5, y1 = 16 + Math.sin(a) * 9.5
    const x2 = 16 + Math.cos(a) * 13, y2 = 16 + Math.sin(a) * 13
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
  })
  return <Svg><circle cx="16" cy="16" r="9.5" />{teeth}<circle cx="16" cy="16" r="4" /><circle className="ti-accent" cx="16" cy="16" r="1.2" /></Svg>
}

/* Electrical: a trace with a resistor and soldered nodes. */
function CircuitIcon() {
  return <Svg>
    <path d="M3 16h5l2-4 3 8 3-8 3 8 2-4h8" />
    <circle cx="5" cy="16" r="1.5" fill="currentColor" stroke="none" />
    <circle className="ti-accent" cx="27" cy="16" r="1.8" fill="var(--oec-gold)" stroke="none" />
    <path d="M8 8v3M24 21v3" />
  </Svg>
}

/* Computing & AI: a die in its package, pins out, gold core. */
function ChipIcon() {
  return <Svg>
    <rect x="9" y="9" width="14" height="14" rx="1.5" />
    <rect className="ti-accent" x="13.5" y="13.5" width="5" height="5" />
    <path d="M13 9V5M19 9V5M13 23v4M19 23v4M9 13H5M9 19H5M23 13h4M23 19h4" />
  </Svg>
}

/* Chemical & Materials: conical flask with a hex lattice cell inside. */
function FlaskIcon() {
  return <Svg>
    <path d="M13 5h6M14 5v6L8.9 22.8a1.7 1.7 0 0 0 1.6 2.2h11a1.7 1.7 0 0 0 1.6-2.2L18 11V5" />
    <path d="M11.6 18.5h8.8" />
    <path className="ti-accent" d="M16 19l2 1.2v2.3L16 23.7l-2-1.2v-2.3z" />
  </Svg>
}

/* Robotics: an articulated arm on its base, gold wrist joint. */
function ArmIcon() {
  return <Svg>
    <path d="M6 27h12M9 27v-3h6v3" />
    <path d="M12 24V14l8-6" />
    <circle cx="12" cy="14" r="1.6" />
    <circle className="ti-accent" cx="20" cy="8" r="1.8" />
    <path d="M21.5 6.5l4-1.5M21.8 9.4l4 1.5" />
  </Svg>
}

/* Civil & Environmental: a truss span on two piers. */
function TrussIcon() {
  return <Svg>
    <path d="M3 20h26M5 14h22" />
    <path d="M5 20l5-6 5 6 6-6 6 6" />
    <path d="M8 20v5M24 20v5" />
    <path className="ti-accent" d="M13 26.5c1.4-1 2.8-1 4.2 0 1.4 1 2.8 1 4.2 0" />
  </Svg>
}

/* Fallback: a vernier caliper — the instrument of measuring twice. */
function CaliperIcon() {
  return <Svg>
    <path d="M4 10h24v5H4z" />
    <path d="M8 15v9l3-3v-6M20 15v12l3-3v-9" />
    <path className="ti-accent" d="M11 12.5h2M15 12.5h2M19 12.5h2M23 12.5h2" />
  </Svg>
}

/* Drafting compass: for planning and coordination. */
function CompassIcon() {
  return <Svg>
    <circle cx="16" cy="6.5" r="2" />
    <path d="M14.8 8.2L9 24M17.2 8.2L23 24" />
    <path className="ti-accent" d="M9.5 22c4.2 2.6 8.8 2.6 13 0" />
    <path d="M9 24l-.6 2.8M23 24l.6 2.8" />
  </Svg>
}

/* Field flag: events on the ground. */
function FlagIcon() {
  return <Svg>
    <path d="M9 27V5" />
    <path d="M9 6h13l-3.5 4.5L22 15H9" />
    <circle className="ti-accent" cx="9" cy="27" r="1.6" />
  </Svg>
}

/* Log book: records and minutes. */
function LogbookIcon() {
  return <Svg>
    <rect x="8" y="5" width="17" height="22" rx="1.5" />
    <path d="M12 5v22" />
    <path d="M15.5 11h6M15.5 15h6M15.5 19h4" />
    <path className="ti-accent" d="M21 5v5l1.8-1.4L24.6 10V5" />
  </Svg>
}

/* Network nodes: liaison between groups. */
function NodesIcon() {
  return <Svg>
    <circle cx="8" cy="10" r="3" />
    <circle cx="24" cy="8" r="3" />
    <circle cx="16" cy="24" r="3" />
    <path d="M10.8 11.4l10.4-2.8M9.2 12.8l5.4 8.4M22.6 10.6l-5.2 10.8" />
    <circle className="ti-accent" cx="16" cy="15" r="1.4" fill="var(--oec-gold)" stroke="none" />
  </Svg>
}

const DISCIPLINE_ICONS: Array<[RegExp, () => ReactElement]> = [
  [/mechanical/, GearIcon],
  [/electric/, CircuitIcon],
  [/comput|software|ai/, ChipIcon],
  [/chemi|material/, FlaskIcon],
  [/robot/, ArmIcon],
  [/civil|environment/, TrussIcon],
  [/coordinat|project|plan/, CompassIcon],
  [/event|support/, FlagIcon],
  [/secretar|record|note/, LogbookIcon],
  [/liaison|partner|outreach/, NodesIcon],
]

export function TechnicalIcon({ name }: { name: string }) {
  const key = name.trim().toLowerCase()
  const match = DISCIPLINE_ICONS.find(([pattern]) => pattern.test(key))
  const Icon = match ? match[1] : CaliperIcon
  return <span className="icon-plate"><Icon /></span>
}
