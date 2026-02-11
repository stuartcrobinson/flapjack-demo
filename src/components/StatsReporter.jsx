import { useStats, useInstantSearch } from 'react-instantsearch'
import { useEffect, useRef } from 'react'

export function StatsReporter({ onStats }) {
  const { nbHits } = useStats()
  const { results } = useInstantSearch()
  const queryId = results?.query ?? ''
  const hitsKey = `${queryId}:${nbHits}`
  const prevKey = useRef('')

  useEffect(() => {
    if (hitsKey !== prevKey.current) {
      prevKey.current = hitsKey
      onStats(nbHits)
    }
  }, [hitsKey, nbHits, onStats])

  return null
}