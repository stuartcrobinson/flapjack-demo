/**
 * Resolve service slots to concrete instances for a given collection + region.
 *
 * Extracted from App.jsx for testability.
 */

export function isMixedContent(instance, pageIsSecure) {
  if (!pageIsSecure) return false
  return instance.host.startsWith('http://') && !instance.host.includes('localhost') && !instance.host.includes('127.0.0.1')
}

export function resolveSlots(slots, instances, discoveredCollections, indexName, region, devMode, pageIsSecure) {
  return slots.map(slot => {
    if (slot.localOnly && !devMode) return null
    if (slot.localOnly) {
      const inst = instances.find(i => i.id === 'fj-local' && i.enabled)
      if (!inst) return { ...slot, instance: null, reason: 'local server not configured' }
      const col = discoveredCollections[indexName]
      const hasCollection = col && col.instances[inst.id]
      return { ...slot, instance: inst, reason: hasCollection ? null : 'no collection' }
    }

    const candidates = instances.filter(i => i.enabled && i.engine === slot.engine && i.region === region)
    if (candidates.length === 0) return { ...slot, instance: null, reason: `no ${slot.engine} in ${region}` }

    const col = discoveredCollections[indexName]
    if (!col) {
      return { ...slot, instance: candidates[0], reason: 'no collection' }
    }

    const withCollection = candidates.filter(c => col.instances[c.id] && col.instances[c.id].docCount > 0)
    if (withCollection.length > 0) {
      withCollection.sort((a, b) => (col.instances[b.id].docCount || 0) - (col.instances[a.id].docCount || 0))
      const best = withCollection[0]
      if (isMixedContent(best, pageIsSecure)) {
        return { ...slot, instance: best, reason: 'HTTPS page cannot reach HTTP server (SSL pending)' }
      }
      return { ...slot, instance: best, reason: null }
    }

    return { ...slot, instance: candidates[0], reason: 'no collection' }
  }).filter(Boolean)
}
