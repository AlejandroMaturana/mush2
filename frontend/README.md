# Frontend — Mush2

Dashboard React en tiempo real para monitoreo y control de cultivos de hongos adaptógenos. Visualiza telemetría en tiempo real, gestiona recetas, controla actuadores remotamente.

## 📋 Stack Tecnológico

| Componente | Versión | Propósito |
|---|---|---|
| **Framework** | React 18 | UI library |
| **Bundler** | Vite | Build tool (fast HMR) |
| **Lenguaje** | JavaScript (ES2022) | Frontend logic |
| **Styling** | CSS Modules + CSS Grid | UI styling |
| **Charts** | Chart.js 4 | Visualización de telemetría |
| **HTTP** | Fetch API / axios | Comunicación con backend |
| **Testing** | Vitest + React Testing Library | Tests unitarios |
| **Dev Server** | Vite dev server | Local development |

## 🚀 Inicio Rápido

### Requisitos

- Node.js 18.x o superior
- pnpm (gestor de paquetes)
- Backend corriendo en http://localhost:3797

### Instalación

```bash
# 1. Instalar dependencias
cd frontend
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# VITE_API_URL=http://localhost:3797/api/v1

# 3. Iniciar servidor de desarrollo
pnpm run dev
# Accede en http://localhost:5173
```

## 📚 Estructura del Proyecto

```
src/
├── main.jsx                  # Entry point
├── App.jsx                   # Root component + routing
├── index.css                 # Global styles
├── pages/                    # Page components (layouts)
│   ├── Dashboard.jsx         # Dashboard principal
│   ├── RecipeList.jsx        # Listado de recetas
│   ├── CycleManager.jsx      # Gestión de ciclos
│   ├── DeviceList.jsx        # Dispositivos
│   └── Login.jsx             # Autenticación
├── components/               # Componentes reutilizables
│   ├── DeviceCard.jsx        # Card de dispositivo
│   ├── SensorChart.jsx       # Gráfico de telemetría
│   ├── AlarmBanner.jsx       # Banner de alarmas
│   ├── Header.jsx            # Navbar
│   └── Sidebar.jsx           # Navegación lateral
├── api/                      # Servicios HTTP
│   ├── client.js             # Configuración fetch
│   ├── auth.js               # Endpoints de autenticación
│   ├── devices.js            # Endpoints de dispositivos
│   └── recipes.js            # Endpoints de recetas
├── hooks/                    # Custom React hooks
│   ├── useFetchDevices.js    # Hook para obtener dispositivos
│   ├── useAuth.js            # Hook de autenticación
│   └── useLocalStorage.js    # Persistencia local
├── context/                  # Context API
│   ├── AuthContext.jsx       # Autenticación global
│   └── ThemeContext.jsx      # Tema (light/dark)
├── utils/                    # Funciones auxiliares
│   ├── formatDate.js         # Formatos de fecha
│   ├── validators.js         # Validación de formularios
│   └── constants.js          # Constantes globales
└── __tests__/                # Suite de tests
    ├── components/
    └── hooks/
```

## 🎨 Componentes Principales

### Dashboard

Página de inicio: visualiza dispositivos, ciclos activos y alarmas.

```jsx
<Dashboard>
  ├── <DeviceGrid>
  │   └── <DeviceCard>
  │       ├── <SensorChart> (temp, humedad, CO2)
  │       └── <ActuatorControls>
  └── <AlarmBanner>
```

### Real-time Updates

Server-Sent Events para actualizaciones en vivo:

```javascript
const eventSource = new EventSource('/api/v1/events');
eventSource.addEventListener('telemetry', (e) => {
  const data = JSON.parse(e.data);
  updateChart(data);
});
```

## 🔌 Integración con Backend

### API Client

```javascript
import { getDevices, sendActuatorCommand } from './api/devices.js';

// Obtener dispositivos
const devices = await getDevices();

// Enviar comando
await sendActuatorCommand('ESP8266_001', {
  channel: 1,
  state: true,
  duration: 3600
});
```

## 🧪 Testing

```bash
pnpm test              # Tests una vez
pnpm run test:watch    # Modo watch
pnpm run test:ui       # UI interactiva
```

## 📦 Comandos Principales

```bash
pnpm run dev              # Dev server (puerto 5173)
pnpm run build            # Build minificado → dist/
pnpm run preview          # Previsualizar build
pnpm run build:analyze    # Analizar tamaño bundle
pnpm test                 # Tests
pnpm run lint             # ESLint
pnpm run format:fix       # Auto-formatear
```

## 🎯 Performance

- Code splitting por rutas (React.lazy)
- Memoization con useMemo, useCallback
- Lazy loading de imágenes
- Virtual scrolling para listas grandes

## 🚢 Deployment

```bash
pnpm run build  # Genera dist/
# Servir dist/ con Nginx, Vercel, Netlify, etc.
```

Ver `docs/deployment.md` para más detalles.

---

**Última actualización:** 2026-06-13  
**Versión:** 0.1.0  
**Stack:** React 18 + Vite

