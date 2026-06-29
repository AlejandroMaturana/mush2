// =================================================================
//  PRUEBA encontrar led RGB - Adaptado para ESP32-S3 DevKit
//  Pines a probar: 48, 38, 18, 8, 35, 36 y 37
//  Tipo de disparo: loop
// =================================================================

#include <Adafruit_NeoPixel.h>

// Pines más comunes para el LED RGB en placas S3 clones
const int pinesAProbar[] = {48, 38, 18, 8, 35, 36, 37}; 
const int totalPines = sizeof(pinesAProbar) / sizeof(pinesAProbar[0]);

int indiceActual = 0;
Adafruit_NeoPixel pixel;

void setup() {
  Serial.begin(115200);
  
  // Espera hasta 5 segundos a que el Monitor Serie se abra en tu PC
  while (!Serial && millis() < 5000) {
    delay(10);
  }
  
  Serial.println("\n--- Iniciando escaneo de LED RGB Integrado ---");
}

void loop() {
  int pinActual = pinesAProbar[indiceActual];
  
  Serial.print("Probando si el LED RGB está en el GPIO: ");
  Serial.println(pinActual);

  // Inicializamos el NeoPixel en el pin actual
  pixel = Adafruit_NeoPixel(1, pinActual, NEO_GRB + NEO_KHZ800);
  pixel.begin();
  pixel.setBrightness(50); // Brillo moderado

  // Encendemos en color Verde para testing claro
  pixel.setPixelColor(0, pixel.Color(0, 255, 0)); 
  pixel.show();
  delay(1500); // 1.5 segundos para que observes la placa

  // Apagamos antes de pasar al siguiente
  pixel.setPixelColor(0, pixel.Color(0, 0, 0));
  pixel.show();
  pixel.clear();
  delay(500);

  // Avanzar al siguiente pin de la lista
  indiceActual = (indiceActual + 1) % totalPines;
  
  if (indiceActual == 0) {
    Serial.println(">>> Ciclo completado. Reiniciando escaneo... <<<");
    delay(2000);
  }
}