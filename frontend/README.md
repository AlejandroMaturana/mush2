# Frontend — Mush2

Dashboard React en tiempo real para monitoreo y control de cultivos de hongos adaptógenos.

## Stack

| Componente | Versión | Propósito |
|---|---|---|
| React | 18.x | UI library |
| Vite | 6.x | Build tool |
| Tailwind | 4.x | Utility CSS |
| Chart.js | 4.x | Telemetry charts |
| axios | 1.x | HTTP client |
| Vitest | 3.x | Testing |

## Inicio Rápido

```bash
cd frontend
pnpm install
pnpm run dev    # http://localhost:5173
```

Requiere backend corriendo en `http://localhost:3797`.

## Comandos

```bash
pnpm run dev        # Dev server (puerto 5173)
pnpm run build      # Build → dist/
pnpm run preview    # Preview build
pnpm test           # Tests (vitest)
pnpm run lint       # ESLint
```

## Estructura

```
src/
├── main.jsx                          # Entry point + providers
├── App.jsx                           # Router + layout
├── api/
│   ├── client.js                     # Re-exports (axiosInstance + feature APIs)
│   ├── useSSE.js                     # SSE singleton (auth + backoff)
│   └── AuthContext.jsx               # Re-export to AuthProvider
├── app/
│   ├── providers/
│   │   ├── AuthProvider.jsx          # Auth context (JWT in-memory)
│   │   ├── ThemeProvider.jsx         # Theme (dark/light)
│   │   └── AlarmProvider.jsx         # Alarm stats (SSE-driven)
│   └── routes.jsx                    # Route definitions
├── features/
│   ├── auth/api/auth.js              # Login/logout/refresh
│   ├── devices/
│   │   ├── api/devices.js            # Device CRUD + actuators
│   │   ├── components/               # DeviceConnectivityPanel, ToggleSwitch, ActuatorControl
│   │   └── pages/                    # DeviceListPage, DeviceDetailPage, ProvisioningPage
│   ├── cultivation/
│   │   ├── api/cycles.js             # Cycles + bioactives
│   │   ├── components/               # CompoundBar, SpeciesCard
│   │   └── pages/                    # CyclesPage, CycleDetailPage, BioactiveDashboardPage
│   ├── events/pages/                 # EventsPage
│   ├── analytics/pages/              # DeviceAnalyticsPage
│   ├── alarms/                       # AlarmsPage + API
│   ├── settings/                     # SettingsPage + UserSettings + SystemSettings
│   └── monitoring/pages/             # MonitoringPage
├── shared/
│   ├── api/axiosInstance.js           # Axios with auth interceptor + refresh single-flight
│   ├── components/                   # ToggleSwitch, StatusBadge, Panel, LoadingState, etc.
│   ├── constants/deviceStatus.js     # Status configs + derived helpers
│   └── utils/
│       ├── format.js                 # formatDate, formatBytes, formatUptime, formatTimeAgo
│       └── TemporalEngine.js         # Telemetry aggregation + chart formatting
└── styles/                           # CSS (Tailwind + custom)
```

## Testing

```bash
pnpm test           # Run all
pnpm run test:watch # Watch mode
```

Tests use Vitest + React Testing Library. Run from `frontend/`.

## Deployment

```bash
pnpm run build  # → dist/
```

Serve `dist/` con Nginx, Vercel, etc. Backend must be accessible at the same origin or via CORS.

---

**Versión:** 1.15.5
