import Image from 'next/image'
import clsx from 'clsx'

export function BrandLogo({ variant = 'horizontal', className, src }: { variant?: 'horizontal' | 'badge'; className?: string; src?: string | null }) {
  const badge = variant === 'badge'
  // Circle-masked badge: the original oec-badge.png has opaque cream corners, so it
  // rendered as a square tile anywhere a border-radius was not already applied.
  const fallback=badge?'/brand/oec-badge-circle.png':'/brand/oec-horizontal.png'
  const width=badge?96:360
  const height=badge?96:153
  if(src)return <img className={clsx('brand-logo',className)} src={src} alt="Oberlin Engineering Club" width={width} height={height}/>
  return <Image className={clsx('brand-logo', className)} src={fallback} alt="Oberlin Engineering Club" width={width} height={height} priority />
}
