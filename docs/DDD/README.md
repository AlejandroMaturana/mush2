# Domain-Driven Design (DDD) — Mush2

Los documentos DDD definen el **modelo de dominio** del proyecto Mush2 estableciendo un **Lenguaje Ubicuo**, **Contextos Limitados**, **Agregados**, **Value Objects**, **Eventos de Dominio** y **Máquinas de Estado**.

## ¿Cuándo crear un documento DDD?

Crea un documento DDD cuando quieras:

- Definir o refinar el **Lenguaje Ubicuo** del dominio micológico
- Modelar **nuevas entidades** o **agregados** del dominio
- Especificar **Value Objects** compartidos entre contextos
- Documentar **Eventos de Dominio** y flujos de comunicación
- Diseñar **máquinas de estado** para entidades con ciclo de vida complejo
- Identificar **nuevos Bounded Contexts** o refinar los existentes

**No** crea un documento DDD para:

- Decisiones de infraestructura (usa ADR)
- Propuestas de cambios que requieren debate (usa RFC)
- Configuración de entorno o despliegue
- Bugs o fixes puntuales

## Estructura del directorio

```
docs/DDD/
├── README.md                      # Este archivo
├── template.md                    # Template para nuevos documentos
├── DDD-001-modelo_del_dominio.md  # Documento principal
├── DDD-002-bounded-contexts.md    # Contextos Limitados
├── DDD-003-agregados-raices-de.md # Agregados y Raíces
├── DDD-004-value-objets.md        # Value Objects
├── DDD-005-state-machines.md      # Máquinas de Estado
├── DDD-006-domain-event.md        # Eventos de Dominio
├── DDD-007-migration-roadmap.md   # Roadmap de Migración
├── DDD-008-device-status-policy.md # Device Status Policy (multidimensional)
```

## Índice de documentos

| ID | Documento | Descripción | Depende de |
|----|-----------|-------------|------------|
| [DDD-001](DDD-001-domain-model.md) | Modelo de Dominio | Documento principal con Lenguaje Ubicuo, Contextos, Agregados, Value Objects, Eventos, Máquinas de Estado y Reglas de Negocio | — |
| [DDD-002](DDD-002-bounded-contexts.md) | Bounded Contexts | 4 Contextos: Cultivo, Monitoreo, Control, Usuarios | DDD-001 |
| [DDD-003](DDD-003-agregados-raices-de.md) | Agregados | 5 Agregados con sus Raíces e invariantes | DDD-001, DDD-002 |
| [DDD-004](DDD-004-value-objets.md) | Value Objects | ~30 Value Objects de dominio, identidad y configuración | DDD-001, DDD-003 |
| [DDD-005](DDD-005-state-machines.md) | Máquinas de Estado | 7 Máquinas de Estado con diagramas y reglas | DDD-001, DDD-003 |
| [DDD-006](DDD-006-domain-event.md) | Eventos de Dominio | ~20 Eventos con flujos de secuencia | DDD-001, DDD-002, DDD-003 |
| [DDD-007](DDD-007-migration-roadmap.md) | Roadmap de Migración | Plan de 8 fases (22-32 semanas) | Todos |
| [DDD-008](DDD-008-device-status-policy.md) | Device Status Policy | Modelo multidimensional de estado de dispositivo | DDD-001, DDD-005 |

## Numeración

- Los documentos DDD se numeran secuencialmente: DDD-001, DDD-002, etc.
- El número es permanente; si un documento es reemplazado, se crea uno nuevo con el siguiente número.
- Los números no se reutilizan.

## Template

Ver [template.md](template.md) para el template base de un nuevo documento DDD.
