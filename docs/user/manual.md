# Mush2 — Manual de Usuario

> Sistema de control de ambientes para cultivo de hongos adaptógenos.
> Versión: 0.9.1 | Protocolo HTTP polling: 1.0.0 | BLE Provisioning: 1.0.0

---

## Índice

1. [Introducción](#1-introducción)
2. [Arquitectura](#2-arquitectura)
3. [Conexión Inicial](#3-conexión-inicial)
4. [Dashboard](#4-dashboard)
5. [Dispositivos](#5-dispositivos)
6. [Recetas](#6-recetas)
7. [Ciclos de Cultivo](#7-ciclos-de-cultivo)
8. [Solución de Problemas](#8-solución-de-problemas)
9. [Provisioning BLE](#9-provisioning-ble)
10. [Botón Multifunción (SMFB)](#10-botón-multifunción-smfb)

---

## 1. Introducción

Mush2 es un sistema IoT para monitorear y controlar el ambiente de cámaras de cultivo de hongos. Consta de:

- **Controlador físico** (ESP32-S3-DevKitC-1) con componentes satelitales para abarcar funciones
- **Backend** en Node.js con base de datos PostgreSQL
- **Frontend** web accesible desde cualquier navegador
- **Botón multifunción** (SMFB) — interacción física local sin necesidad de app ni WiFi

### Sensores compatibles
- **AHT21**: Temperatura y humedad (I2C 0x38)
- **ENS160**: Calidad del aire — CO₂, VOC, AQI (I2C 0x53)

### Actuadores
- **SSR1** (D5): Calefacción — control por histéresis de temperatura
- **SSR2** (D7): Ventilación — control por histéresis de temperatura + CO₂
- **SSR3** (D6): Humidificación — control por histéresis de humedad
- **SSR4** (D0): Iluminación — control por fotoperiodo

### Interacción física
- **Botón SMFB** (GPIO 6): Botón multifunción con 4 gestos (click, doble-click, hold 3s, hold 10s)
- **LED RGB** (GPIO 48): NeoPixel WS2812B para feedback visual de estado y gestos

---

## 2. Arquitectura

```
                    ┌─────────────────────────────────────────┐
                    │              WEB BROWSER                │
                    │  (Chrome/Edge 90+ — Web Bluetooth API)  │
                    └────────────┬────────────────────────────┘
                                 │ BLE (solo provisioning)
                                 ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ SENSORES │───▶│ ESP32-S3 │───▶│  HTTP    │───▶│ BACKEND  │───▶│ Frontend │
│ AHT21    │    │   + BOTON│    │ polling  │    │ Node.js  │    │   Web    │
│ ENS160   │    │   SMFB   │    │ + MQTT   │    │ Postgres │    │          │
└──────────┘    └────┬─────┘    └──────────┘    └──────────┘    └──────────┘
                     │                                │
                ┌────▼─────┐                    ┌─────▼──────┐
│ SSR/     │
                 │ ACTUAD.  │
                 └──────────┘
```

- **BLE Provisioning**: Configuración Wi-Fi inicial desde el navegador vía Bluetooth
- **HTTP Polling**: Comunicación entre firmware y backend mediante peticiones HTTP periódicas
- **MQTT**: Comandos de actuadores en tiempo real
- **SSE**: Eventos en vivo del backend al frontend
- **REST API**: Operaciones CRUD (dispositivos, recetas, ciclos)

---

## 3. Conexión Inicial

### Primer inicio del controlador

Cuando el ESP32-S3 arranca sin credenciales Wi-Fi guardadas, entra en **modo provisioning BLE**:

- El LED RGB parpadea en **azul** (0.75s ON / 0.75s OFF)
- El dispositivo se anuncia como `Mush2-XXXX` (últimos 4 dígitos del MAC)
- Permanece en este modo hasta recibir credenciales o por 5 minutos

### Provisionar desde el navegador

1. Conecta el ESP32-S3 a la corriente (USB o fuente externa)
2. Abre la web de Mush2 en **Chrome o Edge** (versión 90+)
3. Ve a **Dashboard** → haz clic en **ADD DEVICE**
4. Se abre el asistente de provisioning:
   - **ESCANEAR**: busca dispositivos Mush2 cercanos vía Bluetooth
   - **CONFIGURAR**: muestra información del dispositivo; ingresa SSID y contraseña Wi-Fi
   - **ENVIAR**: transmite las credenciales al dispositivo
   - **LISTO**: el dispositivo se reinicia y se conecta a la red
5. Tras el reinicio, el LED se apaga y el dispositivo aparece en el Dashboard

> **Nota**: Web Bluetooth requiere un gesto del usuario (clic) para escanear. Solo funciona en Chrome/Edge — no en Safari ni Firefox.

### Provisionar de nuevo (cambio de red)

Si el dispositivo ya tiene credenciales guardadas pero quieres cambiarlas:

1. **Mantén presionado el botón multifunción durante 3 segundos** — el LED parpadea en azul y el dispositivo entra en modo provisioning BLE
2. O desde el Dashboard, ve al detalle del dispositivo y usa la opción de **Factory Reset**
3. El dispositivo reiniciará en modo provisioning (LED azul pulsante)
4. Repite los pasos de provisioning

---

## 4. Dashboard

La página principal muestra:

- **Métricas en vivo**: Temperatura, humedad, CO₂, VOC con actualización SSE
- **Estado de dispositivos**: Online/Offline
- **Alertas**: Alarmas activas del sistema (HIGH_TEMP, LOW_HUM, HIGH_CO2, etc.)

### Agregar un nuevo dispositivo

Si no hay dispositivos, el Dashboard muestra una pantalla de inicio con el botón **ADD DEVICE**.
Si ya hay dispositivos, el botón **ADD DEVICE** está en el encabezado de la sección **Chambers**.
Ambos botones llevan al [asistente de provisioning BLE](#9-provisioning-ble).

---

## 5. Dispositivos

Cada controlador físico aparece como un dispositivo en el sistema.

### Detalle del dispositivo
- Información general (ID, MAC, firmware, estado)
- Actuadores con control individual (ON/OFF) — al enviar comando pasa a modo REMOTE
- Histórico de telemetría con filtros por tipo de sensor y rango de fechas

### Control manual
1. Abre el detalle del dispositivo
2. Usa los botones ON/OFF en cada actuador
3. El comando se encola y el firmware lo recoge en su próximo sondeo HTTP
4. El firmware confirma con un ACK
5. Al enviar un comando manual, el actuador pasa a modo REMOTE

---

## 6. Recetas

Las recetas definen los parámetros ideales para cada especie de hongo.

### Campos de una receta

| Campo | Descripción |
|---|---|
| Especie | Nombre científico del hongo |
| Incubación | Temp, humedad, CO₂ máx y duración (días) |
| Fructificación | Temp, humedad, CO₂ máx y duración (días) |
| Mantenimiento | Temp, humedad, CO₂ máx |
| FAE | Intervalo y nivel de ventilación |
| Luz | Ciclo luz/oscuridad en horas |

### Receta incluida
- **Melena de León** (*Hericium erinaceus*): 18d incubación (20-24°C / 85-95% HR / CO₂ <1200ppm) → 10d fructificación (18-22°C / 85-95% HR / CO₂ <1200ppm)

---

## 7. Ciclos de Cultivo

Un ciclo ejecuta una receta de principio a fin.

### Estados del ciclo

| Estado | Descripción |
|---|---|
| PLANIFICADO | Creado pero no iniciado |
| ACTIVO | En ejecución — el motor de control evalúa el dispositivo cada 60s |
| COMPLETADO | Ciclo finalizado exitosamente |
| ABORTADO | Cancelado manualmente |

### Fases del ciclo

1. **INCUBACIÓN**: El micelio coloniza el sustrato
2. **FRUCTIFICACIÓN**: Aparecen los primordios y cuerpos fructíferos
3. **MANTENIMIENTO**: Cosecha continua
4. **COMPLETADO**: Ciclo terminado

> El motor de control del backend evalúa automáticamente cada 60 segundos si los parámetros están dentro del rango de la fase actual. Cuando se cumple la duración de la fase, transiciona automáticamente a la siguiente. Se generan snapshots periódicos en CycleState.

### Crear un ciclo

1. Ve a **Ciclos** → botón "Nuevo ciclo"
2. Selecciona una receta
3. Configura el dispositivo asignado
4. El ciclo inicia en PLANIFICADO
5. Actívalo manualmente → pasa a INCUBACIÓN

---

## 8. Solución de Problemas

### El dispositivo no aparece en el Dashboard
- Verifica que el LED del ESP32-S3 esté encendido
- Revisa la conexión WiFi (el firmware muestra en monitor serie el estado)
- El backend debe estar corriendo y accesible vía HTTP
- Si hay 5+ reinicios consecutivos, el firmware entra en modo SAFE (espera 60s)

### Los sensores no reportan datos
- Verifica el cableado I2C (SDA→D2, SCL→D1)
- El ENS160 necesita el AHT21 para calibrarse (se pasa temp/hum vía setTempAndHum)
- El firmware reinicia el AHT21 automáticamente si falla el trigger de medición
- Revisa el monitor serial del firmware (115200 baud)

### Los actuadores no responden
- Verifica el modo de control (LOCAL/REMOTE/OFF)
- En modo REMOTE, los comandos HTTP tienen prioridad
- Las reglas de histéresis solo operan en modo LOCAL
- Si el backend no está accesible, el firmware reintenta la conexión periódicamente

### El escáner BLE no encuentra dispositivos
- El dispositivo debe estar en modo provisioning (LED azul pulsante). Si el LED está apagado, ya está conectado a Wi-Fi — haz factory reset
- Usa Chrome o Edge versión 90+ en un equipo con Bluetooth
- Verifica que el Bluetooth del equipo esté encendido
- La primera vez el navegador pedirá permiso para acceder al Bluetooth

### El provisioning falla con "GATT operation failed"
- El error ocurre si el dispositivo se reinicia antes de que el navegador reciba la confirmación. Reintenta la operación
- Si persiste, verifica que la señal Wi-Fi sea buena (SSID correcto)

### El botón no responde
- Verifica que el LED muestre estado (si está apagado, el dispositivo está operando normalmente)
- Si el LED está en rojo fijo (safe mode), el botón no funcionará hasta que pase el período de 60 segundos
- Si el LED está púrpura, el dispositivo está arrancando — espera a que complete la inicialización
- Durante una actualización OTA, el botón está completamente bloqueado por seguridad
- Si el dispositivo no tiene botón físico instalado, puede configurar `BUTTON_PIN` a `-1` en `config.h` para deshabilitar la función

### Cómo reiniciar el controlador
- **Mantén presionado el botón multifunción durante 10 segundos** — el LED parpadea en rojo y el dispositivo se reinicia con configuración de fábrica (borra todas las credenciales WiFi y configuración)
- O desconecta y vuelve a conectar la alimentación USB
- O usa el botón RST en el ESP32-S3 (reinicio sin borrar configuración)

### Cómo actualizar el firmware por WiFi (OTA)
1. Envía comando HTTP a `POST /api/v1/devices/{id}/ota` con `{"action":"activate"}`
2. El firmware activa ArduinoOTA por 120s — flashea desde PlatformIO
3. O usa `{"action":"update","url":"http://..."}` para descarga HTTP directa

---

## Apéndice: Especies de prueba

| Especie | Incubación | Fructificación | Notas |
|---|---|---|---|
| *Hericium erinaceus* (Melena de León) | 20-24°C, 18d | 18-22°C, 10d | FAE alto |
| *Pleurotus ostreatus* (Ostra) | 22-26°C, 14d | 15-20°C, 7d | FAE medio |
| *Lentinula edodes* (Shiitake) | 20-24°C, 21d | 15-20°C, 10d | FAE medio |

---

## 9. Provisioning BLE

### Indicadores LED

| Modo | LED | Descripción |
|---|---|---|
| Provisioning | Azul pulsante (0.75s) | Esperando credenciales Wi-Fi vía BLE |
| Normal | Apagado | Funcionando en la red Wi-Fi |
| Alarma | Rojo fijo | Sobretemperatura o fallo de sensor |
| Degradado | Amarillo fijo | Sin datos de sensor válidos |
| Safe Mode | Rojo fijo (60s) | 5+ reinicios consecutivos |
| Click | Blanco flash (50ms) | Acknowledge — sin cambio de estado |
| Doble-click | Cyan flash (2x) | Refresh forzado de sensores |
| Hold 3s confirm | Azul flash (2x) | Entrando a provisioning |
| Hold progreso | Rampa azul→roja | Progreso visual del hold |
| Factory reset | Rojo parpadeo (5x) | Reset ejecutándose |

### GATT Profile

El servicio BLE expone 5 características para el provisioning:

| UUID | Nombre | Permisos | Descripción |
|---|---|---|---|
| `a7c3...4c5d` | Servicio | — | Servicio de provisioning |
| `...e1...` | device_info | READ | JSON con deviceId, fwVer, hwRev |
| `...e2...` | wifi_ssid | WRITE | SSID de la red Wi-Fi |
| `...e3...` | wifi_pass | WRITE | Contraseña Wi-Fi |
| `...e4...` | prov_cmd | WRITE | Comandos: `provision`, `reset`, `factory_reset` |
| `...e5...` | prov_status | READ + NOTIFY | JSON con estado y mensaje |

### Comandos del canal prov_cmd

| Comando | Efecto |
|---|---|
| `provision` | Guarda SSID+pass en NVS y reinicia a modo normal |
| `reset` | Reinicia el dispositivo (manteniendo credenciales) |
| `factory_reset` | Borra NVS de provisioning y reinicia a modo BLE |

### Requisitos del navegador

- **Web Bluetooth API** — Chrome 90+, Edge 90+, navegadores basados en Chromium
- No funciona en Safari, Firefox ni navegadores iOS
- Requiere Bluetooth activo en el dispositivo

---

## 10. Botón Multifunción (SMFB)

El dispositivo incluye un botón físico que permite interactuar con el controlador sin necesidad de aplicación móvil ni conexión WiFi. El botón está ubicado en GPIO 6 y usa un pull-up interno (activo LOW).

### Gestos disponibles

| Gesto | Cómo hacerlo | Acción |
|---|---|---|
| **Click** | Presionar y soltar rápidamente (< 0.3s) | Muestra estado del dispositivo (flash LED blanco) |
| **Doble-click** | Dos clicks rápidos seguidos | Forzar lectura de sensores (flash LED cyan) |
| **Hold 3 segundos** | Mantener presionado 3 segundos | Entrar/salir de modo provisioning BLE (LED azul) |
| **Hold 10 segundos** | Mantener presionado 10 segundos | **Factory reset** — borra toda la configuración (LED rojo) |

### Feedback LED por gesto

| Gesto | Patrón LED |
|---|---|
| Click | Flash blanco breve (50ms) |
| Doble-click | 2 flashes cyan rápidos |
| Hold progreso (0-3s) | Rampa azul creciente (mientras mantienes presionado) |
| Hold confirm (3s) | Doble flash azul |
| Hold progreso (3-10s) | Rampa roja creciente (mientras mantienes presionado) |
| Factory reset | 5 parpadeos rojos rápidos |

### Comportamiento por estado del dispositivo

| Estado del dispositivo | Click | Doble-click | Hold 3s | Hold 10s |
|---|---|---|---|---|
| **Normal** | Flash blanco | Refresh sensores | Entrar provisioning | Factory reset |
| **Degradado** | Flash blanco | Refresh sensores | Entrar provisioning | Factory reset |
| **Error** | Flash blanco | Ignorado | Ignorado | Factory reset |
| **Provisioning BLE** | Cancelar provisioning | Ignorado | Cancelar provisioning | Factory reset |
| **Actualización OTA** | **Todo bloqueado** | **Todo bloqueado** | **Todo bloqueado** | **Todo bloqueado** |
| **Arrancando (BOOT/INIT)** | Ignorado | Ignorado | Ignorado | Factory reset |

### Cancelación durante hold

Mientras mantienes presionado el botón, puedes arrepentirte:

- Si sueltas **antes de 3 segundos**: no ocurre nada (se cancela el gesto)
- Si sueltas **después de 3 segundos pero antes de 10**: se ejecuta el hold-3s (provisioning)
- Solo si mantienes **10 segundos completos** se ejecuta el factory reset

### Indicadores LED durante interacción

| Modo | LED | Descripción |
|---|---|---|
| Provisioning | Azul pulsante (0.75s) | Esperando credenciales Wi-Fi vía BLE |
| Normal | Verde fijo | Funcionando en la red Wi-Fi |
| Alarma | Rojo fijo | Sobretemperatura o fallo de sensor |
| Degradado | Amarillo fijo | Sin datos de sensor válidos |
| Safe Mode | Rojo fijo (60s) | 5+ reinicios consecutivos |
| **Click** | Blanco flash (50ms) | Acknowledge — sin cambio de estado |
| **Doble-click** | Cyan flash (2x) | Refresh forzado de sensores |
| **Hold 3s confirm** | Azul flash (2x) | Entrando a provisioning |
| **Hold progreso** | Rampa azul→roja | Progreso visual del hold |
| **Factory reset** | Rojo parpadeo (5x) | Reset ejecutándose |

### Notas importantes

- El botón **no modifica parámetros** — solo acciona modos y funciones predefinidas
- Durante una **actualización OTA**, el botón está completamente deshabilitado por seguridad
- El botón funciona **sin WiFi y sin aplicación** — es la interfaz de recuperación del dispositivo
- Si el dispositivo no tiene botón físico, puede deshabilitar la función configurando `BUTTON_PIN = -1`

---

*Documentación actualizada el 2026-07-12 para Mush2 v0.9.1*
