import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SiteNav from '../components/SiteNav'
import { filterPlants } from '../lib/plantSearch'

export default function PublicProfilePage() {
  const { userId } = useParams()

  const [profile, setProfile] = useState(null)
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPlants = filterPlants(plants, searchTerm)

  useEffect(() => {
    if (userId) {
      loadPublicProfile()
    }
  }, [userId])

  async function loadPublicProfile() {
    setLoading(true)
    setMessage('')

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, public_display_name, is_public')
      .eq('id', userId)
      .single()

    if (profileError) {
      setMessage(profileError.message)
      setLoading(false)
      return
    }

    if (!profileData?.is_public) {
      setProfile(profileData)
      setPlants([])
      setLoading(false)
      return
    }

    const { data: plantData, error: plantError } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', userId)
      .order('nickname', { ascending: true })

    if (plantError) {
      setMessage(plantError.message)
      setPlants([])
    } else {
      setPlants(plantData ?? [])
    }

    setProfile(profileData)
    setLoading(false)
  }

  function getPlantImageUrl(path) {
    if (!path) return null
    const { data } = supabase.storage.from('plant-photos').getPublicUrl(path)
    return data.publicUrl
  }

  const ownerName =
    profile?.public_display_name || profile?.display_name || 'Unknown'

  return (
    <div className="app-shell">
      <SiteNav />

      {loading ? (
        <p>Loading profile...</p>
      ) : !profile ? (
        <p>Profile not found.</p>
      ) : !profile.is_public ? (
        <>
          <header className="page-header">
            <h1>Private Collection</h1>
            <p>This plant collection is not public.</p>
          </header>
          {message && <p className="message">{message}</p>}
        </>
      ) : (
        <>
          <header className="page-header">
            <h1>{ownerName}&rsquo;s Plants</h1>
            <p>Browse this public plant collection.</p>
          </header>

          <section className="panel">
            <div className="section-row">
              <div>
                <h2 className="section-title">Search This Collection</h2>
                <p className="muted">
                  Search by plant name, species, location, or notes.
                </p>
              </div>
            </div>

            <input
              type="text"
              placeholder={`Search ${ownerName}'s plants...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </section>

          {message && <p className="message">{message}</p>}

          <section>
            <div className="section-heading">
              <h2>Plant Grid</h2>
            </div>

            {plants.length === 0 ? (
              <p>No public plants yet.</p>
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
                            alt={`${ownerName}'s ${plant.nickname}`}
                          />
                        ) : (
                          <div className="plant-photo-placeholder">🌿</div>
                        )}

                        <h3>{ownerName}&rsquo;s {plant.nickname}</h3>
                        {plant.common_name && <p>{plant.common_name}</p>}
                        {plant.scientific_name && (
                          <p className="muted italic">{plant.scientific_name}</p>
                        )}
                        {plant.location && (
                          <p className="muted">{plant.location}</p>
                        )}
                      </article>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}