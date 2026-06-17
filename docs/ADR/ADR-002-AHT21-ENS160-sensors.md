# ADR-002: Selección del módulo sensor combinado AHT21+ENS160

**Fecha**: 2026-06-10 (actualizado 2026-06-14)
**Estado**: Aceptado

## Contexto
El sistema requiere medición de cuatro variables ambientales: temperatura, humedad relativa, CO₂ equivalente (eCO₂) y compuestos orgánicos volátiles totales (TVOC). Se necesita un módulo sensor compatible con ESP8266, de bajo consumo, comunicación I²C, y que minimice la complejidad de integración.

## Decisión
Usar el módulo combinado que integra el sensor de temperatura y humedad **AHT21** junto con el sensor de calidad del aire **ENS160** en una misma placa.

## Motivos
1. **Integración dual en un solo módulo**: Proporciona las cuatro variables requeridas en una única placa, reduciendo puntos de fallo.
2. **ENS160 con baseline automática**: Implementa algoritmos de compensación y auto-calibración de línea base.
3. **AHT21 de alto rendimiento**: Precisión de ±0.3 °C en temperatura y ±2 % en humedad relativa.
4. **Bus I²C compartido**: Ambos sensores operan en el mismo bus con direcciones distintas (AHT21: 0x38, ENS160: 0x53).
5. **Librería DFRobot para ENS160**: Librería estable para el ENS160 (`DFRobot_ENS160`).

## Consecuencias
- El firmware debe inicializar ambos sensores secuencialmente en el mismo bus I²C.
- El ENS160 requiere un período de *burn-in* de 48 horas continuas la primera vez.
- La temperatura del AHT21 se usa para compensación del ENS160 vía `setTempAndHum()`.
- **El AHT21 tiene implementación personalizada** en el firmware (sin librería externa), lo que permite mayor control pero requiere mantenimiento.

## Alternativas descartadas
- **DHT22 + CCS811**: El CCS811 requiere calentamiento prolongado y sufre deriva.
- **BME680**: No reporta eCO₂ ni TVOC como valores separados.
- **SHT31 + SGP30**: Coste combinado mayor y ocupa más espacio.
- **SCD30 (NDIR)**: Costoso (~30 USD) y consumo elevado.

## Detalle técnico

### Direcciones I²C
| Sensor | Dirección I²C | Implementación |
|--------|---------------|----------------|
| AHT21  | 0x38          | Personalizada (`aht_sensor.cpp`) |
| ENS160 | 0x53          | DFRobot (`ens160_sensor.cpp`) |

### Lectura de sensores
- El AHT21 se lee directamente mediante protocolo I²C personalizado
- El ENS160 usa la librería `DFRobot_ENS160_I2C`
- La compensación de temperatura/humedad se actualiza en cada lectura del ENS160

### Estructura de datos
```cpp
// Lectura AHT21
struct SensorReading {
  float temperature;
  float humidity;
  bool valid;
};

// Lectura ENS160
struct EnsReading {
  uint16_t aqi;
  uint16_t eco2;
  uint16_t tvoc;
  bool valid;
};
```

## Referencias
- Implementación: `firmware/src/aht_sensor.cpp`, `firmware/src/ens160_sensor.cpp`
- Ver también: ADR-001 (placa ESP8266)