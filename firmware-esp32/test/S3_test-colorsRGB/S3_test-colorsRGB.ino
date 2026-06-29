// =================================================================
//  PRUEBA colores led RGB - Adaptado para ESP32-S3 DevKit
//  Pin a probar: 48
//  Tipo de disparo: ciclo rainbow
// =================================================================

#include <Adafruit_NeoPixel.h>

// --- Configuración Específica de tu Placa ---
#define PIN_LED_RGB        48 
// Tu placa tiene solo 1 LED integrado
#define NUM_PIXELS        1  
// Brillo de 0 (apaga) a 255 (máximo). 50 es bueno para testeo sin cegar.
#define BRIGHTNESS       50  

// Inicializamos el objeto pixel (cantidad, pin, tipo)
Adafruit_NeoPixel pixel = Adafruit_NeoPixel(NUM_PIXELS, PIN_LED_RGB, NEO_GRB + NEO_KHZ800);

void setup() {
  Serial.begin(115200);
  
  // Espera para el Monitor Serie
  while (!Serial && millis() < 4000) { delay(10); }

  Serial.println("\n--- Iniciando Ciclo Gradual RGB en GPIO 48 ---");
  Serial.println("Mostrando efecto Rainbow suave...");

  pixel.begin();            // Inicializa la librería
  pixel.setBrightness(BRIGHTNESS); // Establece el brillo general
  pixel.show();             // Apaga el LED inicialmente
}

void loop() {
  // Creamos un ciclo 'rainbow' suave. 
  // 'pixel.gamma32' ayuda a que los colores se vean más lineales y naturales al ojo.

  // 'j' es el "paso" del color, incrementamos de 1 en 1 para máxima suavidad.
  // Usamos una variable estática para que 'j' mantenga su valor entre loops.
  static long hue = 0; 

  // Generamos el color basado en el hue actual (el círculo de color)
  // El argumento es un valor de 0 a 65535 (un entero de 16 bits)
  uint32_t color_actual = pixel.ColorHSV(hue);

  // Aplicamos corrección Gamma para transiciones más bonitas
  uint32_t color_gamma = pixel.gamma32(color_actual);

  // Ponemos el color en el primer (y único) LED
  pixel.setPixelColor(0, color_gamma);
  
  // Actualizamos físicamente el LED
  pixel.show();

  // Incrementamos el hue para el siguiente ciclo. 
  // Al llegar a 65535, automáticamente 'da la vuelta' (overflow) a 0.
  // Incrementos más pequeños (p.ej. 50 o 100) hacen el ciclo más lento.
  hue += 150; 

  // Pequeño delay para controlar la velocidad de la transición.
  // Menor valor = cambio más rápido.
  delay(10); 

  // Cada cierto tiempo informamos al Monitor Serie para saber que sigue vivo
  if (hue % 10000 == 0) {
    Serial.print("Ciclo de color actual (Hue): ");
    Serial.println(hue);
  }
}