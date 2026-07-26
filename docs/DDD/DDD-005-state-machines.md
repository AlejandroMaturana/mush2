# DDD-005: Máquinas de Estado - Mush2

---

## Metadatos

| Campo | Valor |
|-------|-------|
| **ID** | DDD-005 |
| **Nombre** | Máquinas de Estado de Mush2 |
| **Fecha** | 2026-07-14 |
| **Versión** | 1.0 |
| **Estado** | Borrador |
| **Depende de** | DDD-001, DDD-003 |

---

## 1. Resumen

Las **Máquinas de Estado** modelan el ciclo de vida de las entidades del dominio, definiendo estados válidos, transiciones permitidas y las condiciones que las gobiernan. Este documento especifica todas las máquinas de estado identificadas en Mush2.

---

## 2. Convenciones de Notación

### 2.1 Elementos

| Símbolo | Significado |
|---------|-------------|
| `[*]` | Estado inicial |
| `(*)` | Estado final |
| `-->` | Transición |
| `[guarda]` | Condición que debe cumplirse |
| `/acción` | Acción ejecutada en la transición |

### 2.2 Diagramas

Los diagramas usan notación Mermaid `stateDiagram-v2`.

---

## 3. CultivationCycle - Estado del Ciclo

### 3.1 Diagrama

```mermaid
stateDiagram-v2
    [*] --> PLANNED : crearCiclo()
    
    state PLANNED {
        [*] --> EsperandoInicio
        EsperandoInicio : Sin sensores activos
        EsperandoInicio : Receta asignada
    }
    
    PLANNED --> ACTIVE : iniciarCiclo() [sensoresCalibrados]
    PLANNED --> ABORTED : abortarCiclo()
    
    state ACTIVE {
        [*] --> Evaluando
        Evaluando : ControlEngine cada 60s
        Evaluando : Controla actuadores
        
        Evaluando --> Transicionando : transicionSugerida()
        Transicionando --> Evaluando : transicionEjecutada()
    }
    
    ACTIVE --> COMPLETED : completarCiclo() [currentPhase=MAINTENANCE]
    ACTIVE --> ABORTED : abortarCiclo() [criticalAlarm]
    
    state COMPLETED {
        [*] --> Finalizado
        Finalizado : Ciclo exitoso
    }
    
    state ABORTED {
        [*] --> Terminado
        Terminado : Ciclo interrumpido
    }
    
    COMPLETED --> [*]
    ABORTED --> [*]
```

### 3.2 Tabla de Transiciones

| Estado Actual | Evento | Guarda | Estado Nuevo | Acciones |
|---------------|--------|--------|--------------|----------|
| — | crearCiclo() | recetaValida | PLANNED | initPhase=INCUBATION |
| PLANNED | iniciarCiclo() | sensoresCalibrados | ACTIVE | phaseStartedAt=now |
| PLANNED | abortarCiclo() | — | ABORTED | endDate=now |
| ACTIVE | completarCiclo() | currentPhase=MAINTENANCE | COMPLETED | endDate=now |
| ACTIVE | abortarCiclo() | criticalAlarm | ABORTED | endDate=now |
| COMPLETED | — | — | — | Estado final |
| ABORTED | — | — | — | Estado final |

### 3.3 Guardas

| Guarda | Descripción | Implementación |
|--------|-------------|----------------|
| `recetaValida` | recipeId referencia Recipe existente | FK constraint |
| `sensoresCalibrados` | Al menos sensores de temp y hum ACTIVE | Sensor.status=ACTIVE |
| `criticalAlarm` | Existe alarma CRITICAL activa | Alarm.severity=CRITICAL |
| `currentPhase=MAINTENANCE` | Fase actual es MAINTENANCE | CultivationCycle.currentPhase |

### 3.4 Acciones

| Acción | Descripción | Efecto |
|--------|-------------|--------|
| `initPhase` | Inicializa fase | currentPhase=INCUBATION |
| `phaseStartedAt=now` | Registra inicio de fase | phaseStartedAt=new Date() |
| `endDate=now` | Registra fin de ciclo | endDate=new Date() |

---

## 4. Fases del Ciclo (CurrentPhase)

### 4.1 Diagrama

