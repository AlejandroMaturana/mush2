import { useState, useEffect } from 'react'

let cachedManifest = null
let fetchPromise = null

function fetchManifest() {
  if (cachedManifest) return Promise.resolve(cachedManifest)
  if (fetchPromise) return fetchPromise
  fetchPromise = fetch('/version-manifest.json')
    .then((res) => res.json())
    .then((data) => {
      cachedManifest = data
      return data
    })
    .catch(() => null)
  return fetchPromise
}

export function useVersionManifest() {
  const [manifest, setManifest] = useState(cachedManifest)

  useEffect(() => {
    if (cachedManifest) return
    fetchManifest().then(setManifest)
  }, [])

  return manifest
}
