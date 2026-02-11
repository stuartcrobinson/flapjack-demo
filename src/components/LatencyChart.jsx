import { ENGINE_COLORS } from '../config'

import { memo } from 'react'

export const LatencyChart = memo(function LatencyChart({
  chartData, maxLatency, query, indexName,
  customFilter, selectedFacets, onCopyChart, onCopyAll, sortBy
}) {
  const facetLines = Object.entries(selectedFacets || {})
    .filter(([, v]) => v && v.length > 0)
    .map(([attr, vals]) => `${attr}: ${vals.join(', ')}`)

  // Calculate max latency from active instances for proper bar normalization
  const activeLatencies = chartData
    .filter(s => s.active && typeof s.latency === 'number')
    .map(s => s.latency)
  const chartMaxLatency = activeLatencies.length > 0 ? Math.max(...activeLatencies) : 1

  return (
    <div className="latency-chart">
      <div className="chart-header">
        <div className="chart-title">
          <div>Query: "{query || '(empty)'}" · Collection: {indexName}</div>
          {sortBy && <div className="chart-subtitle">Sort: {sortBy}</div>}
          {customFilter && <div className="chart-subtitle">Filter: {customFilter}</div>}
          {facetLines.length > 0 && <div className="chart-subtitle">Facets: {facetLines.join(' | ')}</div>}
        </div>
        <div className="chart-buttons">
          <button className="chart-copy-btn" onClick={onCopyChart}>📋 Copy Chart</button>
          <button className="chart-copy-btn" onClick={onCopyAll}>📋 Copy All</button>
        </div>
      </div>
      {chartData.map(s => (
        <div key={s.slotId} className={`chart-row ${!s.active ? 'chart-row-disabled' : ''}`}>
          <div className="chart-value">
            {s.active ? (
              <span className="chart-value-text">{s.latency} ms</span>
            ) : (
              <span className="chart-value-na">—</span>
            )}
          </div>
          <div className="chart-label">{s.name}</div>
          <div className="chart-region">
            {s.active ? `${s.region} · ${s.ip}` : (s.reason || 'N/A')}
            {s.active && s.note ? ` · ${s.note}` : ''}
          </div>
          <div className="chart-bar-container">
            {s.active && (
              <div
                className="chart-bar"
                style={{
                  width: `${(typeof s.latency === 'number' ? s.latency : 0) / chartMaxLatency * 100}%`,
                  background: ENGINE_COLORS[s.engine] || '#999'
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
})