# Estándares de Codificación — Mush2

Guía integral para mantener código limpio, escalable y mantenible en todos los componentes del proyecto.

## Principios Generales

1. **Legibilidad**: El código debe ser autodocumentado y comprensible a primera vista
2. **Escalabilidad**: Diseño modular que facilite agregar nuevas características sin romper existentes
3. **Mantenibilidad**: Código consistente y estructurado que reduce errores y facilita debugging
4. **Seguridad**: Validación rigurosa de entradas, gestión segura de secretos, criptografía robusta
5. **Observabilidad**: Logging, tracing y monitoreo integral para diagnosticar problemas en producción

---

## Backend (Node.js / Express)

### Estructura de Carpetas

```
backend/src/
├── config/              # Configuración (env, db, logger)
├── models/              # Modelos Sequelize
├── routes/              # Definición de endpoints
├── controllers/         # Lógica de request/response (opcional si es simple)
├── services/            # Lógica de negocio (MQTT, control, criptografía)
├── middlewares/         # Auth, RBAC, tenant, error handling
├── utils/               # Funciones auxiliares (formatters, validators)
├── __tests__/           # Tests (Jest + Supertest)
├── app.js               # Configuración de Express
└── server.js            # Entry point
```

### Nomenclatura

- **Archivos**: `camelCase.js` (ej: `mqttService.js`, `controlEngine.js`)
- **Funciones/Métodos**: `camelCase` (ej: `connectMQTT()`, `evaluateCycle()`)
- **Constantes**: `UPPER_SNAKE_CASE` (ej: `MAX_RETRY_ATTEMPTS = 5`)
- **Clases/Modelos**: `PascalCase` (ej: `class Device { }`)
- **Variables**: `camelCase` (ej: `deviceList`, `isConnected`)

### Documentación con JSDoc

**Obligatorio** para:
- Funciones/métodos exportados
- Servicios principales
- Middlewares
- Funciones complejas o no obvias

**Formato:**

```javascript
/**
 * Conecta al broker MQTT con reintentos exponenciales.
 * 
 * @description
 * Intenta conectar primero al broker primario. Si falla, usa fallback.
 * Implementa backoff exponencial con máximo de 180 segundos.
 * 
 * @param {string} [brokerUrl] - URL del broker (default: env.MQTT.broker)
 * @returns {void}
 * 
 * @example
 * connectMQTT();
 * 
 * @emits {Object} mqtt:connected - Emitido cuando se conecta exitosamente
 * @emits {Object} mqtt:error - Emitido cuando hay error de conexión
 * 
 * @throws {Error} Si ambos brokers (primario y fallback) fallan permanentemente
 * 
 * @see {@link docs/contracts/mqtt-contract.md}
 */
export function connectMQTT(brokerUrl) {
  // implementación
}
```

### Manejo de Errores

**Patrón general:**

```javascript
try {
  // operación que puede fallar
  const result = await riiskyOperation();
  return result;
} catch (err) {
  // Log siempre con contexto
  console.error(`[SERVICE_NAME] Error doing X: ${err.message}`, { 
    code: err.code,
    context: { param1, param2 },
    stack: err.stack 
  });
  
  // Re-throw o retornar valor seguro según el caso
  throw new AppError('USER_FRIENDLY_MESSAGE', 500);
  // o
  return null; // si es recuperable
}
```

**Reglas:**
- NUNCA silenciar errores con `catch { }`
- SIEMPRE loguear con contexto ([SERVICE_NAME] ...)
- Diferenciar entre errores recuperables e irrecuperables
- Retornar errores HTTP apropiados (400, 401, 403, 500)

### Logging

**Prefijos de log obligatorios:**

```javascript
console.log('[DB]', 'Conexión establecida');
console.log('[MQTT]', 'Conectado a broker');
console.error('[CONTROL]', 'Error evaluando ciclo:', err.message);
console.warn('[AUTH]', 'Intento fallido de login', { userId, attempts });
```

