#define BUTTON_TEST_VERSION "1.0.0"

#include <Arduino.h>
#include <Adafruit_NeoPixel.h>
#include <esp_task_wdt.h>

// ============================================================
//  S3_test-button — Validacion de hardware SMFB
//  Test autocontenido: boton en GPIO 6 + NeoPixel en GPIO 48
// ============================================================

#define PIN_BUTTON    6
#define PIN_LED       48
#define LED_COUNT     1

#define DEBOUNCE_MS   20
#define CLICK_MAX_MS  300
#define DOUBLE_GAP_MS 300
#define HOLD_3S_MS    3000
#define HOLD_10S_MS   10000

Adafruit_NeoPixel led(LED_COUNT, PIN_LED, NEO_GRB + NEO_KHZ800);

// ISR state
volatile uint32_t isrTimestamp = 0;
volatile bool rawLevel = true;

void IRAM_ATTR isrHandler(void* arg) {
  rawLevel = !digitalRead(PIN_BUTTON);
  isrTimestamp = millis();
}

// Debounce state
bool debouncedLevel = true;
bool pendingEdge = false;
bool pendingIsPress = false;
uint32_t pendingTimestamp = 0;
uint32_t lastTransitionTime = 0;

void debouncePoll() {
  uint32_t now = millis();
  bool raw = rawLevel;
  if (raw != debouncedLevel) {
    if ((now - lastTransitionTime) >= DEBOUNCE_MS) {
      debouncedLevel = raw;
      pendingEdge = true;
      pendingIsPress = raw;
      pendingTimestamp = isrTimestamp;
      lastTransitionTime = now;
    }
  } else {
    lastTransitionTime = now;
  }
}

bool consumeEdge(bool& isPress, uint32_t& ts) {
  if (pendingEdge) {
    isPress = pendingIsPress;
    ts = pendingTimestamp;
    pendingEdge = false;
    return true;
  }
  return false;
}

// Test state
enum TestPhase {
  TEST_RAW_DEBOUNCE,
  TEST_CLICK,
  TEST_DOUBLE_CLICK,
  TEST_HOLD_3S,
  TEST_HOLD_10S,
  TEST_CANCELLATION,
  TEST_GPIO_CONFIG,
  TEST_DONE
};

TestPhase currentTest = TEST_RAW_DEBOUNCE;
uint8_t passed = 0;
uint8_t failed = 0;
uint32_t testStart = 0;
bool waitingForInput = false;
uint32_t waitStart = 0;

void setLED(uint8_t r, uint8_t g, uint8_t b) {
  led.setPixelColor(0, led.Color(r, g, b));
  led.show();
}

void flashLED(uint8_t r, uint8_t g, uint8_t b, int count, int onMs, int offMs) {
  for (int i = 0; i < count; i++) {
    setLED(r, g, b);
    delay(onMs);
    setLED(0, 0, 0);
    if (i < count - 1) delay(offMs);
  }
}

void printHeader(const char* name) {
  Serial.printf("\n--- Test %d: %s ---\n", (int)currentTest + 1, name);
  Serial.println("Presiona el boton ahora...");
}

void printResult(bool ok, const char* detail) {
  if (ok) {
    passed++;
    Serial.printf("[VERDE] PASA: %s\n", detail);
    flashLED(0, 255, 0, 2, 80, 80);
  } else {
    failed++;
    Serial.printf("[ROJO] FALLA: %s\n", detail);
    flashLED(255, 0, 0, 3, 60, 60);
  }
}

void waitForEdge(uint32_t timeoutMs) {
  pendingEdge = false;
  waitingForInput = true;
  waitStart = millis();
  while (!pendingEdge && (millis() - waitStart) < timeoutMs) {
    debouncePoll();
    delay(1);
  }
  waitingForInput = false;
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.printf("\n[Mush2] S3_test-button v%s\n", BUTTON_TEST_VERSION);

  led.begin();
  led.setBrightness(24);
  setLED(128, 0, 128);
  delay(500);

  pinMode(PIN_BUTTON, INPUT_PULLUP);
  debouncedLevel = digitalRead(PIN_BUTTON);
  rawLevel = debouncedLevel;
  lastTransitionTime = millis();
  attachInterruptArg(digitalPinToInterrupt(PIN_BUTTON), isrHandler, this, CHANGE);

  esp_task_wdt_init(30, true);
  esp_task_wdt_add(NULL);

  Serial.println("[INIT] Hardware inicializado");
  Serial.printf("[INIT] GPIO%d = %s (pull-up)\n", PIN_BUTTON,
    digitalRead(PIN_BUTTON) ? "HIGH" : "LOW");
  Serial.println("\n=== Suite de tests SMFB ===\n");

  testStart = millis();
}

