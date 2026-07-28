# ADR-029: Environment Isolation

**Estado:** Aceptado

**Fecha:** 2026-07-27

---

# Resumen

Establece la arquitectura de aislamiento entre ambientes de Mush2. Cada ambiente (development, production, etc.) posee infraestructura completamente independiente: bases de datos, brokers MQTT, redes Docker y configuración. El sistema valida activamente la consistencia del ambiente durante el arranque e impide el inicio si detecta una configuración cruzada.

---

# Contexto

Durante el desarrollo de Mush2 se detectó que los entornos de desarrollo y producción podían compartir infraestructura crítica. El backend ejecutado localmente mediante Docker Desktop podía resolver recursos pertenecientes al despliegue de producción, provocando:

* Incertidumbre operacional sobre qué base de datos estaba activa.
* Riesgo de afectar servicios productivos desde desarrollo.
* Diagnósticos complejos cuando los datos no eran reproducibles.

El problema raíz no es Docker, Render o PostgreSQL individualmente; es la **ausencia de una política arquitectónica de aislamiento**. La separación dependía de convenciones manuales, no de garantías verificables por el sistema.

---

# Decisión

## 1. Principio: Zero Shared Infrastructure by Default

Ningún recurso productivo puede ser utilizado desde desarrollo por configuración implícita. Cada ambiente debe ser autocontenedor.

## 2. Infraestructura por Ambiente

| Recurso | Development | Production |
|---------|-------------|------------|
| PostgreSQL | `mush2-dev-postgres` (Docker local) | Render PostgreSQL addon |
| Mosquitto | `mush2-dev-mosquitto` (Docker local) | VPS o servicio externo |
| Backend | `localhost:3797` (node --watch) | Render Web Service |
| Network | `mush2-dev-internal` (Docker) | Infraestructura Render |
| Volumes | `mush2-dev-pgdata`, `mush2-dev-mosquitto-*` | Render managed volumes |

## 3. ConfigurationService con Fail-Fast

El backend debe validar su configuración durante el arranque y detenerse inmediatamente si detecta:

* Variables obligatorias faltantes.
* Configuraciones incompatibles con el ambiente declarado.
* Conexiones a infraestructura que no corresponde al ambiente actual.

## 4. Environment Variables Explícitas

Las variables de entorno deben expresar explícitamente el ambiente al que pertenecen. No existen variables "compartidas por accidente".

## 5. Docker Compose Separado

El desarrollo utiliza un `docker-compose.dev.yml` independiente del `docker-compose.yml` de producción. Nunca se comparten archivos compose.

---

# Justificación

* **Resuelve el problema inmediato:** Elimina la posibilidad de que el backend de desarrollo conecte a la base de datos de producción.
* **Previene regresiones:** Las validaciones fail-fast detectan configuraciones peligrosas antes de que causen daño.
* **Base para futuras etapas:** El modelo de ambientes es extensible a staging, laboratory, testing sin refactorizar.
* **Simplicidad:** No introduce herramientas externas ni frameworks nuevos; usa Docker Compose y variables de entorno existentes.

---

# Alternativas Consideradas

## Alternativa A: Solo documentar la separación

### Ventajas

* Sin cambios de código
* Implementación inmediata

### Desventajas

* No previene errores humanos
* La separación depende de disciplina, no de sistema

### Motivo del descarte

Contradice el principio *Fail Fast*. La separación documentada sin validación automática no elimina el riesgo.

---

## Alternativa B: Usar Docker profiles en un solo compose

### Ventajas

* Un solo archivo compose
* Menos mantenimiento

### Desventajas

* Acoplamiento: un cambio en development puede afectar production
* No resuelve la separación de datos (misma DB instance)
* Más complejo de entender para nuevos desarrolladores

### Motivo del descarte

El objetivo es aislamiento completo, no solo separación de servicios. Un compose unificado con profiles no garantiza que las bases de datos sean independientes.

---

## Alternativa C: Infrastructure as Code (Terraform/Pulumi)

### Ventajas

* Aislamiento completo en la nube
* Reproducibilidad total

