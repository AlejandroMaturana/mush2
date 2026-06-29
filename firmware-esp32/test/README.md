# Mush2 — Pruebas de Hardware (ESP32-S3)

## Propósito

Este directorio contiene sketches de validación de hardware para el firmware Mush2. Cada prueba es un sketch Arduino/PlatformIO autocontenidos e independiente que se flashea al ESP32-S3 y se ejecuta en el hardware real. Las pruebas verifican conexiones físicas (GPIO, I2C), periféricos (NeoPixel, SSR, sensores) y subsistemas de red (HTTP poller, watchdog).

## Metodología: Tests de Integración vs Unit Tests

Estos son **tests de integración sobre hardware real** — no unit tests con mocking. Esto es intencional:

| Aspecto | Enfoque actual (recomendado) | Unit test puro |
|---------|------------------------------|----------------|
| Verifica | HW real + firmware juntos | Lógica aislada |
| Requiere | Placa ESP32-S3 conectada | Solo compilación nativa |
| Confiabilidad | 100% real | Depende de calidad de mocks |
| Velocidad de ciclo | Lenta (flashear + Serial) | Instantánea |
| Mockea | Nada | WiFiClient, I2C, NVS, GPIO |

Para firmware embebido con Arduino en ESP32-S3, este enfoque es el estándar de la industria. Los unit tests puros requerirían un framework como Unity en host nativo mockeando todo el HAL, lo cual tiene baja relación costo/beneficio para este proyecto.

## Estructura

```
test/
├── README.md                          ← Este archivo
├── S3_test-ledRGB/                   ← Escaneo de GPIOs para NeoPixel
├── S3_test-RGBoff/                   ← Apagado de LED RGB (GPIO 48)
├── S3_test-colorsRGB/                ← Ciclo rainbow en NeoPixel
├── S3_test-SSR-4ch/                  ← Prueba SSR 4 canales (active-LOW)
├── S3_test-i2c-ENS160-AHT21/         ← Bus I2C + sensores ENS160 + AHT21
├── S3_test-http-poller/              ← HTTP polling FSM + backend
└── S3_test-watchdog/                 ← Watchdog SW/HW + safe mode
```

## Inventario de Pruebas

| Test | Componente | ¿Qué verifica? | Dependencias |
|------|-----------|----------------|-------------|
| `ledRGB` | NeoPixel | Escaneo de GPIOs (48,38,18,8,35,36,37) para encontrar el pin del LED RGB | `Adafruit NeoPixel` |
| `RGBoff` | NeoPixel | Apagado absoluto del LED en GPIO 48 | `Adafruit NeoPixel` |
| `colorsRGB` | NeoPixel | Ciclo rainbow con corrección gamma en GPIO 48 | `Adafruit NeoPixel` |
| `SSR-4ch` | SSR | Control individual y simultáneo de 4 canales SSR (active-LOW) en GPIOs 11-14 | Ninguna (GPIO directo) |
| `i2c-ENS160-AHT21` | Sensores I2C | Bus I2C en SDA=4/SCL=5, detección y lectura de ENS160 (0x53) + AHT21 (0x38) | `DFRobot_ENS160`, `DFRobot_AHT20` |
| `http-poller` | HTTP Poller + SSR | WiFi + TCP + HTTP + parseo JSON + **criterio: response valida = COMPLETE** (actuators vacío = OK, no FAIL) + aplicación a SSR + **ciclo test local** (CH1→CH4 round-robin 3s mientras backend no envíe actuators) | Ninguna (WiFi + GPIO nativo) |
| `watchdog` | Watchdog + State Machine | SW WDT (30s timeout), Task WDT (10s), contador de reboots en NVS, safe mode, transiciones de FSM, cascading reboot | Ninguna (autocontenido) |

## Cómo Ejecutar una Prueba

### Con PlatformIO (recomendado)

```bash
cd firmware-esp32/test/S3_test-<nombre>
pio run -t upload
pio device monitor
```

Cada prueba incluye su propio `platformio.ini`. Todas las pruebas nuevas son autocontenidas (no dependen de archivos en `src/`).

### Con Arduino IDE

1. Abrir el archivo `.ino`
2. Instalar las librerías listadas en la columna "Dependencias" de la tabla
3. Seleccionar placa: `ESP32-S3 DevKitC-1`
4. Flash y monitor Serial a 115200 baud

## Convenciones

- **Nombres**: `S3_test-<componente>/S3_test-<componente>.ino`
- **Versión**: Cada test tiene `#define <COMPONENTE>_TEST_VERSION "x.y.z"`
- **Serial**: Salida a 115200 baud, formato legible
- **LED**: Las pruebas usan el LED RGB como indicador de estado cuando es relevante
- **WDT**: Todas las pruebas registran el Task WDT para evitar reseteos durante la ejecución

## Agregar una Nueva Prueba

1. Crear `test/S3_test-<componente>/`
2. Escribir `S3_test-<componente>.ino`
3. Si necesita librerías externas, agregar `platformio.ini` con `lib_deps`
4. Si necesita headers del `src/` principal, agregar `build_flags = -I../../src`
5. Actualizar este README con la nueva entrada en la tabla

## Tests vs Código de Producción

Las pruebas en `test/` son independientes del flujo de compilación principal. El `src/` principal no referencia a `test/` de ninguna forma. Esto permite que las pruebas evolucionen sin afectar el firmware de producción, y viceversa.
