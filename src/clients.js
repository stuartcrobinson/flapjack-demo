// Lazy load SDKs to reduce initial bundle size
let algoliasearchPromise = null
let meilisearchPromise = null
let typesensePromise = null

function getAlgoliasearch() {
  if (!algoliasearchPromise) {
    algoliasearchPromise = import('algoliasearch/lite').then(m => m.liteClient)
  }
  return algoliasearchPromise
}

function getMeilisearch() {
  if (!meilisearchPromise) {
    meilisearchPromise = import('@meilisearch/instant-meilisearch').then(m => m.instantMeiliSearch)
  }
  return meilisearchPromise
}

function getTypesense() {
  if (!typesensePromise) {
    typesensePromise = import('typesense-instantsearch-adapter').then(m => m.default)
  }
  return typesensePromise
}

export async function createFlapjackClient(host, onMetrics, sortBy = null) {
  const algoliasearch = await getAlgoliasearch()
  const _fjClientId = Math.random().toString(36).slice(2, 6)
  let _fjCallCount = 0
  return algoliasearch('test-app', 'test-key', {
    requester: {
      async send(request) {
        _fjCallCount++
        const _thisCall = _fjCallCount
        const startTime = performance.now()
        const url = request.url.replace(/https:\/\/[^/]+/, host)
        let body = request.data
        if (sortBy && body) {
          try {
            const parsed = JSON.parse(body)
            if (parsed.requests) {
              parsed.requests = parsed.requests.map(r => { r.sort = [sortBy]; return r })
            } else {
              parsed.sort = [sortBy]
            }
            body = JSON.stringify(parsed)
          } catch (e) {}
        }
        const isLoopback = host.includes('localhost') || host.includes('127.0.0.1')
        const response = await fetch(url, {
          method: request.method,
          headers: {
            'content-type': 'application/json',
            'x-algolia-api-key': request.headers?.['x-algolia-api-key'] || 'test-key',
            'x-algolia-application-id': request.headers?.['x-algolia-application-id'] || 'test-app'
          },
          body: body,
          ...(isLoopback && { targetAddressSpace: 'loopback' }),
        })
        const rawLatency = performance.now() - startTime
        const latency = Math.round(rawLatency)
        const text = await response.text()
        let nbHits = 0
        try { 
          const j = JSON.parse(text)
          nbHits = j.results?.[0]?.nbHits ?? j.nbHits ?? 0
        } catch {}
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
          window.__fjLocalDebug = window.__fjLocalDebug || []
          window.__fjLocalDebug.push({ cid: _fjClientId, n: _thisCall, raw: rawLatency.toFixed(2), ms: latency, hits: nbHits })
          if (window.__fjLocalDebug.length > 20) window.__fjLocalDebug.shift()
        }
        onMetrics?.({ latency, nbHits })
        return { status: response.status, content: text, isTimedOut: false }
      }
    }
  })
}

export async function createAlgoliaClient(appId, apiKey, onMetrics) {
  const algoliasearch = await getAlgoliasearch()
  return algoliasearch(appId, apiKey, {
    requester: {
      async send(request) {
        const startTime = performance.now()
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.data
        })
        const latency = Math.round(performance.now() - startTime)
        const text = await response.text()
        let nbHits = 0
        try { 
          const j = JSON.parse(text)
          nbHits = j.results?.[0]?.nbHits ?? j.nbHits ?? 0
        } catch {}
        onMetrics?.({ latency, nbHits })
        return { status: response.status, content: text, isTimedOut: false }
      }
    }
  })
}

export async function createMeilisearchClient(host, apiKey, onMetrics) {
  const instantMeiliSearch = await getMeilisearch()
  const originalClient = instantMeiliSearch(host, apiKey, { finitePagination: true }).searchClient
  return {
    search: async (requests) => {
      const startTime = performance.now()
      const result = await originalClient.search(requests)
      const latency = Math.round(performance.now() - startTime)
      const nbHits = result.results?.[0]?.nbHits ?? 0
      onMetrics?.({ latency, nbHits })
      return result
    }
  }
}

export async function fetchTypesenseQueryFields(host, apiKey, indexName, port = 443, protocol = 'https') {
  try {
    const res = await fetch(`${protocol}://${host}:${port}/collections/${indexName}`, {
      headers: { 'X-TYPESENSE-API-KEY': apiKey }
    })
    if (!res.ok) return null
    const schema = await res.json()
    const stringFields = schema.fields
      .filter(f => (f.type === 'string' || f.type === 'string[]') && f.name !== 'objectID')
      .map(f => f.name)
    return stringFields.length > 0 ? stringFields.join(',') : null
  } catch {
    return null
  }
}

export async function createTypesenseClient(host, apiKey, indexName, sortBy, perPage, queryByFields, onMetrics, port = 443, protocol = 'https') {
  if (!queryByFields) return null
  const TypesenseInstantSearchAdapter = await getTypesense()
  const adapter = new TypesenseInstantSearchAdapter({
    server: {
      apiKey,
      nodes: [{ host, port, protocol }]
    },
    additionalSearchParameters: { 
      query_by: queryByFields,
      ...(sortBy ? { sort_by: sortBy } : {}),
      ...(perPage ? { per_page: perPage } : {})
    }
  })
  return {
    search: async (requests) => {
      const startTime = performance.now()
      const result = await adapter.searchClient.search(requests)
      const latency = Math.round(performance.now() - startTime)
      const nbHits = result.results?.[0]?.nbHits ?? 0
      onMetrics?.({ latency, nbHits })
      return result
    }
  }
}