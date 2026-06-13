# Guía Operacional — Mush2

Procedimientos y runbooks para operar Mush2 en producción: monitoring, troubleshooting, incident response, maintenance.

---

## Monitoring Setup

### Health Checks

```bash
# API Health
curl http://localhost:3797/health
# { "status": "ok", "uptime": 3600 }

# MQTT Health
curl http://localhost:3797/monitoring/health/mqtt
# { "status": "ok", "mqtt": "connected" }

# DB Health (endpoint admin)
curl http://localhost:3797/monitoring/health/db -H "Authorization: Bearer $ADMIN_TOKEN"
# { "status": "ok", "pool": "8/20" }
```

### Prometheus Metrics (recomendado)

Instalar dependencia `prom-client`:

```bash
pnpm add prom-client
```

Exponer en endpoint `/metrics`:

```javascript
import promClient from 'prom-client';

app.get('/metrics', async (req, res) => {
  const metrics = await promClient.register.metrics();
  res.type('text/plain').send(metrics);
});

// Custom metrics
const httpLatency = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'route', 'status_code'],
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpLatency.labels(req.method, req.route.path, res.statusCode).observe(duration);
  });
  next();
});
```

---

## Troubleshooting Guide

### Problema: Backend no inicia

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solución:**

```bash
# 1. Verificar PostgreSQL
psql -U postgres -c "SELECT version();"

# 2. Verificar variables de entorno
cat .env.local | grep DB_

# 3. Verificar conectividad
telnet localhost 5432

# 4. Revisar logs
sudo tail -f /var/log/postgresql/postgresql.log
```

---

### Problema: Dispositivos desconectados periódicamente

**Síntomas:** Dispositivos aparecen OFFLINE cada 30 min

**Causas posibles:**
1. WiFi inestable
2. Broker MQTT con límite de conexiones
3. Firewall bloqueando puerto MQTT

**Diagnosticar:**

```bash
# 1. Verificar logs de broker MQTT
mosquitto_sub -h mqtt.broker -v -t 'mush2/state/+/online'

# 2. Verificar keepalive en firmware
# En config.h: #define MQTT_KEEPALIVE 30

# 3. Verificar firewall
sudo iptables -L -n | grep 1883

# 4. Monitorear conexiones MQTT
watch -n 1 "mqtt_sub -h localhost -t '\$SYS/broker/clients/connected'"
```

**Fix:**

```cpp
// firmware/src/mqtt_handler.cpp
mqttClient.setKeepAlive(60);  // aumentar de 30 a 60 segundos
mqttClient.setConnectTimeout(5000);  // más tolerante
```

---

### Problema: Queries lentas (>500ms)

**Diagnosticar:**

```sql
-- Encontrar queries lentas en PostgreSQL
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 500
ORDER BY mean_time DESC;

-- Analizar específica query
EXPLAIN ANALYZE
SELECT * FROM telemetry
WHERE deviceId = 1
AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC
LIMIT 100;

-- Ver índices sin usar
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

**Fix typical:**

```sql
-- Agregar índice
CREATE INDEX CONCURRENTLY idx_telemetry_device_timestamp
ON telemetry(deviceId, timestamp DESC);

-- Vacuum
VACUUM ANALYZE telemetry;

-- Ver estadísticas
SELECT pg_size_pretty(pg_total_relation_size('telemetry'));
```

---

### Problema: Memoria Backend aumenta constantemente

**Diagnosticar:**

```javascript
// En backend, agregue endpoint debug
app.get('/debug/memory', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(mem.external / 1024 / 1024)}MB`,
  });
});

// Monitorear
curl http://localhost:3797/debug/memory | jq

// Si sube constantemente → memory leak
// Ver event listeners sin cleanup:
// grep -r "\.on(" src/ | grep -v "\.off("
```

**Causas comunes:**
- Event listeners no removidos
- Timers sin clearInterval
- Caches sin TTL
- Conexiones MQTT no cerradas

---

## Mantenimiento Preventivo

### Daily (automático)