**Niveles:**
- `console.log()` - INFO: eventos normales, transiciones, operaciones exitosas
- `console.warn()` - WARN: comportamientos inesperados pero recuperables
- `console.error()` - ERROR: errores que afectan funcionalidad
- Usar `util.inspect()` para objetos grandes

### Testing

**Requisitos:**

- Mínimo 70% cobertura en `/services`
- Mínimo 60% cobertura en `/routes`
- Tests en `__tests__/` usando Jest + Supertest
- Nombres descriptivos: `test('should validate email format', () => { })`

**Ejemplo:**

```javascript
describe('MQTT Service', () => {
  describe('connectMQTT()', () => {
    it('should connect to primary broker on success', async () => {
      // setup
      // act
      // assert
    });

    it('should fallback to secondary broker if primary fails', async () => {
      // setup
      // act
      // assert
    });

    it('should emit connected event when successful', (done) => {
      // setup
      events.once('mqtt:connected', () => {
        expect(isConnected()).toBe(true);
        done();
      });
      // act
    });
  });
});
```

### Validación de Entrada

**Usar middleware o validadores:**

```javascript
import { body, validationResult } from 'express-validator';

router.post('/devices', [
  body('deviceId').isLength({ min: 1, max: 50 }).trim().escape(),
  body('macAddress').isMACAddress(),
  body('status').isIn(['ONLINE', 'OFFLINE', 'ERROR']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // lógica segura
});
```

**Regla:** Validar SIEMPRE en entrada, NUNCA asumir datos correctos.

### Seguridad

- ✅ JWT con algoritmo HS256 o RS256
- ✅ Contraseñas con bcrypt (salt rounds ≥ 10)
- ✅ Secretos SOLO en `.env`, NUNCA en código
- ✅ Sanitizar input para prevenir SQL injection (Sequelize lo hace)
- ✅ Rate limiting en endpoints públicos
- ✅ CORS restrictivo
- ✅ CSP headers via Helmet
- ✅ Validar permisos RBAC en cada endpoint
- ❌ NO loguear tokens, passwords, API keys
- ❌ NO exponerse a XXRF, XSS, injection

---

## Frontend (React / Vite)

### Estructura de Carpetas

```
frontend/src/
├── components/          # Componentes reutilizables
├── pages/               # Páginas (layouts)
├── api/                 # Servicios API (axios/fetch)
├── hooks/               # Custom React hooks
├── context/             # Context API para estado global
├── utils/               # Utilidades (formatters, validators)
├── styles/              # CSS modular
├── __tests__/           # Tests (Vitest + React Testing Library)
├── App.jsx              # Root component
└── main.jsx             # Entry point
```

### Nomenclatura

- **Archivos componente**: `PascalCase.jsx` (ej: `DeviceCard.jsx`, `RecipeForm.jsx`)
- **Archivos utilidad**: `camelCase.js` (ej: `formatDate.js`, `fetchDevice.js`)
- **Props**: `camelCase` (ej: `deviceId`, `isLoading`)
- **Estados**: `camelCase` (ej: `const [selectedDevice, setSelectedDevice] = useState()`)

### Componentes

**Patrón:**

```jsx
/**
 * DeviceCard - Muestra información de un dispositivo individual.
 * 
 * @param {Object} props
 * @param {string} props.deviceId - ID único del dispositivo
 * @param {Object} props.device - Objeto dispositivo { id, name, status, ... }
 * @param {boolean} [props.isSelected=false] - Si está seleccionado
 * @param {Function} [props.onSelect] - Callback cuando se selecciona
 * 
 * @returns {React.ReactElement}
 */
export function DeviceCard({ deviceId, device, isSelected = false, onSelect }) {
  if (!device) return <div>Cargando...</div>;

  return (
    <div className={`device-card ${isSelected ? 'selected' : ''}`}>
      <h3>{device.name}</h3>
      <p>Estado: <strong>{device.status}</strong></p>
      <button onClick={() => onSelect?.(deviceId)}>Seleccionar</button>
    </div>
  );
}

DeviceCard.propTypes = {
  deviceId: PropTypes.string.isRequired,
  device: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    status: PropTypes.string,
  }),
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func,
};
```

