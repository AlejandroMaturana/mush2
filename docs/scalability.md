# Guía de Escalabilidad — Mush2

Estrategias, patrones y best practices para escalar Mush2 a miles de dispositivos y usuarios sin degradación de performance.

---

## Niveles de Escalabilidad

### Nivel 1: Desarrollo (1-10 dispositivos)

**Setup:**
- PostgreSQL local o Docker container
- Broker MQTT simple (Mosquitto)
- Backend en máquina personal

**Límites:**
- ~100 mensajes MQTT/segundo
- ~50 usuarios concurrentes
- ~500GB histórico máximo

**Requisitos:**
- RAM: 4GB
- CPU: 2 cores
- Disk: 100GB SSD

---

### Nivel 2: Piloto (10-100 dispositivos)

**Setup:**
- PostgreSQL en VM dedicado
- MQTT broker en VPS
- Backend containerizado (Docker)
- Frontend static site

**Optimizaciones necesarias:**
- [ ] Connection pooling PostgreSQL (max: 20 conexiones)
- [ ] Índices en columnas de búsqueda
- [ ] Rate limiting en API
- [ ] Caching de recetas frecuentes

**Límites:**
- ~1000 mensajes MQTT/segundo
- ~500 usuarios concurrentes
- ~5TB histórico

**Requisitos:**
- RAM: 8GB
- CPU: 4 cores
- Disk: 500GB SSD
- Ancho de banda: 100Mbps

---

### Nivel 3: Producción (100-1000 dispositivos)

**Setup:**
- PostgreSQL replicado (primary + replicas)
- MQTT broker cluster (3+ nodos HiveMQ)
- Backend múltiples instancias (load balancer)
- Frontend CDN global

**Optimizaciones necesarias:**
- [ ] Sharding de data por región/tenant
- [ ] Redis cache para sesiones + recetas
- [ ] Connection pooling avanzado (pgBouncer)
- [ ] Compresión de histórico viejo
- [ ] Replication de MQTT
- [ ] Auto-scaling de backend

**Límites:**
- ~10,000 mensajes MQTT/segundo
- ~5,000 usuarios concurrentes
- ~50TB histórico

**Requisitos:**
- RAM: 32GB+ cluster
- CPU: 16+ cores cluster
- Disk: 2TB+ SSD
- Ancho de banda: 1Gbps

---

### Nivel 4: Empresa (1000+ dispositivos)

**Setup:**
- PostgreSQL multi-regional con replicación lógica
- MQTT broker geo-distribuido (AWS IoT Core / Azure IoT Hub)
- Kubernetes cluster para backend
- GraphQL API para queries complejas
- Search engine (Elasticsearch) para auditoría

**Optimizaciones necesarias:**
- [ ] Event sourcing para auditoria
- [ ] CQRS pattern (reads separados de writes)
- [ ] Message queue (RabbitMQ, Kafka)
- [ ] Time-series database (InfluxDB, TimescaleDB)
- [ ] CDN para assets
- [ ] Service mesh (Istio)

**Límites:**
- ~100,000+ mensajes/segundo
- ~50,000+ usuarios concurrentes
- Terabytes histórico con query <100ms

**Requisitos:**
- Multi-region deployment
- Managed services (RDS, DMS, ElastiCache)
- 24/7 SRE team

---

## Optimizaciones por Componente

### Backend (Node.js)

#### Connection Pooling

**Antes (problema):**

```javascript
// Sin pooling: nueva conexión por request
const client = new Client(connectionString);
await client.connect();
await client.query('SELECT...');
await client.end();  // + latencia conexión
```

**Después (optimizado):**

```javascript
// Con pooling: reutiliza conexiones
const pool = new Pool({
  max: 20,              // máximo conexiones simultáneas
  min: 2,               // mínimo siempre activas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const result = await pool.query('SELECT...');
// Conexión reutilizada del pool
```

**Impacto:** -50% latencia, -80% conexiones simultáneas

#### Índices de Base de Datos

**Críticos:**

```sql
-- Búsqueda por dispositivo
CREATE INDEX idx_telemetry_device_timestamp
ON telemetry(deviceId, timestamp DESC);

-- Búsqueda de ciclos activos
CREATE INDEX idx_cultivation_cycle_status_phase
ON cultivation_cycle(status, currentPhase);

-- Búsqueda de usuarios
CREATE INDEX idx_user_username
ON "user"(username UNIQUE);

-- Auditoría por usuario
CREATE INDEX idx_audit_log_user_action
ON audit_log(userId, action, createdAt DESC);
```

