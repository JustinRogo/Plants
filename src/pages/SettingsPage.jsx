import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SiteNav from '../components/SiteNav'

export default function SettingsPage() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [publicDisplayName, setPublicDisplayName] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentSession = data.session ?? null
      setSession(currentSession)
      if (currentSession?.user) {
        loadProfile(currentSession.user.id)
      } else {
        setLoading(false)
      }
    })
  }, [])

  async function loadProfile(userId) {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      setMessage(error.message)
    } else if (data) {
      setDisplayName(data.display_name || '')
      setPublicDisplayName(data.public_display_name || '')
      setIsPublic(data.is_public || false)
    }

    setLoading(false)
  }

  async function saveSettings(e) {
    e.preventDefault()
    if (!session?.user) return

    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName || null,
        public_display_name: publicDisplayName || null,
        is_public: isPublic,
      })
      .eq('id', session.user.id)

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Settings updated.')
    }

    setSaving(false)
  }

  if (!session) {
    return (
      <div className="app-shell">
        <SiteNav />
        <header className="page-header">
          <h1>Settings</h1>
          <p>You need to sign in to manage your profile settings.</p>
        </header>
        <Link to="/" className="back-link">← Back to home</Link>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <SiteNav />

      <header className="page-header">
        <h1>Settings</h1>
        <p>Manage your profile and public visibility.</p>
      </header>
      {isPublic && session?.user && (
        <div className="share-box">
          <p className="muted">Your public profile link:</p>
          <p className="inline-link">
            {window.location.origin}/u/{session.user.id}
          </p>
        </div>
      )}
      {loading ? (
        <p>Loading settings...</p>
      ) : (
        <section className="panel">
          <form className="plant-form-expanded" onSubmit={saveSettings}>
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <input
              type="text"
              placeholder="Public display name"
              value={publicDisplayName}
              onChange={(e) => setPublicDisplayName(e.target.value)}
            />

            <div className="full-width checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                Make my plant collection public
              </label>
            </div>

            <div className="full-width">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </section>
      )}

      {message && <p className="message">{message}</p>}
    </div>
  )
}