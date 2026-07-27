# DDD-007: Roadmap de Migración a DDD - Mush2

---

## Metadatos

| Campo | Valor |
|-------|-------|
| **ID** | DDD-007 |
| **Nombre** | Roadmap de Migración a Domain-Driven Design |
| **Fecha** | 2026-07-14 |
| **Versión** | 1.0 |
| **Estado** | Borrador |
| **Depende de** | DDD-001 a DDD-006 |

---

## 1. Resumen

Este documento define el **plan de migración** desde la arquitectura actual (N-tier/layered con JavaScript) hacia una arquitectura basada en Domain-Driven Design. Incluye fases, entregables, criterios de éxito y riesgos.

---

## 2. Estado Actual (As-Is)

### 2.1 Arquitectura Actual

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND                                  │
│  React 18 + Vite + Chart.js                                 │
│  (JavaScript, no TypeScript)                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                    HTTP/REST
                           │
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND                                   │
│  Express.js + Sequelize 6                                    │
│  (JavaScript, no TypeScript)                                 │
│                                                             │
│  Routes (Controllers) ──> Models (ORM) ──> Services         │
│                                                             │
│  Business logic leaks into route handlers                    │
│  No repository pattern                                      │
│  No value objects                                            │
│  No bounded contexts                                         │
│  No domain events as first-class objects                     │
└─────────────────────────────────────────────────────────────┘
                           │
                    PostgreSQL
                           │
┌─────────────────────────────────────────────────────────────┐
│                    FIRMWARE                                  │
│  ESP32-S3 + FreeRTOS (C++)                                  │
│  MQTT + SSE                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Problemas Identificados

| Problema | Impacto | Ubicación |
|----------|---------|-----------|
| **Lógica de negocio en route handlers** | Difícil de testear y reutilizar | `routes/api.js`, `routes/recipes.js` |
| **Sin repository pattern** | Acoplamiento directo a Sequelize | Todos los routes y services |
| **Sin value objects** | Temperatura, humedad son números crudos | `controlEngine.js`, `phaseEvaluator.js` |
| **Código duplicado** | `getPhaseThresholds()` duplicado | `controlEngine.js:22-54`, `actuators.js:9-38` |
| **Estado in-memory frágil** | Se pierde en reinicio | `controlEngine.js:13`, `phaseEvaluator.js:109` |
| **Sin TypeScript** | No hay tipos ni interfaces | Todo el backend |
| **Sin bounded contexts** | Todo acoplado en un solo módulo | Estructura de directorios |

---

## 3. Estado Deseado (To-Be)

