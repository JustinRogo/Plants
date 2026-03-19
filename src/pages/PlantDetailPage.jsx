import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SiteNav from '../components/SiteNav'

export default function PlantDetailPage() {
  const { plantId } = useParams()

  const [plant, setPlant] = useState(null)
  const [photos, setPhotos] = useState([])
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [isEditingPlant, setIsEditingPlant] = useState(false)
  const [savingPlant, setSavingPlant] = useState(false)

  const [editNickname, setEditNickname] = useState('')
  const [editCommonName, setEditCommonName] = useState('')
  const [editScientificName, setEditScientificName] = useState('')
  const [editCultivar, setEditCultivar] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editLightConditions, setEditLightConditions] = useState('')
  const [editPotSize, setEditPotSize] = useState('')
  const [editSubstrate, setEditSubstrate] = useState('')
  const [editAcquiredOn, setEditAcquiredOn] = useState('')
  const [editStatus, setEditStatus] = useState('active')
  const [editNotes, setEditNotes] = useState('')

  const [updateType, setUpdateType] = useState('note')
  const [updateTitle, setUpdateTitle] = useState('')
  const [updateBody, setUpdateBody] = useState('')
  const [eventDate, setEventDate] = useState(() => {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  })
  const [updatePhoto, setUpdatePhoto] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [updatingFeaturedId, setUpdatingFeaturedId] = useState(null)
  const [deletingPhotoId, setDeletingPhotoId] = useState(null)
  const [deletingUpdateId, setDeletingUpdateId] = useState(null)
  const [session, setSession] = useState(null)
  const isOwner = session?.user?.id === plant?.user_id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })
  }, [])

  useEffect(() => {
    if (plantId) {
      loadPlantDetail()
    }
  }, [plantId])

  async function loadPlantDetail() {
    setLoading(true)
    setMessage('')

    const { data: plantData, error: plantError } = await supabase
      .from('plants')
      .select('*')
      .eq('id', plantId)
      .single()

    if (plantError) {
      setMessage(plantError.message)
      setLoading(false)
      return
    }

    const { data: photoData, error: photoError } = await supabase
      .from('plant_photos')
      .select('*')
      .eq('plant_id', plantId)
      .order('created_at', { ascending: false })

    if (photoError) {
      setMessage(photoError.message)
      setLoading(false)
      return
    }

    const { data: updateData, error: updateError } = await supabase
      .from('plant_updates')
      .select('*')
      .eq('plant_id', plantId)
      .order('event_date', { ascending: false })

    if (updateError) {
      setMessage(updateError.message)
      setLoading(false)
      return
    }

    setPlant(plantData)
    setPhotos(photoData ?? [])
    setUpdates(updateData ?? [])
    hydrateEditForm(plantData)
    setLoading(false)
  }

  function hydrateEditForm(p) {
    setEditNickname(p.nickname || '')
    setEditCommonName(p.common_name || '')
    setEditScientificName(p.scientific_name || '')
    setEditCultivar(p.cultivar || '')
    setEditLocation(p.location || '')
    setEditLightConditions(p.light_conditions || '')
    setEditPotSize(p.pot_size || '')
    setEditSubstrate(p.substrate || '')
    setEditAcquiredOn(p.acquired_on || '')
    setEditStatus(p.status || 'active')
    setEditNotes(p.notes || '')
  }

  function cancelEditPlant() {
    if (plant) hydrateEditForm(plant)
    setIsEditingPlant(false)
  }

  function getImageUrl(path) {
    if (!path) return null
    const { data } = supabase.storage.from('plant-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function savePlantDetails(e) {
    e.preventDefault()
    setMessage('')
    setSavingPlant(true)

    const { data, error } = await supabase
      .from('plants')
      .update({
        nickname: editNickname,
        common_name: editCommonName || null,
        scientific_name: editScientificName || null,
        cultivar: editCultivar || null,
        location: editLocation || null,
        light_conditions: editLightConditions || null,
        pot_size: editPotSize || null,
        substrate: editSubstrate || null,
        acquired_on: editAcquiredOn || null,
        status: editStatus,
        notes: editNotes || null,
      })
      .eq('id', plantId)
      .select()
      .single()

    if (error) {
      setMessage(error.message)
      setSavingPlant(false)
      return
    }

    setPlant(data)
    setIsEditingPlant(false)
    setSavingPlant(false)
    setMessage('Plant details updated.')
  }

  async function addUpdate(e) {
    e.preventDefault()
    setMessage('')
    setSubmitting(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage(userError?.message || 'You must be signed in.')
      setSubmitting(false)
      return
    }

    const { data: insertedUpdate, error: updateError } = await supabase
      .from('plant_updates')
      .insert({
        plant_id: plantId,
        user_id: user.id,
        update_type: updateType,
        title: updateTitle || null,
        body: updateBody || null,
        event_date: new Date(eventDate).toISOString(),
        metadata: {},
      })
      .select()
      .single()

    if (updateError) {
      setMessage(updateError.message)
      setSubmitting(false)
      return
    }

    if (updatePhoto && insertedUpdate) {
      const safeFileName = updatePhoto.name.replace(/\s+/g, '-')
      const filePath = `${user.id}/${plantId}/updates/${insertedUpdate.id}-${Date.now()}-${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from('plant-photos')
        .upload(filePath, updatePhoto)

      if (uploadError) {
        setMessage(`Update saved, but image upload failed: ${uploadError.message}`)
        setSubmitting(false)
        await loadPlantDetail()
        return
      }

      const { error: photoInsertError } = await supabase
        .from('plant_photos')
        .insert({
          plant_id: plantId,
          user_id: user.id,
          storage_path: filePath,
          caption: updateTitle || `${updateType} update`,
          taken_at: new Date(eventDate).toISOString(),
          is_featured: false,
        })

      if (photoInsertError) {
        setMessage(`Update saved, image uploaded, but photo record failed: ${photoInsertError.message}`)
        setSubmitting(false)
        await loadPlantDetail()
        return
      }
    }

    resetUpdateForm()
    setMessage('Update added.')
    setSubmitting(false)
    await loadPlantDetail()
  }

  async function setFeaturedPhoto(photo) {
    if (!photo?.id || !photo?.storage_path) return

    setMessage('')
    setUpdatingFeaturedId(photo.id)

    const { error: clearError } = await supabase
      .from('plant_photos')
      .update({ is_featured: false })
      .eq('plant_id', plantId)

    if (clearError) {
      setMessage(clearError.message)
      setUpdatingFeaturedId(null)
      return
    }

    const { error: markError } = await supabase
      .from('plant_photos')
      .update({ is_featured: true })
      .eq('id', photo.id)

    if (markError) {
      setMessage(markError.message)
      setUpdatingFeaturedId(null)
      return
    }

    const { error: plantError } = await supabase
      .from('plants')
      .update({ featured_photo_path: photo.storage_path })
      .eq('id', plantId)

    if (plantError) {
      setMessage(plantError.message)
      setUpdatingFeaturedId(null)
      return
    }

    setUpdatingFeaturedId(null)
    setMessage('Featured photo updated.')
    await loadPlantDetail()
  }

  async function deletePhoto(photo) {
    if (!photo?.id) return

    const confirmed = window.confirm(
      'Delete this photo? This will remove it from storage and from the plant gallery.'
    )
    if (!confirmed) return

    setMessage('')
    setDeletingPhotoId(photo.id)

    const wasFeatured = plant?.featured_photo_path === photo.storage_path

    if (photo.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('plant-photos')
        .remove([photo.storage_path])

      if (storageError) {
        setMessage(storageError.message)
        setDeletingPhotoId(null)
        return
      }
    }

    const { error: rowError } = await supabase
      .from('plant_photos')
      .delete()
      .eq('id', photo.id)

    if (rowError) {
      setMessage(rowError.message)
      setDeletingPhotoId(null)
      return
    }

    if (wasFeatured) {
      const remainingPhotos = photos.filter((p) => p.id !== photo.id)
      const replacement = remainingPhotos[0] ?? null

      if (replacement) {
        await supabase
          .from('plant_photos')
          .update({ is_featured: false })
          .eq('plant_id', plantId)

        await supabase
          .from('plant_photos')
          .update({ is_featured: true })
          .eq('id', replacement.id)

        await supabase
          .from('plants')
          .update({ featured_photo_path: replacement.storage_path })
          .eq('id', plantId)
      } else {
        await supabase
          .from('plants')
          .update({ featured_photo_path: null })
          .eq('id', plantId)
      }
    }

    setDeletingPhotoId(null)
    setMessage('Photo deleted.')
    await loadPlantDetail()
  }

  async function deleteUpdate(update) {
    if (!update?.id) return

    const confirmed = window.confirm(
      'Delete this update? This cannot be undone.'
    )
    if (!confirmed) return

    setMessage('')
    setDeletingUpdateId(update.id)

    const { error } = await supabase
      .from('plant_updates')
      .delete()
      .eq('id', update.id)

    if (error) {
      setMessage(error.message)
      setDeletingUpdateId(null)
      return
    }

    setDeletingUpdateId(null)
    setMessage('Update deleted.')
    await loadPlantDetail()
  }

  function resetUpdateForm() {
    setUpdateType('note')
    setUpdateTitle('')
    setUpdateBody('')
    const now = new Date()
    setEventDate(
      new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    )
    setUpdatePhoto(null)

    const fileInput = document.getElementById('update-photo')
    if (fileInput) fileInput.value = ''
  }

  if (loading) {
    return (
      <div className="app-shell">
        <p>Loading plant...</p>
      </div>
    )
  }

  if (!plant) {
    return (
      <div className="app-shell">
        <Link to="/" className="back-link">← Back to all plants</Link>
        <p>Plant not found.</p>
        {message && <p className="message">{message}</p>}
      </div>
    )
  }

  const featuredImage = getImageUrl(plant.featured_photo_path)

  return (

    <div className="app-shell">
      <SiteNav />
      <Link to="/" className="back-link">← Back to all plants</Link>

      <section className="plant-detail-hero panel">
        <div className="plant-detail-image-wrap">
          {featuredImage ? (
            <img
              src={featuredImage}
              alt={plant.nickname}
              className="plant-detail-image"
            />
          ) : (
            <div className="plant-photo-placeholder detail-placeholder">🌿</div>
          )}
        </div>

        <div className="plant-detail-meta">
          <div className="section-row">
            <h1>{plant.nickname}</h1>
            {isOwner && !isEditingPlant ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsEditingPlant(true)}
              >
                Edit Plant
              </button>
            ) : null}
          </div>

          {!isEditingPlant || !isOwner ? (
            <>
              {plant.common_name && <p>{plant.common_name}</p>}
              {plant.scientific_name && (
                <p className="muted italic">{plant.scientific_name}</p>
              )}

              <div className="meta-list">
                {plant.cultivar && <p><strong>Cultivar:</strong> {plant.cultivar}</p>}
                {plant.location && <p><strong>Location:</strong> {plant.location}</p>}
                {plant.light_conditions && <p><strong>Light:</strong> {plant.light_conditions}</p>}
                {plant.pot_size && <p><strong>Pot Size:</strong> {plant.pot_size}</p>}
                {plant.substrate && <p><strong>Substrate:</strong> {plant.substrate}</p>}
                {plant.acquired_on && <p><strong>Acquired:</strong> {plant.acquired_on}</p>}
                {plant.status && <p><strong>Status:</strong> {plant.status}</p>}
                {plant.last_watered_at && (
                  <p><strong>Last Watered:</strong> {new Date(plant.last_watered_at).toLocaleDateString()}</p>
                )}
                {plant.last_repotted_at && (
                  <p><strong>Last Repotted:</strong> {new Date(plant.last_repotted_at).toLocaleDateString()}</p>
                )}
                {plant.last_bloomed_at && (
                  <p><strong>Last Bloomed:</strong> {new Date(plant.last_bloomed_at).toLocaleDateString()}</p>
                )}
              </div>

              {plant.notes && (
                <>
                  <h3>Notes</h3>
                  <p>{plant.notes}</p>
                </>
              )}
            </>
          ) : (
            <form className="plant-form-expanded" onSubmit={savePlantDetails}>
              <input
                type="text"
                placeholder="Nickname"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Common name"
                value={editCommonName}
                onChange={(e) => setEditCommonName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Scientific name"
                value={editScientificName}
                onChange={(e) => setEditScientificName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Cultivar"
                value={editCultivar}
                onChange={(e) => setEditCultivar(e.target.value)}
              />
              <input
                type="text"
                placeholder="Location"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
              <input
                type="text"
                placeholder="Light conditions"
                value={editLightConditions}
                onChange={(e) => setEditLightConditions(e.target.value)}
              />
              <input
                type="text"
                placeholder="Pot size"
                value={editPotSize}
                onChange={(e) => setEditPotSize(e.target.value)}
              />
              <input
                type="text"
                placeholder="Substrate"
                value={editSubstrate}
                onChange={(e) => setEditSubstrate(e.target.value)}
              />
              <input
                type="date"
                value={editAcquiredOn}
                onChange={(e) => setEditAcquiredOn(e.target.value)}
              />
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="gifted">Gifted</option>
                <option value="lost">Lost</option>
                <option value="dead">Dead</option>
              </select>
              <div className="full-width">
                <textarea
                  rows={5}
                  placeholder="Notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
              <div className="full-width action-row">
                <button type="submit" disabled={savingPlant}>
                  {savingPlant ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={cancelEditPlant}
                  disabled={savingPlant}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
      {isOwner && (
        <section className="panel">
          <h2>Add Update</h2>

          <form className="update-form" onSubmit={addUpdate}>
            <select value={updateType} onChange={(e) => setUpdateType(e.target.value)}>
              <option value="note">Note</option>
              <option value="watering">Watering</option>
              <option value="repotting">Repotting</option>
              <option value="bloom">Bloom</option>
              <option value="fertilizing">Fertilizing</option>
              <option value="pruning">Pruning</option>
              <option value="pest">Pest</option>
              <option value="health">Health</option>
              <option value="photo">Photo</option>
            </select>

            <input
              type="text"
              placeholder="Title"
              value={updateTitle}
              onChange={(e) => setUpdateTitle(e.target.value)}
            />

            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />

            <div className="full-width">
              <textarea
                rows={4}
                placeholder="What changed?"
                value={updateBody}
                onChange={(e) => setUpdateBody(e.target.value)}
              />
            </div>

            <div className="full-width">
              <label htmlFor="update-photo" className="field-label">
                Optional photo
              </label>
              <input
                id="update-photo"
                type="file"
                accept="image/*"
                onChange={(e) => setUpdatePhoto(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="full-width">
              <button type="submit" disabled={submitting}>
                {submitting ? 'Saving Update...' : 'Add Update'}
              </button>
            </div>
          </form>
        </section>
      )}
      {message && <p className="message">{message}</p>}

      <section className="panel">
        <h2>Photo History</h2>
        {photos.length === 0 ? (
          <p>No photos yet.</p>
        ) : (
          <div className="detail-photo-grid">
            {photos.map((photo) => {
              const imageUrl = getImageUrl(photo.storage_path)
              const isCurrentFeatured = plant.featured_photo_path === photo.storage_path

              return (
                <div className="detail-photo-card" key={photo.id}>
                  <img
                    src={imageUrl}
                    alt={photo.caption || plant.nickname}
                    className="detail-photo-image"
                  />

                  {photo.caption && <p>{photo.caption}</p>}
                  {photo.taken_at && (
                    <p className="muted">{new Date(photo.taken_at).toLocaleString()}</p>
                  )}

                  <div className="photo-card-actions">
                    {isCurrentFeatured ? (
                      <span className="featured-badge">Featured</span>
                    ) : null}

                    {isOwner && !isCurrentFeatured && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setFeaturedPhoto(photo)}
                        disabled={updatingFeaturedId === photo.id || deletingPhotoId === photo.id}
                      >
                        {updatingFeaturedId === photo.id ? 'Updating...' : 'Set as featured'}
                      </button>
                    )}

                    {isOwner && (
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => deletePhoto(photo)}
                        disabled={deletingPhotoId === photo.id || updatingFeaturedId === photo.id}
                      >
                        {deletingPhotoId === photo.id ? 'Deleting...' : 'Delete photo'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Update Timeline</h2>
        {updates.length === 0 ? (
          <p>No updates yet.</p>
        ) : (
          <div className="timeline">
            {updates.map((update) => (
              <article className="timeline-item" key={update.id}>
                <div className="timeline-item-header">
                  <strong>{formatUpdateType(update.update_type)}</strong>
                  <span className="muted">
                    {new Date(update.event_date).toLocaleString()}
                  </span>
                </div>

                {update.title && <h3>{update.title}</h3>}
                {update.body && <p>{update.body}</p>}

                {isOwner && (
                  <div className="timeline-actions">
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => deleteUpdate(update)}
                      disabled={deletingUpdateId === update.id}
                    >
                      {deletingUpdateId === update.id ? 'Deleting...' : 'Delete update'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function formatUpdateType(type) {
  if (!type) return ''
  return type.charAt(0).toUpperCase() + type.slice(1)
}