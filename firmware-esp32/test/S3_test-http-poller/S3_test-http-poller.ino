#include <Arduino.h>
#include <WiFi.h>
#include <esp_task_wdt.h>

#include "config.h"

#define POLL_TEST_VERSION "1.2.0"

const uint8_t ssrPins[4] = {SSR_CH1_PIN, SSR_CH2_PIN, SSR_CH3_PIN, SSR_CH4_PIN};
const char* ssrLabels[4] = {"CH1 Vent", "CH2 Heat", "CH3 Humid", "CH4 Light"};

// Estados deseados desde backend o test local
int desiredState[4] = {0, 0, 0, 0};
int desiredMode[4] = {0, 0, 0, 0};
bool actuatorsFromBackend = false;
bool parseOk = false;

// ============================================================
// SSR test cycle state machine
// ============================================================
enum SsrTestStep {
  SSR_TEST_IDLE,
  SSR_TEST_CH1,
  SSR_TEST_CH2,
  SSR_TEST_CH3,
  SSR_TEST_CH4,
  SSR_TEST_ALLOFF
};
SsrTestStep ssrTestStep = SSR_TEST_IDLE;
unsigned long ssrTestStart = 0;
const unsigned long SSR_TEST_DURATION = 3000;

// ============================================================
// HTTP Poller FSM
// ============================================================
enum TestPhase {
  PHASE_BOOT,
  PHASE_WIFI,
  PHASE_CONNECT,
  PHASE_SEND,
  PHASE_WAIT,
  PHASE_READ,
  PHASE_PARSE,
  PHASE_COMPLETE,
  PHASE_FAIL
};

TestPhase phase = PHASE_BOOT;
WiFiClient client;
unsigned long deadline = 0;
String httpResponse;
bool bodyStarted = false;
unsigned long phaseStart = 0;
unsigned int successCount = 0;
unsigned int failCount = 0;
char hdrBuf[4] = {0};

// ============================================================
// Funciones SSR
// ============================================================
void ssrSetup() {
  for (int i = 0; i < 4; i++) {
    pinMode(ssrPins[i], OUTPUT);
    if (SSR_ACTIVE_LOW) {
      digitalWrite(ssrPins[i], HIGH); // OFF
    } else {
      digitalWrite(ssrPins[i], LOW);  // OFF
    }
  }
  Serial.println("[SSR] Inicializado: 4 canales active-LOW");
}

void ssrSet(int ch, bool on) {
  if (ch < 0 || ch >= 4) return;
  if (SSR_ACTIVE_LOW) {
    digitalWrite(ssrPins[ch], on ? LOW : HIGH);
  } else {
    digitalWrite(ssrPins[ch], on ? HIGH : LOW);
  }
  Serial.printf("[SSR] %s: %s\n", ssrLabels[ch], on ? "ON  (LOW)" : "OFF (HIGH)");
}

void ssrAllOff() {
  for (int i = 0; i < 4; i++) ssrSet(i, false);
}

void applyParsedActuators() {
  Serial.println("[SSR] Aplicando estados desde backend:");
  for (int i = 0; i < 4; i++) {
    ssrSet(i, desiredState[i] == 1);
  }
}

void runSsrTestCycle() {
  unsigned long now = millis();

  switch (ssrTestStep) {
    case SSR_TEST_IDLE:
      ssrTestStep = SSR_TEST_CH1;
      ssrTestStart = now;
      Serial.println("\n===== INICIO CICLO TEST SSR =====");
      ssrSet(0, true);
      break;

    case SSR_TEST_CH1:
      if (now - ssrTestStart >= SSR_TEST_DURATION) {
        ssrSet(0, false);
        ssrTestStep = SSR_TEST_CH2;
        ssrTestStart = now;
        ssrSet(1, true);
      }
      break;

    case SSR_TEST_CH2:
      if (now - ssrTestStart >= SSR_TEST_DURATION) {
        ssrSet(1, false);
        ssrTestStep = SSR_TEST_CH3;
        ssrTestStart = now;
        ssrSet(2, true);
      }
      break;

    case SSR_TEST_CH3:
      if (now - ssrTestStart >= SSR_TEST_DURATION) {
        ssrSet(2, false);
        ssrTestStep = SSR_TEST_CH4;
        ssrTestStart = now;
        ssrSet(3, true);
      }
      break;

    case SSR_TEST_CH4:
      if (now - ssrTestStart >= SSR_TEST_DURATION) {
        ssrSet(3, false);
        ssrTestStep = SSR_TEST_ALLOFF;
        ssrTestStart = now;
        Serial.println("[SSR] Todos OFF (pausa 3s)");
      }
      break;

    case SSR_TEST_ALLOFF:
      if (now - ssrTestStart >= SSR_TEST_DURATION) {
        ssrTestStep = SSR_TEST_CH1;
        ssrTestStart = now;
        Serial.println("\n===== REINICIO CICLO TEST SSR =====");
        ssrSet(0, true);
      }
      break;
  }
}

