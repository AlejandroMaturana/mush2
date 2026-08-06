# ADR-032: Configuration Governance

**Estado:** Aceptado

**Fecha:** 2026-08-05

---

# Resumen

Establece la gobernanza de la configuración persistente de Mush2. Toda configuración debe pertenecer a un único dominio propietario, poseer una única fuente de verdad y contar con al menos un consumidor identificado. Los parámetros heredados sin consumidores quedan prohibidos para nuevas funcionalidades y sujetos a un proceso documentado de saneamiento.

---

# Contexto

El módulo de Configuración del sistema fue simplificado. Durante esa intervención se realizó una auditoría completa de los parámetros persistentes con el objetivo de conocer qué configuraciones existen, dónde se almacenan, quién las consume y cuáles siguen siendo necesarias.

La auditoría reveló que la configuración evolucionó sin una política explícita. Existen parámetros activos, parámetros sin ningún consumidor, configuraciones duplicadas, múltiples fuentes de verdad para un mismo concepto e implementaciones parciales donde el dato guardado nunca es leído o el dato leído no se corresponde con ningún campo persistido. Varias de estas situaciones corresponden a deuda técnica histórica acumulada antes de la refundación domain-first.

Sin una política explícita, cada nueva configuración vuelve a reproducir el patrón: se agrega un parámetro, se expone en una interfaz o en una API, y nadie garantiza que tenga un propietario, un consumidor y una única fuente de verdad. El sistema quedaría condenado a acumular configuración muerta de forma permanente.

Este ADR formaliza las reglas que impiden esa acumulación. No registra la auditoría completa: documenta las decisiones arquitectónicas que la auditoría obliga a tomar.

---

# Problemas identificados

La auditoría encontró los siguientes problemas de tipo arquitectónico:

* **Múltiples fuentes de verdad.** Un mismo concepto de configuración se almacena en más de un lugar con criterios distintos de persistencia y prioridad.
* **Configuraciones sin consumidores.** Parámetros expuestos en la API o en la interfaz que ningún servicio, componente o firmware lee.
* **Implementaciones parciales.** Parámetros persistidos cuyos nombres no coinciden con los campos que los consumidores leen, produciendo fallos silenciosos.
* **Parámetros heredados.** Configuración correspondiente a diseños reemplazados que permanece activa en los modelos sin funcionalidad asociada.
* **Duplicación entre modelos.** Dos mecanismos de persistencia para el mismo dato, escritos de forma simultánea y leídos con precedencia inconsistente.
* **Separación poco clara entre Usuario, Dispositivo y Sistema.** Configuración de un dominio almacenada en el modelo de otro, o sin distinción de responsabilidad.
* **Ausencia de trazabilidad.** No es posible determinar quién declaró un parámetro, para qué se creó y si sigue vigente.

---

# Decisión

## 1. Toda configuración tendrá exactamente un dominio propietario

Ninguna configuración puede existir sin pertenecer a un dominio definido. El dominio propietario es el responsable de declararla, validarla y documentarla. Dos dominios no pueden declarar el mismo concepto.

## 2. Toda configuración tendrá una única fuente de verdad

Para cada parámetro existe exactamente un mecanismo de persistencia autoritativo. Los demás mecanismos, cuando existan, son derivados o réplicas y se mantienen sincronizados por el consumidor del dominio propietario. Está prohibido introducir un segundo mecanismo de persistencia para un dato ya existente.

## 3. Toda configuración tendrá al menos un consumidor identificado

Toda configuración nueva debe declarar sus consumidores antes de ser implementada. Un parámetro sin consumidor identificado es configuración muerta y no debe incorporarse.

## 4. Las configuraciones sin consumidores no se incorporarán a nuevas funcionalidades

Ninguna nueva funcionalidad puede basarse en parámetros huérfanos ni puede recrear su patrón. Si una funcionalidad necesita un parámetro inexistente, se declara uno nuevo conforme a este ADR; no se reutiliza uno sin consumidor.

## 5. Las configuraciones históricas se documentarán antes de eliminarse

La eliminación de parámetros heredados es un proceso gobernado: cada parámetro se documenta, se registra en el backlog y se elimina mediante un cambio explícito. La eliminación silenciosa está prohibida. La documentación precede al cambio.

## 6. Las responsabilidades de configuración se dividirán únicamente entre los dominios definidos por el proyecto

No existe configuración "general" ni "del sistema" fuera de los dominios. Todo parámetro se clasifica dentro de un dominio propietario antes de implementarse. Un parámetro no clasificable se rechaza hasta que se defina su dominio.

---

# Dominios propietarios

Los dominios propietarios de configuración son los definidos por el proyecto:

* **Usuario.** Configuración personal de la cuenta: preferencias de interfaz, idioma, formato de fecha, canales de notificación y severidad de alertas del usuario. Pertenece a `UserPreference` y sus entidades vinculadas.
* **Dispositivo.** Configuración física y operativa del hardware: polaridad de actuadores, modo de control, parámetros de salud, identidad MQTT e integraciones de telemetría del dispositivo. Pertenece a `Device` y sus entidades vinculadas.
* **Sistema.** Parámetros de plataforma compartidos por todos los usuarios: umbrales de seguridad, identidad de servicios globales y valores operativos del backend. Pertenece a `SystemSetting` y sus entidades vinculadas.
* **Infraestructura.** Configuración de despliegue y entorno: variables de entorno, credenciales de infraestructura y políticas de aislamiento de ambientes. Pertenece a la configuración de entorno validada por el ConfigurationService.

Las preferencias personales del usuario nunca residen en el dominio Sistema. La configuración física de un dispositivo nunca reside en el dominio Usuario. Las credenciales de infraestructura nunca residen en un modelo de negocio.

---

# Hallazgos relevantes

Casos representativos que motivan este ADR, sin constituir un inventario:

* **Polaridad de actuadores (SSR Active Low).** Se almacena en el backend y en el almacenamiento no volátil del firmware. Dos fuentes de verdad para un mismo parámetro físico.
* **Integración ThingSpeak.** Se persiste en columnas del dispositivo y, en paralelo, en credenciales cifradas de integración. La lectura usa una u otra según precedencia implícita.
* **Severidad de notificaciones.** Existen tres mecanismos de severidad paralelos y mal conectados: un campo persistido que no se lee, un campo leído que no existe en el modelo y una severidad por dispositivo. La política efectiva queda oculta detrás de valores por defecto.
* **Parámetros de plataforma sin consumidor.** La mayoría de las claves de configuración del sistema se exponen en la API sin que ningún servicio, componente o interfaz las consuma.
* **Preferencias sin uso.** Varias preferencias de usuario se persisten desde la interfaz sin que ningún componente las lea; el tema de interfaz se aplica desde almacenamiento local, no desde la preferencia persistida.

---

# Consecuencias

A partir de este ADR:

* Toda configuración nueva declara su dominio propietario, su fuente de verdad y sus consumidores en el mismo cambio que la introduce.
* Toda implementación futura evita crear una segunda fuente de verdad para un parámetro existente.
* Toda nueva configuración justifica su dominio antes de ser implementada; la justificación queda registrada en el ADR o en la documentación del cambio.
* Los parámetros heredados se someten al proceso de documentación previo a su eliminación.
* Los hallazgos de la auditoría se tratan como trabajo de saneamiento explícito y trazable, no como cambios implícitos.

---

# Backlog derivado

Trabajo de saneamiento identificado por la auditoría, pendiente de planificación:

* Notification Severity Wiring
* Subscription Usage
* SSR Source of Truth
* ThingSpeak Source of Truth
* Legacy SystemSetting Cleanup
* Unified Notification Center
* Telegram Bot Lifecycle
* Subscription Upgrade Validation
* Public Settings Consumer
* Integration Credentials Providers

---

# Consecuencias positivas

* **Reducción de deuda técnica.** Los parámetros huérfanos y duplicados se eliminan o consolidan mediante un proceso gobernado.
* **Mayor trazabilidad.** Toda configuración puede responder a quién la posee, dónde se persiste y quién la consume.
* **Menor acoplamiento.** Los dominios no dependen de datos declarados en modelos ajenos.
* **Gobernanza explícita.** La política de configuración es verificable y auditable, no una convención implícita.
* **Simplificación futura.** La incorporación de nueva configuración es un proceso definido, y el saneamiento del sistema se mantiene continuo.

---

# Reglas derivadas

| ID | Regla |
|----|-------|
| ADR-032-R01 | Toda configuración pertenece exactamente a un dominio propietario (Usuario, Dispositivo, Sistema, Infraestructura). |
| ADR-032-R02 | Todo parámetro posee una única fuente de verdad; los demás mecanismos son derivados y sincronizados. |
| ADR-032-R03 | Toda configuración nueva declara al menos un consumidor identificado. |
| ADR-032-R04 | Ninguna funcionalidad nueva se implementa sobre configuración sin consumidores. |
| ADR-032-R05 | La eliminación de configuración histórica exige documentación previa y registro en backlog. |
| ADR-032-R06 | Todo parámetro se clasifica en un dominio antes de implementarse; los no clasificables se rechazan. |

---

# ADR relacionados

* ADR-029 — Aislamiento de Ambientes (dominio Infraestructura y ConfigurationService)
* ADR-019 — Domain-First (principios de responsabilidad por dominio)
* ADR-016 — Suscripción Basada en Capacidades (cuotas y retención de datos)
* ADR-025 — Device Status Policy (configuración de salud del dispositivo)
* ADR-028 — Identidad MQTT por Dispositivo (credenciales provisionadas)

---

# Referencias

* Auditoría de gobernanza de configuración de Mush2 (resultado previo a este ADR)
* `docs/ADR/template.md` — plantilla oficial de ADR del proyecto

---

# Historial de Cambios

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 2026-08-05 | Creación del documento (ACEPTADO) |

---

*Documento generado como parte del proceso de Architecture Decision Records de Mush2.*