```mermaid
stateDiagram-v2
    [*] --> INCUBATION : iniciarCiclo()
    
    state INCUBATION {
        [*] --> Colonizando
        Colonizando : Micelio colonizando sustrato
        
        Colonizando --> MonitoreandoCO2 : activarMonitoreo()
        MonitoreandoCO2 --> Colonizando : CO2 estable
        MonitoreandoCO2 --> EvaluandoTransicion : CO2 < umbral [sustain]
        
        EvaluandoTransicion --> Colonizando : transicionRechazada
    }
    
    INCUBATION --> FRUITING : transicionarFase() [sensor/time/manual]
    
    state FRUITING {
        [*] --> Fructificando
        Fructificando : Hongos apareciendo
        
        Fructificando --> ControlandoFAE : activarFAE()
        ControlandoFAE --> Fructificando : FAE completado
        ControlandoFAE --> EvaluandoTiempo : verificarDuracion()
        
        EvaluandoTiempo --> Fructificando : tiempoInsuficiente
    }
    
    FRUITING --> MAINTENANCE : transicionarFase() [tiempo]
    
    state MAINTENANCE {
        [*] --> Produciendo
        Produciendo : Flushes de cosecha
        
        Produciendo --> EnReposo : reposo()
        EnReposo --> Produciendo : nuevoFlush()
        Produciendo --> EvaluandoFinal : verificarCiclo()
        
        EvaluandoFinal --> Produciendo : cicloContinua
    }
    
    MAINTENANCE --> COMPLETED : finalizarCiclo() [diasAgotados]
    
    state COMPLETED {
        [*] --> AnalizandoBioactivos
        AnalizandoBioactivos : Análisis de compuestos
    }
    
    COMPLETED --> [*]
```

### 4.2 Tabla de Transiciones

| Fase Actual | Evento | Guarda | Fase Nueva | Acciones |
|-------------|--------|--------|------------|----------|
| — | iniciarCiclo() | — | INCUBATION | Registrar inicio |
| INCUBATION | transicionarFase() | sensor/time/manual | FRUITING | PhaseTransition record |
| FRUITING | transicionarFase() | tiempo | MAINTENANCE | PhaseTransition record |
| MAINTENANCE | finalizarCiclo() | diasAgotados | COMPLETED | endDate=now |

### 4.3 Reglas de Transición por Especie

| Especie | Transición | Trigger | Sustain | Notas |
|---------|------------|---------|---------|-------|
| Hericium erinaceus | INCUBATION → FRUITING | CO2 < 800ppm | 60 min | Melena de León |
| Ganoderma lucidum | INCUBATION → FRUITING | CO2 < 700ppm | 120 min | Reishi |
| Lentinula edodes | INCUBATION → FRUITING | Temp < 16°C | 60 min | Shiitake (cold shock) |
| Trametes versicolor | INCUBATION → FRUITING | CO2 < 900ppm | 60 min | Cola de Pavo |
| Cordyceps militaris | INCUBATION → FRUITING | Temp < 22°C | 120 min | Cordyceps |
| Pleurotus ostreatus | INCUBATION → FRUITING | CO2 < 1000ppm | 30 min | Pleurotus |
| Inonotus obliquus | INCUBATION → FRUITING | CO2 < 1200ppm | 120 min | Chaga |

---

## 5. Device - Estado del Dispositivo

> **OBSOLETO** — Esta sección ha sido reemplazada por **DDD-008: Device Status Policy**, que define un modelo multidimensional (Connectivity × Health × Lifecycle) en lugar del modelo plano de 4 estados aquí presentado.
>
> Ver también: **ADR-025** para la decisión arquitectónica.

### 5.1 Modelo previo (obsoleto)

```mermaid
stateDiagram-v2
    [*] --> OFFLINE : registrar()
    
    state OFFLINE {
        [*] --> SinConexion
        SinConexion : No hay comunicación
    }
    
    OFFLINE --> ONLINE : conectar() [heartbeat]
    OFFLINE --> MAINTENANCE : iniciarMantenimiento()
    
    state ONLINE {
        [*] --> Operando
        Operando : Sensores activos
        Operando : Actuadores respondiendo
        
        Operando --> EvaluandoHealth : cadaCiclo()
        EvaluandoHealth --> Operando : saludOK
        EvaluandoHealth --> Operando : saludCritica [activarFailSafe]
    }
    
    ONLINE --> OFFLINE : desconectar() [timeout]
    ONLINE --> ERROR : reportarError() [faultDetectado]
    ONLINE --> MAINTENANCE : iniciarMantenimiento()
    
    state ERROR {
        [*] --> ConFallos
        ConFallos : Requiere intervención
        ConFallos : No ejecuta comandos
    }
    
    ERROR --> ONLINE : recuperar() [reinicio]
    ERROR --> OFFLINE : reiniciar()
    
    state MAINTENANCE {
        [*] --> Actualizando
        Actualizando : Firmware update
        Actualizando : Hardware check
        
        Actualizando --> Completado : actualizarFirmware() [exito]
        Actualizando --> ConError : actualizarFirmware() [fallo]
    }
    
    MAINTENANCE --> ONLINE : completarMantenimiento() [exito]
    MAINTENANCE --> OFFLINE : completarMantenimiento() [reinicio]
    
    state COMPLETED
    state TERMINATED
    
    COMPLETED --> [*]
    TERMINATED --> [*]
```