// ============================================================
// Funciones HTTP Poller
// ============================================================
const char* phaseName(TestPhase p) {
  switch (p) {
    case PHASE_BOOT:     return "BOOT";
    case PHASE_WIFI:     return "WIFI";
    case PHASE_CONNECT:  return "CONNECT";
    case PHASE_SEND:     return "SEND";
    case PHASE_WAIT:     return "WAIT";
    case PHASE_READ:     return "READ";
    case PHASE_PARSE:    return "PARSE";
    case PHASE_COMPLETE: return "COMPLETE";
    case PHASE_FAIL:     return "FAIL";
    default:             return "UNKNOWN";
  }
}

void setPhase(TestPhase p) {
  if (p != phase) {
    Serial.printf("[PHASE] %s -> %s\n", phaseName(phase), phaseName(p));
    phase = p;
    phaseStart = millis();
  }
}

// Parseo manual del JSON (sin ArduinoJson) buscando actuator entries
void parseHttpResponse(const String& body) {
  Serial.printf("[PARSE] Body raw (%u bytes):\n", body.length());
  for (unsigned int i = 0; i < body.length(); i++) {
    Serial.write(body[i]);
  }
  Serial.println();

  if (body.length() == 0) {
    Serial.println("[PARSE] ERROR: Body vacio");
    failCount++;
    actuatorsFromBackend = false;
    setPhase(PHASE_FAIL);
    return;
  }

  // Reset actuator state antes de parsear
  parseOk = false;
  for (int i = 0; i < 4; i++) {
    desiredState[i] = 0;
    desiredMode[i] = 0;
  }
  actuatorsFromBackend = false;

  int idx = 0;
  int chCount = 0;
  while (true) {
    int chPos = body.indexOf("\"channel\"", idx);
    if (chPos == -1) break;

    // Extraer número de canal
    int colon = body.indexOf(':', chPos + 9);
    if (colon == -1) break;
    int comma = body.indexOf(',', colon);
    int brace = body.indexOf('}', colon);
    int end = (comma > 0 && comma < brace) ? comma : brace;
    if (end == -1) end = body.length();
    String chStr = body.substring(colon + 1, end);
    chStr.trim();
    int ch = chStr.toInt();

    // Extraer state
    int statePos = body.indexOf("\"state\"", chPos);
    String state = "OFF";
    if (statePos > 0 && statePos < chPos + 80) {
      int sc = body.indexOf(':', statePos + 7);
      if (sc > 0) {
        int sq1 = body.indexOf('\"', sc + 1);
        int sq2 = body.indexOf('\"', sq1 + 1);
        if (sq1 > 0 && sq2 > sq1) state = body.substring(sq1 + 1, sq2);
      }
    }

    // Extraer mode
    int modePos = body.indexOf("\"mode\"", chPos);
    String mode = "LOCAL";
    if (modePos > 0 && modePos < chPos + 80) {
      int mc = body.indexOf(':', modePos + 6);
      if (mc > 0) {
        int mq1 = body.indexOf('\"', mc + 1);
        int mq2 = body.indexOf('\"', mq1 + 1);
        if (mq1 > 0 && mq2 > mq1) mode = body.substring(mq1 + 1, mq2);
      }
    }

    Serial.printf("[ACTUATOR] CH%d: state=%s mode=%s\n", ch, state.c_str(), mode.c_str());

    // Guardar en arrays globales
    if (ch >= 1 && ch <= 4) {
      desiredState[ch - 1] = (state == "ON") ? 1 : 0;
      desiredMode[ch - 1] = (mode == "REMOTE") ? 1 : 0;
    }

    chCount++;
    idx = end + 1;
  }

  parseOk = true;

  if (chCount == 0) {
    Serial.printf("[PARSE] WARN: Sin actuadores en respuesta (%u bytes): ", body.length());
    for (unsigned int i = 0; i < body.length(); i++) Serial.write(body[i]);
    Serial.println();
    Serial.println("[PARSE] Respuesta valida sin actuadores -> COMPLETE (SSR test cycle activo)");
    actuatorsFromBackend = false;
    successCount++;
    setPhase(PHASE_COMPLETE);
  } else {
    Serial.printf("[PARSE] OK: %d actuadores parseados\n", chCount);
    actuatorsFromBackend = true;
    applyParsedActuators();
    successCount++;
    setPhase(PHASE_COMPLETE);
  }
}

