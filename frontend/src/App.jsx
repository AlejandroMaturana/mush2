import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DeviceDetail from './pages/DeviceDetail.jsx'
import Recipes from './pages/Recipes.jsx'
import Cycles from './pages/Cycles.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import { useAuth } from './api/AuthContext.jsx'
import AppShell from './components/layout/AppShell.jsx'

function App() {
  const { user, logout } = useAuth()

  return (
    <BrowserRouter>
      {!user ? (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      ) : (
        <AppShell user={user} onLogout={logout}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/devices/:id" element={<DeviceDetail />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/cycles" element={<Cycles />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AppShell>
      )}
    </BrowserRouter>
  )
}

export default App
