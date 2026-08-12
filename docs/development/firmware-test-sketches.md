# Política de sketches de hardware (I110) — Mush2

> El gate de CI compila los sketches **autónomos** (proyectos PlatformIO con `platformio.ini`
> en `firmware/test/<sketch>/`). Los sketches que requieren **hardware físico** (actuadores,
> sensores I2C, LEDs RGB, monitor de relé SSR, watchdog real) se declaran **fuera del gate**:
> no se ejecutan en runners de CI sin HW. Esta política es explícita (ISSUE-110, TST-006,
> Ciclo 2) y evita falsos verdes o runs colgados.

## 1. Sketches compilados en CI (autónomos)

| Sketch | Ruta | Nota |
|---|---|---|
| `S3_test-actuator-chain` | `firmware/test/S3_test-actuator-chain` | valida cadena de actuadores (compila) |
| `S3_test-button` | `firmware/test/S3_test-button` | botón físico (compila) |
| `S3_test-http-poller` | `firmware/test/S3_test-http-poller` | HTTP poller (compila) |
| `S3_test-watchdog` | `firmware/test/S3_test-watchdog` | SW WDT + Task WDT (compila) |

Estos 4 tienen `platformio.ini` propio y se compilan en el job `firmware` de `ci.yml`
(`pio run -d test/S3_test-<name>`), dentro del loop de sketches.

## 2. Sketches fuera del gate (requieren hardware)

| Sketch | Motivo de exclusión |
|---|---|
| `S3_test-colorsRGB` | requiere HW + LED RGB direccionable + inspección visual |
| `S3_test-i2c-ENS160-AHT21` | requiere sensores I2C físicos (ENS160/AHT21) |
| `S3_test-ledRGB` | requiere HW + LED RGB |
| `S3_test-RGBoff` | requiere HW + LED RGB |
| `S3_test-SSR-4ch` | requiere módulo de relé de estado sólido 4 canales |

No tienen `platformio.ini` en el árbol; la ejecución real se realiza con hardware
(ver `docs/development/firmware-test-hw.md` si aplica). **No se declaran como gate de CI**
hasta que se disponga de un banco de pruebas HW en el runner.

## 3. Regla de mantenimiento

- Si un sketch pasa a ser compilable sin HW (unitario/simulación), se debe añadir su
  `platformio.ini` y registrarlo en **§1**.
- Si un sketch elimina su HW dependency a futuro, moverlo de **§2 → §1** con su config.
- REG-019 (`backend/src/__tests__/regression/REG-019_ci-gates-scanning.test.ts`) valida que
  el CI compila los autónomos y que esta política de exclusión está documentada.