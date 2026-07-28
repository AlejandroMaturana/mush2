import client from '../../../shared/api/axiosInstance'

export async function getSpeciesCatalog(params = {}) {
  const { data } = await client.get('/species', { params })
  return data.data ?? data
}

export async function getSpecies(id) {
  const { data } = await client.get(`/species/${id}`)
  return data
}

export async function createSpecies(payload) {
  const { data } = await client.post('/species', payload)
  return data
}

export async function updateSpecies(id, payload) {
  const { data } = await client.put(`/species/${id}`, payload)
  return data
}

export async function deleteSpecies(id) {
  await client.delete(`/species/${id}`)
}
