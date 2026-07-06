# RFC-0003 — Dashboard Multi-Dispositivo Simultáneo

## Metadata

| Campo             | Valor                                  |
| ----------------- | -------------------------------------- |
| Autor             | Alejandro Maturana                     |
| Estado            | DRAFT                                  |
| Fecha de apertura | 2026-07-05                             |
| Fecha de cierre   | 2026-07-19                             |
| ADR resultado     | Pendiente                              |
| Área              | Frontend / Backend                     |
| EDD relacionado   | EDD-004 (Multi-Tenant y Escalabilidad) |

---

## Resumen

Rediseñar el Dashboard para mostrar el estado de N cámaras de cultivo simultáneas en una sola vista, con selector de dispositivo activo y vista agregada de estado del sistema completo.

---

## Motivación

El frontend actual muestra información de un solo dispositivo a la vez. Un cultivador con 3 cámaras (Melena de León, Shiitake, Reishi) debe navegar a cada dispositivo individualmente para revisar su estado. Esto:

1. No permite comparar condiciones entre cámaras de un vistazo
2. No ofrece una vista de salud global del sistema
3. No escala a N cámaras sin rediseño de la navegación

Esta RFC define el contrato de diseño y los requisitos de API para el Dashboard multi-dispositivo (Fase 8 del roadmap).

---

## Diseño detallado

### Vista A: Grid de cámaras (vista principal)

```
┌──────────────────────────────────────────────┐
│  🍄 Mush2 Dashboard          [⚠️ 1 alerta]   │
├──────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌─────────┐ │
│  │ Cámara A   │  │ Cámara B   │  │ [+] Add │ │
│  │ Melena León│  │ Shiitake   │  │         │ │
│  │ 🟢 NORMAL  │  │ 🟡 WARN CO₂│  │         │ │
│  │ T: 23.5°C  │  │ T: 18.0°C  │  │         │ │
│  │ HR: 85%    │  │ HR: 92%    │  │         │ │
│  │ CO₂: 450   │  │ CO₂: 1200  │  │         │ │
│  │ FRUITING   │  │ PRIMORDIA  │  │         │ │
│  └────────────┘  └────────────┘  └─────────┘ │
└──────────────────────────────────────────────┘
```

### Vista B: Detalle de cámara (al hacer click)

Navegación a `/devices/:id` — vista actual, sin cambios.

### Endpoint nuevo: Estado agregado

```
GET /api/v1/devices/summary
Authorization: Bearer <token>

Response 200:
{
  "devices": [
    {
      "id": "uuid",
      "deviceId": "esp32s3_001",
      "chamberName": "Melena de León",
      "status": "ONLINE",
      "healthStatus": "NORMAL",        // NORMAL | WARN | CRITICAL | OFFLINE
      "currentPhase": "FRUITING",
      "activeAlarms": 0,
      "latestTelemetry": {
        "temperature": 23.5,
        "humidity": 85.2,
        "co2": 450,
        "timestamp": "2026-07-05T12:00:00Z"
      },
      "lastSeen": "2026-07-05T12:00:08Z"
    }
  ],
  "summary": {
    "total": 2,
    "online": 2,
    "offline": 0,
    "withAlarms": 1
  }
}
```

### Cambios en SSE

El stream SSE actual (`GET /events`) envía eventos con `deviceId`. El frontend debe filtrar por dispositivo o manejar eventos de todos los dispositivos:

```javascript
// Actual (filtra por un solo device)
eventSource.onmessage = (e) => {
  const event = JSON.parse(e.data);
  updateDashboard(event); // Asume un solo device
};

// Propuesto (maneja N devices)
eventSource.onmessage = (e) => {
  const event = JSON.parse(e.data);
  updateDeviceCard(event.deviceId, event); // Actualiza tarjeta específica
};
```

### Gestión de estado en React

```javascript
// useDevices.js — hook para múltiples dispositivos
function useDevices() {
  const [devices, setDevices] = useState({});

  useEffect(() => {
    // Carga inicial: GET /api/v1/devices/summary
    fetchDevicesSummary().then((data) => setDevices(byId(data.devices)));

    // Actualizaciones en tiempo real via SSE
    const sse = new EventSource("/events");
    sse.onmessage = (e) => {
      const event = JSON.parse(e.data);
      if (event.type === "telemetry") {
        setDevices((prev) => ({
          ...prev,
          [event.deviceId]: {
            ...prev[event.deviceId],
            latestTelemetry: event.data,
          },
        }));
      }
    };
    return () => sse.close();
  }, []);

  return devices;
}
```

---

## Alternativas consideradas

| Opción                          | Pros                                   | Contras                                      | Decisión       |
| ------------------------------- | -------------------------------------- | -------------------------------------------- | -------------- |
| **Grid de tarjetas (elegida)**  | Vista de densidad adecuada, escala a N | Requiere endpoint nuevo                      | ✅ Recomendada |
| Lista de dispositivos (tabla)   | Simple de implementar                  | Menos visual, difícil leer métricas          | ❌             |
| Mapa físico (plano del cultivo) | Muy intuitivo                          | Requiere configuración de layout por usuario | 🟡 Para v3+    |
| Un SSE por device               | Isolation clara                        | N conexiones simultáneas vs 1                | ❌ No escala   |

---

## Impacto en compatibilidad

- **Backend**: nuevo endpoint `GET /api/v1/devices/summary` — no rompe nada
- **Frontend**: `Dashboard.jsx` necesita refactor para manejar N devices
- **SSE**: el stream actual ya incluye `deviceId` en cada evento — compatible
- **Rutas**: `/devices/:id` (vista detalle) no cambia

---

## Preguntas abiertas

1. ¿Cuántas cámaras máximas queremos soportar en la vista grid sin paginación? (sugerido: 12)
2. ¿El endpoint `/devices/summary` puede reutilizar datos del `GET /devices` existente o requiere uno nuevo?
3. ¿Hay algún diseño en los prototipos HTML (`Prototype_website_sush2/`) para la vista multi-dispositivo?

---

## Decisión

**Estado final:** DRAFT — Pendiente de revisión (depende de Fase 8)

**ADR generado:** Pendiente de aceptación