void runPollCycle() {
  unsigned long now = millis();

  switch (phase) {
    case PHASE_COMPLETE:
      if (WiFi.status() == WL_CONNECTED) {
        client.stop();
        httpResponse = "";
        bodyStarted = false;
        memset(hdrBuf, 0, 4);
        parseOk = false;
        setPhase(PHASE_CONNECT);
        deadline = now + 10000;
      }
      break;

    case PHASE_BOOT:
      if (WiFi.status() == WL_CONNECTED) {
        client.stop();
        httpResponse = "";
        bodyStarted = false;
        memset(hdrBuf, 0, 4);
        parseOk = false;
        setPhase(PHASE_CONNECT);
        deadline = now + 10000;
      }
      break;

    case PHASE_FAIL: {
      static unsigned long failWaitStart = 0;
      if (failWaitStart == 0) {
        failWaitStart = now;
        Serial.println("[POLL] Esperando 3s antes de reintentar...");
      }
      if (now - failWaitStart >= 3000) {
        failWaitStart = 0;
        if (WiFi.status() == WL_CONNECTED) {
          client.stop();
          httpResponse = "";
          bodyStarted = false;
          memset(hdrBuf, 0, 4);
          parseOk = false;
          setPhase(PHASE_CONNECT);
          deadline = now + 10000;
        }
      }
      break;
    }

    case PHASE_WIFI:
      Serial.println("[WIFI] Conectando...");
      WiFi.begin(WIFI_SSID_1, WIFI_PASSWORD_1);
      setPhase(PHASE_WIFI);
      deadline = now + 30000;
      break;

    case PHASE_CONNECT:
      if (now >= deadline) {
        Serial.println("[CONNECT] ERROR: Timeout de conexión TCP");
        failCount++;
        client.stop();
        setPhase(PHASE_FAIL);
        return;
      }
      if (!client.connected()) {
        client.setTimeout(5000);
        int result = client.connect(BACKEND_HOST, BACKEND_PORT);
        if (!client.connected()) {
          if (result == 0) {
            Serial.printf("[CONNECT] Fallo: %s:%d (timeout o RST)\n", BACKEND_HOST, BACKEND_PORT);
          }
          delay(100);
          return;
        }
      }
      Serial.printf("[CONNECT] TCP conectado a %s:%d\n", BACKEND_HOST, BACKEND_PORT);
      setPhase(PHASE_SEND);
      break;

    case PHASE_SEND: {
      String path = "/api/v1/actuators?deviceId=" + String(DEVICE_ID);
      client.printf("GET %s HTTP/1.1\r\nHost: %s:%d\r\nConnection: close\r\n\r\n",
        path.c_str(), BACKEND_HOST, BACKEND_PORT);
      Serial.printf("[SEND] GET %s\n", path.c_str());
      httpResponse = "";
      bodyStarted = false;
      memset(hdrBuf, 0, 4);
      setPhase(PHASE_WAIT);
      deadline = now + 10000;
      break;
    }

    case PHASE_WAIT:
      if (now >= deadline) {
        Serial.println("[WAIT] ERROR: Timeout esperando respuesta");
        failCount++;
        client.stop();
        setPhase(PHASE_FAIL);
        return;
      }
      if (client.available()) {
        setPhase(PHASE_READ);
        deadline = now + 5000;
        return;
      }
      if (!client.connected()) {
        if (client.available()) {
          setPhase(PHASE_READ);
          deadline = now + 5000;
          return;
        }
        Serial.println("[WAIT] Desconectado sin datos");
        failCount++;
        client.stop();
        setPhase(PHASE_FAIL);
        return;
      }
      delay(10);
      break;

    case PHASE_READ:
      if (now >= deadline) {
        Serial.printf("[READ] ERROR: Timeout leyendo (bodyStarted=%d, len=%u)\n",
          bodyStarted ? 1 : 0, httpResponse.length());
        failCount++;
        client.stop();
        setPhase(PHASE_FAIL);
        return;
      }
      while (client.available()) {
        char c = client.read();
        if (!bodyStarted) {
          memmove(hdrBuf, hdrBuf + 1, 3);
          hdrBuf[3] = c;
          if (memcmp(hdrBuf, "\r\n\r\n", 4) == 0) {
            bodyStarted = true;
            memset(hdrBuf, 0, 4);
            Serial.printf("[READ] Inicio de body detectado\n");
          }
        } else {
          httpResponse += c;
        }
      }
      if (!client.connected() && !client.available()) {
        if (bodyStarted && httpResponse.length() > 0) {
          client.stop();
          Serial.printf("[READ] Respuesta completa (%u bytes)\n", httpResponse.length());
          setPhase(PHASE_PARSE);
        } else {
          Serial.println("[READ] Desconectado sin body");
          failCount++;
          client.stop();
          setPhase(PHASE_FAIL);
        }
        return;
      }
      delay(10);
      break;

    case PHASE_PARSE:
      parseHttpResponse(httpResponse);
      break;
  }
}