### 3.1 Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND                                  │
│  React 19 + TypeScript + Tailwind CSS v4                    │
└─────────────────────────────────────────────────────────────┘
                           │
                    HTTP/REST
                           │
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND                                   │
│  Express.js + TypeScript                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CAPA DE DOMINIO                                     │   │
│  │  - Entities (Aggregate Roots)                        │   │
│  │  - Value Objects                                     │   │
│  │  - Domain Events                                     │   │
│  │  - Domain Services                                   │   │
│  │  - Repository Interfaces                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CAPA DE APLICACIÓN                                  │   │
│  │  - Application Services                              │   │
│  │  - DTOs                                              │   │
│  │  - Use Cases                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CAPA DE INFRAESTRUCTURA                             │   │
│  │  - Repository Implementations (Sequelize)            │   │
│  │  - MQTT Bridge                                       │   │
│  │  - SSE Server                                       │   │
│  │  - EventBus Implementation                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                    PostgreSQL
```

---

## 4. Fases de Migración

### Fase 0: Preparación (2-3 semanas)

**Objetivo**: Establecer bases para la migración

| Tarea | Entregable | Criterio de Éxito |
|-------|------------|-------------------|
| Instalar TypeScript en backend | `tsconfig.json` | Compila sin errores |
| Configurar path aliases | `@domain/`, `@infrastructure/` | Imports funcionan |
| Crear estructura de directorios | `src/domain/`, `src/application/`, etc. | Estructura creada |
| Instalar dependencias de DDD | `uuid`, `bcrypt`, etc. | Dependencias instaladas |
| Crear ADR de migración | `ADR-018-DDD-Migration.md` | ADR aprobado |

**Estructura de directorios objetivo**:

```
backend/src/
├── domain/                    # Capa de dominio
│   ├── cultivation/           # Contexto: Cultivo
│   │   ├── entities/
│   │   │   ├── CultivationCycle.ts
│   │   │   ├── Recipe.ts
│   │   │   └── SpeciesProfile.ts
│   │   ├── value-objects/
│   │   │   ├── CultivationPhase.ts
│   │   │   ├── CycleStatus.ts
│   │   │   ├── PhaseThreshold.ts
│   │   │   └── Temperature.ts
│   │   ├── events/
│   │   │   ├── CultivoIniciado.ts
│   │   │   └── FaseCambiada.ts
│   │   ├── services/
│   │   │   ├── PhaseEvaluator.ts
│   │   │   └── PhaseThresholdExtractor.ts
│   │   └── repositories/
│   │       ├── ICultivationCycleRepository.ts
│   │       └── IRecipeRepository.ts
│   │
│   ├── monitoring/            # Contexto: Monitoreo
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── events/
│   │   ├── services/
│   │   └── repositories/
│   │
│   ├── control/               # Contexto: Control
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── events/
│   │   ├── services/
│   │   └── repositories/
│   │
│   └── identity/              # Contexto: Usuarios
│       ├── entities/
│       ├── value-objects/
│       ├── events/
│       ├── services/
│       └── repositories/
│
├── application/               # Capa de aplicación
│   ├── cultivation/
│   │   ├── commands/
│   │   ├── queries/
│   │   └── handlers/
│   ├── monitoring/
│   ├── control/
│   └── identity/
│
├── infrastructure/            # Capa de infraestructura
│   ├── persistence/
│   │   ├── sequelize/
│   │   ├── repositories/
│   │   └── migrations/
│   ├── messaging/
│   │   ├── mqtt-bridge.ts
│   │   ├── sse-server.ts
│   │   └── event-bus.ts
│   └── external/
│       ├── telegram-service.ts
│       └── thingspeak-sync.ts
│
└── interfaces/                # Capa de presentación
    ├── http/
    │   ├── routes/
    │   └── middlewares/
    └── sse/
        └── event-stream.ts
```

---

### Fase 1: Value Objects (2-3 semanas)

**Objetivo**: Crear Value Objects para el Shared Kernel

| Tarea | Entregable | Criterio de Éxito |
|-------|------------|-------------------|
| Crear Value Objects de dominio | `Temperature.ts`, `Humidity.ts`, etc. | Tests pasan |
| Crear Value Objects de identidad | `UUID.ts`, `MACAddress.ts` | Tests pasan |
| Crear Value Objects de enum | `CultivationPhase.ts`, `DeviceStatus.ts` | Tests pasan |
| Reemplazar uso de `string` por Value Objects | Refactor en controlEngine | Tests pasan |
| Documentar patrones en ADR | `ADR-019-Value-Objects.md` | ADR aprobado |

**Ejemplo de implementación**:

```typescript
// domain/shared/value-objects/Temperature.ts
export class Temperature {
  public readonly value: number;
  public readonly unit: 'C' | 'F';
  
  private constructor(value: number, unit: 'C' | 'F') {
    this.value = Object.freeze(value);
    this.unit = Object.freeze(unit);
  }
  
  static create(value: number, unit: 'C' | 'F' = 'C'): Temperature {
    if (value < -40 || value > 85) {
      throw new Error(`Temperature ${value}°${unit} out of range`);
    }
    return new Temperature(value, unit);
  }
  
  equals(other: Temperature): boolean {
    return this.toCelsius() === other.toCelsius();
  }
  
  toCelsius(): number {
    if (this.unit === 'C') return this.value;
    return (this.value - 32) * 5/9;
  }
  
