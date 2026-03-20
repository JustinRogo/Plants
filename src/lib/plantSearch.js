export function sortPlants(plants, sortKey) {
  const sorted = [...plants]
  if (sortKey === 'last_watered') {
    sorted.sort((a, b) => {
      if (!a.last_watered_at && !b.last_watered_at) return 0
      if (!a.last_watered_at) return 1
      if (!b.last_watered_at) return -1
      return new Date(b.last_watered_at) - new Date(a.last_watered_at)
    })
  } else if (sortKey === 'date_added') {
    sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } else {
    sorted.sort((a, b) => (a.nickname || '').localeCompare(b.nickname || ''))
  }
  return sorted
}

export function filterPlants(plants, searchTerm) {
  const query = searchTerm.trim().toLowerCase()

  if (!query) return plants

  return plants.filter((plant) => {
    const values = [
      plant.nickname,
      plant.common_name,
      plant.scientific_name,
      plant.cultivar,
      plant.location,
      plant.notes,
    ]

    return values.some((value) =>
      String(value || '').toLowerCase().includes(query)
    )
  })
}