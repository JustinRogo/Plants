import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createHashRouter,
  RouterProvider,
} from 'react-router-dom'
import App from './App'
import HomePage from './pages/HomePage'
import PlantDetailPage from './pages/PlantDetailPage'
import ExplorePage from './pages/ExplorePage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import './index.css'
import PublicProfilePage from './pages/PublicProfilePage'

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'plant/:plantId', element: <PlantDetailPage /> },
      { path: 'explore', element: <ExplorePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'u/:userId', element: <PublicProfilePage /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)