**Costo:** +50MB storage, +1-2ms en INSERTs  
**Beneficio:** -80% latencia en queries

#### Caché en Redis

```javascript
// Cachear recetas (stale si >1 hora)
const recipe = await redis.get(`recipe:${id}`);
if (!recipe) {
  recipe = await Recipe.findByPk(id);
  await redis.setex(`recipe:${id}`, 3600, JSON.stringify(recipe));
}

// Cachear sesiones JWT
await redis.setex(`session:${token}`, 86400, JSON.stringify(user));

// Rate limiting
const key = `ratelimit:${userId}:${minute}`;
const count = await redis.incr(key);
if (count > 100) throw new RateLimitError();
```

**Impacto:** -70% DB load, -90% latencia recetas

#### Compresión de Datos Históricos

```javascript
// Script de compresión mensual
export async function compressOldTelemetry() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Agregar data: tomar promedio por hora
  const oldReadings = await Telemetry.findAll({
    where: { timestamp: { [Op.lt]: thirtyDaysAgo } },
  });

  for (const batch of chunk(oldReadings, 1000)) {
    const hourly = groupByHour(batch);
    // Insertar en tabla comprimida (hourly_telemetry)
    // Borrar originals
  }

  console.log(`[COMPRESS] Reduced ${oldReadings.length} records to ~${oldReadings.length / 24}`);
}

// Schedule: cron job mensual
schedule.scheduleJob('0 3 1 * *', compressOldTelemetry);
```

**Impacto:** -90% disk para data vieja, queries más rápidas

---

### Frontend (React)

#### Code Splitting

```jsx
// Antes: todo en bundle.js (~500KB)
import RecipeEditor from './pages/RecipeEditor';

// Después: lazy load por ruta
const RecipeEditor = lazy(() => import('./pages/RecipeEditor'));

<Suspense fallback={<Loading />}>
  <RecipeEditor />
</Suspense>
```

**Impacto:** -60% bundle inicial, LCP <2s en 3G

#### Memoization

```jsx
// Evita re-render de gráficos costosos
const MemoizedChart = memo(({ data, selectedPhase }) => {
  const filteredData = useMemo(
    () => data.filter(d => d.phase === selectedPhase),
    [data, selectedPhase]
  );
  
  const handleUpdate = useCallback(
    (newValue) => { /* ... */ },
    [selectedPhase]
  );

  return <Chart data={filteredData} onChange={handleUpdate} />;
});
```

**Impacto:** -50% renders innecesarios

#### Virtual Scrolling

```jsx
// Para listas >100 items
import { FixedSizeList as List } from 'react-window';

<List height={600} itemCount={10000} itemSize={50} width="100%">
  {({ index, style }) => (
    <div style={style}>
      <DeviceRow device={devices[index]} />
    </div>
  )}
</List>
```

**Impacto:** Renderiza solo items visibles, -95% DOM nodes

---

### Firmware (ESP8266)

#### Batching de Telemetría

```cpp
// Antes: envía cada lectura (30/segundo) = bloat MQTT
void loop() {
  float temp = readTemp();
  mqttClient.publish("mush2/telemetry/...", jsonPayload);
  delay(1000);
}

// Después: agrupa 10 lecturas, envía cada 30s
telemetryBuffer[bufferIndex++] = { temp, humidity, co2 };
if (bufferIndex >= 10 || timeElapsed >= 30000) {
  StaticJsonDocument<512> doc;
  doc["readings"] = serializeArray(telemetryBuffer);
  mqttClient.publish("mush2/telemetry/...", payload);
  bufferIndex = 0;
}
```

**Impacto:** -90% mensajes MQTT, -85% WiFi overhead

#### Deep Sleep para Modo Bajo Consumo

```cpp
// Configurable por receta
if (shouldEnterLowPowerMode()) {
  WiFi.mode(WIFI_OFF);
  rtc_gpio_pullup_dis(GPIO_NUM_15);
  esp_sleep_enable_timer_wakeup(sleepDuration);
  esp_deep_sleep_start();
  // RAM se mantiene en RTC, ~10µA consumo
}
```

**Impacto:** -95% consumo energía en fases pasivas

---

## Patrones de Escalabilidad

### 1. Database Replication

**Setup master-replica:**

```yaml
# Primary (escrituras)
PostgreSQL Primary
  ↓
  Replicación streaming
  ↓
PostgreSQL Replica (solo lectura)

# Queries
INSERT/UPDATE → Primary
SELECT → Replica (para reportes históricos)
```

**SQL Setup:**

