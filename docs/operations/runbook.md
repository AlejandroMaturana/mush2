# Guía Operacional — Mush2

Procedimientos y runbooks para operar Mush2 en producción: monitoring, troubleshooting, incident response, maintenance.

---

## Monitoring Setup

### Health Checks

```bash
# API Health
curl http://localhost:3797/health
# { "status": "ok", "uptime": 3600 }

# HTTP Polling Health
curl http://localhost:3797/monitoring/health/polling
# { "status": "ok", "activeDevices": 3, "commandsPending": 0 }

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
cat .env | grep DB_

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
2. Timeout de petición HTTP
3. Firewall bloqueando puerto

**Diagnosticar:**

```bash
# 1. Verificar logs de backend
tail -f /var/log/mush2/backend.log | grep -i "timeout\|poll"

# 2. Verificar watchdog en firmware (Serial)
# [WDT] Software watchdog timeout — reiniciando

# 3. Verificar conectividad
curl -I http://localhost:3797/health

# 4. Monitorear dispositivos activos
curl http://localhost:3797/monitoring/health/polling | jq
```

**Fix:**

```cpp
// firmware/src/http_poller.cpp
http.setTimeout(10000);  // aumentar timeout
http.setConnectTimeout(5000);  // más tolerante
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
- Conexiones HTTP no cerradas

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
| **P4 Low** | Mejora, no urgente | 1 día | 2 semanas |

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
# - Port 3797 en uso → kill $pid
```

### Runbook: Watchdog Timeout en Firmware

**Detectar:** Múltiples reinicios del ESP32-S3 reportados en telemetría

```bash
# 1. Verificar contador de reboots en el firmware (estado SAFE si >5)
# 2. Revisar logs seriales: "[WDT] Software watchdog timeout"
# 3. Causas típicas:
#    - delay() bloqueante en taskSensors (AHT21 80ms)
#    - heap insuficiente en taskPoller
#    - I2C lock

# 4. Acción inmediata:
#    - Verificar que TASK_WDT_TIMEOUT >= delay más largo * 2
#    - Verificar esp_task_wdt_reset() en cada rama del código
#    - Conectar Serial para ver último mensaje antes del crash
```

---

## Security Maintenance

### Weekly Security Checks

```bash
# 1. Verificar dependencias desactualizadas
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

```sql
-- Borrar ciclos completados >1 año
DELETE FROM cycle_state WHERE cycleId IN (
  SELECT id FROM cultivation_cycle
  WHERE status = 'COMPLETED' AND updatedAt < NOW() - INTERVAL '1 year'
);

-- Comprimir telemetría >30 días
INSERT INTO telemetry_archive
SELECT * FROM telemetry WHERE timestamp < NOW() - INTERVAL '30 days';

DELETE FROM telemetry WHERE timestamp < NOW() - INTERVAL '30 days';

-- Vació
VACUUM ANALYZE;
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
   - HTTP polling funciona
   - API responde

5. **Communicate recovery** (2 min)
   - Update status page
   - Post-mortem scheduled

---

**Última actualización:** 2026-06-28  
**Aplicable a:** Mush2 v0.9.0+
