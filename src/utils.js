export function buildFilterString(customFilter, selectedFacets, engine) {
  const isMeilisearch = engine === 'meilisearch'
  const isTypesense = engine === 'typesense'
  const parts = []

  if (customFilter.trim()) {
    if (isMeilisearch) {
      let converted = customFilter.trim()
        .replace(/(\w+):("?[^"'\s]+)/g, '$1 = $2')
        .replace(/(\w+):"([^"]+)"/g, '$1 = "$2"')
      parts.push(converted)
    } else if (isTypesense) {
      let converted = customFilter.trim()
        .replace(/ OR /gi, ' || ')
        .replace(/ AND /gi, ' && ')
      parts.push(converted)
    } else {
      parts.push(customFilter.trim())
    }
  }

  for (const [attr, values] of Object.entries(selectedFacets)) {
    if (values.length > 0) {
      if (isMeilisearch) {
        const facetFilter = values.map(v => `${attr} = "${v}"`).join(' OR ')
        parts.push(`(${facetFilter})`)
      } else if (isTypesense) {
        const escaped = values.map(v => `\`${v}\``)
        parts.push(`${attr}:=[${escaped.join(', ')}]`)
      } else {
        const facetFilter = values.map(v => `${attr}:"${v}"`).join(' OR ')
        parts.push(`(${facetFilter})`)
      }
    }
  }

  if (isTypesense) return parts.join(' && ')
  return parts.join(' AND ')
}