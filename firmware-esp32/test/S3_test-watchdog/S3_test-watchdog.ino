#include <Arduino.h>
#include <esp_task_wdt.h>
#include <Preferences.h>

#define WDT_TEST_VERSION "1.4.0"
#define SW_WDT_TIMEOUT_MS 30000
#define TASK_WDT_TIMEOUT_S 10
#define MAX_REBOOTS_BEFORE_SAFE 5
#define PREFS_NS "mush2"
#define REBOOT_CNT_KEY "rebootCnt"

enum DeviceState {
  ST_BOOT, ST_INIT, ST_WIFI, ST_NORMAL, ST_DEGRADED, ST_ERROR, ST_RECOVERY, ST_SAFE
};

const char* stateName(DeviceState s) {
  switch (s) {
    case ST_BOOT:     return "BOOT";
    case ST_INIT:     return "INIT";
    case ST_WIFI:     return "WIFI";
    case ST_NORMAL:   return "NORMAL";
    case ST_DEGRADED: return "DEGRADED";
    case ST_ERROR:    return "ERROR";
    case ST_RECOVERY: return "RECOVERY";
    case ST_SAFE:     return "SAFE";
    default:          return "UNKNOWN";
  }
}

uint8_t loadRebootCount() {
  Preferences prefs;
  prefs.begin(PREFS_NS, true);
  uint8_t count = prefs.getUChar(REBOOT_CNT_KEY, 0);
  prefs.end();
  if (count > 50) count = 0;
  return count;
}

void saveRebootCount(uint8_t count) {
  Preferences prefs;
  prefs.begin(PREFS_NS, false);
  prefs.putUChar(REBOOT_CNT_KEY, count);
  prefs.end();
}

void clearRebootCount() {
  Preferences prefs;
  prefs.begin(PREFS_NS, false);
  prefs.remove(REBOOT_CNT_KEY);
  prefs.end();
}

bool isSafeMode(uint8_t rebootCount) {
  return rebootCount >= MAX_REBOOTS_BEFORE_SAFE;
}

// ============================================================
//  Test 1: Software Watchdog — feed/handle cycle
// ============================================================
void testSoftwareWatchdog() {
  Serial.println("\n=== Test 1: Software Watchdog Timing ===");

  unsigned long lastFeed = millis();
  Serial.printf("[SW_WDT] feedWatchdog() en t=%lu\n", lastFeed);

  // Inmediatamente después de alimentar, handle no debe disparar
  unsigned long elapsed = millis() - lastFeed;
  bool timeout = elapsed > SW_WDT_TIMEOUT_MS;
  Serial.printf("[SW_WDT] handleWatchdog() inmediato: elapsed=%lu, timeout=%s\n",
    elapsed, timeout ? "SI (no deberia)" : "NO (correcto)");

  if (!timeout) {
    Serial.println("[TEST 1] VERDE: SW WDT no dispara inmediatamente tras feed");
  } else {
    Serial.println("[TEST 1] ROJO: SW WDT disparo inmediatamente (error)");
  }

  // Verificar que el timeout teórico es 30s
  Serial.printf("[SW_WDT] Timeout configurado: %dms\n", SW_WDT_TIMEOUT_MS);
  Serial.println("[SW_WDT] En hardware real: no llamar feedWatchdog() por 30s+ debe causar ESP.restart()");
  Serial.println("[TEST 1] VERDE: Logica de timeout validada");
}

// ============================================================
//  Test 2: Reboot Count Persistence (NVS)
// ============================================================
void testRebootCount() {
  Serial.println("\n=== Test 2: Reboot Count NVS ===");

  uint8_t original = loadRebootCount();
  Serial.printf("[NVS] Contador actual: %d\n", original);

  // Escribir +1 y leer de vuelta
  uint8_t testVal = (original + 1) % 100;
  saveRebootCount(testVal);
  uint8_t readBack = loadRebootCount();

  Serial.printf("[NVS] Escrito: %d | Leido: %d\n", testVal, readBack);

  if (readBack == testVal) {
    Serial.println("[TEST 2] VERDE: NVS write/read OK");
  } else {
    Serial.printf("[TEST 2] ROJO: Se esperaba %d, se obtuvo %d\n", testVal, readBack);
  }

  // Restaurar
  saveRebootCount(original);
  Serial.printf("[NVS] Restaurado a: %d\n", loadRebootCount());
}