```sql
-- En Primary
ALTER SYSTEM SET wal_level = replica;
CREATE PUBLICATION app_pub FOR ALL TABLES;

-- En Replica
CREATE SUBSCRIPTION app_sub CONNECTION 'primary_dsn' PUBLICATION app_pub;
```

### 2. Load Balancing

**Con Nginx:**

```nginx
upstream backend {
  least_conn;  # Algoritmo least connections
  server backend1.local:3797 weight=1;
  server backend2.local:3797 weight=1;
  server backend3.local:3797 weight=1;
}

server {
  listen 80;
  location /api/v1 {
    proxy_pass http://backend;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

### 3. Circuit Breaker Pattern

```javascript
import CircuitBreaker from 'opossum';

const db = new CircuitBreaker(async () => {
  return pool.query('SELECT * FROM devices');
}, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

try {
  const devices = await db.fire();
} catch (err) {
  if (err.message.includes('breaker')) {
    // fallback: servir cached version
    return getCachedDevices();
  }
}
```

### 4. Event Sourcing para Auditoría

```javascript
// Guardar cada cambio como evento inmutable
await AuditEvent.create({
  timestamp: new Date(),
  userId: req.user.id,
  action: 'CYCLE_STARTED',
  entityId: cycle.id,
  changes: {
    before: null,
    after: { recipeId, chamberId, startDate },
  },
});

// Reconstruir estado desde eventos
function getCycleStateAt(cycleId, timestamp) {
  const events = await AuditEvent.findAll({
    where: { entityId: cycleId, timestamp: { [Op.lte]: timestamp } },
  });
  
  let state = {};
  for (const event of events) {
    state = { ...state, ...event.changes.after };
  }
  return state;
}
```

---

## Monitoreo y Observabilidad

### Métricas Clave

```javascript
// Latencia API por endpoint
console.time('GET /devices');
const devices = await getDevices();
console.timeEnd('GET /devices');  // ~45ms

// DB connection pool
console.log(pool.idleCount, '/', pool.totalCount);  // 8 / 20

// MQTT throughput
let msgCount = 0;
mqtt.on('message', () => {
  msgCount++;
  if (msgCount % 1000 === 0) {
    console.log(`[MQTT] ${msgCount} messages processed this minute`);
  }
});

// Memory usage
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`[MEMORY] heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
  if (mem.heapUsed > 1.2 * 1024 * 1024 * 1024) {  // >1.2GB
    console.warn('[MEMORY] Approaching limit, consider scaling');
  }
}, 60000);
```

### Alertas

| Métrica | Umbral | Acción |
|---|---|---|
| Latencia API p99 | >500ms | Investigar queries lentas |
| CPU | >80% | Escalar horizontalmente |
| Memory | >85% | Revisar memory leaks, escalar |
| DB connections | >90% maxPool | Aumentar pool size |
| MQTT disconnect | >30s | Verificar broker, reconnect |
| Error rate | >1% | Revisar logs, rollback si es reciente |

---

## Capacidad Estimada

| Métrica | Nivel 2 | Nivel 3 | Escalable? |
|---|---|---|---|
| Dispositivos conectados | 100 | 1,000 | ✅ Sharding |
| Mensajes MQTT/sec | 1,000 | 10,000 | ✅ MQTT cluster |
| Usuarios concurrentes | 500 | 5,000 | ✅ Load balancer |
| Histórico (dias) | 30 | 365 | ✅ Compresión |
| Query latency p95 | 100ms | <500ms | ✅ Índices + caché |
| Storage (GB) | 500 | 2,000 | ✅ Compresión |

---

## Checklist de Escalabilidad

Antes de pasar a siguiente nivel:

- [ ] Connection pooling configurado
- [ ] Índices de DB creados y verificados (EXPLAIN)
- [ ] Rate limiting implementado
- [ ] Caché (Redis) en datos frecuentes
- [ ] Monitoreo de metrics (Prometheus, DataDog)
- [ ] Alertas configuradas
- [ ] Load testing exitoso (>2x carga esperada)
- [ ] Graceful shutdown implementado
- [ ] Data backups automatizados (diarios)
- [ ] Disaster recovery plan

---

## Referencias

- PostgreSQL Scalability: https://wiki.postgresql.org/wiki/Performance_Optimization
- Node.js Best Practices: https://nodejs.org/en/docs/guides/nodejs-performance/
- MQTT Scalability: https://www.hivemq.com/article/mqtt-scalability/
- React Performance: https://react.dev/learn/render-and-commit

---

**Última actualización:** 2026-06-13  
**Aplicable a:** Mush2 v0.1.0+
