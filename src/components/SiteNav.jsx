import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SiteNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  function isActive(path) {
    return location.pathname === path
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/explore')
  }

  return (
    <nav className="site-nav">
      {session && (
        <Link
          className={isActive('/') ? 'nav-link active' : 'nav-link'}
          to="/"
        >
          My Plants
        </Link>
      )}

      <Link
        className={isActive('/explore') ? 'nav-link active' : 'nav-link'}
        to="/explore"
      >
        Explore
      </Link>

      {session && (
        <Link
          className={isActive('/settings') ? 'nav-link active' : 'nav-link'}
          to="/settings"
        >
          Settings
        </Link>
      )}

      {session ? (
        <button className="nav-link" onClick={handleSignOut}>
          Sign Out
        </button>
      ) : (
        <Link
          className={isActive('/login') ? 'nav-link active' : 'nav-link'}
          to="/login"
        >
          Sign In
        </Link>
      )}
    </nav>
  )
}