// =================================================================
//  PRUEBA SSR 4 CANALES - Adaptado para ESP32-S3 DevKit
//  Pines consecutivos elegidos: GPIO 11, 12, 13, 14 (100% Seguros)
//  Tipo de disparo: Low Level Trigger (Se activan con LOW)
// =================================================================

#define SSR1  11  // GPIO 11 - Ventilación
#define SSR2  12  // GPIO 12 - Calefacción
#define SSR3  13  // GPIO 13 - Humidificación
#define SSR4  14  // GPIO 14 - Iluminación (Fototropismo)

void setup() {
  Serial.begin(115200);
  
  // Esperar al USB nativo del ESP32-S3 antes de enviar texto
  while (!Serial && millis() < 4000) { 
    delay(10); 
  }
  
  Serial.println("\n=== Prueba SSR 4 Canales - ESP32-S3 ===");
  Serial.printf("Pines consecutivos asignados: GPIO %d, %d, %d, %d\n", SSR1, SSR2, SSR3, SSR4);
  Serial.println("Nota: Módulo configurado como LOW LEVEL TRIGGER (0V activa).");

  // Configurar pines como salida
  pinMode(SSR1, OUTPUT);
  pinMode(SSR2, OUTPUT);
  pinMode(SSR3, OUTPUT);
  pinMode(SSR4, OUTPUT);

  // IMPORTANTE: Escribir HIGH inmediatamente para asegurar que arranquen 
  // APAGADOS antes de que la etapa de potencia reciba energía.
  digitalWrite(SSR1, HIGH);
  digitalWrite(SSR2, HIGH);
  digitalWrite(SSR3, HIGH);
  digitalWrite(SSR4, HIGH);

  Serial.println("Inicialización completa. Todos los SSR forzados a APAGADO (HIGH).");
  delay(2000);
}

void loop() {
  Serial.println("\n--- Iniciando ciclo de prueba en bucle ---");

  pruebaIndividual();
  pruebaTodosJuntos();

  delay(3000);
}

// ===================== FUNCIONES DE CONTROL =====================

void pruebaIndividual() {
  int pines[] = {SSR1, SSR2, SSR3, SSR4};
  const char* nombres[] = {"Ventilación", "Calefacción", "Humidificación", "Iluminación"};
  
  for(int i = 0; i < 4; i++) {
    Serial.printf("Activando SSR %d [%s] -> (GPIO %d) [Nivel LOW]\n", i + 1, nombres[i], pines[i]);
    
    digitalWrite(pines[i], LOW);    // Enciende el SSR
    delay(1500);
    
    digitalWrite(pines[i], HIGH);   // Apaga el SSR
    delay(700);
  }
}

void pruebaTodosJuntos() {
  Serial.println(">>>> Activando TODOS los SSR en simultáneo... [Nivel LOW]");
  
  digitalWrite(SSR1, LOW);
  digitalWrite(SSR2, LOW);
  digitalWrite(SSR3, LOW);
  digitalWrite(SSR4, LOW);
  
  delay(3500);
  
  digitalWrite(SSR1, HIGH);
  digitalWrite(SSR2, HIGH);
  digitalWrite(SSR3, HIGH);
  digitalWrite(SSR4, HIGH);
  
  Serial.println(">>>> Todos los SSR desactivados simultáneamente (HIGH).");
}
