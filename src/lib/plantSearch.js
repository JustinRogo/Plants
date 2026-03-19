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