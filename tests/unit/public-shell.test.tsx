import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PublicHeader } from '@/components/public/PublicHeader'

describe('public shell', () => {
  it('renders OEC branding and the required top-level navigation', () => {
    render(<PublicHeader />)
    expect(screen.getByRole('img', { name: /oberlin engineering club/i })).toBeInTheDocument()
    for (const label of ['Home', 'About', 'Projects', 'Events', 'Opportunities', 'Resources', '3-2 Pathway', 'News', 'Get Involved']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })
})
