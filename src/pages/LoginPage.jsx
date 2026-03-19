import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SiteNav from '../components/SiteNav'

export default function LoginPage() {
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!authReady) return
    if (session) {
      navigate('/', { replace: true })
    }
  }, [authReady, session, navigate])

  async function signIn(e) {
    e.preventDefault()
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
    }
  }

  async function signUp(e) {
    e.preventDefault()
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    setMessage(
      error ? error.message : 'Account created. Check your email if confirmation is required.'
    )
  }

  if (!authReady) {
    return (
      <div className="app-shell">
        <SiteNav />
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <SiteNav />

      <header className="page-header">
        <h1>Sign In</h1>
        <p>Access your plant collection and care log.</p>
      </header>

      <section className="panel">
        <form className="plant-form" onSubmit={signIn}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">Sign In</button>
          <button type="button" className="secondary-button" onClick={signUp}>
            Sign Up
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        <p className="muted" style={{ marginTop: '12px' }}>
          Want to browse first? <Link to="/explore">View public plants</Link>
        </p>
      </section>
    </div>
  )
}