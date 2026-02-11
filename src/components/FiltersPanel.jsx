import { useState, useEffect } from 'react'

export function FiltersPanel({ 
  customFilter, setCustomFilter, sortBy, setSortBy, 
  selectedFacets, setSelectedFacets, facetValues 
}) {
  const [filterInput, setFilterInput] = useState(customFilter)
  
  useEffect(() => {
    setFilterInput(customFilter)
  }, [customFilter])
  
  const applyFilter = () => {
    setCustomFilter(filterInput)
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      applyFilter()
    }
  }
  
  const clearAll = () => {
    setCustomFilter('')
    setFilterInput('')
    setSelectedFacets({})
  }
  
  const hasActiveFilters = customFilter || Object.values(selectedFacets).some(v => v.length > 0)
  const filterPending = filterInput !== customFilter
  
  return (
    <div className="filters-panel">
      <div className="filter-input-group">
        <label>Filter:</label>
        <input 
          type="text"
          className={`filter-input ${filterPending ? 'filter-pending' : ''}`}
          placeholder="e.g. brand:Samsung OR price < 100"
          value={filterInput}
          onChange={(e) => setFilterInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button 
          className={`apply-filter-btn ${filterPending ? 'apply-pending' : ''}`} 
          onClick={applyFilter}
          disabled={!filterPending}
        >
          Apply Filter
        </button>
        <select 
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="">Sort: Relevance</option>
          <option value="price:asc">Price ↑</option>
          <option value="price:desc">Price ↓</option>
          <option value="popularity:desc">Popularity ↓</option>
        </select>
        {hasActiveFilters && (
          <button className="clear-filters-btn" onClick={clearAll}>Clear</button>
        )}
      </div>
      
      <div className="facets-container">
        {Object.entries(facetValues).filter(([, values]) => Object.keys(values).length > 0).sort(([a], [b]) => a.localeCompare(b)).map(([attr, values]) => (
            <div key={attr} className="facet-group">
              <div className="facet-group-title">{attr}</div>
              <div className="facet-values">
                {Object.entries(values).slice(0, 8).map(([value, count]) => (
                  <label key={value} className="facet-checkbox">
                    <input 
                      type="checkbox"
                      checked={(selectedFacets[attr] || []).includes(value)}
                      onChange={(e) => {
                        setSelectedFacets(prev => {
                          const current = prev[attr] || []
                          if (e.target.checked) {
                            return { ...prev, [attr]: [...current, value] }
                          } else {
                            return { ...prev, [attr]: current.filter(v => v !== value) }
                          }
                        })
                      }}
                    />
                    <span className="facet-value-name">{value}</span>
                    <span className="facet-value-count">({count})</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}