// =================================================================
//  PRUEBA apagado de led RGB - Adaptado para ESP32-S3 DevKit
//  Pin elegido: GPIO 48
// =================================================================

#include <Adafruit_NeoPixel.h>

#define PIN_LED_RGB 48
Adafruit_NeoPixel pixel(1, PIN_LED_RGB, NEO_GRB + NEO_KHZ800);

void setup() {
  pixel.begin();
  pixel.setPixelColor(0, pixel.Color(0, 0, 0)); // Color 0,0,0 es APAGADO absoluto
  pixel.show(); // Enviar la orden física al LED
}

void loop() {
  // Nada por aquí, el LED ya recibió la orden de apagarse
}