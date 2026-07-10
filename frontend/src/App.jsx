import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DeviceDetail from './pages/DeviceDetail.jsx'
import Recipes from './pages/Recipes.jsx'
import Cycles from './pages/Cycles.jsx'
import Alarms from './pages/Alarms.jsx'
import Settings from './pages/Settings.jsx'
import SettingsHub from './pages/settings/SettingsHub.jsx'
import UserSettings from './pages/settings/UserSettings.jsx'
import DeviceSettings from './pages/settings/DeviceSettings.jsx'
import CultivationSettings from './pages/settings/CultivationSettings.jsx'
import ApiKeysSettings from './pages/settings/ApiKeysSettings.jsx'
import SystemSettings from './pages/settings/SystemSettings.jsx'
import Provisioning from './pages/Provisioning.jsx'
import Landing from './pages/Landing.jsx'
import { useAuth } from './api/AuthContext.jsx'
import AppShell from './components/layout/AppShell.jsx'
import { AlarmProvider } from './contexts/AlarmContext.jsx'

function App() {
  const { user, logout } = useAuth()

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {!user ? (
        <Routes>
          <Route path="*" element={<Landing />} />
        </Routes>
      ) : (
        <AlarmProvider>
          <AppShell user={user} onLogout={logout}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/devices/:id" element={<DeviceDetail />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/cycles" element={<Cycles />} />
              <Route path="/alarms" element={<Alarms />} />
              <Route path="/settings" element={<Settings />}>
                <Route index element={<SettingsHub />} />
                <Route path="user" element={<UserSettings />} />
                <Route path="device" element={<DeviceSettings />} />
                <Route path="cultivation" element={<CultivationSettings />} />
                <Route path="api-keys" element={<ApiKeysSettings />} />
                <Route path="system" element={<SystemSettings />} />
              </Route>
              <Route path="/provisioning" element={<Provisioning />} />
            </Routes>
          </AppShell>
        </AlarmProvider>
      )}
    </BrowserRouter>
  )
}

export default App