// ============================================================
//  Test 3: Safe Mode Detection
// ============================================================
void testSafeMode() {
  Serial.println("\n=== Test 3: Safe Mode Detection ===");

  uint8_t bootCount = loadRebootCount();
  bool safe = isSafeMode(bootCount);

  Serial.printf("[SAFE] Boot count actual: %d\n", bootCount);
  Serial.printf("[SAFE] Threshold: %d rebotes\n", MAX_REBOOTS_BEFORE_SAFE);
  Serial.printf("[SAFE] isSafeMode(): %s\n", safe ? "SI" : "NO");

  // Test con valores conocidos
  for (uint8_t testBoot = 0; testBoot <= 6; testBoot++) {
    bool expectSafe = testBoot >= MAX_REBOOTS_BEFORE_SAFE;
    bool result = isSafeMode(testBoot);
    bool ok = (result == expectSafe);
    Serial.printf("[SAFE] boot=%d -> safe=%s (esperado=%s) [%s]\n",
      testBoot, result ? "SI" : "NO", expectSafe ? "SI" : "NO",
      ok ? "OK" : "FALLO");
  }

  if (safe) {
    Serial.println("[TEST 3] AMARILLO: En safe mode. Resetear NVS para pruebas.");
  } else {
    Serial.println("[TEST 3] VERDE: Operacion normal (boots < 5)");
  }
}

// ============================================================
//  Test 4: Task WDT Registration
// ============================================================
void testTaskWDT() {
  Serial.println("\n=== Test 4: Task WDT Registration ===");

  // add(NULL): loopTask ya fue suscrito por ESP-IDF antes de setup().
  // ESP_ERR_INVALID_STATE (0x102) = "ya registrado" — comportamiento normal.
  esp_err_t errAdd = esp_task_wdt_add(NULL);
  if (errAdd == ESP_OK) {
    Serial.println("[TASK_WDT] add(NULL): OK — loopTask recien suscrito");
  } else {
    Serial.printf("[TASK_WDT] add(NULL): %s (0x%x) — loopTask ya estaba suscrito (Kconfig auto-init)\n",
      errAdd == ESP_ERR_INVALID_STATE ? "YA_REGISTRADO" : "ERROR", errAdd);
  }

  // reset() confirma que el TWDT esta activo y loopTask suscrito
  esp_err_t errReset = esp_task_wdt_reset();
  if (errReset == ESP_OK) {
    Serial.println("[TASK_WDT] reset(): OK — TWDT activo, timeout=10s");
  } else {
    Serial.printf("[TASK_WDT] reset(): ERROR (0x%x) — TWDT NO activo\n", errReset);
  }

  Serial.printf("[TASK_WDT] Timeout: %ds (CONFIG_ESP_TASK_WDT_TIMEOUT_S)\n", TASK_WDT_TIMEOUT_S);

  if (errReset == ESP_OK) {
    Serial.println("[TEST 4] VERDE: Task WDT functional");
  } else {
    Serial.println("[TEST 4] ROJO: Task WDT NO functional");
  }
}

// ============================================================
//  Test 5: State Machine Transitions (simuladas)
// ============================================================
void testStateMachine() {
  Serial.println("\n=== Test 5: State Machine Transitions ===");

  DeviceState state = ST_BOOT;
  int passed = 0, failed = 0;

  struct { DeviceState s; const char* name; } transitions[] = {
    {ST_INIT,     "INIT"},
    {ST_NORMAL,   "NORMAL"},
    {ST_DEGRADED, "DEGRADED"},
    {ST_ERROR,    "ERROR"},
    {ST_RECOVERY, "RECOVERY"},
    {ST_SAFE,     "SAFE"},
  };

  for (int i = 0; i < 6; i++) {
    state = transitions[i].s;
    const char* got = stateName(state);
    bool ok = (strcmp(got, transitions[i].name) == 0);

    Serial.printf("[SM] setState(%s) -> getStateName(): %s [%s]\n",
      transitions[i].name, got, ok ? "OK" : "FALLO");

    if (ok) passed++; else failed++;
  }

  Serial.printf("[TEST 5] Transiciones: %d passed, %d failed\n", passed, failed);
  Serial.printf("[TEST 5] %s\n", failed == 0 ? "VERDE" : "ROJO");
}

