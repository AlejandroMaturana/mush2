# Arquitectura del Frontend — Mush2

## Stack

| Capa          | Tecnología                          |
| ------------- | ----------------------------------- |
| Framework     | React 18                            |
| Build tool    | Vite                                |
| Routing       | React Router v6                     |
| Estado global | Context API + useReducer            |
| HTTP          | axios (instancia compartida)        |
| Tiempo real   | EventSource (SSE)                   |
| Gráficos      | Chart.js + react-chartjs-2          |
| Estilos       | CSS globales + design tokens        |
| Pruebas       | Vitest + React Testing Library      |
| Linting       | ESLint + Prettier                   |
| Tema          | CSS variables + clase `.light`      |

## Estructura de Directorios

```
frontend/src/
│   App.jsx                         # Layout + Routing (BrowserRouter)
│   index.css                       # Legacy (no importado)
│   main.jsx                        # Punto de entrada
│
├───app/
│   ├───providers/
│   │       AuthProvider.jsx        # Contexto de autenticación + JWT refresh
│   │       AlarmProvider.jsx       # Contexto global de alarmas
│   │       ThemeProvider.jsx       # Contexto de tema (dark/light)
│   │
│   └───routes.jsx                  # Definición de rutas públicas/protégées
│
├───api/
│       AuthContext.jsx             # Re-export de AuthProvider
│       client.js                   # Barrel: re-exporta todas las APIs de features
│       useSSE.js                   # Hook SSE principal (ack, telemetry, alarm, etc.)
│
├───layouts/
│   ├───AppShell/                   # Contenedor principal (sidebar + topbar + content)
│   ├───BottomNav/                  # Navegación inferior (mobile)
│   ├───Sidebar/                    # Sidebar de navegación (desktop)
│   ├───StatusFooter/               # Footer con versión y estado del sistema
│   └───TopBar/                     # Barra superior + toggle tema + usuario
│
├───shared/
│   ├───api/
│   │       axiosInstance.js        # Instancia axios con baseURL /api/v1 + interceptors JWT
│   │
│   ├───components/
│   │       ChartPanel.jsx          # Panel de gráficos reutilizable (Chart.js)
│   │       LoadingState.jsx        # Skeletons y estados de carga
│   │       ErrorBoundary.jsx       # Captura de errores React
│   │       OfflineBanner.jsx       # Banner de conexión perdida
│   │       ...
│   │
│   ├───constants/                  # Constantes compartidas
│   │       deviceStatus.js         # Device Status Policy (ADR-025): CONNECTIVITY, HEALTH, LIFECYCLE
│   │       status.js               # Re-exports de deviceStatus + labels (SEVERITY, PHASE, CYCLE_STATUS)
│   ├───hooks/                      # Hooks compartidos (useSSE legacy)
│   └───utils/                      # Utilidades (formatDate, etc.)
│
├───styles/
│       index.css                   # Design tokens (:root dark, .light overrides)
│
├───features/
│   ├───auth/
│   │   ├───api/auth.js             # login, register
│   │   └───pages/                  # LandingPage, HomeRedirect
│   │
│   ├───devices/
│   │   ├───api/devices.js          # CRUD dispositivos + actuadores
│   │   ├───api/telemetry.js        # Telemetry + health endpoints
│   │   ├───api/telegram.js         # Config Telegram por dispositivo
│   │   ├───components/             # DeviceHealthPanel, DeviceMaintenancePanel
│   │   ├───constants/              # Sensor configs, rangos
│   │   ├───hooks/useDevice.js      # Hook para detalle de dispositivo
│   │   └───pages/                  # DeviceDetailPage, ProvisioningPage
│   │
│   ├───cultivation/
│   │   ├───api/cycles.js           # CRUD ciclos + bioactives
│   │   ├───api/recipes.js          # CRUD recetas
│   │   ├───api/species.js          # CRUD especies
│   │   ├───components/             # CycleCard, CycleForm, RecipeCard
│   │   └───pages/                  # CyclesPage, RecipesPage, SpeciesLibraryPage,
│   │                               # RecipeComparatorPage, BioactiveDashboardPage
│   │
│   ├───dashboard/
│   │   └───pages/DashboardPage.jsx # Dashboard principal
│   │
│   ├───alarms/
│   │   ├───api/alarms.js           # CRUD alarmas + stats
│   │   └───pages/AlarmsPage.jsx
│   │
│   ├───analytics/
│   │   ├───api/analytics.js        # Analytics por chamber
│   │   ├───components/RiskBar.jsx  # Barras de riesgo biológico
│   │   └───pages/DeviceAnalyticsPage.jsx  # /fleet/devices/:id/analytics
│   │
│   ├───events/
│   │   └───pages/EventsPage.jsx    # Feed SSE en vivo (/operations/events)
│   │
│   ├───logs/
│   │   ├───api/audit.js            # Audit logs
│   │   └───pages/LogsPage.jsx
│   │
│   └───settings/
│       ├───api/settings.js         # Profile, password, telegram, api-keys, system,
│       │                           # subscription, thingSpeak
│       └───pages/                  # SettingsHub, UserSettings, DeviceSettings,
│                                   # CultivationSettings, ApiKeysSettings,
│                                   # SystemSettings, SubscriptionSettings
│
└───pages/                          # Páginas legacy (algunas aún activas)
        DeviceDetail.jsx
        Cycles.jsx
        BioactiveDashboard.jsx
        Login.jsx
        Landing.jsx
```

