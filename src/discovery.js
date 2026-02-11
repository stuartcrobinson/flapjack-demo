import { INSTANCES } from './config'

export async function discoverCollections() {
  const t0 = performance.now()
  const instanceCollections = {}

  const settled = await Promise.allSettled(
    INSTANCES.filter(i => i.enabled).map(async (instance) => {
      const collections = await Promise.race([
        listCollections(instance),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ])
      return { instance, collections }
    })
  )

  const collectionMap = {}

  for (const result of settled) {
    if (result.status === 'rejected') {
      console.warn('Discovery failed:', result.reason?.message)
      continue
    }
    const { instance, collections } = result.value
    instanceCollections[instance.id] = collections.map(c => c.name)

    for (const col of collections) {
      if (!collectionMap[col.name]) {
        collectionMap[col.name] = { name: col.name, instances: {} }
      }
      collectionMap[col.name].instances[instance.id] = {
        docCount: col.docCount,
        fields: col.fields,
        engine: instance.engine,
        region: instance.region,
      }
    }
  }

  const elapsed = Math.round(performance.now() - t0)
  console.log(`Discovery: ${elapsed}ms, ${Object.keys(collectionMap).length} collections from ${settled.filter(r => r.status === 'fulfilled').length}/${settled.length} instances`)
  window.__discoveryMs = elapsed
  return collectionMap
}

async function listCollections(instance) {
  const { engine, auth } = instance
  if (engine === 'flapjack') return listFlapjack(instance)
  if (engine === 'algolia') return listAlgolia(instance)
  if (engine === 'meilisearch') return listMeilisearch(instance)
  if (engine === 'typesense') return listTypesense(instance)
  return []
}

async function listFlapjack(instance) {
  const res = await fetch(`${instance.host}/1/indexes`, {
    headers: {
      'x-algolia-api-key': instance.auth.apiKey,
      'x-algolia-application-id': instance.auth.appId,
    }
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.items || []).map(idx => ({
    name: idx.name || idx.indexName,
    docCount: idx.entries || 0,
    fields: [],
  }))
}

async function listAlgolia(instance) {
  const res = await fetch(`${instance.host}/1/indexes`, {
    headers: {
      'x-algolia-api-key': instance.auth.apiKey,
      'x-algolia-application-id': instance.auth.appId,
    }
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.items || []).map(idx => ({
    name: idx.name,
    docCount: idx.entries || 0,
    fields: [],
  }))
}

async function listMeilisearch(instance) {
  const res = await fetch(`${instance.host}/indexes`, {
    headers: { 'Authorization': `Bearer ${instance.auth.apiKey}` }
  })
  if (!res.ok) return []
  const data = await res.json()
  const indexes = data.results || data || []
  const statsResults = await Promise.allSettled(
    indexes.map(idx => {
      if (idx.numberOfDocuments) return Promise.resolve(idx.numberOfDocuments)
      return fetch(`${instance.host}/indexes/${idx.uid}/stats`, {
        headers: { 'Authorization': `Bearer ${instance.auth.apiKey}` }
      }).then(r => r.ok ? r.json().then(s => s.numberOfDocuments || 0) : 0).catch(() => 0)
    })
  )
  return indexes.map((idx, i) => ({
    name: idx.uid,
    docCount: idx.numberOfDocuments || (statsResults[i].status === 'fulfilled' ? statsResults[i].value : 0),
    fields: [],
  }))
}

async function listTypesense(instance) {
  const proto = instance.host.includes('://') ? '' : 'https://'
  const res = await fetch(`${proto}${instance.host}/collections`, {
    headers: { 'X-TYPESENSE-API-KEY': instance.auth.apiKey }
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.map(col => ({
    name: col.name,
    docCount: col.num_documents || 0,
    fields: (col.fields || []).filter(f => f.type === 'string').map(f => f.name),
  }))
}

export function findInstancesForCollection(collectionName, collectionMap, region) {
  const col = collectionMap[collectionName]
  if (!col) return []

  const byEngine = {}
  for (const [instanceId, info] of Object.entries(col.instances)) {
    const instance = INSTANCES.find(i => i.id === instanceId)
    if (!instance) continue
    if (region !== 'local' && instance.region !== region && instance.region !== 'local') continue

    if (!byEngine[instance.engine] || info.docCount > byEngine[instance.engine].docCount) {
      byEngine[instance.engine] = { instance, ...info }
    }
  }

  return Object.values(byEngine)
}