### 5.2 Tabla de Transiciones (previa, obsoleta)

| Estado Actual | Evento | Guarda | Estado Nuevo | Acciones |
|---------------|--------|--------|--------------|----------|
| — | registrar() | MAC única | OFFLINE | Crear registro |
| OFFLINE | conectar() | heartbeat | ONLINE | lastSeen=now |
| OFFLINE | iniciarMantenimiento() | — | MAINTENANCE | — |
| ONLINE | desconectar() | timeout | OFFLINE | — |
| ONLINE | reportarError() | faultDetectado | ERROR | Registrar fault |
| ONLINE | iniciarMantenimiento() | — | MAINTENANCE | — |
| ONLINE | activarFailSafe() | temp≥32°C | ONLINE | ventilacionON, calorOFF |
| ERROR | recuperar() | reinicio | ONLINE | Limpiar fault |
| ERROR | reiniciar() | — | OFFLINE | — |
| MAINTENANCE | completarMantenimiento() | exito | ONLINE | Actualizar firmware |
| MAINTENANCE | completarMantenimiento() | fallo | OFFLINE | Registrar error |

### 5.3 Razón de obsolescencia

El modelo de 4 estados (ONLINE, OFFLINE, MAINTENANCE, ERROR) no logra representar:

- La distinción entre conectividad y salud del hardware
- Los estados transitorios del firmware (DEGRADED, STALE, PROVISIONING, RETIRED)
- La composición de múltiples dimensiones de condición del dispositivo

Ver **DDD-008** para el modelo definitivo con tres dimensiones independientes.

---

## 6. Alarm - Ciclo de Vida

### 6.1 Diagrama

```mermaid
stateDiagram-v2
    [*] --> ACTIVE : generar()
    
    state ACTIVE {
        [*] --> SinReconocer
        SinReconocer : Esperando reconocimiento
        SinReconocer : visible en dashboard
    }
    
    ACTIVE --> ACKNOWLEDGED : reconocer() [operador]
    ACTIVE --> RESOLVED : resolver() [condicionNormaliza]
    
    state ACKNOWLEDGED {
        [*] --> Vista
        Vista : Operador confirmó vista
        Vista : Persiste activa
    }
    
    ACKNOWLEDGED --> RESOLVED : resolver() [condicionNormaliza]
    
    state RESOLVED {
        [*] --> Cerrada
        Cerrada : Condición normalizada
        Cerrada : Historial preservado
    }
    
    RESOLVED --> [*]
```

### 6.2 Tabla de Transiciones

| Estado Actual | Evento | Guarda | Estado Nuevo | Acciones |
|---------------|--------|--------|--------------|----------|
| — | generar() | noDuplicado | ACTIVE | Crear registro |
| ACTIVE | reconocer() | operadorVálido | ACKNOWLEDGED | acknowledgedBy=userId |
| ACTIVE | resolver() | condicionNormaliza | RESOLVED | resolvedAt=now |
| ACKNOWLEDGED | resolver() | condicionNormaliza | RESOLVED | resolvedAt=now |
| RESOLVED | — | — | — | Estado final |

### 6.3 Deduplicación

```javascript
async function ensureAlarm(deviceId, type, sensorType, severity, message) {
  // Verificar si ya existe alarma activa
  const existing = await Alarm.findOne({
    where: { deviceId, type, sensorType, resolvedAt: null }
  });
  
  if (existing) return existing; // Deduplicación
  
  // Crear nueva alarma
  return await Alarm.create({
    deviceId, type, sensorType, severity, message
  });
}
```

### 6.4 Resolución Automática

```javascript
async function resolveAlarm(deviceId, type, sensorType) {
  const active = await Alarm.findOne({
    where: { deviceId, type, sensorType, resolvedAt: null }
  });
  
  if (active) {
    await active.update({ resolvedAt: new Date() });
    events.emit('alarm', { ...active.toJSON(), action: 'RESOLVED' });
  }
}
```