void printReport() {
  unsigned long uptime = millis() / 1000;
  Serial.printf("\n========== REPORTE HTTP POLLER ==========\n");
  Serial.printf("Version:     %s\n", POLL_TEST_VERSION);
  Serial.printf("Uptime:      %lus\n", uptime);
  Serial.printf("WiFi:        %s (RSSI: %d)\n",
    WiFi.isConnected() ? "OK" : "NO", WiFi.RSSI());
  Serial.printf("Backend:     %s:%d\n", BACKEND_HOST, BACKEND_PORT);
  Serial.printf("Ciclos OK:   %u\n", successCount);
  Serial.printf("Ciclos FAIL: %u\n", failCount);
  Serial.printf("Total:       %u\n", successCount + failCount);
  Serial.printf("Fase actual: %s\n", phaseName(phase));
  Serial.printf("SSR backend: %s\n", actuatorsFromBackend ? "ACTIVO" : "---");
  Serial.printf("SSR CH1:     %s\n", desiredState[0] ? "ON" : "OFF");
  Serial.printf("SSR CH2:     %s\n", desiredState[1] ? "ON" : "OFF");
  Serial.printf("SSR CH3:     %s\n", desiredState[2] ? "ON" : "OFF");
  Serial.printf("SSR CH4:     %s\n", desiredState[3] ? "ON" : "OFF");
  Serial.printf("==========================================\n\n");
}

void setup() {
  Serial.begin(115200);
  delay(100);

  esp_task_wdt_init(10, true);
  esp_task_wdt_add(NULL);

  Serial.printf("\n=== S3_test-http-poller v%s ===\n", POLL_TEST_VERSION);
  Serial.printf("Backend: %s:%d\n", BACKEND_HOST, BACKEND_PORT);
  Serial.printf("DeviceID: %s\n", DEVICE_ID);
  Serial.printf("SSR: CH1=GPIO%d CH2=GPIO%d CH3=GPIO%d CH4=GPIO%d (active-LOW)\n",
    SSR_CH1_PIN, SSR_CH2_PIN, SSR_CH3_PIN, SSR_CH4_PIN);
  Serial.println("Verifique las credenciales WiFi en el source antes de flashear.");
  Serial.println("============================================\n");

  ssrSetup();
  ssrAllOff();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID_1, WIFI_PASSWORD_1);

  setPhase(PHASE_WIFI);
  phaseStart = millis();
  deadline = millis() + 30000;
}

void loop() {
  unsigned long now = millis();

  esp_task_wdt_reset();

  // --- WiFi ---
  if (phase == PHASE_WIFI) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("[WIFI] Conectado! IP: %s\n", WiFi.localIP().toString().c_str());
      setPhase(PHASE_COMPLETE);
    } else if (now >= deadline) {
      Serial.println("[WIFI] ERROR: No se pudo conectar en 30s");
      Serial.println("[WIFI] Verifique SSID/PASSWORD en el source");
      setPhase(PHASE_FAIL);
    } else {
      static unsigned long lastWifiLog = 0;
      if (now - lastWifiLog > 3000) {
        Serial.printf("[WIFI] Esperando conexion... (estado: %d)\n", WiFi.status());
        lastWifiLog = now;
      }
      delay(1000);
      return;
    }
  }

  // --- SSR: test cycle o backend control (corre antes del poll para log mas limpio) ---
  if (WiFi.status() == WL_CONNECTED) {
    if (!actuatorsFromBackend) {
      runSsrTestCycle();
    }
  }

  // --- HTTP Polling ---
  if (WiFi.status() == WL_CONNECTED) {
    runPollCycle();

    // Reporte cada 60s
    static unsigned long lastReport = 0;
    if (now - lastReport > 60000) {
      lastReport = now;
      printReport();
    }
  }

  delay(250);
}
