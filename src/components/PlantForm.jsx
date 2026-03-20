import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Module-level cache — loaded once, shared across all renders
let plantListCache = null

async function loadPlantList() {
  if (plantListCache) return plantListCache
  const res = await fetch(import.meta.env.BASE_URL + 'plantlist.json')
  plantListCache = await res.json()
  return plantListCache
}

function getSuggestions(list, query, field) {
  if (!list || query.length < 2) return []
  const q = query.toLowerCase()
  const results = []
  for (const entry of list) {
    const target = field === 'common' ? entry[0] : entry[1]
    if (target.toLowerCase().includes(q)) {
      results.push(entry)
      if (results.length === 8) break
    }
  }
  return results
}

export default function PlantForm({ session, onPlantAdded, setMessage, setMessageType }) {
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

  const [plantList, setPlantList] = useState(null)
  const [commonSuggestions, setCommonSuggestions] = useState([])
  const [sciSuggestions, setSciSuggestions] = useState([])
  const [showCommon, setShowCommon] = useState(false)
  const [showSci, setShowSci] = useState(false)

  async function ensureListLoaded() {
    if (plantList) return plantList
    const list = await loadPlantList()
    setPlantList(list)
    return list
  }

  async function handleCommonNameChange(e) {
    const val = e.target.value
    setCommonName(val)
    const list = await ensureListLoaded()
    setCommonSuggestions(getSuggestions(list, val, 'common'))
    setShowCommon(true)
  }

  async function handleSciNameChange(e) {
    const val = e.target.value
    setScientificName(val)
    const list = await ensureListLoaded()
    setSciSuggestions(getSuggestions(list, val, 'sci'))
    setShowSci(true)
  }

  function selectSuggestion(entry) {
    setCommonName(entry[0])
    setScientificName(entry[1])
    setCommonSuggestions([])
    setSciSuggestions([])
    setShowCommon(false)
    setShowSci(false)
  }

  async function addPlant(e) {
    e.preventDefault()
    setMessage('')

    if (!session?.user) {
      setMessage('You need to sign in first.')
      setMessageType?.('error')
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
      setMessageType?.('error')
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
        setMessageType?.('error')
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
        setMessageType?.('error')
        onPlantAdded()
        return
      }

      const { error: plantUpdateError } = await supabase
        .from('plants')
        .update({ featured_photo_path: filePath })
        .eq('id', insertedPlant.id)

      if (plantUpdateError) {
        setMessage(`Plant saved, but featured image could not be linked: ${plantUpdateError.message}`)
        setMessageType?.('error')
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
    setMessageType?.('success')
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

      <div className="autocomplete-wrap">
        <input
          type="text"
          placeholder="Common name"
          value={commonName}
          onChange={handleCommonNameChange}
          onFocus={() => { ensureListLoaded(); setShowCommon(true) }}
          onBlur={() => setTimeout(() => setShowCommon(false), 150)}
        />
        {showCommon && commonSuggestions.length > 0 && (
          <ul className="suggestions-list">
            {commonSuggestions.map((entry, i) => (
              <li key={i} onMouseDown={() => selectSuggestion(entry)}>
                <span>{entry[0]}</span>
                <span className="suggestions-sci">{entry[1]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="autocomplete-wrap">
        <input
          type="text"
          placeholder="Scientific name"
          value={scientificName}
          onChange={handleSciNameChange}
          onFocus={() => { ensureListLoaded(); setShowSci(true) }}
          onBlur={() => setTimeout(() => setShowSci(false), 150)}
        />
        {showSci && sciSuggestions.length > 0 && (
          <ul className="suggestions-list">
            {sciSuggestions.map((entry, i) => (
              <li key={i} onMouseDown={() => selectSuggestion(entry)}>
                <span className="suggestions-sci">{entry[1]}</span>
                <span>{entry[0]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

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

      <div>
        <label className="field-label">Date acquired</label>
        <input
          type="date"
          value={acquiredOn}
          onChange={(e) => setAcquiredOn(e.target.value)}
        />
      </div>

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
          capture="environment"
          onChange={(e) => setPlantImage(e.target.files?.[0] ?? null)}
        />
      </div>
      {plantImage && (
        <div className="full-width">
          <img
            src={URL.createObjectURL(plantImage)}
            alt="Plant preview"
            style={{ maxWidth: '200px', borderRadius: '8px', marginTop: '0.5rem' }}
          />
        </div>
      )}
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
