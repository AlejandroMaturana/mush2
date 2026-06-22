# ADR-010: Mecanismo Fail-Safe Overheat y Seguridad Térmica

**Estado:** Aceptado  
**Fecha:** 2026-06-21  
**Decisión:** Implementar un sistema de seguridad térmica con override total, detección de fallo de sensores, secuencia de arranque controlada y gestión térmica del SSR.

## Contexto

El sistema opera con 4 SSRs de 2A que controlan cargas de AC (ventilador, manta térmica, humidificadores). Sin mecanismos de seguridad ante:

- **Fallo de sensor**: Si el AHT21 se desconecta, las lecturas pueden ser inválidas y el control opera a ciegas
- **Sobrecalentamiento**: Si la manta térmica falla en ON, la temperatura puede superar 40°C en minutos
- **Fallo de SSR**: Un SSR en cortocircuito mantiene el actuador encendido permanentemente
- **Condensación en ENS160**: Humedad >95% puede descalibrar el sensor de CO₂
- **Arranque en caliente**: Tras un reinicio, el ENS160 da lecturas falsas de CO₂ durante 3 minutos

Se requiere un mecanismo fail-safe que actúe independientemente del control normal y priorice la integridad del cultivo y el hardware.

## Decisión

### 1. Overheat Fail-Safe (Override de Emergencia)

El fail-safe overheat tiene la **máxima prioridad** sobre cualquier otro control:

- **Umbral crítico**: `TEMP_CRITICAL = 32.0°C`
- **Acción**: Apagar TODOS los actuadores, forzar ventilador ON al 100%
- **Recuperación**: Cuando temp baje de `28.0°C`, desactivar override y retornar al control normal
- **Frecuencia de evaluación**: Cada ciclo de sensor (10s), antes de la evaluación de histéresis

### 2. Modo Seguro por Fallo de Sensores

| Escenario | Detección | Acción |
|-----------|-----------|--------|
| AHT21 falla 3 lecturas consecutivas | `reading.valid == false` × 3 | Apagar TODOS los actuadores. Ventilador en ciclo 2min ON / 10min OFF. Usar última lectura válida como fallback (5 min de gracia) |
| ENS160 da CO₂ < 400 ppm (anómalo) | 3 lecturas consecutivas | Asumir 800 ppm como valor seguro. Activar alarma |
| ENS160 no responde | Timeout I2C | Ignorar CO₂, operar solo con T/H. Ventilador en ciclo forzado 5min ON / 10min OFF |
| I2C bus lock | 3 fallos consecutivos de AHT21 | `Wire.end(); delay(100); Wire.begin();` para resetear bus sin reiniciar micro |

### 3. Secuencia de Arranque (Power-On Sequence)

Tras cualquier reinicio del microcontrolador:

| Tiempo | Acción |
|--------|--------|
| T=0s | Inicializar solo AHT21 y ENS160 (warm-up) |
| T=5s | Leer baseline de T y HR del ambiente |
| T=10s | Ventilador al 100% durante 10s para purgar gases acumulados |
| T=30s | Habilitar control automático completo |

**Razón**: El ENS160 da lecturas erráticas de CO₂ (hasta 2000 ppm falsos) durante los primeros 3 minutos.

### 4. Gestión Térmica del SSR

- Los SSRs disipan ~1.5W por canal. No montar los 4 juntos sin separación de 15mm.
- Si la temperatura del disipador (NTC) supera 55°C:
  - Reducir ciclo de trabajo al 50% (alternar ON/OFF en periodos de 30s)
  - Activar ventilador de 12V dedicado al panel de SSR

### 5. Protección contra Overshoot Térmico

La manta térmica tiene inercia: cuando el sensor marca 24°C, la superficie de la manta ya está a 70°C.

- **Apagado anticipado**: Cuando la temperatura esté a 1.0°C del setpoint (`temp >= tempMax - 1.0`), apagar la manta y dejar que la inercia complete el ciclo.
- Esto aplica solo en modo LOCAL; en REMOTE el usuario controla directamente.

## Consecuencias

### Positivas
- El cultivo nunca supera los 32°C aunque fallen todos los controles
- El sistema se recupera automáticamente de fallos de sensores sin intervención
- La secuencia de arranque evita falsas alarmas de CO₂ post-reinicio
- Protección contra burnout del SSR por sobrecalentamiento

### Negativas
- El override fail-safe puede causar ciclos de temperatura si el sensor falla intermitentemente
- La purga de 10s al arranque puede estresar primordios si ocurre durante el día
- La reducción de ciclo de trabajo por temperatura SSR puede afectar el control fino

## Implementación

- `hysteresis_controller.cpp`: Métodos `checkOverheat()`, `checkSensorHealth()` en `main.ino`
- `main.ino`: Bucle principal verifica fail-safe ANTES de evaluar histéresis
- `config.h`: `TEMP_CRITICAL` (32.0°C) y `TEMP_RECOVERY` (28.0°C)
- `ssr_controller.cpp`: `setAll(0)` para apagado de emergencia

## Referencias

- `docs/roadmap/consideraciones.md` — Sección 6: Consideraciones Finales
- `docs/roadmap/otras-consideraciones.md` — Sección 5: Gestión Térmica del SSR
- `docs/roadmap/otras-consideraciones.md` — Sección 6: Secuencia de Arranque
- `docs/roadmap/otras-consideraciones.md` — Sección 8: Detección de Fallos
