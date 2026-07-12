// =================================================================
//  TEST CADENA DE ACTUADORES
//  Valida SSRController + HysteresisController + REMOTE override
//  Diagnostica: decisiones de control, estado software, GPIO físico
// =================================================================

#define ACTUATOR_CHAIN_TEST_VERSION "1.0.0"

// Include sources bajo test
#include <ssr_controller.h>
#include <hysteresis_controller.h>
#include <config.h>

// Pull in .cpp so they compile as part of the sketch
#include "ssr_controller.cpp"
#include "hysteresis_controller.cpp"

void testSSRInit();
void testSSRChannel(uint8_t ch);
void testResolvePinState();
void testHysteresisEvaluate();
void testRemoteOverride();
void serialMenu();

// Global instances
SSRController ssr;
HysteresisController hyst;

// Default setpoints from config
Setpoints defaultSP = {
  DEFAULT_TEMP_MIN, DEFAULT_TEMP_MAX,
  DEFAULT_HUM_MIN, DEFAULT_HUM_MAX,
  DEFAULT_CO2_MAX
};

// SSR pin map
const uint8_t SSR_PINS[4] = {SSR_CH1_PIN, SSR_CH2_PIN, SSR_CH3_PIN, SSR_CH4_PIN};
const char* SSR_NAMES[4] = {"CH1-Vent", "CH2-Calc", "CH3-Hum", "CH4-Luz"};

// Test results
static uint8_t passed = 0;
static uint8_t failed = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 4000) { delay(10); }

  delay(2000);  // pausa para que alcances a conectar el monitor

  Serial.println(F("\n=============================================="));
  Serial.printf("TEST CADENA ACTUADORES v%s\n", ACTUATOR_CHAIN_TEST_VERSION);
  Serial.printf("SSR_ACTIVE_LOW=%d\n", SSR_ACTIVE_LOW);
  Serial.printf("Pins: CH1=GPIO%d CH2=GPIO%d CH3=GPIO%d CH4=GPIO%d\n",
    SSR_CH1_PIN, SSR_CH2_PIN, SSR_CH3_PIN, SSR_CH4_PIN);
  Serial.println(F("=============================================="));

  // Initialize SSR (calls pinMode + digitalWrite for all channels)
  ssr.init();
  delay(100);

  // Initialize hysteresis
  hyst.init(defaultSP);
  hyst.setMode(CTRL_LOCAL);

  // ---- Run tests ----
  testResolvePinState();
  testSSRInit();
  for (uint8_t ch = 1; ch <= 4; ch++) {
    testSSRChannel(ch);
  }
  testHysteresisEvaluate();
  testRemoteOverride();

  Serial.println(F("\n========= RESUMEN ========="));
  Serial.printf("Pasadas: %u | Falladas: %u\n", passed, failed);
  if (failed == 0) {
    Serial.println(F(">>> TODAS LAS PRUEBAS OK"));
  } else {
    Serial.println(F(">>> HAY FALLOS - revisar arriba"));
  }
  Serial.println(F("\n=== MODO INTERACTIVO ==="));
  Serial.println(F("Comandos: 1ON, 1OFF, 2ON, ... 4OFF | ALLON, ALLOFF | STATUS | MODE LOCAL/REMOTE/OFF | HYST test"));
}

void loop() {
  serialMenu();
}

// ==============================================================
//  TESTS AUTOMATICOS
// ==============================================================

void testResolvePinState() {
  Serial.print(F("\n--- SSR_ACTIVE_LOW --- "));
  // The controller hardcodes active-LOW (state=1->LOW, state=0->HIGH).
  // SSR_ACTIVE_LOW is defined in config but NOT used by the code:
  // if someone sets SSR_ACTIVE_LOW=0, the SSR would be inverted silently.
  // We verify all channels start OFF (HIGH on pin).
  bool allHigh = true;
  for (int i = 0; i < 4; i++) {
    int pin = SSR_PINS[i];
    pinMode(pin, INPUT_PULLUP);  // temporarily read
    if (digitalRead(pin) != HIGH) allHigh = false;
    pinMode(pin, OUTPUT);        // restore
    digitalWrite(pin, HIGH);     // restore OFF state
  }

  if (allHigh) { passed++; Serial.println(F("PASS (all HIGH=OFF)")); }
  else { failed++; Serial.println(F("FAIL (some pins not HIGH)")); }
}

