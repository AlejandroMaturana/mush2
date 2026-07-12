# ADR-015: Reestructuración y Gobernanza de la Documentación Técnica

**Fecha**: 2026-07-05  
**Estado**: Aceptado

## Contexto

El repositorio del proyecto Mush2 ha ido creciendo de forma orgánica en sus tres componentes principales:

- firmware
- backend
- frontend

Para documentar el diseño técnico, la arquitectura y los contratos, se ha utilizado la carpeta `docs/`. Sin embargo, debido a la velocidad del desarrollo y la falta de experiencia técnica estructurando documentación, la carpeta presentaba problemas de redundancia, duplicación (como en `roadmap.md` y `firmware.md`), falta de categorización para diagramas, y carecía de herramientas de gobernanza ágil como solicitudes de comentarios (RFC) o documentos de diseño de ingeniería (EDD). Esto dificultaba la incorporación de nuevos colaboradores externos y el entrenamiento o navegación de agentes de IA.

## Decisión

Realizar una reestructuración profunda de la documentación del proyecto bajo las siguientes directrices:

1. **Establecer una taxonomía rígida de carpetas**:
   - `docs/architecture/` para cómo está construido el sistema actual (añadiendo el esquema de base de datos aquí).
   - `docs/contracts/` para definiciones de interfaz inmutables (REST y MQTT).
   - `docs/protocol/` para el protocolo HTTP de comunicación embebida.
   - `docs/edd/` para Engineering Design Documents (EDDs) antes de diseñar subsistemas.
   - `docs/rfc/` para Request for Comments (RFCs) antes de tomar decisiones sobre propuestas.
   - `docs/design/` para lineamientos visuales y de experiencia de usuario.
   - `docs/operations/` para guías operacionales, despliegues y monitoreo.
   - `docs/roadmap/` unificado como fuente única de verdad para el futuro del proyecto, archivando los roadmaps locales anteriores.
   - `docs/diagrams/exports/` para guardar los diagramas renderizados (PNG/SVG) legibles por plataformas web.
2. **Crear un índice maestro** (`docs/README.md`) para orientar a desarrolladores humanos y agentes de IA.
3. **Eliminar los archivos duplicados o desactualizados** (`docs/firmware.md`, `docs/roadmap.md`, `docs/context/` y la carpeta `docs/issues/` de tareas obsoletas).
4. **Introducir templates de gobernanza** para EDD y RFC.

## Motivos

1. **Claridad y productividad**: Unificar los roadmaps y eliminar copias de documentos desactualizados (como el firmware de ESP8266 que colisionaba con el de ESP32-S3) evita confusiones y errores al codificar.
2. **Gobernanza transparente**: El proceso RFC permite discutir cambios críticos (como la introducción de HTTPS/TLS en firmware) antes de que se escriba código. Los EDD permiten detallar el diseño técnico de subsistemas antes de implementarlos.
3. **Preparación para IA**: Los agentes IA leen el `docs/README.md` como mapa de navegación al iniciar una tarea, lo que optimiza su consumo de tokens y la precisión de sus respuestas.
4. **Facilidad de auditoría**: Agrupar los diagramas exportados en `/exports` permite renderizarlos directamente en la interfaz de GitHub u otros visualizadores sin necesidad de instalar la herramienta de diseño local.

## Consecuencias

- Todo nuevo desarrollador o agente de IA debe guiar su proceso usando el árbol documental propuesto en `docs/README.md`.
- El archivo de base de datos se mantiene en `docs/architecture/database.md`.
- El archivo de configuración de despliegue se mantiene en `docs/operations/deployment.md`.
- Toda propuesta de cambio importante en seguridad, API o protocolo de red requerirá de un RFC previo.

## Referencias

- Implementación de la reestructuración: `docs/README.md`, `docs/roadmap/roadmap.md`, `docs/architecture/firmware.md`
- Propuesta aprobada: `doc_audit_proposal.md` en el directorio de la conversación.
