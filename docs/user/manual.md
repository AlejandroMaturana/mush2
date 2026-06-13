# Mush2 — Manual de Usuario

> Sistema de control de ambientes para cultivo de hongos adaptógenos.
> Versión: 0.7.0 | Protocolo MQTT: 1.0.0

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

---

## 1. Introducción

Mush2 es un sistema IoT para monitorear y controlar el ambiente de cámaras de cultivo de hongos adaptógenos. Consta de:

- **Controlador físico** (ESP8266 LOLIN WeMos D1 R1) con sensores y relés SSR
- **Backend** en Node.js con base de datos PostgreSQL
- **Frontend** web accesible desde cualquier navegador

### Sensores compatibles
- **AHT21**: Temperatura y humedad (I2C 0x38)
- **ENS160**: Calidad del aire — CO₂, VOC, AQI (I2C 0x53)

### Actuadores
- **SSR1** (D5): Calefacción — control por histéresis de temperatura
- **SSR2** (D7): Ventilación — control por histéresis de temperatura + CO₂
- **SSR3** (D6): Humidificación — control por histéresis de humedad

---

## 2. Arquitectura

```
[SENSORES] → ESP8266 → MQTT → [BACKEND] → PostgreSQL → [FRONTEND Web]
                ↓                          ↓
           [SSR/ACTUADORES]          [ThingSpeak]
                ↓
      [Cámara de Cultivo]
```

- **MQTT**: Comunicación en tiempo real entre firmware y backend (2 brokers failover)
- **SSE**: Eventos en vivo del backend al frontend
- **REST API**: Operaciones CRUD (dispositivos, recetas, ciclos)
- **ThingSpeak**: Canal de respaldo con T/HR/CO₂/VOC cada 20s

---

## 3. Conexión Inicial

### Primer inicio del controlador

1. Conecta el D1 R1 vía USB
2. El firmware se conecta automáticamente a WiFi
3. Publica un evento `BOOT` en MQTT
4. El backend registra el dispositivo automáticamente

### Activación en el sistema

1. Inicia sesión en la web con credenciales de administrador
2. Ve a **Dashboard** — el dispositivo aparecerá automáticamente
3. Asigna un nombre a la cámara desde el detalle del dispositivo

---

## 4. Dashboard

La página principal muestra:

- **Métricas en vivo**: Temperatura, humedad, CO₂, VOC con actualización SSE
- **Estado de dispositivos**: Online/Offline
- **Alertas**: Alarmas activas del sistema (HIGH_TEMP, LOW_HUM, HIGH_CO2, etc.)

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
3. El comando se envía vía MQTT con QoS 2
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
- Verifica que el LED del D1 R1 esté encendido
- Revisa la conexión WiFi (el firmware muestra en monitor serie el estado)
- El backend debe estar corriendo y conectado a MQTT
- Si hay 5+ reinicios consecutivos, el firmware entra en modo SAFE (espera 60s)

### Los sensores no reportan datos
- Verifica el cableado I2C (SDA→D2, SCL→D1)
- El ENS160 necesita el AHT21 para calibrarse (se pasa temp/hum vía setTempAndHum)
- El firmware reinicia el AHT21 automáticamente si falla el trigger de medición
- Revisa el monitor serial del firmware (115200 baud)

### Los actuadores no responden
- Verifica el modo de control (LOCAL/REMOTE/OFF)
- En modo REMOTE, los comandos MQTT tienen prioridad
- Las reglas de histéresis solo operan en modo LOCAL
- Si el backend no está conectado al mismo broker MQTT que el firmware, los comandos no llegan

### Cómo reiniciar el controlador
- Desconecta y vuelve a conectar la alimentación USB
- O usa el botón RST en el D1 R1

### Cómo actualizar el firmware por WiFi (OTA)
1. Envía comando MQTT a `mush2/cmd/{id}/ota` con `{"action":"activate"}`
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

*Documentación actualizada el 2026-06-13 para Mush2 v0.7.0*
