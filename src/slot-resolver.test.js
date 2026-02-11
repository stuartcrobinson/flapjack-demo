import { describe, it, expect } from 'vitest'
import { isMixedContent, resolveSlots } from './slot-resolver'

// ── isMixedContent ──────────────────────────────────────────────────────────

describe('isMixedContent', () => {
  it('returns false when page is not secure', () => {
    expect(isMixedContent({ host: 'http://54.151.72.213:7700' }, false)).toBe(false)
  })

  it('returns true for HTTP host on HTTPS page', () => {
    expect(isMixedContent({ host: 'http://54.151.72.213:7700' }, true)).toBe(true)
  })

  it('returns false for HTTPS host on HTTPS page', () => {
    expect(isMixedContent({ host: 'https://fj-us-west-1.flapjack.foo' }, true)).toBe(false)
  })

  it('returns false for localhost HTTP on HTTPS page (local dev)', () => {
    expect(isMixedContent({ host: 'http://localhost:7700' }, true)).toBe(false)
  })

  it('returns false for 127.0.0.1 HTTP on HTTPS page (local dev)', () => {
    expect(isMixedContent({ host: 'http://127.0.0.1:7700' }, true)).toBe(false)
  })
})

// ── resolveSlots ────────────────────────────────────────────────────────────

const MOCK_INSTANCES = [
  { id: 'fj-local', engine: 'flapjack', region: 'local', host: 'http://localhost:7700', enabled: true, auth: {} },
  { id: 'fj-usw1', engine: 'flapjack', region: 'us-west-1', host: 'https://fj.example.com', enabled: true, auth: {} },
  { id: 'fj-http', engine: 'flapjack', region: 'us-west-1', host: 'http://1.2.3.4:7700', enabled: true, auth: {} },
  { id: 'ts-usw1', engine: 'typesense', region: 'us-west-1', host: 'ts.example.com', enabled: true, auth: {} },
  { id: 'ms-usw1', engine: 'meilisearch', region: 'us-west-1', host: 'https://ms.example.com', enabled: true, auth: {} },
  { id: 'alg-usw1', engine: 'algolia', region: 'us-west-1', host: 'https://alg.example.com', enabled: true, auth: {} },
]

const MOCK_SLOTS = [
  { slotId: 'fj-local', engine: 'flapjack', label: 'FJ Local', localOnly: true },
  { slotId: 'flapjack', engine: 'flapjack', label: 'FJ' },
  { slotId: 'typesense', engine: 'typesense', label: 'TS' },
  { slotId: 'meilisearch', engine: 'meilisearch', label: 'MS' },
  { slotId: 'algolia', engine: 'algolia', label: 'ALG' },
]

const MOCK_COLLECTIONS = {
  bestbuy: {
    name: 'bestbuy',
    instances: {
      'fj-local': { docCount: 21469, engine: 'flapjack' },
      'fj-usw1': { docCount: 21469, engine: 'flapjack' },
      'ts-usw1': { docCount: 21469, engine: 'typesense' },
      'ms-usw1': { docCount: 21469, engine: 'meilisearch' },
      'alg-usw1': { docCount: 21469, engine: 'algolia' },
    }
  },
  namesMaxFj: {
    name: 'namesMaxFj',
    instances: {
      'fj-http': { docCount: 11240000, engine: 'flapjack' },
    }
  },
}

