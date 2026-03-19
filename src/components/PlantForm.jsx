import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PlantForm({ session, onPlantAdded, setMessage }) {
  const [nickname, setNickname] = useState('')
  const [commonName, setCommonName] = useState('')
  const [scientificName, setScientificName] = useState('')
  const [cultivar, setCultivar] = useState('')
  const [location, setLocation] = useState('')
  const [lightConditions, setLightConditions] = useState('')
  const [potSize, setPotSize] = useState('')
  const [substrate, setSubstrate] = useState('')
  const [acquiredOn, setAcquiredOn] = useState('')
  const [status, setStatus] = useState('active')
  const [notes, setNotes] = useState('')
  const [plantImage, setPlantImage] = useState(null)

  async function addPlant(e) {
    e.preventDefault()
    setMessage('')

    if (!session?.user) {
      setMessage('You need to sign in first.')
      return
    }

    const userId = session.user.id

    const { data: insertedPlant, error: insertError } = await supabase
      .from('plants')
      .insert({
        user_id: userId,
        nickname,
        common_name: commonName || null,
        scientific_name: scientificName || null,
        cultivar: cultivar || null,
        location: location || null,
        light_conditions: lightConditions || null,
        pot_size: potSize || null,
        substrate: substrate || null,
        acquired_on: acquiredOn || null,
        status,
        notes: notes || null,
      })
      .select()
      .single()

    if (insertError) {
      setMessage(insertError.message)
      return
    }

    if (plantImage && insertedPlant) {
      const safeFileName = plantImage.name.replace(/\s+/g, '-')
      const filePath = `${userId}/${insertedPlant.id}/${Date.now()}-${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from('plant-photos')
        .upload(filePath, plantImage)

      if (uploadError) {
        setMessage(`Plant saved, but image upload failed: ${uploadError.message}`)
        onPlantAdded()
        return
      }

      const { error: photoInsertError } = await supabase
        .from('plant_photos')
        .insert({
          plant_id: insertedPlant.id,
          user_id: userId,
          storage_path: filePath,
          is_featured: true,
        })

      if (photoInsertError) {
        setMessage(`Plant saved, image uploaded, but photo record failed: ${photoInsertError.message}`)
        onPlantAdded()
        return
      }

      const { error: plantUpdateError } = await supabase
        .from('plants')
        .update({ featured_photo_path: filePath })
        .eq('id', insertedPlant.id)

      if (plantUpdateError) {
        setMessage(`Plant saved, but featured image could not be linked: ${plantUpdateError.message}`)
        onPlantAdded()
        return
      }
    }

    setNickname('')
    setCommonName('')
    setScientificName('')
    setCultivar('')
    setLocation('')
    setLightConditions('')
    setPotSize('')
    setSubstrate('')
    setAcquiredOn('')
    setStatus('active')
    setNotes('')
    setPlantImage(null)

    const fileInput = document.getElementById('plant-image')
    if (fileInput) fileInput.value = ''

    setMessage('Plant added.')
    onPlantAdded()
  }

return (
  <form className="plant-form-expanded" onSubmit={addPlant}>
    <input
      type="text"
      placeholder="Nickname"
      value={nickname}
      onChange={(e) => setNickname(e.target.value)}
      required
    />

    <input
      type="text"
      placeholder="Common name"
      value={commonName}
      onChange={(e) => setCommonName(e.target.value)}
    />

    <input
      type="text"
      placeholder="Scientific name"
      value={scientificName}
      onChange={(e) => setScientificName(e.target.value)}
    />

    <input
      type="text"
      placeholder="Cultivar"
      value={cultivar}
      onChange={(e) => setCultivar(e.target.value)}
    />

    <input
      type="text"
      placeholder="Location"
      value={location}
      onChange={(e) => setLocation(e.target.value)}
    />

    <input
      type="text"
      placeholder="Light conditions"
      value={lightConditions}
      onChange={(e) => setLightConditions(e.target.value)}
    />

    <input
      type="text"
      placeholder="Pot size"
      value={potSize}
      onChange={(e) => setPotSize(e.target.value)}
    />

    <input
      type="text"
      placeholder="Substrate"
      value={substrate}
      onChange={(e) => setSubstrate(e.target.value)}
    />

    <input
      type="date"
      value={acquiredOn}
      onChange={(e) => setAcquiredOn(e.target.value)}
    />

    <select value={status} onChange={(e) => setStatus(e.target.value)}>
      <option value="active">Active</option>
      <option value="gifted">Gifted</option>
      <option value="lost">Lost</option>
      <option value="dead">Dead</option>
    </select>

    <div className="full-width">
      <label htmlFor="plant-image" className="field-label">
        Plant image
      </label>
      <input
        id="plant-image"
        type="file"
        accept="image/*"
        onChange={(e) => setPlantImage(e.target.files?.[0] ?? null)}
      />
    </div>

    <div className="full-width">
      <textarea
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
      />
    </div>

    <div className="full-width">
      <button type="submit">Add Plant</button>
    </div>
  </form>
)
}