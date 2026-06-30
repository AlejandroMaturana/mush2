# ADR-001: Migración al ESP32-S3 como nodo de telemetría

**Fecha**: 2026-06-10 (actualizado 2026-06-27)
**Estado**: Aceptado

## Contexto
El sistema requiere un microcontrolador con conectividad WiFi integrada para actuar como nodo de adquisición y telemetría ambiental. Debe leer los sensores AHT21+ENS160 vía I²C, enviar datos por HTTP (ThingSpeak + backend local), controlar actuadores mediante SSRs (active-LOW), manejar un LED RGB NeoPixel, y operar de forma continua con FreeRTOS.

## Decisión
Usar la placa **ESP32-S3-DevKitC-1** basada en el SoC ESP32-S3 (Xtensa LX7 dual-core).

## Motivos
1. **Doble núcleo**: El ESP32-S3 incorpora dos núcleos Xtensa LX7 a 240 MHz, permitiendo aislar tareas de control (I²C + SSR) en Core 1 y tareas de red (WiFi + HTTP) en Core 0.
2. **WiFi + BLE 5.0 integrado**: Pila TCP/IP completa, WPA2, y Bluetooth Low Energy para futuras expansiones.
3. **16 MB de Flash**: Espacio suficiente para OTA, WebServer y almacenamiento de configuraciones.
4. **GPIOs ampliados**: Se usan pines dedicados para I²C (GPIO4 SDA, GPIO5 SCL), 4 SSRs (GPIO11–14) y NeoPixel RGB (GPIO48), sin conflictos con periféricos internos.
5. **USB CDC nativo**: El ESP32-S3 no requiere driver externo; la programación y monitoreo se realizan directamente por USB serie nativo.
6. **NeoPixel/WS2812B integrado**: LED RGB programable para indicación visual de estado.
7. **Factor de forma compacto**: La ESP32-S3-DevKitC-1 mantiene un tamaño reducido adecuado para instalaciones en cámaras de cultivo.
8. **Compatible con PlatformIO**: Se programa con el ecosistema Arduino/ESP32.
9. **Coste unitario aproximado de 8–12 USD**.

## Consecuencias
- Los GPIOs operan a 3.3 V. Los sensores AHT21+ENS160 trabajan nativamente a 3.3 V.
- Los SSRs se configuran como active-LOW (lógica invertida) según tests de laboratorio.

## Alternativas descartadas
- **ESP32 DevKit v1 (ESP32-WROOM-32)**: Sin soporte para USB CDC nativo; flash máximo de 4–8 MB. El ESP32-S3 ofrece mejor rendimiento y más flash.
- **Raspberry Pi Pico W**: Sin WiFi integrado confiable; ecosistema menos maduro para IoT.

## Detalle técnico

### Mapeo de pines utilizado
| Función       | Pin DevKitC-1 | GPIO ESP32-S3 | Nota                        |
|---------------|---------------|---------------|-----------------------------|
| I²C SDA       | GPIO4         | GPIO4         | Sensor AHT21+ENS160         |
| I²C SCL       | GPIO5         | GPIO5         | Sensor AHT21+ENS160         |
| LED RGB       | GPIO48        | GPIO48        | NeoPixel/WS2812B            |
| SSR Canal 1   | GPIO11        | GPIO11        | Ventilación                 |
| SSR Canal 2   | GPIO12        | GPIO12        | Calefacción (manta térmica) |
| SSR Canal 3   | GPIO13        | GPIO13        | Humidificación              |
| SSR Canal 4   | GPIO14        | GPIO14        | Iluminación (fotoperiodo)   |

### Configuración en PlatformIO
```ini
[env:esp32-s3-devkitc-1]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
monitor_speed = 115200
board_build.flash_mode = qio
board_build.arduino.partitions = default_16MB.csv
board_upload.flash_size = 16MB
```

### Estrategia de núcleos FreeRTOS
- **Core 1 (Control)**: I²C (lectura de sensores) + SSR (control de actuadores).
- **Core 0 (Red)**: WiFi + HTTP polling (ThingSpeak + backend local) + OTA.

### Intervalos de operación
- Lectura de sensores: cada 10 segundos (`SENSOR_INTERVAL`)
- Envío a ThingSpeak: cada 20 segundos (`TS_INTERVAL`)
- Polling a backend local: cada 3 segundos (`POLL_INTERVAL`)

## Referencias
- Implementación: `firmware-esp32/platformio.ini`, `firmware-esp32/src/config.h`
- Ver también: ADR-002 (sensores), ADR-003 (SSRs)
