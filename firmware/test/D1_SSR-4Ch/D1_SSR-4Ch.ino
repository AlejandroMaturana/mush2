// =============================================
//  PRUEBA SSR 3 CANALES - WeMos D1 R1 (ESP8266)
//  Pines: D5, D4, D6 (según config.h del firmware)
//  Ch4 dejado fuera de momento
//  NOTA: D14/SDA/D3 y D13/SCLK/D4 conflictos con I2C
// =============================================

#define SSR1  14  // D5  (GPIO14) - Cambiado de D2 para evitar conflicto I2C
#define SSR2  2   // D4  (GPIO2) - Ojo: D4 tiene LED integrado en algunas placas
#define SSR3  12  // D6  (GPIO12)
// Ch4 dejado fuera - no definido

void setup() {
  Serial.begin(115200);
  delay(500);
  
  Serial.println("\n=== Prueba SSR 3 Canales - WeMos D1 R1 ===");
  Serial.println("Pines usados: D5, D4, D6");
  Serial.println("Ch4 dejado fuera");
  Serial.println("Nota: SSR1 en D5 (no D2) para evitar conflicto I2C");

  pinMode(SSR1, OUTPUT);
  pinMode(SSR2, OUTPUT);
  pinMode(SSR3, OUTPUT);

  // Apagar todos al inicio
  digitalWrite(SSR1, HIGH);
  digitalWrite(SSR2, HIGH);
  digitalWrite(SSR3, HIGH);

  Serial.println("Todos los SSR apagados.");
  delay(1000);
}

void loop() {
  Serial.println("\n--- Iniciando ciclo de prueba ---");

  pruebaIndividual();
  pruebaTodosJuntos();

  delay(2500);
}

// ===================== FUNCIONES =====================

void pruebaIndividual() {
  int pines[] = {SSR1, SSR2, SSR3};
  
  for(int i = 0; i < 3; i++) {
    Serial.print("Activando SSR ");
    Serial.print(i + 1);
    Serial.print(" (GPIO");
    Serial.print(pines[i]);
    Serial.println(")");
    
    digitalWrite(pines[i], LOW);    // Encender SSR
    delay(1500);
    digitalWrite(pines[i], HIGH);   // Apagar SSR
    delay(700);
  }
}

void pruebaTodosJuntos() {
  Serial.println("Activando TODOS los SSR (1, 2, 3)...");
  
  digitalWrite(SSR1, LOW);
  digitalWrite(SSR2, LOW);
  digitalWrite(SSR3, LOW);
  
  delay(3500);
  
  digitalWrite(SSR1, HIGH);
  digitalWrite(SSR2, HIGH);
  digitalWrite(SSR3, HIGH);
  
  Serial.println("Todos los SSR apagados.");
}