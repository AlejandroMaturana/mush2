// =================================================================
//  PRUEBA comunicación i2c - Adaptado para ESP32-S3 DevKit
//  SENSOR ENS160 + AHT21 - Adaptado para ESP32-S3 DevKit
//  Pines sugeridos: GPIO 04 (SDA) y GPIO 05 (SCL)
// =================================================================

#include <Wire.h>
#include <DFRobot_AHT20.h>    // Librería para AHT21 / AHT20
#include <DFRobot_ENS160.h>   // Librería para ENS160

/* ---------- Configuración de Pines I2C Seguros ---------- */
#define PIN_SDA   4   // GPIO 4 (Libre de strapping y flash)
#define PIN_SCL   5   // GPIO 5 (Libre de strapping y flash)

DFRobot_AHT20   aht21;

/* Constructor del ENS160: bus Wire + dirección I2C.
   Cambia 0x53 → 0x52 si tu módulo tiene el pin ADD a GND. */
DFRobot_ENS160_I2C ens160(&Wire, 0x53);

/* Variables de calibración */
float temperature = 25.0;
float humidity    = 35.0;

void setup() {
  Serial.begin(115200);
  
  // Ajuste crítico para el USB nativo del ESP32-S3:
  // Espera hasta 4 segundos a que se abra el Monitor Serie antes de iniciar
  while (!Serial && millis() < 4000) { 
    delay(10); 
  }

  Serial.println(F("\n=== ENS160 + AHT21 – ESP32-S3 TEST ==="));
  Serial.printf("Configurando I2C en SDA: GPIO %d | SCL: GPIO %d\n", PIN_SDA, PIN_SCL);

  /* ---- Inicializar I2C en el ESP32-S3 ---- */
  Wire.begin(PIN_SDA, PIN_SCL);

  /* ---- Inicializar AHT21 ---- */
  Serial.print(F("Inicializando AHT21... "));
  uint8_t ahtSt = aht21.begin();    // 0 = OK
  if (ahtSt != 0) {
    Serial.print(F("ERROR (status "));
    Serial.print(ahtSt);
    Serial.println(')');
  } else {
    Serial.println(F("OK"));
    if (aht21.startMeasurementReady(true)) {
      temperature = aht21.getTemperature_C();
      humidity    = aht21.getHumidity_RH();
      Serial.printf("Lectura inicial -> Temp: %.1f °C | Hum: %.1f %%RH\n", temperature, humidity);
    }
  }

  /* ---- Inicializar ENS160 ---- */
  Serial.print(F("Inicializando ENS160... "));
  
  // Agregamos un contador de intentos para evitar que la placa se congele infinitamente en el setup si falla el cableado
  int intentos = 0;
  while (NO_ERR != ens160.begin() && intentos < 5) {
    Serial.print(F("."));
    intentos++;
    delay(1500);
  }
  
  if (intentos >= 5) {
    Serial.println(F("\n[ERROR] No se pudo comunicar con el ENS160. Revisa el cableado o la dirección I2C (0x53/0x52)."));
  } else {
    Serial.println(F("OK"));
    /* ---- Calibración inicial con T/H del AHT21 ---- */
    ens160.setTempAndHum(temperature, humidity);
    Serial.println(F("ENS160 calibrado con éxito."));
  }

  Serial.println(F("\n--- Iniciando bucle de lecturas (cada 2s) ---"));
}

void loop() {
  /* 1. Actualizar T/H desde el AHT21 */
  if (aht21.startMeasurementReady(true)) {
    temperature = aht21.getTemperature_C();
    humidity    = aht21.getHumidity_RH();
    
    // Enviar datos ambientales frescos al ENS160 para compensación interna
    ens160.setTempAndHum(temperature, humidity);
  }

  /* 2. Obtener lecturas de gases del ENS160 */
  uint8_t aqi   = ens160.getAQI();    // Índice de calidad del aire: 1 (Excelente) a 5 (Muy malo)
  uint16_t eco2 = ens160.getECO2();   // CO2 equivalente en ppm
  uint16_t tvoc = ens160.getTVOC();   // Compuestos Orgánicos Volátiles en ppb

  /* 3. Imprimir resultados formateados */
  Serial.printf(
    "Temp: %4.1f °C  |  Hum: %4.1f %%RH  |  eCO₂: %4u ppm  |  TVOC: %4u ppb  |  AQI: %d\n",
    temperature,
    humidity,
    eco2,
    tvoc,
    aqi
  );

  delay(2000);
}