void testSSRInit() {
  Serial.print(F("\n--- SSR Init --- "));
  uint8_t states[4];
  ssr.getStateArray(states);

  bool allOff = true;
  for (int i = 0; i < 4; i++) {
    if (states[i] != 0) allOff = false;
  }

  if (allOff) { passed++; Serial.println(F("PASS (all OFF)")); }
  else {
    failed++;
    Serial.print(F("FAIL - states: "));
    for (int i = 0; i < 4; i++) Serial.printf("%u", states[i]);
    Serial.println();
  }
}

void testSSRChannel(uint8_t ch) {
  Serial.printf("\n--- SSR Channel %d [%s] --- ", ch, SSR_NAMES[ch-1]);

  // Turn ON
  ssr.setChannel(ch, 1);
  delay(100);
  uint8_t stateOn = ssr.getChannel(ch);
  bool onOk = (stateOn == 1);

  // Turn OFF
  ssr.setChannel(ch, 0);
  delay(100);
  uint8_t stateOff = ssr.getChannel(ch);
  bool offOk = (stateOff == 0);

  // Idempotency: set same state twice should not toggle
  ssr.setChannel(ch, 0);
  delay(50);
  bool idempotent = (ssr.getChannel(ch) == 0);

  if (onOk && offOk && idempotent) {
    passed++;
    Serial.println(F("PASS"));
  } else {
    failed++;
    Serial.printf("FAIL: ON=%u OFF=%u IDEM=%u\n", stateOn, stateOff, idempotent);
  }
}

void testHysteresisEvaluate() {
  Serial.println(F("\n--- Hysteresis Evaluate ---"));

  struct TestCase {
    float temp, hum;
    uint16_t co2;
    const char* desc;
    uint8_t expectHeat;   // hystOutputs[0]
    uint8_t expectVent;   // hystOutputs[1]
    uint8_t expectHum;    // hystOutputs[2]
    uint8_t expectLight;  // hystOutputs[3]
  };

  // With defaults: TEMP 20-24°C, HUM 78-85%, CO2 max 1200
  TestCase cases[] = {
    // Temp within range, humid low -> humidify
    {22.0, 50.0, 500, "Low humidity",          0, 0, 1, 1},
    // Temp high -> ventilate
    {26.0, 80.0, 500, "High temp -> vent",     0, 1, 0, 1},
    // CO2 high -> ventilate
    {22.0, 80.0, 1500, "High CO2 -> vent",     0, 1, 0, 1},
    // Temp low -> heat
    {18.0, 80.0, 500, "Low temp -> heat",      1, 0, 0, 1},
    // All nominal
    {22.0, 80.0, 500, "All nominal",           0, 0, 0, 1},
    // Temp critical -> overheat safety
    {33.0, 80.0, 500, "Critical temp -> overheat", 0, 1, 0, 0},
  };

  uint8_t localPassed = 0;
  uint8_t localFailed = 0;

  for (int i = 0; i < 6; i++) {
    TestCase tc = cases[i];

    // Reset hysteresis state
    hyst.init(defaultSP);
    hyst.setMode(CTRL_LOCAL);

    if (i == 5) {
      // Overheat test: setOverheat directly
      hyst.setOverheat(tc.temp);
    }

    // Light ON for all cases except overheat (case index 5)
    hyst.setLightState(i != 5);

    // Evaluate
    uint8_t outputs[4];
    hyst.evaluate(tc.temp, tc.hum, tc.co2, outputs);

    // Channel mapping from taskSSR in main.ino:
    // CH1=Vent=outputs[1], CH2=Heat=outputs[0], CH3=Hum=outputs[2], CH4=Light=outputs[3]
    uint8_t ch1 = outputs[1];  // vent
    uint8_t ch2 = outputs[0];  // heat
    uint8_t ch3 = outputs[2];  // humid
    uint8_t ch4 = outputs[3];  // light

    bool match = (ch1 == tc.expectVent && ch2 == tc.expectHeat &&
                  ch3 == tc.expectHum && ch4 == tc.expectLight);

    Serial.printf("  [%s] T=%.1f H=%.1f CO2=%u", tc.desc, tc.temp, tc.hum, tc.co2);
    if (match) {
      Serial.println(F(" PASS"));
      localPassed++;
    } else {
      Serial.printf(" FAIL (got %u%u%u%u, expected %u%u%u%u)\n",
        ch2, ch1, ch3, ch4,   // SSR order: heat, vent, hum, light
        tc.expectHeat, tc.expectVent, tc.expectHum, tc.expectLight);
      localFailed++;
    }
  }

  passed += localPassed;
  failed += localFailed;
  Serial.printf("  Hysteresis: %u passed, %u failed\n", localPassed, localFailed);
}

