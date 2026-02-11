import { INSTANCES } from './config'

/**
 * Pre-warm TLS connections to all remote services.
 *
 * The first fetch() to a remote host pays TCP + TLS handshake cost (~40-80ms).
 * By hitting /health (or equivalent) on page load we move that cost out of the
 * first real search, eliminating the "first keystroke spike" we saw in
 * benchmarks (fj-usw1: 168ms first query vs 88ms steady-state).
 *
 * Call this early — ideally right after discovery completes.
 */
export async function warmupAllServices() {
  const pageIsSecure = window.location.protocol === 'https:'
  const enabled = INSTANCES.filter(i => {
    if (!i.enabled || i.region === 'local') return false
    // Skip HTTP instances when page is served over HTTPS (mixed content would block)
    if (pageIsSecure && i.host.startsWith('http://')) return false
    return true
  })

  const results = await Promise.allSettled(
    enabled.map(async (instance) => {
      const t0 = performance.now()
      try {
        const url = warmupUrl(instance)
        await fetch(url, {
          method: 'GET',
          // We only care about establishing the connection; don't wait for body
          signal: AbortSignal.timeout(4000),
        })
        const ms = Math.round(performance.now() - t0)
        console.log(`[warmup] ${instance.id}: ${ms}ms`)
        return { id: instance.id, ms }
      } catch (e) {
        const ms = Math.round(performance.now() - t0)
        console.warn(`[warmup] ${instance.id}: failed (${ms}ms)`, e.message)
        return { id: instance.id, ms, error: e.message }
      }
    })
  )

  const summary = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
  console.log('[warmup] done:', summary)
  return summary
}

function warmupUrl(instance) {
  if (instance.engine === 'flapjack') {
    return `${instance.host}/health`
  }
  if (instance.engine === 'typesense') {
    const proto = instance.host.includes('://') ? '' : 'https://'
    return `${proto}${instance.host}/health`
  }
  if (instance.engine === 'meilisearch') {
    return `${instance.host}/health`
  }
  if (instance.engine === 'algolia') {
    // Algolia DSN doesn't have /health; do a lightweight indices list
    return `${instance.host}/1/indexes?page=0&hitsPerPage=0`
  }
  return `${instance.host}/health`
}