## Flujo de Autenticación

```
Login → POST /api/v1/auth/login
  → Recibe { token, refreshToken, user }
  → Almacena token en sessionStorage
  → Configura axios interceptor (Authorization: Bearer)
  → Redirige a Dashboard

Token expirado (401)
  → Interceptor captura error
  → POST /api/v1/auth/refresh con refreshToken
  → Si ok: renueva token y reintenta request
  → Si fail: redirige a Login
```

## API Client

Todas las llamadas HTTP pasan por una instancia axios compartida:

```
shared/api/axiosInstance.js
  baseURL: '/api/v1'
  Interceptor: agrega Authorization: Bearer <token>
  Interceptor 401: intenta refresh → si falla, redirige a login
```

Cada feature define sus funciones API en `features/<name>/api/<name>.js` y son re-exportadas por `api/client.js` para backward compatibility.

## Tiempo Real (SSE)

```javascript
// api/useSSE.js
EventSource('/events?token=<jwt>')

Eventos escuchados:
  - ack            → Confirmación de comandos
  - state          → Cambios de estado de actuadores
  - telemetry      → Datos de sensores en tiempo real
  - alarm          → Alarmas del sistema
  - control_eval   → Evaluaciones del control engine
  - health         → Reportes de salud del dispositivo
  - maintenance    → Eventos de mantenimiento
  - phase_transition → Transiciones de fase del ciclo
```

## Routing

Rutas protegidas (requieren autenticación):

```
/                                       → HomeRedirect
/overview                               → Dashboard
/fleet/provision                        → Provisioning
/fleet/devices/:id                      → DeviceDetail
/fleet/devices/:id/analytics            → DeviceAnalytics
/cultivation/recipes                    → Recipes
/cultivation/recipes/compare            → RecipeComparator
/cultivation/species                    → SpeciesLibrary
/cultivation/cycles                     → Cycles
/cultivation/cycles/:id/bioactives      → BioactiveDashboard
/operations/alarms                      → Alarms
/operations/logs                        → Logs
/system/settings                        → Settings (layout con children)
/system/settings/user                   → UserSettings
/system/settings/device                 → DeviceSettings
/system/settings/cultivation            → CultivationSettings
/system/settings/api-keys               → ApiKeysSettings
/system/settings/system                 → SystemSettings
/system/settings/subscription           → SubscriptionSettings
```

Aliases de ruta (redirects):

```
/dashboard          → /overview
/recipes            → /cultivation/recipes
/species            → /cultivation/species
/cycles             → /cultivation/cycles
/analytics          → /fleet/devices
/alarms             → /operations/alarms
/logs               → /operations/logs
/settings           → /system/settings
/provisioning       → /fleet/provision
/devices/:id        → /fleet/devices/:id
```

## Tema (Dark/Light)

- **Tokens**: definidos en `styles/index.css` como CSS variables
  - `:root` → tema dark (default)
  - `.light` → overrides para tema claro
- **Estado**: `ThemeProvider` maneja `theme` en context
- **Aplicación**: `useEffect` alterna clases `dark`/`light` en `document.documentElement`
- **Persistencia**: `localStorage.setItem('mush2_theme', theme)`

## Decisiones de Diseño

1. **SSE vs WebSocket**: SSE por simplicidad (unidireccional servidor→cliente). El frontend solo recibe eventos en tiempo real.
2. **Context API vs Redux**: Context API + useReducer para evitar dependencias pesadas.
3. **Feature-based architecture**: Código organizado por dominio (`features/<name>/`), no por tipo (`components/`, `api/`).
4. **Lazy Loading**: Cada página se carga con `React.lazy()` + `Suspense` para reducir bundle inicial.
5. **Barrel exports**: `api/client.js` re-exporta funciones API de todas las features para backward compatibility con imports legacy.
6. **Design tokens**: Variables CSS para colores, espaciado, tipografía. Tema dark/light vía clases en `<html>`.