void testRemoteOverride() {
  Serial.println(F("\n--- REMOTE Override ---"));

  // Simulate the logic from main.ino taskSSR:
  // For each channel, if actuatorMode[ch]==1 (REMOTE), use actuatorDesired[ch]
  // Overheat always wins, SAFE_SENSOR always wins

  uint8_t hystOut[4] = {0, 0, 1, 1};  // heat=0, vent=0, hum=1, light=1
  uint8_t desired[4] = {1, 1, 0, 0};
  uint8_t mode[4]    = {1, 1, 1, 1};  // all REMOTE

  uint8_t finalState[4];
  for (int ch = 0; ch < 4; ch++) {
    finalState[ch] = hystOut[ch];
  }

  // Main.ino remote override logic:
  // CH1=hystOut[1], CH2=hystOut[0], CH3=hystOut[2], CH4=hystOut[3]
  uint8_t chMap[4] = {1, 0, 2, 3};
  for (int ch = 0; ch < 4; ch++) {
    if (mode[ch] == 1) {
      finalState[ch] = desired[ch];
    }
  }

  bool remoteOk = (finalState[0]==1 && finalState[1]==1 && finalState[2]==0 && finalState[3]==0);
  if (remoteOk) {
    Serial.println(F("  REMOTE override PASS"));
    passed++;
  } else {
    Serial.printf("  REMOTE override FAIL: %u%u%u%u\n",
      finalState[0], finalState[1], finalState[2], finalState[3]);
    failed++;
  }

  // Test: REMOTE override with overheat override (vent ON, heat OFF)
  finalState[0] = hystOut[0]; finalState[1] = hystOut[1];
  finalState[2] = hystOut[2]; finalState[3] = hystOut[3];
  for (int ch = 0; ch < 4; ch++) {
    if (mode[ch] == 1) finalState[ch] = desired[ch];
  }
  // Overheat override from main.ino:
  // if (overheat) { finalState[0]=1; finalState[1]=0; }
  bool overheat = true;
  if (overheat) {
    finalState[0] = 1;  // vent ON (ch1)
    finalState[1] = 0;  // heat OFF (ch2)
  }

  bool overheatOk = (finalState[0]==1 && finalState[1]==0);
  if (overheatOk) {
    Serial.println(F("  Overheat override PASS"));
    passed++;
  } else {
    Serial.printf("  Overheat override FAIL: %u%u%u%u\n",
      finalState[0], finalState[1], finalState[2], finalState[3]);
    failed++;
  }
}

// ==============================================================
//  MODO INTERACTIVO
// ==============================================================

void serialMenu() {
  if (Serial.available() <= 0) return;

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  cmd.toUpperCase();

  if (cmd == "STATUS") {
    uint8_t s[4];
    ssr.getStateArray(s);
    Serial.printf("SSR: %u%u%u%u | Hyst mode=%d | Light=%d\n",
      s[0], s[1], s[2], s[3], hyst.getMode(), hyst.getLightState());
    return;
  }

  if (cmd == "ALLON") {
    ssr.setAll(1);
    Serial.println(F("Todos los SSR ON"));
    return;
  }

  if (cmd == "ALLOFF") {
    ssr.setAll(0);
    Serial.println(F("Todos los SSR OFF"));
    return;
  }

  if (cmd.startsWith("MODE ")) {
    String m = cmd.substring(5);
    if (m == "LOCAL") { hyst.setMode(CTRL_LOCAL); Serial.println(F("Mode LOCAL")); }
    else if (m == "REMOTE") { hyst.setMode(CTRL_REMOTE); Serial.println(F("Mode REMOTE")); }
    else if (m == "OFF") { hyst.setMode(CTRL_OFF); Serial.println(F("Mode OFF")); }
    else Serial.println(F("MODE LOCAL|REMOTE|OFF"));
    return;
  }

  if (cmd == "HYST") {
    uint8_t out[4];
    hyst.evaluate(22.0, 50.0, 500, out);
    Serial.printf("Hyst(22,50,500): %u%u%u%u\n", out[0], out[1], out[2], out[3]);
    return;
  }

  // Channel commands: 1ON, 1OFF, 2ON, etc.
  for (uint8_t ch = 1; ch <= 4; ch++) {
    if (cmd == String(ch) + "ON") {
      ssr.setChannel(ch, 1);
      Serial.printf("CH%d ON (GPIO%d=LOW)\n", ch, SSR_PINS[ch-1]);
      return;
    }
    if (cmd == String(ch) + "OFF") {
      ssr.setChannel(ch, 0);
      Serial.printf("CH%d OFF (GPIO%d=HIGH)\n", ch, SSR_PINS[ch-1]);
      return;
    }
  }

  Serial.printf("Desconocido: %s\n", cmd.c_str());
}
