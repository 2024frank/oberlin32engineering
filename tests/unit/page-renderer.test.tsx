import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageRenderer } from '@/components/page-builder/PageRenderer'

describe('PageRenderer', () => {
  it('renders validated visible sections and skips hidden sections', () => {
    render(<PageRenderer sections={[
      { stableKey: 'hero', isVisible: true, type: 'hero', layout: 'split', headline: 'Build. Learn. Engineer Together.', body: 'A home for engineering at Oberlin.', primaryCta: { label: 'Get involved', href: '/get-involved' } },
      { stableKey: 'hidden', isVisible: false, type: 'cta', heading: 'Hidden', body: '', primaryCta: { label: 'Nope', href: '/' } },
      { stableKey: 'projects', isVisible: true, type: 'project_grid', heading: 'Projects', limit: 3, featuredOnly: true }
    ]} />)
    expect(screen.getByRole('heading', { name: 'Build. Learn. Engineer Together.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Get involved' })).toBeInTheDocument()
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
    expect(screen.getByText('Our first projects are taking shape. Check back soon.')).toBeInTheDocument()
  })
})

it('renders a selected hero image from the shared media context', () => {
  render(<PageRenderer sections={[{ stableKey:'hero-media',isVisible:true,type:'hero',layout:'image',headline:'Engineering together',body:'',imageId:'00000000-0000-4000-8000-000000000099' }]} context={{media:{'00000000-0000-4000-8000-000000000099':{url:'/hero.jpg',alt:'Students building a robot'}}}} />)
  expect(screen.getByRole('img',{name:'Students building a robot'})).toHaveAttribute('src','/hero.jpg')
})
