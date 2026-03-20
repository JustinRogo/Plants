import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SiteNav from '../components/SiteNav'
import { filterPlants, sortPlants } from '../lib/plantSearch'

export default function ExplorePage() {
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('date_added')
  const [ownerFilter, setOwnerFilter] = useState('')

  const owners = deriveOwners(plants)

  const visiblePlants = sortPlants(
    filterPlants(
      ownerFilter ? plants.filter((p) => p.owner?.id === ownerFilter) : plants,
      searchTerm
    ),
    sortKey
  )

  useEffect(() => {
    loadPublicPlants()
  }, [])

  async function loadPublicPlants() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('plants')
      .select(`
        *,
        owner:profiles!plants_user_id_fkey (
          id,
          display_name,
          public_display_name,
          is_public
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setPlants([])
    } else {
      setPlants((data || []).filter((plant) => plant.owner?.is_public))
    }

    setLoading(false)
  }

  function getPlantImageUrl(path) {
    if (!path) return null
    const { data } = supabase.storage.from('plant-photos').getPublicUrl(path)
    return data.publicUrl
  }

  function getOwnerName(plant) {
    return (
      plant.owner?.public_display_name ||
      plant.owner?.display_name ||
      'Unknown'
    )
  }

  return (
    <div className="app-shell">
      <SiteNav />

      <header className="page-header">
        <h1>Explore Public Plants</h1>
        <p>
          Browse collections shared publicly by other users.{' '}
          <Link to="/login">Sign in</Link> to manage your own plants.
        </p>
      </header>

      <section className="panel search-panel">
        <div className="section-row">
          <div>
            <h2 className="section-title">Search &amp; Filter</h2>
            <p className="muted">
              Search shared collections by plant name, species, location, or notes.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search public plants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: '2 1 180px' }}
          />
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            style={{ flex: '1 1 140px', width: 'auto' }}
          >
            <option value="">All owners</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            style={{ flex: '1 1 120px', width: 'auto' }}
          >
            <option value="date_added">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </section>

      {message && <p className="message">{message}</p>}

      {loading ? (
        <p>Loading public plants...</p>
      ) : plants.length === 0 ? (
        <p>No public plants yet.</p>
      ) : visiblePlants.length === 0 ? (
        <p>No public plants match your filters.</p>
      ) : (
        <div className="plant-grid">
          {visiblePlants.map((plant) => {
            const imageUrl = getPlantImageUrl(plant.featured_photo_path)
            const ownerName = getOwnerName(plant)

            return (
              <Link
                to={`/plant/${plant.id}`}
                className="plant-card-link"
                key={plant.id}
              >
                <article className="plant-card">
                  {imageUrl ? (
                    <img
                      className="plant-card-image"
                      src={imageUrl}
                      alt={`${ownerName}'s ${plant.nickname}`}
                    />
                  ) : (
                    <div className="plant-photo-placeholder">🌿</div>
                  )}

                  <h3>{ownerName}&rsquo;s {plant.nickname}</h3>

                  <p className="muted">
                    <Link to={`/u/${plant.owner.id}`} className="inline-link">
                      View {ownerName}&rsquo;s collection
                    </Link>
                  </p>

                  {plant.common_name && <p>{plant.common_name}</p>}
                  {plant.scientific_name && (
                    <p className="muted italic">{plant.scientific_name}</p>
                  )}
                  {plant.location && <p className="muted">{plant.location}</p>}
                </article>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function deriveOwners(plants) {
  const seen = new Set()
  return plants
    .map((p) => ({
      id: p.owner?.id,
      name: p.owner?.public_display_name || p.owner?.display_name || 'Unknown',
    }))
    .filter((o) => {
      if (!o.id || seen.has(o.id)) return false
      seen.add(o.id)
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