  toString(): string {
    return `${this.value}°${this.unit}`;
  }
}
```

---

### Fase 2: Repository Interfaces (2-3 semanas)

**Objetivo**: Definir interfaces de repositorio para cada agregado

| Tarea | Entregable | Criterio de Éxito |
|-------|------------|-------------------|
| Crear interfaces de repositorio | `ICultivationCycleRepository.ts` | TypeScript compila |
| Crear implementaciones Sequelize | `SequelizeCultivationCycleRepository.ts` | Tests pasan |
| Inyectar repositorios via DI | `container.ts` | Funciona correctamente |
| Migrar route handlers a usar repositorios | Refactor en routes | Tests pasan |

**Ejemplo de interfaz**:

```typescript
// domain/cultivation/repositories/ICultivationCycleRepository.ts
import { CultivationCycle } from '../entities/CultivationCycle';

export interface ICultivationCycleRepository {
  findById(id: number): Promise<CultivationCycle | null>;
  findActiveByDevice(deviceId: number): Promise<CultivationCycle | null>;
  save(cycle: CultivationCycle): Promise<CultivationCycle>;
  findByUser(userId: string): Promise<CultivationCycle[]>;
  countActiveByDevice(deviceId: number): Promise<number>;
}
```

---

### Fase 3: Aggregate Roots (3-4 semanas)

**Objetivo**: Crear Agregados con sus invariantes

| Tarea | Entregable | Criterio de Éxito |
|-------|------------|-------------------|
| Crear Agregado CultivationCycle | `CultivationCycle.ts` | Tests de invariantes pasan |
| Crear Agregado Recipe | `Recipe.ts` | Tests de invariantes pasan |
| Crear Agregado Device | `Device.ts` | Tests de invariantes pasan |
| Crear Agregado Alarm | `Alarm.ts` | Tests de invariantes pasan |
| Crear Agregado User | `User.ts` | Tests de invariantes pasan |
| Migrar lógica de negocio a Agregados | Refactor en services | Tests pasan |

**Ejemplo de Agregado**:

```typescript
// domain/cultivation/entities/CultivationCycle.ts
import { AggregateRoot } from '../../shared/AggregateRoot';
import { CultivationPhase } from '../value-objects/CultivationPhase';
import { CycleStatus } from '../value-objects/CycleStatus';
import { PhaseTransition } from './PhaseTransition';

export class CultivationCycle extends AggregateRoot {
  private _status: CycleStatus;
  private _currentPhase: CultivationPhase;
  private _phaseStartedAt: Date;
  private _transitions: PhaseTransition[];
  
  // ... constructor, getters
  
  iniciar(): void {
    this.invariant(this._status === CycleStatus.PLANNED, 
      'Only PLANNED cycles can be started');
    this.invariant(this.hasCalibratedSensors(),
      'Sensors must be calibrated');
    
    this._status = CycleStatus.ACTIVE;
    this._currentPhase = CultivationPhase.INCUBATION;
    this._phaseStartedAt = new Date();
    
    this.addDomainEvent(new CultivoIniciado(this.id, this.deviceId));
  }
  
  transicionarFase(toPhase: CultivationPhase): void {
    this.invariant(this._status === CycleStatus.ACTIVE,
      'Only ACTIVE cycles can transition phases');
    this.invariant(this.isValidTransition(toPhase),
      `Invalid transition from ${this._currentPhase} to ${toPhase}`);
    
    const fromPhase = this._currentPhase;
    this._currentPhase = toPhase;
    
    const transition = PhaseTransition.create({
      cycleId: this.id,
      fromPhase,
      toPhase,
      triggerType: 'MANUAL',
      status: 'EXECUTED'
    });
    this._transitions.push(transition);
    
    this.addDomainEvent(new FaseCambiada(this.id, fromPhase, toPhase));
  }
  
