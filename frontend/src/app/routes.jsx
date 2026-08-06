import { lazy } from 'react'
import { Navigate } from 'react-router-dom'

const Landing = lazy(() => import('../features/auth/pages/LandingPage.jsx'))
const Home = lazy(() => import('../features/auth/pages/HomeRedirect.jsx'))
const Dashboard = lazy(() => import('../features/dashboard/pages/DashboardPage.jsx'))
const DeviceDetail = lazy(() => import('../features/devices/pages/DeviceDetailPage.jsx'))
const DeviceList = lazy(() => import('../features/devices/pages/DeviceListPage.jsx'))
const Recipes = lazy(() => import('../features/cultivation/pages/RecipesPage.jsx'))
const RecipeComparator = lazy(() => import('../features/cultivation/pages/RecipeComparatorPage.jsx'))
const SpeciesLibrary = lazy(() => import('../features/cultivation/pages/SpeciesLibraryPage.jsx'))
const Cycles = lazy(() => import('../features/cultivation/pages/CyclesPage.jsx'))
const CycleDetail = lazy(() => import('../features/cultivation/pages/CycleDetailPage.jsx'))
const BioactiveDashboard = lazy(() => import('../features/cultivation/pages/BioactiveDashboardPage.jsx'))
const Alarms = lazy(() => import('../features/alarms/pages/AlarmsPage.jsx'))
const Logs = lazy(() => import('../features/logs/pages/LogsPage.jsx'))
const Events = lazy(() => import('../features/events/pages/EventsPage.jsx'))
const DeviceAnalytics = lazy(() => import('../features/analytics/pages/DeviceAnalyticsPage.jsx'))
const Settings = lazy(() => import('../features/settings/pages/SettingsPage.jsx'))
const UserSettings = lazy(() => import('../features/settings/pages/UserSettings.jsx'))
const DeviceSettings = lazy(() => import('../features/settings/pages/DeviceSettings.jsx'))
const SystemSettings = lazy(() => import('../features/settings/pages/SystemSettings.jsx'))
const Provisioning = lazy(() => import('../features/devices/pages/ProvisioningPage.jsx'))

export const publicRoutes = [
  { path: '*', element: Landing },
]

export const protectedRoutes = [
  { path: '/', element: Home },
  { path: '/overview', element: Dashboard },

  { path: '/fleet/provision', element: Provisioning },
  { path: '/fleet/devices', element: DeviceList },
  { path: '/fleet/devices/:id', element: DeviceDetail },
  { path: '/fleet/devices/:id/analytics', element: DeviceAnalytics },

  { path: '/cultivation/recipes', element: Recipes },
  { path: '/cultivation/recipes/compare', element: RecipeComparator },
  { path: '/cultivation/species', element: SpeciesLibrary },
  { path: '/cultivation/cycles', element: Cycles },
  { path: '/cultivation/cycles/:id', element: CycleDetail },
  { path: '/cultivation/cycles/:id/bioactives', element: BioactiveDashboard },

  { path: '/operations/alarms', element: Alarms },
  { path: '/operations/events', element: Events },
  { path: '/operations/logs', element: Logs },

  {
    path: '/system/settings',
    element: Settings,
    children: [
      { index: true, element: <Navigate to="/system/settings/user" replace /> },
      { path: 'user', element: UserSettings },
      { path: 'device', element: DeviceSettings },
      { path: 'system', element: SystemSettings },
    ],
  },

  { path: '/dashboard', element: () => <Navigate to="/overview" replace /> },
  { path: '/recipes', element: () => <Navigate to="/cultivation/recipes" replace /> },
  { path: '/recipes/compare', element: () => <Navigate to="/cultivation/recipes/compare" replace /> },
  { path: '/species', element: () => <Navigate to="/cultivation/species" replace /> },
  { path: '/cycles', element: () => <Navigate to="/cultivation/cycles" replace /> },
  { path: '/cycles/:id/bioactives', element: () => <Navigate to="/cultivation/cycles/:id/bioactives" replace /> },
  { path: '/analytics', element: () => <Navigate to="/fleet/devices" replace /> },
  { path: '/alarms', element: () => <Navigate to="/operations/alarms" replace /> },
  { path: '/logs', element: () => <Navigate to="/operations/logs" replace /> },
  { path: '/settings', element: () => <Navigate to="/system/settings" replace /> },
  { path: '/settings/*', element: () => <Navigate to="/system/settings" replace /> },
  { path: '/provisioning', element: () => <Navigate to="/fleet/provision" replace /> },
  { path: '/devices/:id', element: () => <Navigate to="/fleet/devices/:id" replace /> },
]