### Hooks Personalizados

**Patrón:**

```javascript
/**
 * useFetchDevice - Hook para obtener datos de un dispositivo.
 * 
 * @param {string} deviceId - ID del dispositivo
 * @returns {Object} { device, loading, error, refetch }
 */
export function useFetchDevice(deviceId) {
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!deviceId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/v1/devices/${deviceId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setDevice(data);
        setError(null);
      } catch (err) {
        console.error('[useFetchDevice]', err.message);
        setError(err.message);
        setDevice(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deviceId]);

  return { device, loading, error, refetch: () => /* retry */ };
}
```

### State Management

- **Local**: `useState()` para estado de componente
- **Compartido**: `useContext()` para estado global (auth, tema)
- **Efectos**: `useEffect()` con dependencias explícitas
- **No global**: ❌ Redux (overkill para este proyecto)

### Testing

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceCard } from './DeviceCard';

describe('DeviceCard', () => {
  it('should render device name', () => {
    render(<DeviceCard device={{ name: 'Cámara 1' }} />);
    expect(screen.getByText('Cámara 1')).toBeInTheDocument();
  });

  it('should call onSelect when button clicked', () => {
    const onSelect = vi.fn();
    render(
      <DeviceCard 
        deviceId="d1" 
        device={{ name: 'C1' }} 
        onSelect={onSelect} 
      />
    );
    fireEvent.click(screen.getByText('Seleccionar'));
    expect(onSelect).toHaveBeenCalledWith('d1');
  });
});
```

---

## Firmware (C++ / PlatformIO)

### Estructura

```
firmware/
├── src/
│   ├── main.ino                      # Entry point
│   ├── config.h                      # Configuración y constantes
│   ├── state_machine.{h,cpp}         # Máquina de estados
│   ├── mqtt_handler.{h,cpp}          # MQTT pub/sub
│   ├── wifi_manager.{h,cpp}          # WiFi y reconexión
│   ├── [sensor]_sensor.{h,cpp}       # Drivers de sensores
│   ├── [actuator]_controller.{h,cpp} # Drivers de actuadores
│   └── ota_handler.{h,cpp}           # Actualizaciones OTA
├── platformio.ini                    # Configuración PlatformIO
└── data/                             # Datos estáticos (credenciales, certificados)
```

### Nomenclatura

- **Funciones**: `camelCase` (ej: `readSensor()`, `controlSSR()`)
- **Clases**: `PascalCase` (ej: `class MQTTHandler { }`)
- **Constantes**: `UPPER_SNAKE_CASE` (ej: `MAX_TEMP = 35`)
- **Macros**: `UPPER_SNAKE_CASE_WITH_PARENS` (ej: `#define DEBUG_LOG(msg)`)

### Documentación

**Comentarios:**

```cpp
/**
 * Lectura de sensor AHT21.
 * 
 * Lee temperatura y humedad del sensor AHT21 vía I2C.
 * Implementa reintentos en caso de error transitorio.
 * 
 * @param[out] temperature - Temperatura en °C (float)
 * @param[out] humidity - Humedad relativa en % (float)
 * @return true si lectura exitosa, false en error
 */
bool readAHT21Sensor(float &temperature, float &humidity) {
  // implementación
}
```

**Regla:** Documentar públicamente (funciones llamadas desde main, etc)

### Memory Management

- ✅ Usar `StaticJsonDocument` para JSON (no dynamic allocation)
- ✅ Pre-asignar buffers
- ✅ Evitar `String` (usa `char[]`)
- ❌ NO usar `new` / `malloc`

### Máquina de Estados

**Estados requeridos:**

```
BOOT → CONFIG → NORMAL → ERROR → RECOVERY → NORMAL
```

**Transiciones:**