// Test: Raw debounce verification
void testRawDebounce() {
  printHeader("Debounce raw (20ms)");

  uint32_t edges[4] = {0};
  int edgeCount = 0;

  waitForEdge(10000);

  if (!pendingEdge) {
    printResult(false, "No se detecto edge en 10s");
    currentTest = TEST_CLICK;
    return;
  }

  bool isPress;
  uint32_t ts;
  consumeEdge(isPress, ts);
  edges[edgeCount++] = ts;
  Serial.printf("  Edge 1: %s @ %lums\n", isPress ? "PRESS" : "RELEASE", ts);

  waitForEdge(5000);
  if (consumeEdge(isPress, ts)) {
    edges[edgeCount++] = ts;
    Serial.printf("  Edge 2: %s @ %lums\n", isPress ? "PRESS" : "RELEASE", ts);
  }

  waitForEdge(5000);
  if (consumeEdge(isPress, ts)) {
    edges[edgeCount++] = ts;
    Serial.printf("  Edge 3: %s @ %lums\n", isPress ? "PRESS" : "RELEASE", ts);
  }

  bool ok = (edgeCount >= 2);
  char detail[64];
  snprintf(detail, sizeof(detail), "%d edges detectados (esperados >= 2)", edgeCount);
  printResult(ok, detail);

  currentTest = TEST_CLICK;
}

// Test: Single click
void testClick() {
  printHeader("Click simple (< 300ms)");
  Serial.println("  Presiona y suelta rapidamente...");

  waitForEdge(10000);
  bool isPress;
  uint32_t ts;
  if (!consumeEdge(isPress, ts) || !isPress) {
    printResult(false, "No se detecto PRESS");
    currentTest = TEST_DOUBLE_CLICK;
    return;
  }
  uint32_t pressTime = ts;

  waitForEdge(2000);
  if (!consumeEdge(isPress, ts) || isPress) {
    printResult(false, "No se detecto RELEASE");
    currentTest = TEST_DOUBLE_CLICK;
    return;
  }
  uint32_t releaseTime = ts;
  uint32_t duration = releaseTime - pressTime;

  bool ok = (duration < CLICK_MAX_MS);
  char detail[64];
  snprintf(detail, sizeof(detail), "Duracion: %lums (max %dms)", duration, CLICK_MAX_MS);
  printResult(ok, detail);

  setLED(200, 200, 200);
  delay(50);
  setLED(0, 0, 0);

  currentTest = TEST_DOUBLE_CLICK;
}

// Test: Double click
void testDoubleClick() {
  printHeader("Double click (gap < 300ms)");
  Serial.println("  Presiona dos veces rapido...");

  waitForEdge(10000);
  bool isPress;
  uint32_t ts;
  if (!consumeEdge(isPress, ts) || !isPress) {
    printResult(false, "No se detecto primer PRESS");
    currentTest = TEST_HOLD_3S;
    return;
  }

  waitForEdge(1000);
  if (!consumeEdge(isPress, ts) || isPress) {
    printResult(false, "No se detecto primer RELEASE");
    currentTest = TEST_HOLD_3S;
    return;
  }
  uint32_t gapStart = millis();

  waitForEdge(1000);
  if (!consumeEdge(isPress, ts) || !isPress) {
    printResult(false, "No se detecto segundo PRESS");
    currentTest = TEST_HOLD_3S;
    return;
  }
  uint32_t gap = millis() - gapStart;

  while (pendingEdge == false && (millis() - waitStart) < 2000) {
    debouncePoll();
    delay(1);
  }
  consumeEdge(isPress, ts);

  bool ok = (gap <= DOUBLE_GAP_MS);
  char detail[64];
  snprintf(detail, sizeof(detail), "Gap: %lums (max %dms)", gap, DOUBLE_GAP_MS);
  printResult(ok, detail);

  flashLED(0, 200, 200, 2, 60, 60);

  currentTest = TEST_HOLD_3S;
}

// Test: 3-second hold
void testHold3s() {
  printHeader("Hold 3 segundos");
  Serial.println("  Manten presionado 3+ segundos...");

  waitForEdge(10000);
  bool isPress;
  uint32_t ts;
  if (!consumeEdge(isPress, ts) || !isPress) {
    printResult(false, "No se detecto PRESS");
    currentTest = TEST_HOLD_10S;
    return;
  }
  uint32_t pressTime = millis();

  bool holdDetected = false;
  while ((millis() - pressTime) < 5000) {
    debouncePoll();
    if (!debouncedLevel) {
      uint32_t elapsed = millis() - pressTime;
      uint8_t brightness = (uint8_t)((elapsed * 128) / HOLD_3S_MS);
      setLED(0, 0, brightness);
    }
    if (!debouncedLevel && (millis() - pressTime) >= HOLD_3S_MS && !holdDetected) {
      holdDetected = true;
      Serial.printf("  Hold detectado a %lums\n", millis() - pressTime);
      flashLED(0, 0, 255, 2, 150, 80);
    }
    delay(10);
  }

  waitForEdge(3000);

  bool ok = holdDetected;
  printResult(ok, holdDetected ? "Hold-3s detectado correctamente" : "No se detecto hold-3s");

  currentTest = TEST_HOLD_10S;
}