---

## 7. PhaseTransition - Workflow de Aprobación

### 7.1 Diagrama

```mermaid
stateDiagram-v2
    [*] --> PENDING : sugerirTransicion()
    
    state PENDING {
        [*] --> EsperandoRevision
        EsperandoRevision : Visible para supervisor
        EsperandoRevision : Puede ser aprobada o rechazada
    }
    
    PENDING --> APPROVED : aprobar() [supervisor]
    PENDING --> REJECTED : rechazar() [supervisor]
    PENDING --> EXECUTED : ejecutar() [fullAuto]
    
    state APPROVED {
        [*] --> ListaParaEjecutar
        ListaParaEjecutar : Aprobada por supervisor
        ListaParaEjecutar : Pendiente de ejecución
    }
    
    APPROVED --> EXECUTED : ejecutar()
    APPROVED --> REJECTED : rechazar() [cambioCondicion]
    
    state EXECUTED {
        [*] --> FaseCambiada
        FaseCambiada : Transición completada
        FaseCambiada : Audit trail registrado
    }
    
    state REJECTED {
        [*] --> Denegada
        Denegada : Transición no ejecutada
        Denegada : Razón registrada
    }
    
    EXECUTED --> [*]
    REJECTED --> [*]
```

### 7.2 Tabla de Transiciones

| Estado Actual | Evento | Guarda | Estado Nuevo | Acciones |
|---------------|--------|--------|--------------|----------|
| — | sugerirTransicion() | modoSEMI_AUTO | PENDING | Crear registro |
| PENDING | aprobar() | supervisorVálido | APPROVED | approvedBy=userId |
| PENDING | rechazar() | supervisorVálido | REJECTED | notes=razón |
| PENDING | ejecutar() | modoFULL_AUTO | EXECUTED | actualizarFase |
| APPROVED | ejecutar() | — | EXECUTED | actualizarFase |
| APPROVED | rechazar() | cambioCondicion | REJECTED | notes=razón |
| EXECUTED | — | — | — | Estado final |
| REJECTED | — | — | — | Estado final |

### 7.3 Modos de Operación

| Modo | Comportamiento |
|------|----------------|
| **MANUAL** | Sin transiciones automáticas |
| **SEMI_AUTO** | Crea PhaseTransition con status=PENDING, espera aprobación |
| **FULL_AUTO** | Crea PhaseTransition con status=EXECUTED directamente |

---

## 8. Actuator - Modo de Operación

### 8.1 Diagrama

```mermaid
stateDiagram-v2
    [*] --> REMOTE : iniciar()
    
    state REMOTE {
        [*] --> ControlRemoto
        ControlRemoto : ControlEngine envía comandos
        ControlRemoto : Responde a histéresis
    }
    
    REMOTE --> LOCAL : overrideManual() [usuario]
    
    state LOCAL {
        [*] --> ControlLocal
        ControlLocal : Usuario controla directamente
        ControlLocal : Timer de 5 minutos
        
        ControlLocal --> EsperandoTimeout : iniciarTimer()
        EsperandoTimeout --> ControlLocal : timeout()
    }
    
    LOCAL --> REMOTE : timeout() [5min]
    LOCAL --> REMOTE : cancelarOverride()
    
    state TIMEOUT
    
    TIMEOUT --> [*]
```

### 8.2 Tabla de Transiciones

| Estado Actual | Evento | Guarda | Estado Nuevo | Acciones |
|---------------|--------|--------|--------------|----------|
| — | iniciar() | — | REMOTE | Modo por defecto |
| REMOTE | overrideManual() | usuarioAutorizado | LOCAL | overrideUntil=now+5min |
| LOCAL | timeout() | 5min transcurridos | REMOTE | Restaurar control |
| LOCAL | cancelarOverride() | — | REMOTE | Restaurar control inmediato |

### 8.3 Lógica de Override

```javascript
async function overrideManual(deviceId, channel, userId) {
  const actuator = await Actuator.findOne({ where: { deviceId, channel } });
  
  if (!actuator) throw new Error('Actuator not found');
  if (actuator.mode === 'LOCAL') throw new Error('Already in LOCAL mode');
  
  const overrideUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos
  
  await actuator.update({
    mode: 'LOCAL',
    overrideUntil
  });
  
  // Programar restauración automática
  setTimeout(async () => {
    await actuator.update({ mode: 'REMOTE', overrideUntil: null });
    events.emit('state', { deviceId, channel, mode: 'REMOTE' });
  }, 5 * 60 * 1000);
}
```