```cpp
enum State { BOOT, CONFIG, NORMAL, ERROR, RECOVERY };

void updateStateMachine() {
  switch (currentState) {
    case BOOT:
      if (hasConfig && wifiConnected) {
        setState(CONFIG);
      }
      break;
    case CONFIG:
      if (mqttConnected && sensorsReady) {
        setState(NORMAL);
      }
      break;
    case NORMAL:
      if (sensorError || mqttError) {
        setState(ERROR);
      }
      break;
    case ERROR:
      if (recoveryAttempts++ > MAX_RETRIES) {
        setState(RECOVERY); // sleep profundo
      } else if (error resolved) {
        setState(BOOT);
      }
      break;
  }
}
```

### Comunicación MQTT

**Publish:**

```cpp
// Telemetría cada 30s
void publishTelemetry() {
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["ts"] = (uint32_t)(millis() / 1000);
  doc["sensors"]["temperature"] = temperature;
  doc["sensors"]["humidity"] = humidity;
  doc["sensors"]["co2"] = co2;
  
  char buffer[256];
  serializeJson(doc, buffer);
  mqtt.publish("mush2/telemetry/DEVICE_ID/sensors", buffer);
}
```

**Subscribe:**

```cpp
// Recibir comandos
void onMQTTMessage(const char* topic, const char* payload) {
  if (strcmp(topic, "mush2/command/DEVICE_ID/ssr") == 0) {
    StaticJsonDocument<128> doc;
    deserializeJson(doc, payload);
    
    int channel = doc["channel"];
    bool state = doc["state"];
    applySSRCommand(channel, state);
  }
}
```

---

## Estándares Transversales

### Git Commits

**Formato:** `[type](scope): description`

Ejemplos:
- `feat(backend): add RBAC middleware`
- `fix(firmware): prevent memory leak in MQTT handler`
- `docs(frontend): improve API hook documentation`
- `refactor(backend): extract validation to utils`
- `test(backend): add tests for controlEngine`
- `chore(deps): update express to 5.0.1`

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`

**Body (si es complejo):**

```
feat(backend): add RBAC middleware

Implement role-based access control for API endpoints.
Validates JWT token, extracts user role, checks permissions.

Closes #123
Refs #456
```

### CI/CD (GitHub Actions)

**Gating:**
- ✅ Tests pasen
- ✅ Cobertura >60% en nuevos archivos
- ✅ Linting (ESLint, Prettier)
- ✅ Security scan (dependencias, SAST)

### Revisión de Código

**Checklist del revisor:**

- ¿Cumple con coding standards?
- ¿Tiene tests?
- ¿Tiene documentación (JSDoc, comments)?
- ¿Rompe compatibilidad de protocolo?
- ¿Exposición de secretos?
- ¿Performance impact?
- ¿Escalabilidad futura?

---

## Escalabilidad y Performance

### Backend

- **Índices DB**: Crear índices en columnas de búsqueda frecuente
- **Caché**: Usar Redis para telemetría reciente, tokens JWT
- **Paginación**: Implementar siempre en listados (limit/offset)
- **Lazy loading**: No fetchear relaciones innecesarias (Sequelize `attributes`)
- **Connection pooling**: Configurar pool de conexiones PostgreSQL

### Frontend

- **Code splitting**: Lazy load páginas con `React.lazy()`
- **Memoization**: Usar `useMemo()`, `useCallback()` en listas grandes
- **Virtual scrolling**: Para listados >100 items
- **Image optimization**: Usar formatos modernos (webp), thumbnail
- **Bundle size**: Monitorear con `vite-bundle-visualizer`

### Firmware

- **Power consumption**: Deep sleep cuando sea posible
- **Memory**: No guardar históricos en RAM, persistir en DB
- **Network**: Batching de telemetría antes de enviar

---

## Versionado de esta Guía

Última actualización: 2026-06-13  
Aplicable a: `backend ≥0.1.0`, `frontend ≥0.1.0`, `firmware ≥0.1.0`

Cambios previos se documentan en `CHANGELOG.md`.