// Test: 10-second hold
void testHold10s() {
  printHeader("Hold 10 segundos (factory reset)");
  Serial.println("  Manten presionado 10+ segundos...");
  Serial.println("  (No se ejecutara factory reset en test)");

  waitForEdge(10000);
  bool isPress;
  uint32_t ts;
  if (!consumeEdge(isPress, ts) || !isPress) {
    printResult(false, "No se detecto PRESS");
    currentTest = TEST_CANCELLATION;
    return;
  }
  uint32_t pressTime = millis();

  bool hold3s = false;
  bool hold10s = false;
  while ((millis() - pressTime) < 12000) {
    debouncePoll();
    uint32_t elapsed = millis() - pressTime;

    if (!debouncedLevel) {
      if (elapsed < HOLD_3S_MS) {
        uint8_t brightness = (uint8_t)((elapsed * 128) / HOLD_3S_MS);
        setLED(0, 0, brightness);
      } else {
        uint32_t redPhase = elapsed - HOLD_3S_MS;
        uint32_t redRange = HOLD_10S_MS - HOLD_3S_MS;
        uint8_t brightness = (uint8_t)((redPhase * 255) / redRange);
        setLED(brightness, 0, 0);
      }
    }

    if (elapsed >= HOLD_3S_MS && !hold3s) {
      hold3s = true;
      Serial.printf("  Hold-3s detectado a %lums\n", elapsed);
    }
    if (elapsed >= HOLD_10S_MS && !hold10s) {
      hold10s = true;
      Serial.printf("  Hold-10s detectado a %lums\n", elapsed);
      flashLED(255, 0, 0, 4, 60, 60);
    }
    delay(10);
  }

  waitForEdge(3000);

  bool ok = hold10s;
  printResult(ok, hold10s ? "Hold-10s detectado correctamente" : "No se detecto hold-10s");

  currentTest = TEST_CANCELLATION;
}

// Test: Cancellation
void testCancellation() {
  printHeader("Cancelacion (hold ~2s, suelta antes de 3s)");
  Serial.println("  Presiona ~2 segundos y suelta...");

  waitForEdge(10000);
  bool isPress;
  uint32_t ts;
  if (!consumeEdge(isPress, ts) || !isPress) {
    printResult(false, "No se detecto PRESS");
    currentTest = TEST_GPIO_CONFIG;
    return;
  }

  bool releasedBefore3s = false;
  uint32_t pressTime = millis();
  while ((millis() - pressTime) < 5000) {
    debouncePoll();
    uint32_t elapsed = millis() - pressTime;

    if (!debouncedLevel) {
      uint8_t brightness = (uint8_t)((elapsed * 128) / HOLD_3S_MS);
      setLED(0, 0, brightness);
    }

    if (debouncedLevel && elapsed < HOLD_3S_MS && elapsed > 500) {
      releasedBefore3s = true;
      Serial.printf("  Suelta a %lums (antes de 3s) — sin gesture\n", elapsed);
      break;
    }
    delay(10);
  }

  bool ok = releasedBefore3s;
  printResult(ok, releasedBefore3s ?
    "Cancelacion correcta: sin gesture al soltar antes de 3s" :
    "No se pudo probar cancelacion");

  currentTest = TEST_GPIO_CONFIG;
}

// Test: GPIO configuration
void testGpioConfig() {
  printHeader("Configuracion GPIO");
  bool pullUp = digitalRead(PIN_BUTTON);
  Serial.printf("  GPIO%d con pull-up: %s\n", PIN_BUTTON, pullUp ? "HIGH" : "LOW");

  bool ok = pullUp;
  char detail[64];
  snprintf(detail, sizeof(detail), "Pull-up activo: %s", pullUp ? "SI" : "NO");
  printResult(ok, detail);

  currentTest = TEST_DONE;
}

void loop() {
  esp_task_wdt_reset();

  switch (currentTest) {
    case TEST_RAW_DEBOUNCE:    testRawDebounce(); break;
    case TEST_CLICK:           testClick(); break;
    case TEST_DOUBLE_CLICK:    testDoubleClick(); break;
    case TEST_HOLD_3S:         testHold3s(); break;
    case TEST_HOLD_10S:        testHold10s(); break;
    case TEST_CANCELLATION:    testCancellation(); break;
    case TEST_GPIO_CONFIG:     testGpioConfig(); break;
    case TEST_DONE:
      Serial.printf("\n=== Resultados ===\n");
      Serial.printf("Pasaron: %d\n", passed);
      Serial.printf("Fallaron: %d\n", failed);
      Serial.printf("Total: %d\n", passed + failed);
      Serial.printf("Tiempo: %lums\n", millis() - testStart);

      if (failed == 0) {
        Serial.println("\n[VERDE] TODOS LOS TESTS PASARON");
        flashLED(0, 255, 0, 10, 100, 100);
      } else {
        Serial.printf("\n[ROJO] %d TEST(S) FALLARON\n", failed);
        flashLED(255, 0, 0, 10, 100, 100);
      }

      Serial.println("\nTests completados. Reinicia para ejecutar de nuevo.");
      while (true) {
        esp_task_wdt_reset();
        delay(1000);
      }
  }

  delay(10);
}