```bash
# Script: scripts/maintenance/daily.sh
#!/bin/bash

# 1. Backup DB
pg_dump -h localhost -U postgres mush2 | gzip > backups/daily-$(date +%Y%m%d).sql.gz

# 2. Limpiar logs antiguos
find logs/ -name "*.log" -mtime +30 -delete

# 3. Verificar health
curl -f http://localhost:3797/health || alert "Backend health check failed"
```

Cron:

```bash
crontab -e
# 0 2 * * * /app/scripts/maintenance/daily.sh
```

### Weekly

```bash
# Verificar performance
psql -U postgres -d mush2 -c "VACUUM ANALYZE;"

# Revisar audit logs
SELECT COUNT(*) FROM audit_log WHERE createdAt > NOW() - INTERVAL '7 days';

# Analizar índices no usados
SELECT indexname FROM pg_stat_user_indexes WHERE idx_scan = 0;
```

### Monthly

```bash
# Comprimir telemetría antigua
pnpm run compress:telemetry

# Revisar tech debt
# Revisar thresholds de alertas
# Revisar capacidad (disk, memory, conexiones)
# Revisar security updates en dependencias
```

---

## Incident Response

### Severidad de Incidents

| Nivel | Descripción | SLA Respuesta | SLA Resolución |
|---|---|---|---|
| **P1 Critical** | Servicio caído | 5 min | 30 min |
| **P2 High** | Funcionalidad degradada | 15 min | 2 horas |
| **P3 Medium** | Bug afectando usuarios | 1 hora | 8 horas |
| **P4 Low** | Mejora, no urgent | 1 día | 2 semanas |

### Runbook: Backend Crashed

**Detectar:** Health check falla 3+ veces

```bash
# 1. Verificar status
systemctl status mush2-backend

# 2. Revisar logs
tail -f /var/log/mush2/backend.log

# 3. Reiniciar
systemctl restart mush2-backend

# 4. Verificar recovery
sleep 10
curl http://localhost:3797/health
```

**Si no inicia:**

```bash
# Ver error detallado
node backend/src/server.js

# Posibles errores:
# - DB unreachable → check postgres
# - MQTT unreachable → check broker
# - Port 3797 en uso → kill $pid
```

### Runbook: MQTT Broker Down

**Detectar:** `isMQTTConnected() === false` por >60s

```bash
# 1. Verificar conectividad
telnet mqtt.broker.com 1883

# 2. Verificar broker
mosquitto -v  # si es local

# 3. Si es HiveMQ, revisar dashboard
# https://admin.mqtt.broker.com/

# 4. Verificar logs broker
tail -f /var/log/mosquitto/mosquitto.log

# 5. Reiniciar si es necesario
systemctl restart mosquitto

# Backend automáticamente reconecta con backoff
```

### Runbook: DB Replication Lag

**Detectar:** `SELECT pg_last_xlog_receive_location()` lag > 10MB

```sql
-- En Primary
SELECT slot_name, slot_type, restart_lsn FROM pg_replication_slots;

-- Ver lag
SELECT
  slot_name,
  pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS lag_bytes
FROM pg_replication_slots;

-- Si lag > 500MB, revisar:
-- - Network latency (ifconfig, ping)
-- - Replica disk space
-- - Replica CPU/memory

-- Aumentar WAL retention
ALTER SYSTEM SET wal_keep_size = '5GB';
SELECT pg_reload_conf();
```

---

## Database Management

### Backup Strategy

**Incremental backups:**

```bash
#!/bin/bash
# Full backup diarios, WAL diarios

# Full backup (domingo)
pg_basebackup -h localhost -U postgres \
  -D backups/full-$(date +%Y%m%d) \
  -P -v

# Commit logs diarios
pg_archivecleanup -d backups/wal $(date -d '1 day ago' +%Y%m%d)
```

**Restore:**

```bash
# Stop backend
systemctl stop mush2-backend

# Restore DB
psql -U postgres < backups/daily-20260610.sql.gz

# Start backend
systemctl start mush2-backend

# Verify
curl http://localhost:3797/health
```

### Data Cleanup

