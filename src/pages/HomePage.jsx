import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PlantForm from '../components/PlantForm'
import SiteNav from '../components/SiteNav'
import { filterPlants, sortPlants } from '../lib/plantSearch'

export default function HomePage() {
  const navigate = useNavigate()

  const [session, setSession] = useState(undefined)
  const [authReady, setAuthReady] = useState(false)
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [showAddPlantForm, setShowAddPlantForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('name')

  const filteredPlants = sortPlants(filterPlants(plants, searchTerm), sortKey)

  useEffect(() => {
    let mounted = true

    async function initAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(session)
      setAuthReady(true)
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setAuthReady(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authReady) return

    if (!session) {
      setPlants([])
      setLoading(false)
      navigate('/explore', { replace: true })
      return
    }

    loadPlants(session.user.id)
  }, [authReady, session, navigate])

  async function loadPlants(userId) {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', userId)
      .order('nickname', { ascending: true })

    if (error) {
      setPlants([])
      setMessage(error.message)
      setMessageType('error')
    } else {
      setPlants(data ?? [])
    }

    setLoading(false)
  }

  function getPlantImageUrl(path) {
    if (!path) return null
    const { data } = supabase.storage.from('plant-photos').getPublicUrl(path)
    return data.publicUrl
  }

  if (!authReady) {
    return (
      <div className="app-shell">
        <SiteNav />
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="app-shell">
      <SiteNav />

      <header className="page-header">
        <h1>My Plants</h1>
        <p>Catalog, care log, notes, and updates</p>
      </header>

      <section className="panel">
        <div className="section-row">
          <div>
            <h2 className="section-title">Add Plant</h2>
            <p className="muted">
              Add a new plant with details, notes, and a featured image.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowAddPlantForm((prev) => !prev)}
          >
            {showAddPlantForm ? 'Close' : 'Add New Plant'}
          </button>
        </div>

        {showAddPlantForm && (
          <div className="collapsible-content">
            <PlantForm
              session={session}
              onPlantAdded={async () => {
                await loadPlants(session.user.id)
                setShowAddPlantForm(false)
              }}
              setMessage={setMessage}
              setMessageType={setMessageType}
            />
          </div>
        )}
      </section>

      {message && <p className={`message message--${messageType}`}>{message}</p>}

      <section className="panel">
        <div className="section-row">
          <div>
            <h2 className="section-title">Search Plants</h2>
            <p className="muted">Search by name, species, location, or notes.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="Search plants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="name">Name</option>
            <option value="last_watered">Last watered</option>
            <option value="date_added">Date added</option>
          </select>
        </div>
      </section>

      <section>
        <div className="section-heading">
          <h2>Plant Grid</h2>
        </div>

        {loading ? (
          <p>Loading plants...</p>
        ) : plants.length === 0 ? (
          <p>No plants yet.</p>
        ) : filteredPlants.length === 0 ? (
          <p>No plants match your search.</p>
        ) : (
          <div className="plant-grid">
            {filteredPlants.map((plant) => {
              const imageUrl = getPlantImageUrl(plant.featured_photo_path)

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
                        alt={plant.nickname}
                      />
                    ) : (
                      <div className="plant-photo-placeholder">🌿</div>
                    )}

                    <h3>{plant.nickname}</h3>
                    {plant.common_name && <p>{plant.common_name}</p>}
                    {plant.scientific_name && (
                      <p className="muted italic">{plant.scientific_name}</p>
                    )}
                    {plant.location && <p className="muted">{plant.location}</p>}
                    {plant.last_watered_at && (
                      <p className="muted">
                        Last watered:{' '}
                        {new Date(plant.last_watered_at).toLocaleDateString()}
                      </p>
                    )}
                  </article>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
