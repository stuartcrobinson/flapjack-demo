const SKIP_FIELDS = new Set(['_highlightResult', '_snippetResult', '_rankingInfo', '_distinctSeqID', '__position', '__queryID'])

function sanitizeHighlight(str) {
  return str
    .replace(/<mark>/g, '\x00M\x00')
    .replace(/<\/mark>/g, '\x00/M\x00')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\x00M\x00/g, '<mark>')
    .replace(/\x00\/M\x00/g, '</mark>')
}

function renderFieldValue(hit, fieldName, devMode) {
  const highlightData = hit._highlightResult?.[fieldName]
  const rawValue = hit[fieldName]
  if (rawValue === null || rawValue === undefined) return null
  if (typeof rawValue === 'object' && !Array.isArray(rawValue)) return null
  const displayValue = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue)
  if (devMode) {
    const highlightValue = highlightData?.value || displayValue
    if (highlightValue.includes('<mark>')) {
      return <code style={{fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-all'}} dangerouslySetInnerHTML={{__html: sanitizeHighlight(highlightValue)}} />
    }
    return <code style={{fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{highlightValue}</code>
  }
  if (highlightData?.value) {
    return <span dangerouslySetInnerHTML={{__html: sanitizeHighlight(highlightData.value)}} />
  }
  if (displayValue.includes('<mark>')) {
    return <span dangerouslySetInnerHTML={{__html: sanitizeHighlight(displayValue)}} />
  }
  return <span>{displayValue}</span>
}

export function Hit({ hit, devMode }) {
  const titleField = hit.name ? 'name' : hit.title ? 'title' : null
  const fields = Object.keys(hit).filter(k => !SKIP_FIELDS.has(k) && k !== titleField)

  return (
    <div className="hit-item">
      {titleField && <h3>{renderFieldValue(hit, titleField, devMode)}</h3>}
      {fields.map(field => {
        const rendered = renderFieldValue(hit, field, devMode)
        if (rendered === null) return null
        return <p key={field} style={{fontSize: '12px', marginBottom: '4px'}}><strong>{field}:</strong> {rendered}</p>
      })}
    </div>
  )
}