### Desventajas

* Sobreingeniería para la escala actual
* Curva de aprendizaje innecesaria
* No resuelve el problema local (Docker Desktop)

### Motivo del descarte

El proyecto actualmente opera con Docker Desktop (local) y Render (producción). IaC es una capacidad futura (etapas 12E-12J), no una necesidad de la etapa 12.0.

---

# Consecuencias

## Positivas

* Desarrollo completamente aislado de producción
* Detección inmediata de configuraciones peligrosas
* Docker Desktop puede iniciarse/detenerse sin afectar producción
* Base arquitectónica clara para futuros ambientes

## Negativas

* Requiere mantener `.env.development` sincronizado con cambios en variables
* Docker Desktop es obligatorio para desarrollo (ya lo era)

## Riesgos

* Si se agrega una nueva variable de entorno obligatoria, debe documentarse en `.env.development`
* La validación fail-fast puede retrasar el arranque si hay errores de configuración (deseable)

---

# Impacto en la Arquitectura

| Componente | Impacto |
|------------|---------|
| Backend | ConfigurationService nuevo; env.js actualizado; server.js modificado |
| Docker | Nuevo docker-compose.dev.yml; contenedores con nombres aislados |
| Database | PostgreSQL de desarrollo independiente con volumen propio |
| MQTT | Mosquitto de desarrollo independiente |
| Frontend | Sin cambios (excluido de esta etapa) |
| Firmware | Sin cambios (excluido de esta etapa) |

---

# Reglas Derivadas

| ID | Regla |
|----|--------|
| ADR-029-R01 | Todo ambiente posee una instancia de PostgreSQL independiente |
| ADR-029-R02 | Todo ambiente posee un broker MQTT independiente |
| ADR-029-R03 | El ConfigurationService valida la configuración antes de que server.js establezca conexiones |
| ADR-029-R04 | Una configuración cruzada debe provocar FATAL y exit(1) |
| ADR-029-R05 | El docker-compose.dev.yml es independiente del docker-compose.yml |
| ADR-029-R06 | Ninguna variable de entorno puede asumir valores de otro ambiente por defecto |

---

# Implementación

| Módulo | Cambio |
|--------|--------|
| `backend/src/config/ConfigurationService.js` | Nuevo: validación fail-fast de configuración |
| `backend/src/config/env.js` | Actualizado: centraliza todas las variables de entorno |
| `backend/src/server.js` | Modificado: ejecuta validación antes de DB authenticate |
| `backend/src/services/mqttBridge.js` | Modificado: usa env.js en lugar de process.env directo |
| `docker-compose.dev.yml` | Nuevo: stack de desarrollo aislado |
| `.env.development` | Nuevo: configuración por defecto para desarrollo |
| `.gitignore` | Actualizado: exclusión de .env.development |

---

# Validación

1. Iniciar el backend con `.env.development` → debe arrancar correctamente.
2. Modificar `DATABASE_URL` para apuntar a una IP externa → debe fallar con FATAL.
3. Configurar `NODE_ENV=production` sin `JWT_SECRET` → debe fallar con FATAL.
4. Iniciar Docker Desktop con `docker-compose.dev.yml` → debe crear contenedores independientes.
5. Verificar que los contenedores de desarrollo tienen nombres diferentes a los de producción.
6. Detener Docker Desktop → la infraestructura de Render no debe verse afectada.

---

# ADR Relacionados

* ADR-024 — Estrategia de Despliegue HTTPS (complementa: TLS en infraestructura, no en app)
* ADR-023 — Infraestructura MQTT Segura (complementa: MQTT por ambiente)

---

# Referencias

* DDD-009 — Configuration & Environment Model
* ISSUE-environment-isolation.md — Especificación de la etapa 12.0
* ISSUE-infrast_env-management.md — Roadmap completo de ambientes

---

# Historial de Cambios

| Versión | Fecha | Cambio |
|----------|---------|--------|
| 1.0 | 2026-07-27 | Creación del documento (ACEPTADO) |

---

*Documento generado como parte del proceso de Architecture Decision Records de Mush2.*
