// =============================================
//  SENSOR ENS160 + AHT21 - WeMos D1 R1 (ESP8266)
//  Pines: GPIO04 y GPIO05 (I2C)
//  Versión de testeo comunicación I2C
// =============================================

#include <ESP8266WiFi.h>      // sólo para que el core ESP8266 se incluya
#include <Wire.h>
#include <DFRobot_AHT20.h>    // AHT21 / AHT20
#include <DFRobot_ENS160.h>   // ENS160

/* ----------  Pines I2C del ESP8266 ---------- */
#define PIN_SDA   4   // GPIO4 (alias D2)
#define PIN_SCL   5   // GPIO5 (alias D1)
/* Si prefieres los alias en vez de los números,
   comenta las dos líneas anteriores y descomenta:
   #define PIN_SDA   D2
   #define PIN_SCL   D1
*/

DFRobot_AHT20   aht21;

/* Constructor del ENS160: bus Wire + dirección I2C.
   Cambia 0x53 → 0x52 si tu módulo tiene el pin ADD a GND. */
DFRobot_ENS160_I2C ens160(&Wire, 0x53);

/* Variables de calibración */
float temperature = 25.0;
float humidity    = 35.0;

void setup() {
  Serial.begin(115200);
  while (!Serial) ;                 // Espera al Monitor Serie

  Serial.println(F("\n=== ENS160 + AHT21 – ESP8266 (WEMOS D1 R1) ==="));

  /* ----  I2C ---- */
  Wire.begin(PIN_SDA, PIN_SCL);      // inicia I2C en los pines elegidos

  /* ----  AHT21 ---- */
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
      Serial.print(F("Temp : ")); Serial.print(temperature);
      Serial.println(F(" °C"));
      Serial.print(F("Hum  : ")); Serial.print(humidity);
      Serial.println(F(" % RH"));
    }
  }

  /* ----  ENS160 ---- */
  Serial.print(F("Inicializando ENS160... "));
  while (NO_ERR != ens160.begin()) {
    Serial.println(F("\nComunicación fallida – revisa cables"));
    delay(2000);
  }
  Serial.println(F("OK"));

  /* ----  Calibración con T/H ---- */
  ens160.setTempAndHum(temperature, humidity);
  Serial.println(F("ENS160 calibrado"));
  Serial.println(F("\n--- Lecturas cada 2 s ---"));
}

void loop() {
  /* Actualiza T/H y recalibra ENS160 */
  if (aht21.startMeasurementReady(true)) {
    temperature = aht21.getTemperature_C();
    humidity    = aht21.getHumidity_RH();
    ens160.setTempAndHum(temperature, humidity);
  }

  /* Lecturas del ENS160 */
  uint8_t aqi   = ens160.getAQI();    // 1‑5 (1=Excelente)
  uint16_t eco2 = ens160.getECO2();   // ppm
  uint16_t tvoc = ens160.getTVOC();   // ppb

  /* Salida por Serial */
Serial.printf(
  "Temp: %.1f °C  Hum: %.1f %% RH  eCO₂: %4u ppm  TVOC: %4u ppb  AQI: %d\r\n",
  temperature,               // %.1f → una décima de grado
  humidity,                  // %.1f → una décima de % RH
  eco2,                      // %4u → ancho 4 para alinear valores
  tvoc,                      // %4u
  aqi                        // %d
);
// ---------------------------------------------------------------


  delay(2000);
}
