// =============================================
//  SENSOR DHT-11 - WeMos D1 R1 (ESP8266)
//  Pin: D5 (GPIO14)
//  Versión mejorada con diagnósticos
// =============================================

#include <DHT.h>

#define DHTPIN    14     // D5 (GPIO14)
#define DHTTYPE   DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  delay(1000);                 // Espera más larga al inicio
  
  Serial.println("\n=== DHT-11 - Diagnóstico Iniciado ===");
  Serial.print("Pin: D5 (GPIO");
  Serial.print(DHTPIN);
  Serial.println(")");

  dht.begin();
  
  Serial.println("Sensor DHT-11 inicializado...");
  Serial.println("Esperando estabilización (3 segundos)...");
  delay(3000);                 // Tiempo importante de estabilización
}

void loop() {
  // Lectura con más tiempo entre intentos
  delay(2500);

  float h = dht.readHumidity();
  float t = dht.readTemperature();

  Serial.print("Lectura | ");

  if (isnan(h) || isnan(t)) {
    Serial.println("ERROR: Falló la lectura del sensor");
    Serial.println("   → Verifica conexiones o resistencia pull-up");
  } 
  else {
    Serial.print("Humedad: ");
    Serial.print(h);
    Serial.print(" %  |  Temperatura: ");
    Serial.print(t);
    Serial.println(" °C");
  }
}