---

## 9. ControlEngine - Ciclo de Evaluación

### 9.1 Diagrama

```mermaid
stateDiagram-v2
    [*] --> Inactivo
    
    state Inactivo {
        [*] --> EsperandoInicio
        EsperandoInicio : Sin ciclos activos
    }
    
    Inactivo --> Evaluando : iniciarMotor() [cicloActivo]
    
    state Evaluando {
        [*] --> LeyendoSensores
        LeyendoSensores : Obtener lecturas actuales
        
        LeyendoSensores --> Analizando : lecturasObtenidas
        
        state Analizando {
            [*] --> VerificandoUmbrales
            VerificandoUmbrales : Comparar con receta
            
            VerificandoUmbrales --> CalculandoComandos : umbralesVerificados
            CalculandoComandos : Generar órdenes
            
            CalculandoComandos --> EvaluandoTransicion : comandosListos
            EvaluandoTransicion : Verificar cambio de fase
        }
        
        Analizando --> EnviandoComandos : comandosGenerados
        EnviandoComandos : Push a firmware
        
        EnviandoComandos --> RegistrandoEstado : comandosEnviados
        RegistrandoEstado : Guardar CycleState
    }
    
    Evaluando --> EsperandoIntervalo : cicloCompletado
    EsperandoIntervalo : 60 segundos
    
    EsperandoIntervalo --> Evaluando : intervaloCompletado
    
    Evaluando --> Inactivo : detenerMotor() [noCiclosActivos]
    
    Inactivo --> [*]
```

### 9.2 Flujo del Ciclo

```
1. LEER SENSORES
   └─> Obtener últimas lecturas de Telemetry
   
2. ANALIZAR
   ├─> Verificar umbrales vs receta activa
   ├─> Calcular desviaciones
   └─> Determinar severidad de alarmas
   
3. COMPUTAR COMANDOS
   ├─> Aplicar histéresis (±1.0°C)
   ├─> Verificar fail-safe (temp ≥ 32°C)
   └─> Generar órdenes para actuadores
   
4. ENVIAR COMANDOS
   └─> Push vía MQTT/WebSocket
   
5. REGISTRAR ESTADO
   └─> Crear CycleState snapshot
   
6. EVALUAR TRANSICIÓN
   └─> Verificar si se debe cambiar de fase
```

### 9.3 Fail-Safe

```javascript
function computeCommands(readings, recipe, phase) {
  const temp = readings.temperature;
  const state = getActuatorState(deviceId);
  
  // FAIL-SAFE: Temperatura crítica
  if (temp >= 32.0) {
    return {
      ventOn: true,    // FORZAR ventilación
      heatOn: false,   // FORZAR calefacción OFF
      humidOn: false,  // FORZAR humidificador OFF
      overheat: true
    };
  }
  
  // ... lógica normal de control
}
```

---

## 10. Resumen de Máquinas de Estado

| Máquina | Estados | Transiciones | Guardas Principales |
|---------|---------|--------------|---------------------|
| **CultivationCycle** | 4 (PLANNED, ACTIVE, COMPLETED, ABORTED) | 5 | sensoresCalibrados, criticalAlarm |
| **CurrentPhase** | 4 (INCUBATION, FRUITING, MAINTENANCE, COMPLETED) | 4 | sensor/time/manual |
| **Device** | ~~4~~ → ver DDD-008 | ~~9~~ → ver DDD-008 | ~~heartbeat, timeout, fault~~ → ver DDD-008 |
| **Alarm** | 3 (ACTIVE, ACKNOWLEDGED, RESOLVED) | 4 | operador, condicionNormaliza |
| **PhaseTransition** | 4 (PENDING, APPROVED, EXECUTED, REJECTED) | 6 | supervisor, modo |
| **Actuator** | 2 (REMOTE, LOCAL) | 3 | usuario, timeout |
| **ControlEngine** | 2 (Evaluando, Inactivo) | 3 | cicloActivo, intervalo |

---

## 11. Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2026-07-14 | Equipo Mush2 | Creación del documento |
| 1.1 | 2026-07-25 | Equipo Mush2 | Sección 5 (Device) marcada como obsoleta, reemplazada por DDD-008 |

---

*Documento generado como parte del proceso de Domain-Driven Design de Mush2.*