  private isValidTransition(toPhase: CultivationPhase): boolean {
    const sequence = [
      CultivationPhase.INCUBATION,
      CultivationPhase.FRUITING,
      CultivationPhase.MAINTENANCE,
      CultivationPhase.COMPLETED
    ];
    const currentIndex = sequence.indexOf(this._currentPhase);
    const targetIndex = sequence.indexOf(toPhase);
    return targetIndex === currentIndex + 1;
  }
}
```

---

### Fase 4: Domain Events (2-3 semanas)

**Objetivo**: Implementar Eventos de Dominio como primeros objetos

| Tarea | Entregable | Criterio de Éxito |
|-------|------------|-------------------|
| Crear clase base DomainEvent | `DomainEvent.ts` | TypeScript compila |
| Crear eventos del contexto Cultivo | `CultivoIniciado.ts`, etc. | Tests pasan |
| Crear eventos del contexto Monitoreo | `AlarmaGenerada.ts`, etc. | Tests pasan |
| Crear eventos del contexto Control | `FailSafeActivado.ts`, etc. | Tests pasan |
| Crear eventos del contexto Usuarios | `UsuarioRegistrado.ts`, etc. | Tests pasan |
| Integrar con EventBus actual | Refactor eventBus.js | Tests pasan |

---

### Fase 5: Domain Services (3-4 semanas)

**Objetivo**: Mover lógica de negocio a Domain Services

| Tarea | Entregable | Criterio de Éxito |
|-------|------------|-------------------|
| Crear PhaseEvaluator como Domain Service | `PhaseEvaluator.ts` | Tests pasan |
| Crear SeverityCalculator | `SeverityCalculator.ts` | Tests pasan |
| Crear VPDCalculator | `VPDCalculator.ts` | Tests pasan |
| Crear AlarmDeduplicator | `AlarmDeduplicator.ts` | Tests pasan |
| Migrar lógica de controlEngine | Refactor controlEngine.js | Tests pasan |

---

### Fase 6: Application Services (2-3 semanas)

**Objetivo**: Crear orquestación de servicios

| Tarea | Entregable | Criterio de Éxito |
|-------|------------|-------------------|
| Crear Application Services por contexto | `CultivationApplicationService.ts` | Tests pasan |
| Crear DTOs de entrada/salida | `CreateCycleDto.ts`, etc. | TypeScript compila |
| Crear Handlers de comandos | `CreateCycleHandler.ts` | Tests pasan |
| Crear Handlers de queries | `GetCycleByIdHandler.ts` | Tests pasan |

---

### Fase 7: Migración de Routes (2-3 semanas)

**Objetivo**: Migrar route handlers a usar Application Services

| Tarea | Entregable | Criterio de Éxito |
|-------|------------|-------------------|
| Migrar `routes/cycles.js` | `routes/cycles.ts` | Tests pasan |
| Migrar `routes/recipes.js` | `routes/recipes.ts` | Tests pasan |
| Migrar `routes/alarms.js` | `routes/alarms.ts` | Tests pasan |
| Migrar `routes/api.js` | `routes/api.ts` | Tests pasan |
| Migrar otros routes | `routes/*.ts` | Tests pasan |

---

### Fase 8: Frontend TypeScript (4-6 semanas)

**Objetivo**: Migrar frontend a TypeScript

| Tarea | Entregable | Criterio de Éxito |
|-------|------------|-------------------|
| Instalar TypeScript en frontend | `tsconfig.json` | Compila sin errores |
| Migrar componentes React | `*.tsx` | Tests pasan |
| Migrar servicios API | `*.ts` | TypeScript compila |
| Migrar hooks personalizados | `*.ts` | Tests pasan |

---

## 5. Priorización de Migración

### 5.1 Orden de Migración por Impacto

```
Prioridad 1 (Alto impacto, bajo esfuerzo):
├── Value Objects (Fase 1)
├── Repository Interfaces (Fase 2)
└── Aggregate Roots (Fase 3)

Prioridad 2 (Alto impacto, esfuerzo medio):
├── Domain Events (Fase 4)
├── Domain Services (Fase 5)
└── Application Services (Fase 6)

Prioridad 3 (Impacto medio, alto esfuerzo):
├── Migración de Routes (Fase 7)
└── Frontend TypeScript (Fase 8)
```

### 5.2 Timeline Estimada

| Fase | Duración | Dependencias |
|------|----------|--------------|
| Fase 0: Preparación | 2-3 semanas | Ninguna |
| Fase 1: Value Objects | 2-3 semanas | Fase 0 |
| Fase 2: Repository Interfaces | 2-3 semanas | Fase 0 |
| Fase 3: Aggregate Roots | 3-4 semanas | Fase 1, Fase 2 |
| Fase 4: Domain Events | 2-3 semanas | Fase 1 |
| Fase 5: Domain Services | 3-4 semanas | Fase 1, Fase 2, Fase 3 |
| Fase 6: Application Services | 2-3 semanas | Fase 3, Fase 4 |
| Fase 7: Migración de Routes | 2-3 semanas | Fase 6 |
| Fase 8: Frontend TypeScript | 4-6 semanas | Fase 7 |
| **Total** | **22-32 semanas** | — |

---

## 6. Estrategia de Migración Gradual

### 6.1 Patrón Strangler Fig

No se reescribe todo de una vez. Se migra gradualmente:

1. **Nuevos features** se implementan en DDD desde el inicio
2. **Features existentes** se migran cuando se modifican
3. **Lógica crítica** se migra primero (controlEngine, phaseEvaluator)
4. **Lógica periférica** se migra al final (settings, diagnostics)

### 6.2 Coexistencia

Durante la migración, ambos estilos coexisten:

```
backend/src/
├── routes/              # Routes existentes (JavaScript)
├── services/            # Services existentes (JavaScript)
├── models/              # Models existentes (JavaScript)
│
├── domain/              # NUEVO: Capa de dominio (TypeScript)
├── application/         # NUEVO: Capa de aplicación (TypeScript)
├── infrastructure/      # NUEVO: Capa de infraestructura (TypeScript)
└── interfaces/          # NUEVO: Capa de presentación (TypeScript)
```

### 6.3 Puntos de Integración

| Punto | Estrategia |
|-------|------------|
| **Routes** | Route handler llama a Application Service |
| **Models** | Repository Implementation usa Sequelize Model |
| **Services** | Domain Service es llamado por Application Service |
| **EventBus** | Domain Events se publican via EventBus existente |

---

## 7. Criterios de Éxito

### 7.1 Métricas de Calidad

| Métrica | Objetivo | Cómo medir |
|---------|----------|------------|
| **Cobertura de tests** | >80% | Jest coverage report |
| **Duplicación de código** | <5% | SonarQube |
| **Acoplamiento** | Bajo | Métricas de dependencias |
| **Mantenibilidad** | >7.0 | SonarQube rating |
| **TypeScript strict mode** | Habilitado | tsconfig.json |

### 7.2 Criterios de Aceptación

- [ ] Todos los Value Objects tienen tests unitarios
- [ ] Todos los Agregados invariantes están verificados
- [ ] Los Domain Events se publican correctamente
- [ ] Los Repository Interfaces están definidos
- [ ] Las Application Services orquestan correctamente
- [ ] Los Routes usan Application Services
- [ ] No hay lógica de negocio en Routes
- [ ] No hay código duplicado
- [ ] TypeScript compila sin errores en modo strict

---

## 8. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Sobrediseño** | Media | Alto | Empezar simple, iterar |
| **Pérdida de productividad** | Alta | Medio | Migración gradual, no big bang |
| **Complejidad innecesaria** | Media | Alto | Revisar con el equipo regularmente |
| **Incompatibilidad con código existente** | Baja | Medio | Coexistencia, puntos de integración |
| **Falta de conocimiento DDD** | Media | Alto | Training, pair programming |

---

## 9. Próximos Pasos Inmediatos

1. **Semana 1**: Revisar DDD-001 a DDD-007 con el equipo
2. **Semana 2**: Crear ADR-018-DDD-Migration.md
3. **Semana 3**: Instalar TypeScript en backend (Fase 0)
4. **Semana 4**: Crear estructura de directorios (Fase 0)

---

## 10. Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2026-07-14 | Equipo Mush2 | Creación del documento |

---

*Documento generado como parte del proceso de Domain-Driven Design de Mush2.*