```bash
-- Borrar ciclos completados >1 año
DELETE FROM cycle_state WHERE cycleId IN (
  SELECT id FROM cultivation_cycle
  WHERE status = 'COMPLETED' AND updatedAt < NOW() - INTERVAL '1 year'
);

-- Comprimir telemetría >30 días
INSERT INTO telemetry_archive
SELECT * FROM telemetry WHERE timestamp < NOW() - INTERVAL '30 days';

DELETE FROM telemetry WHERE timestamp < NOW() - INTERVAL '30 days';

-- Vacío
VACUUM ANALYZE;
```

---

## Security Maintenance

### Weekly Security Checks

```bash
# 1. Verificar dependencias desactualiz adas
pnpm audit

# 2. Revisar JWT secrets (nunca loguear)
grep -r "JWT_SECRET\|token" src/ | grep -v "test\|example"

# 3. Verificar .env en git (nunca!)
git log --all --full-history -- ".env*"

# 4. Ver users con acceso admin
psql -U postgres -d mush2 -c "SELECT username, role FROM user WHERE role = 'ADMIN';"

# 5. Revisar logs de acceso fallido
grep "401\|403" logs/access.log | tail -20
```

### Certificate Renewal (HTTPS)

```bash
# Si usas Let's Encrypt
sudo certbot renew --force-renewal

# Restart nginx/reverse proxy
sudo systemctl restart nginx

# Verify
curl https://your-domain.com/health
```

---

## Performance Tuning

### PostgreSQL Parameters

```sql
-- Ver parametros actuales
SHOW max_connections;
SHOW shared_buffers;
SHOW effective_cache_size;
SHOW work_mem;

-- Recommendations (8GB RAM server)
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '50MB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';

SELECT pg_reload_conf();
SELECT pg_reload_conf();  -- sí, dos veces

-- Restart para tomar efecto
sudo systemctl restart postgresql
```

### Node.js Flags

```bash
# Aumentar memory heap
node --max-old-space-size=4096 backend/src/server.js

# Enable profiling (producción NO)
node --prof backend/src/server.js

# Abort on uncaught exception (early exit)
node --abort-on-uncaught-exception backend/src/server.js
```

---

## Disaster Recovery Plan

### RTO/RPO Targets

- **RTO (Recovery Time Objective):** <30 minutos
- **RPO (Recovery Point Objective):** <1 hora

### Steps

1. **Evaluate damage** (5 min)
   - ¿Es DB? ¿Backend? ¿Ambos?
   - ¿Qué versión es data más reciente?

2. **Notify stakeholders** (5 min)
   - Status page
   - Email a usuarios

3. **Restore** (10-15 min)
   - Restore DB desde backup
   - Restart services
   - Verify health

4. **Validate** (5 min)
   - Queries funcionan
   - MQTT conecta
   - API responde

5. **Communicate recovery** (2 min)
   - Update status page
   - Post-mortem scheduled

---

## Logs y Auditoría

### Log Locations

```
/var/log/mush2/
├── backend.log        # Node.js app logs
├── access.log         # HTTP access logs (Nginx)
├── error.log          # HTTP errors (Nginx)
├── mqtt.log           # MQTT connection logs
└── db/
    └── postgresql.log # PostgreSQL logs
```

### Centralized Logging (recomendado)

```bash
# Con ELK Stack (Elasticsearch, Logstash, Kibana)
# Instalar beats (lightweight collectors)

curl -L https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-7.x.x-linux-x86_64.tar.gz | tar xz

# Configurar filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/mush2/*.log
  fields:
    service: mush2-backend

output.elasticsearch:
  hosts: ["elasticsearch:9200"]

# Dashboard en Kibana
# https://kibana:5601
```

---

## Checklist de Operaciones

**Diario:**
- [ ] Health checks passing
- [ ] No P1 incidents
- [ ] Backup completado

**Semanal:**
- [ ] Revisar logs (errors, warnings)
- [ ] Verificar disk space
- [ ] Analizar performance

**Mensual:**
- [ ] Security audit
- [ ] Dependency updates
- [ ] Capacity planning

---

**Última actualización:** 2026-06-13  
**Aplicable a:** Mush2 v0.1.0+
