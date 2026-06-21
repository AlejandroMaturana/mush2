// =============================================
//  RECONOCIMIENTO PIN_LED_BUILTIN - WeMos D1 R1 (ESP8266)
//  Prueba sistemática para identificar el LED integrado
//  Basado en el sketch de prueba SSR
// =============================================

// Definiciones de pines comunes para LED_BUILTIN en diferentes placas
#define TEST_PIN_1  2   // D4  - Más común en ESP8266 (WeMos D1, NodeMCU)
#define TEST_PIN_2  16  // D0  - Común en algunas placas
#define TEST_PIN_3  0   // D3  - Usado en algunos modelos
#define TEST_PIN_4  4   // D2  - Alternativa en algunas placas
#define TEST_PIN_5  5   // D1  - Menos común pero posible

// Variables para almacenar el pin encontrado
int ledBuiltinPin = -1;
bool ledEncontrado = false;

// Configuración de prueba
#define TIEMPO_PRUEBA 1500    // Tiempo que cada pin permanece encendido
#define TIEMPO_ESPERA 500     // Tiempo entre pruebas
#define CICLOS_PRUEBA 2       // Número de ciclos de prueba

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== RECONOCIMIENTO DE LED_BUILTIN ===");
  Serial.println("Buscando el LED integrado en la placa...");
  Serial.println("Pines a probar: D4(2), D0(16), D3(0), D2(4), D1(5)");
  Serial.println("Observa físicamente el LED en la placa.");
  Serial.println("El pin correcto hará parpadear el LED integrado.\n");
  
  delay(3000); // Tiempo para leer las instrucciones
  
  // Realizar pruebas
  identificarLedBuiltin();
  
  // Mostrar resultado
  mostrarResultado();
}

void loop() {
  // Si encontramos el LED, hacer un patrón de demostración
  if (ledEncontrado && ledBuiltinPin != -1) {
    demoLedEncontrado();
  } else {
    // Si no se encontró, seguir intentando
    Serial.println("\nNo se encontró el LED_BUILTIN. Reintentando...");
    identificarLedBuiltin();
    mostrarResultado();
    delay(5000);
  }
}

// ===================== FUNCIONES DE PRUEBA =====================

void identificarLedBuiltin() {
  int pinesPrueba[] = {TEST_PIN_1, TEST_PIN_2, TEST_PIN_3, TEST_PIN_4, TEST_PIN_5};
  int numPines = sizeof(pinesPrueba) / sizeof(pinesPrueba[0]);
  
  Serial.println("--- INICIANDO PRUEBA DE PINES ---");
  
  for (int ciclo = 0; ciclo < CICLOS_PRUEBA; ciclo++) {
    Serial.printf("\nCiclo de prueba #%d\n", ciclo + 1);
    
    for (int i = 0; i < numPines; i++) {
      int pinActual = pinesPrueba[i];
      
      // Configurar pin como salida
      pinMode(pinActual, OUTPUT);
      
      // Encender LED (LOW para la mayoría de placas ESP8266)
      Serial.printf("Probando pin %d (GPIO%d)... ", pinActual, pinActual);
      digitalWrite(pinActual, LOW);
      
      // Esperar y verificar si el usuario ve el LED
      delay(TIEMPO_PRUEBA);
      
      // Apagar LED
      digitalWrite(pinActual, HIGH);
      delay(TIEMPO_ESPERA);
      
      Serial.println("¿Viste el LED encenderse?");
      delay(500); // Tiempo para procesar
    }
  }
  
  Serial.println("\n--- PRUEBA COMPLETADA ---");
}

void mostrarResultado() {
  Serial.println("\n=== RESULTADO DE LA PRUEBA ===");
  
  // El usuario debe ingresar el pin correcto por Serial
  Serial.println("Ingresa el número del pin que hizo parpadear el LED:");
  Serial.println("Opciones: 2 (D4), 16 (D0), 0 (D3), 4 (D2), 5 (D1)");
  Serial.println("O ingresa -1 si ningún pin funcionó.");
  Serial.println("Esperando entrada...");
  
  // Aquí el usuario debe ingresar manualmente el pin
  // En un sketch real, podrías implementar lógica automática
  // por ahora, mostramos los valores comunes
  mostrarPinesComunes();
}

void mostrarPinesComunes() {
  Serial.println("\nPINES COMUNES PARA LED_BUILTIN:");
  Serial.println("  • ESP8266 (NodeMCU/WeMos D1): GPIO2 (D4)");
  Serial.println("  • ESP8266 (Algunas placas): GPIO16 (D0)");
  Serial.println("  • ESP8266 (Otros modelos): GPIO0 (D3)");
  Serial.println("  • ESP8266 (Alternativo): GPIO4 (D2)");
  Serial.println("");
  Serial.println("RECOMENDACIÓN: En la mayoría de las placas WeMos D1,");
  Serial.println("LED_BUILTIN está en GPIO2 (D4).");
  Serial.println("");
  Serial.println("Define en tu código:");
  Serial.println("  #define PIN_LED_BUILTIN 2  // D4");
}

void demoLedEncontrado() {
  Serial.println("\n=== DEMOSTRACIÓN DEL LED ENCONTRADO ===");
  Serial.printf("LED_BUILTIN identificado en GPIO%d\n", ledBuiltinPin);
  
  // Patrón de parpadeo
  for (int i = 0; i < 5; i++) {
    digitalWrite(ledBuiltinPin, LOW);  // Encender
    delay(200);
    digitalWrite(ledBuiltinPin, HIGH); // Apagar
    delay(200);
  }
  
  // Parpadeo lento
  for (int i = 0; i < 3; i++) {
    digitalWrite(ledBuiltinPin, LOW);
    delay(500);
    digitalWrite(ledBuiltinPin, HIGH);
    delay(500);
  }
  
  delay(5000);
}

// ===================== FUNCIÓN DE CONFIGURACIÓN =====================

// Esta función se ejecuta si el usuario identifica el pin correcto
void configurarLedBuiltin(int pin) {
  ledBuiltinPin = pin;
  ledEncontrado = true;
  
  pinMode(ledBuiltinPin, OUTPUT);
  digitalWrite(ledBuiltinPin, HIGH); // Apagar inicialmente
  
  Serial.printf("\nLED_BUILTIN configurado en GPIO%d\n", ledBuiltinPin);
  Serial.println("Puedes usar esta definición en tu código:");
  Serial.printf("  #define PIN_LED_BUILTIN %d\n", ledBuiltinPin);
}

// Función para pruebas automáticas (opcional)
void pruebaAutomatica() {
  Serial.println("\n--- PRUEBA AUTOMÁTICA DE PINES ---");
  
  int pinesPrueba[] = {TEST_PIN_1, TEST_PIN_2, TEST_PIN_3, TEST_PIN_4, TEST_PIN_5};
  
  // Probar cada pin 3 veces
  for (int pin : pinesPrueba) {
    pinMode(pin, OUTPUT);
    
    for (int i = 0; i < 3; i++) {
      digitalWrite(pin, LOW);
      delay(100);
      digitalWrite(pin, HIGH);
      delay(100);
    }
    
    // Apagar completamente
    digitalWrite(pin, HIGH);
    delay(200);
  }
}