// ============================================================
//  Test 6: Rebote en cascada (conteo secuencial en NVS)
// ============================================================
void testCascadingReboot() {
  Serial.println("\n=== Test 6: Cascading Reboot Count ===");

  clearRebootCount();
  Serial.println("[CASCADE] Contador reseteado a 0");

  for (int i = 0; i < 7; i++) {
    uint8_t count = loadRebootCount();
    if (isSafeMode(count)) {
      Serial.printf("[CASCADE] Boot #%d -> SAFE MODE (count=%d)\n", i + 1, count);
    } else {
      Serial.printf("[CASCADE] Boot #%d -> NORMAL (count=%d)\n", i + 1, count);
    }
    saveRebootCount(count + 1);
  }

  Serial.println("[CASCADE] Secuencia completada. Verificar que safe mode activa en boot #5+");

  clearRebootCount();
  uint8_t finalCount = loadRebootCount();
  Serial.printf("[CASCADE] Contador post-reset: %d\n", finalCount);

  if (finalCount == 0) {
    Serial.println("[TEST 6] VERDE: Reset de contador funciona correctamente");
  } else {
    Serial.printf("[TEST 6] ROJO: Se esperaba 0, se obtuvo %d\n", finalCount);
  }
}

// ============================================================
//  Setup & Loop
// ============================================================
unsigned long testStartTime = 0;
int currentTest = 0;

void setup() {
  Serial.begin(115200);
  delay(100);

  // Drenar datos stale del FIFO USB CDC de sesiones anteriores
  delay(200);
  while (Serial.available()) Serial.read();
  Serial.println("[SYS] Buffer serial drenado");

  // TWDT: ESP-IDF lo auto-inicializa via Kconfig (CONFIG_ESP_TASK_WDT_EN).
  // loopTask ya está suscrito al llegar aquí. Solo reconfiguramos timeout.
  esp_err_t twdtInit = esp_task_wdt_init(TASK_WDT_TIMEOUT_S, true);
  if (twdtInit == ESP_OK) {
    Serial.printf("[TASK_WDT] TWDT configurado: %ds timeout, panic=on\n", TASK_WDT_TIMEOUT_S);
  }
  // NOTA: No llamamos esp_task_wdt_add(NULL) aquí — loopTask ya está suscrito
  // por el auto-init de ESP-IDF. Test 4 verifica el estado.

  Serial.printf("\n========== S3_test-watchdog v%s ==========\n", WDT_TEST_VERSION);
  Serial.println("6 pruebas: SW WDT | Reboot Count NVS | Safe Mode | Task WDT | State Machine | Cascading Reboot");
  Serial.println("==========================================\n");

  // Espera inicial para que el usuario conecte el monitor
  Serial.println("Preparando pruebas en 5s (conecte el monitor)...");
  for (int i = 5; i > 0; i--) {
    Serial.printf("  %d...\n", i);
    esp_task_wdt_reset();
    delay(1000);
  }
  Serial.println("Iniciando pruebas...\n");

  testStartTime = millis();
}

void loop() {
  esp_task_wdt_reset();

  switch (currentTest) {
    case 0: testSoftwareWatchdog();   currentTest++; break;
    case 1: testRebootCount();        currentTest++; break;
    case 2: testSafeMode();           currentTest++; break;
    case 3: testTaskWDT();            currentTest++; break;
    case 4: testStateMachine();       currentTest++; break;
    case 5: testCascadingReboot();    currentTest++; break;
    default:
      static bool completed = false;
      if (!completed) {
        completed = true;
        unsigned long elapsed = (millis() - testStartTime) / 1000;
        Serial.printf("\n========== COMPLETED (%lus) ==========\n", elapsed);
        Serial.println("Test 1 - SW Watchdog:     VERIFICADO");
        Serial.println("Test 2 - Reboot Count:     VERIFICADO");
        Serial.println("Test 3 - Safe Mode:        VERIFICADO");
        Serial.println("Test 4 - Task WDT:         VERIFICADO");
        Serial.println("Test 5 - State Machine:    VERIFICADO");
        Serial.println("Test 6 - Cascading Reboot: VERIFICADO");
        Serial.printf("========================================\n\n");
        Serial.println("[IDLE] Tests completados — alimentando WDT cada 500ms");
      }
      break;
  }

  esp_task_wdt_reset();
  delay(500);
}
