import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { FiltersPanel } from './FiltersPanel'

afterEach(cleanup)

describe('FiltersPanel', () => {
  const defaultProps = {
    customFilter: '',
    setCustomFilter: vi.fn(),
    sortBy: '',
    setSortBy: vi.fn(),
    selectedFacets: {},
    setSelectedFacets: vi.fn(),
  }

  it('renders facet groups with values', () => {
    const facetValues = {
      brand: { Samsung: 100, Apple: 80, Sony: 50 },
      category: { TV: 200, Phone: 150 },
    }
    const { container } = render(<FiltersPanel {...defaultProps} facetValues={facetValues} />)
    const groups = container.querySelectorAll('.facet-group')
    expect(groups.length).toBe(2)
    const titles = [...groups].map(g => g.querySelector('.facet-group-title').textContent)
    expect(titles).toContain('brand')
    expect(titles).toContain('category')
  })

  it('hides facet groups with empty values', () => {
    const facetValues = {
      brand: { Samsung: 100, Apple: 80 },
      category: {},  // empty — should be hidden
    }
    const { container } = render(<FiltersPanel {...defaultProps} facetValues={facetValues} />)
    const groups = container.querySelectorAll('.facet-group')
    expect(groups.length).toBe(1)
    expect(groups[0].querySelector('.facet-group-title').textContent).toBe('brand')
  })

  it('renders nothing when all facet groups are empty', () => {
    const facetValues = {
      brand: {},
      category: {},
    }
    const { container } = render(<FiltersPanel {...defaultProps} facetValues={facetValues} />)
    expect(container.querySelectorAll('.facet-group').length).toBe(0)
  })

  it('renders nothing when facetValues is empty object', () => {
    const { container } = render(<FiltersPanel {...defaultProps} facetValues={{}} />)
    expect(container.querySelectorAll('.facet-group').length).toBe(0)
  })

  it('limits to 8 facet values per group', () => {
    const facetValues = {
      brand: Object.fromEntries(
        Array.from({ length: 15 }, (_, i) => [`Brand${i}`, 100 - i])
      ),
    }
    const { container } = render(<FiltersPanel {...defaultProps} facetValues={facetValues} />)
    expect(container.querySelectorAll('.facet-checkbox').length).toBe(8)
  })
})
