# ADR-016: Política de Capacidades Basada en Suscripción (Capability-Based Subscription)

**Fecha**: 2026-07-11  
**Estado**: Aceptado

## Contexto

La plataforma proporciona control ambiental de extremo a extremo para sistemas de cultivo de hongos mediante dispositivos IoT, procesamiento de telemetría, automatización, almacenamiento histórico y servicios en la nube.

El costo operativo de la plataforma no es constante. A medida que aumenta el uso, también lo hacen recursos como: almacenamiento de telemetría, ancho de banda, procesamiento de eventos, frecuencia de sincronización, notificaciones, analítica, generación de reportes, ejecución de automatizaciones, acceso concurrente y mantenimiento de infraestructura.

Al mismo tiempo, existen usuarios con necesidades muy diferentes: laboratorio personal, cultivador hobby, producción semiindustrial y producción industrial. Un modelo uniforme obligaría a dimensionar la infraestructura para el peor escenario, trasladando el costo a todos los usuarios independientemente de su consumo.

## Problema

¿Cómo asignar capacidades de la plataforma de manera que sea técnicamente escalable, refleje el consumo real de recursos, permita evolucionar el producto sin fragmentar la arquitectura y mantenga una única base de código?

## Decisión

La plataforma implementará un **Capability-Based Subscription Model**. La suscripción representa una política de asignación de capacidades y recursos, no una diferencia funcional del controlador.

Todos los usuarios ejecutan el mismo firmware, utilizan la misma API y comparten la misma arquitectura. Las diferencias entre planes se expresan mediante:

- capacidades habilitadas;
- cuotas (*quotas*);
- límites operacionales;
- calidad de servicio (*Quality of Service*);
- frecuencia de actualización;
- tiempo de retención de datos.

Estas políticas serán aplicadas mediante autorización basada en capacidades (*feature flags*, *claims* y *quotas*), evitando bifurcaciones del código.

## Principios Arquitectónicos

### 1. El controlador nunca pierde funciones críticas

La seguridad operacional no depende del plan contratado. Siempre estarán disponibles: alarmas críticas, protección del hardware, automatizaciones de seguridad, funcionamiento autónomo (*offline*), recuperación ante fallos, watchdogs y control ambiental básico.

### 2. La nube sí puede escalar por capacidades

Las funciones cuyo costo aumenta con el uso podrán limitarse. Ejemplos: historial, dashboards, analítica, exportaciones, API, usuarios, organizaciones, dispositivos, frecuencia de sincronización, procesamiento IA, reglas avanzadas e integraciones externas.

### 3. Las cuotas representan consumo

Los límites no son arbitrarios. Cada cuota corresponde a un recurso medible. Ejemplos: GB almacenados, eventos procesados, mensajes MQTT, consultas API, dispositivos registrados, automatizaciones activas, frecuencia de refresco y tiempo de retención.

### 4. El software permanece único

No existirán versiones distintas del backend. La plataforma se construye una sola vez. Las capacidades se habilitan dinámicamente.

## Clasificación de Capacidades

Toda capacidad en la plataforma se clasifica en una de las siguientes categorías antes de su implementación:

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **Capacidad** | Funcionalidad habilitada/deshabilitada | `automation.recipes`, `integrations.mqtt` |
| **Recurso** | Entidad consumible con límite | `devices.max`, `storage.gb` |
| **Cuota** | Límite medible sobre un recurso | `api.requests.per_month`, `data.retention.days` |
| **Política** | Regla de comportamiento del sistema | `qos.refresh_rate`, `disposition.cancel` |

## Motivos

1. **Escalabilidad de infraestructura**: Los costos operativos se alinean con el consumo real, permitiendo dimensionar recursos por demanda.
2. **Evolución sin fragmentación**: Nuevas capacidades se agregan como políticas, no como forks del código.
3. **Mantenibilidad**: Una única API, un único firmware y un único backend reducen la carga de mantenimiento.
4. **Seguridad**: Las funciones críticas del controlador son independientes del plan, garantizando la integridad del cultivo.

## Consecuencias

### Positivas

- Infraestructura escalable alineada con el consumo.
- Evolución sencilla del catálogo de capacidades (una sola arquitectura, una sola API, un solo firmware).
- Incorporación de nuevas capacidades sin modificar el núcleo.

### Negativas

- Mayor complejidad en autorización (middleware de capabilities).
- Mayor cantidad de pruebas (matrices de planes × capacidades).
- Necesidad de auditar permanentemente las capacidades.
- Dependencia de un sistema de políticas consistente.

## Principio rector

> **El hardware controla el ambiente. La plataforma administra capacidades. La suscripción nunca compromete la seguridad del cultivo; únicamente determina el nivel de acceso a recursos compartidos y servicios de valor agregado.**

## Documentos complementarios

- `docs/architecture/capability-catalog.md` — catálogo detallado de capacidades, recursos, cuotas y políticas.
- `docs/architecture/authorization-model.md` — modelo de autorización basado en capacidades.
- `docs/architecture/qos-policy.md` — políticas de calidad de servicio por plan.
- `docs/RFC/RFC-0006-realtime-streaming.md` — RFC de streaming en tiempo real.
- `docs/RFC/RFC-0007-device-limits.md` — RFC de límites de dispositivos.

## Referencias

- Implementación base: `backend/src/models/Subscription.js`
- Middleware de cuota: `backend/src/middlewares/subscriptionRateLimit.js`
- Rutas de suscripción: `backend/src/routes/subscriptions.js`
- Job de retención: `backend/src/jobs/dataRetentionJob.js`
- Frontend: `frontend/src/pages/settings/SubscriptionSettings.jsx`

---

Autor: AlejandroMaturana