describe('resolveSlots', () => {
  it('filters out localOnly slots when devMode is off', () => {
    const result = resolveSlots(MOCK_SLOTS, MOCK_INSTANCES, MOCK_COLLECTIONS, 'bestbuy', 'us-west-1', false, false)
    expect(result.find(s => s.slotId === 'fj-local')).toBeUndefined()
  })

  it('includes localOnly slots when devMode is on', () => {
    const result = resolveSlots(MOCK_SLOTS, MOCK_INSTANCES, MOCK_COLLECTIONS, 'bestbuy', 'us-west-1', true, false)
    const local = result.find(s => s.slotId === 'fj-local')
    expect(local).toBeDefined()
    expect(local.instance.id).toBe('fj-local')
    expect(local.reason).toBeNull()
  })

  it('resolves bestbuy collection to all engines', () => {
    const result = resolveSlots(MOCK_SLOTS, MOCK_INSTANCES, MOCK_COLLECTIONS, 'bestbuy', 'us-west-1', false, false)
    const fj = result.find(s => s.slotId === 'flapjack')
    const ts = result.find(s => s.slotId === 'typesense')
    const ms = result.find(s => s.slotId === 'meilisearch')
    const alg = result.find(s => s.slotId === 'algolia')

    expect(fj.instance.id).toBe('fj-usw1')
    expect(fj.reason).toBeNull()
    expect(ts.instance.id).toBe('ts-usw1')
    expect(ts.reason).toBeNull()
    expect(ms.instance.id).toBe('ms-usw1')
    expect(ms.reason).toBeNull()
    expect(alg.instance.id).toBe('alg-usw1')
    expect(alg.reason).toBeNull()
  })

  it('marks non-flapjack engines as no collection for namesMaxFj', () => {
    const result = resolveSlots(MOCK_SLOTS, MOCK_INSTANCES, MOCK_COLLECTIONS, 'namesMaxFj', 'us-west-1', false, false)
    const ts = result.find(s => s.slotId === 'typesense')
    const ms = result.find(s => s.slotId === 'meilisearch')
    const alg = result.find(s => s.slotId === 'algolia')

    expect(ts.reason).toBe('no collection')
    expect(ms.reason).toBe('no collection')
    expect(alg.reason).toBe('no collection')
  })

  it('blocks HTTP instance on HTTPS page (mixed content)', () => {
    const result = resolveSlots(MOCK_SLOTS, MOCK_INSTANCES, MOCK_COLLECTIONS, 'namesMaxFj', 'us-west-1', false, true)
    const fj = result.find(s => s.slotId === 'flapjack')

    expect(fj.instance.id).toBe('fj-http')
    expect(fj.reason).toContain('HTTPS page cannot reach HTTP server')
  })

  it('allows HTTP instance on HTTP page (no mixed content)', () => {
    const result = resolveSlots(MOCK_SLOTS, MOCK_INSTANCES, MOCK_COLLECTIONS, 'namesMaxFj', 'us-west-1', false, false)
    const fj = result.find(s => s.slotId === 'flapjack')

    expect(fj.instance.id).toBe('fj-http')
    expect(fj.reason).toBeNull()
  })

  it('returns no collection when collection does not exist', () => {
    const result = resolveSlots(MOCK_SLOTS, MOCK_INSTANCES, {}, 'nonexistent', 'us-west-1', false, false)
    const fj = result.find(s => s.slotId === 'flapjack')

    expect(fj.reason).toBe('no collection')
  })

  it('prefers instance with highest docCount', () => {
    const collections = {
      test: {
        name: 'test',
        instances: {
          'fj-usw1': { docCount: 100, engine: 'flapjack' },
          'fj-http': { docCount: 50000, engine: 'flapjack' },
        }
      }
    }
    // On HTTP page, fj-http (higher docCount) should win
    const result = resolveSlots(MOCK_SLOTS, MOCK_INSTANCES, collections, 'test', 'us-west-1', false, false)
    const fj = result.find(s => s.slotId === 'flapjack')
    expect(fj.instance.id).toBe('fj-http')
  })

  // ── namesMaxFj HTTPS scenario (real production config) ───────────────────

  it('resolves namesMaxFj on HTTPS page when instance uses HTTPS', () => {
    const instances = [
      ...MOCK_INSTANCES,
      { id: 'fj-namesmaxfj', engine: 'flapjack', region: 'us-west-1', host: 'https://fj-us-west-1-namesmaxfj.flapjack.foo', enabled: true, auth: {} },
    ]
    const collections = {
      namesMaxFj: {
        name: 'namesMaxFj',
        instances: {
          'fj-namesmaxfj': { docCount: 11000000, engine: 'flapjack' },
        }
      }
    }
    // pageIsSecure=true — HTTPS instance should resolve without mixed content
    const result = resolveSlots(MOCK_SLOTS, instances, collections, 'namesMaxFj', 'us-west-1', false, true)
    const fj = result.find(s => s.slotId === 'flapjack')
    expect(fj.instance.id).toBe('fj-namesmaxfj')
    expect(fj.reason).toBeNull()
  })

  it('namesMaxFj: only flapjack slot active, others show no collection', () => {
    const instances = [
      ...MOCK_INSTANCES,
      { id: 'fj-namesmaxfj', engine: 'flapjack', region: 'us-west-1', host: 'https://fj-us-west-1-namesmaxfj.flapjack.foo', enabled: true, auth: {} },
    ]
    const collections = {
      namesMaxFj: {
        name: 'namesMaxFj',
        instances: {
          'fj-namesmaxfj': { docCount: 11000000, engine: 'flapjack' },
        }
      }
    }
    const result = resolveSlots(MOCK_SLOTS, instances, collections, 'namesMaxFj', 'us-west-1', false, true)

    const fj = result.find(s => s.slotId === 'flapjack')
    const ts = result.find(s => s.slotId === 'typesense')
    const ms = result.find(s => s.slotId === 'meilisearch')
    const alg = result.find(s => s.slotId === 'algolia')

    expect(fj.reason).toBeNull()
    expect(ts.reason).toBe('no collection')
    expect(ms.reason).toBe('no collection')
    expect(alg.reason).toBe('no collection')
  })

  it('namesMaxFj: HTTPS instance preferred over HTTP instance by docCount', () => {
    const instances = [
      ...MOCK_INSTANCES,
      { id: 'fj-namesmaxfj', engine: 'flapjack', region: 'us-west-1', host: 'https://fj-us-west-1-namesmaxfj.flapjack.foo', enabled: true, auth: {} },
    ]
    const collections = {
      namesMaxFj: {
        name: 'namesMaxFj',
        instances: {
          'fj-http': { docCount: 5000000, engine: 'flapjack' },
          'fj-namesmaxfj': { docCount: 11000000, engine: 'flapjack' },
        }
      }
    }
    // Even on HTTPS page, the HTTPS instance with higher docCount wins
    const result = resolveSlots(MOCK_SLOTS, instances, collections, 'namesMaxFj', 'us-west-1', false, true)
    const fj = result.find(s => s.slotId === 'flapjack')
    expect(fj.instance.id).toBe('fj-namesmaxfj')
    expect(fj.reason).toBeNull()
  })

  it('disabled instance is excluded from candidates', () => {
    const instances = [
      { id: 'fj-usw1', engine: 'flapjack', region: 'us-west-1', host: 'https://fj.example.com', enabled: false, auth: {} },
      { id: 'fj-namesmaxfj', engine: 'flapjack', region: 'us-west-1', host: 'https://fj-us-west-1-namesmaxfj.flapjack.foo', enabled: true, auth: {} },
    ]
    const collections = {
      namesMaxFj: {
        name: 'namesMaxFj',
        instances: {
          'fj-namesmaxfj': { docCount: 11000000, engine: 'flapjack' },
        }
      }
    }
    const result = resolveSlots(MOCK_SLOTS, instances, collections, 'namesMaxFj', 'us-west-1', false, true)
    const fj = result.find(s => s.slotId === 'flapjack')
    expect(fj.instance.id).toBe('fj-namesmaxfj')
  })

  it('zero docCount instance is skipped in favor of populated one', () => {
    const collections = {
      bestbuy: {
        name: 'bestbuy',
        instances: {
          'fj-usw1': { docCount: 0, engine: 'flapjack' },
          'fj-http': { docCount: 21469, engine: 'flapjack' },
        }
      }
    }
    const result = resolveSlots(MOCK_SLOTS, MOCK_INSTANCES, collections, 'bestbuy', 'us-west-1', false, false)
    const fj = result.find(s => s.slotId === 'flapjack')
    expect(fj.instance.id).toBe('fj-http')
  })
})
