#ifndef CHANNEL_MAPPING_H
#define CHANNEL_MAPPING_H

// Mapeo canónico channel → GPIO del ESP32-S3.
// Fuente de verdad: EDD-006 §5.2 — RM-003: inmutable sin nuevo EDD + cambio de hardware.
//
// | channel | ActuatorType | GPIO | SSR | Propósito                    |
// |---------|--------------|------|-----|------------------------------|
// | 1       | VENTILATION  | 11   | R1  | Renovación de aire           |
// | 2       | HEATER       | 12   | R2  | Manta térmica                |
// | 3       | HUMIDIFIER   | 13   | R3  | Humidificador ultrasónico    |
// | 4       | LIGHT        | 14   | R4  | Luz LED fotoperiodo          |

#define CHANNEL_1_PIN 11  // VENTILATION
#define CHANNEL_2_PIN 12  // HEATER
#define CHANNEL_3_PIN 13  // HUMIDIFIER
#define CHANNEL_4_PIN 14  // LIGHT

#define CHANNEL_PINS_COUNT 4

#endif
