#include <unity.h>

// Modulos de produccion compilados en esta TU (cobertura nativa de PR-H/I105).
// logger.cpp + event_bus.cpp + telemetry_buffer.cpp comparten este TU: el binario
// nativo es unico, asi que los globales (firmwareLogger, eventBus, telemetryBuffer)
// se definen exactamente una vez aqui.
#include "../src/logger.cpp"
#include "../src/event_bus.cpp"
#include "../src/telemetry_buffer.cpp"

#include "logger.h"
#include "event_bus.h"
#include "telemetry_buffer.h"
#include "stubs_config.h"

// ============ EventBus ============

static int g_evtCount = 0;
static EventType g_evtType = EVT_COUNT;
static uint32_t g_evtTs = 0;

static void evtCallback(const Event& event, void* ctx) {
  g_evtCount++;
  g_evtType = event.type;
  g_evtTs = event.timestamp;
  (void)ctx;
}

static void resetEvtCounters(void) {
  g_evtCount = 0;
  g_evtType = EVT_COUNT;
  g_evtTs = 0;
}

void test_EVT_init_subscribe_publish_loop_delivers(void) {
  EventBus bus;
  TEST_ASSERT_TRUE(bus.init());
  TEST_ASSERT_TRUE(bus.init());  // idempotente

  resetEvtCounters();
  Event ev;
  ev.type = EVT_ALARM;
  ev.timestamp = 42;
  TEST_ASSERT_TRUE(bus.subscribe(EVT_ALARM, evtCallback, nullptr));
  bus.publish(ev);
  TEST_ASSERT_EQUAL_UINT32(1, bus.getPendingCount());
  bus.loop();
  TEST_ASSERT_EQUAL_INT(1, g_evtCount);
  TEST_ASSERT_EQUAL_INT(EVT_ALARM, (int)g_evtType);
  TEST_ASSERT_EQUAL_UINT32(42, g_evtTs);
  TEST_ASSERT_EQUAL_UINT32(0, bus.getPendingCount());
}

void test_EVT_unsubscribe_stops_delivery(void) {
  EventBus bus;
  bus.init();
  bus.subscribe(EVT_ALARM, evtCallback);
  resetEvtCounters();
  Event ev;
  ev.type = EVT_ALARM;
  ev.timestamp = 1;
  bus.publish(ev);
  bus.loop();
  TEST_ASSERT_EQUAL_INT(1, g_evtCount);

  TEST_ASSERT_TRUE(bus.unsubscribe(EVT_ALARM, evtCallback));
  resetEvtCounters();
  bus.publish(ev);
  bus.loop();
  TEST_ASSERT_EQUAL_INT(0, g_evtCount);
}

void test_EVT_subscribe_rejects_bad_args(void) {
  EventBus bus;
  TEST_ASSERT_FALSE(bus.subscribe(EVT_ALARM, evtCallback));  // sin init
  TEST_ASSERT_TRUE(bus.init());
  TEST_ASSERT_FALSE(bus.subscribe((EventType)EVT_COUNT, evtCallback));
  TEST_ASSERT_FALSE(bus.subscribe(EVT_ALARM, nullptr));
  TEST_ASSERT_FALSE(bus.unsubscribe(EVT_ALARM, evtCallback));  // nunca suscrito
}

void test_EVT_subscriber_slots_full(void) {
  EventBus bus;
  bus.init();
  for (int i = 0; i < 4; i++) {
    TEST_ASSERT_TRUE(bus.subscribe(EVT_ALARM, evtCallback));
  }
  TEST_ASSERT_FALSE(bus.subscribe(EVT_ALARM, evtCallback));
}

void test_EVT_queue_overflow_drops(void) {
  EventBus bus;
  bus.init();
  Event ev;
  ev.type = EVT_ALARM;
  ev.timestamp = 0;
  for (int i = 0; i < 32 + 5; i++) {
    bus.publish(ev);
  }
  TEST_ASSERT_EQUAL_UINT32(32, bus.getPendingCount());
  bus.loop();
  TEST_ASSERT_EQUAL_UINT32(0, bus.getPendingCount());
}

void test_EVT_publish_from_isr_and_loop(void) {
  EventBus bus;
  bus.init();
  Event ev;
  ev.type = EVT_LOG;
  ev.timestamp = 7;
  bus.publishFromISR(ev);
  TEST_ASSERT_EQUAL_UINT32(1, bus.getPendingCount());
  bus.loop();
  TEST_ASSERT_EQUAL_UINT32(0, bus.getPendingCount());
}

// ============ Logger ============

void test_LOGGER_init_add_sink_and_log(void) {
  Logger logger;
  TEST_ASSERT_TRUE(logger.init());
  SerialSink serial;
  logger.addSink(&serial);
  logger.setLevel(LOG_DEBUG);
  logger.log(LOG_ERROR, "TST", "error %d", 1);
  logger.log(LOG_INFO, "TST", "info");
  logger.log(LOG_VERBOSE, "TST", "verbose");  // filtrado (level > DEBUG)
  logger.loop();
  TEST_ASSERT_EQUAL_UINT32(2, logger.getLogCount());
  TEST_ASSERT_EQUAL_UINT32(1, logger.getErrorCount());
  TEST_ASSERT_EQUAL_INT(LOG_DEBUG, (int)logger.getLevel());
  logger.dumpRecent(1);
}

void test_LOGGER_ring_wraps_around(void) {
  Logger logger;
  logger.init();
  SerialSink serial;
  logger.addSink(&serial);
  logger.setLevel(LOG_DEBUG);
  for (int i = 0; i < 70; i++) {
    logger.log(LOG_INFO, "TST", "entry %d", i);
  }
  TEST_ASSERT_EQUAL_UINT32(70, logger.getLogCount());
  logger.dumpRecent(50);  // el ring (64) ya dio la vuelta
}

void test_LOGGER_spiffs_sink_roundtrip(void) {
  stubs::spiffsEnabled() = true;
  Logger logger;
  logger.init();
  SpiffsSink spiffs;
  spiffs.begin();
  TEST_ASSERT_EQUAL_INT(0, spiffs.getWriteErrors());
  LogEntry e;
  e.level = LOG_WARN;
  e.timestamp = 5;
  snprintf(e.tag, sizeof(e.tag), "TAG");
  snprintf(e.message, sizeof(e.message), "mensaje");
  spiffs.write(e);
  spiffs.flush();
  TEST_ASSERT_EQUAL_INT(0, spiffs.getWriteErrors());
}

void test_LOGGER_spiffs_sink_unavailable(void) {
  stubs::spiffsEnabled() = false;
  Logger logger;
  logger.init();
  SpiffsSink spiffs;
  spiffs.begin();
  TEST_ASSERT_EQUAL_INT(1, spiffs.getWriteErrors());
  LogEntry e;
  e.level = LOG_ERROR;
  e.timestamp = 0;
  snprintf(e.tag, sizeof(e.tag), "T");
  snprintf(e.message, sizeof(e.message), "x");
  spiffs.write(e);  // no-op (_available false)
  TEST_ASSERT_EQUAL_INT(1, spiffs.getWriteErrors());
}

static bool g_mqttPublished = false;
static char g_mqttTopic[64];

static bool mqttPublishFunc(const char* topic, const char* payload, bool retained) {
  g_mqttPublished = true;
  snprintf(g_mqttTopic, sizeof(g_mqttTopic), "%s", topic);
  (void)payload;
  (void)retained;
  return true;
}

static bool mqttConnectedFunc(void) { return true; }
static bool mqttNotConnectedFunc(void) { return false; }

void test_LOGGER_mqtt_sink_publishes_when_connected(void) {
  Logger logger;
  logger.init();
  MqttSink mqtt;
  mqtt.setPublishFunc(mqttPublishFunc);
  mqtt.setConnectedFunc(mqttConnectedFunc);
  LogEntry e;
  e.level = LOG_INFO;
  e.timestamp = 9;
  snprintf(e.tag, sizeof(e.tag), "MQ");
  snprintf(e.message, sizeof(e.message), "hola");
  g_mqttPublished = false;
  mqtt.write(e);
  TEST_ASSERT_TRUE(g_mqttPublished);
  TEST_ASSERT_EQUAL_STRING("log", g_mqttTopic);
}

void test_LOGGER_mqtt_sink_skips_when_disconnected(void) {
  Logger logger;
  logger.init();
  MqttSink mqtt;
  mqtt.setPublishFunc(mqttPublishFunc);
  mqtt.setConnectedFunc(mqttNotConnectedFunc);
  LogEntry e;
  e.level = LOG_INFO;
  e.timestamp = 9;
  snprintf(e.tag, sizeof(e.tag), "MQ");
  snprintf(e.message, sizeof(e.message), "hola");
  g_mqttPublished = false;
  mqtt.write(e);
  TEST_ASSERT_FALSE(g_mqttPublished);
}

// ============ TelemetryBuffer ============

void test_TBUF_init_push_pop_fifo(void) {
  EventBus bus;
  bus.init();
  TelemetryBuffer tb;
  TEST_ASSERT_TRUE(tb.init(&bus));
  tb.push(20.5f, 80.0f, 900, 50, 2);
  tb.push(21.0f, 79.0f, 910, 55, 3);
  TEST_ASSERT_TRUE(tb.hasPending());
  TEST_ASSERT_EQUAL_UINT32(2, tb.count());

  TelemetryEntry e;
  TEST_ASSERT_TRUE(tb.pop(&e));
  TEST_ASSERT_EQUAL_FLOAT(20.5f, e.temperature);
  TEST_ASSERT_EQUAL_FLOAT(80.0f, e.humidity);
  TEST_ASSERT_EQUAL_UINT16(900, e.eco2);
  TEST_ASSERT_EQUAL_UINT16(50, e.tvoc);
  TEST_ASSERT_EQUAL_UINT8(2, e.aqi);

  TEST_ASSERT_TRUE(tb.pop(&e));
  TEST_ASSERT_EQUAL_FLOAT(21.0f, e.temperature);
  TEST_ASSERT_FALSE(tb.pop(&e));
  TEST_ASSERT_FALSE(tb.hasPending());
}

void test_TBUF_push_no_bus_pop_matches_values(void) {
  TelemetryBuffer tb;
  tb.init(nullptr);
  tb.push(23.5f, 81.0f, 950, 60, 4);
  TelemetryEntry e;
  TEST_ASSERT_TRUE(tb.pop(&e));
  TEST_ASSERT_EQUAL_FLOAT(23.5f, e.temperature);
  TEST_ASSERT_EQUAL_FLOAT(81.0f, e.humidity);
  TEST_ASSERT_EQUAL_UINT16(950, e.eco2);
  TEST_ASSERT_EQUAL_UINT16(60, e.tvoc);
  TEST_ASSERT_EQUAL_UINT8(4, e.aqi);
  TEST_ASSERT_EQUAL_UINT8(0, e.flags);
}

void test_TBUF_init_without_spiffs_buffers_ram(void) {
  stubs::spiffsEnabled() = false;
  TelemetryBuffer tb;
  TEST_ASSERT_FALSE(tb.init(nullptr));
  tb.push(1.0f, 2.0f, 3, 4, 5);
  TEST_ASSERT_TRUE(tb.hasPending());
  TelemetryEntry e;
  TEST_ASSERT_TRUE(tb.pop(&e));
  TEST_ASSERT_EQUAL_FLOAT(1.0f, e.temperature);
}

void test_TBUF_spill_count_increases_when_ram_full(void) {
  TelemetryBuffer tb;
  tb.init(nullptr);
  for (int i = 0; i < 200; i++) {
    tb.push((float)i, 50.0f, 400, 10, 1);
  }
  TEST_ASSERT_TRUE(tb.getSpillCount() > 0);
  TEST_ASSERT_TRUE(tb.hasPending());
  TEST_ASSERT_TRUE(tb.count() > 0);
}

void test_TBUF_spill_writes_spiffs_and_drain(void) {
  TelemetryBuffer tb;
  tb.init(nullptr);
  for (int i = 0; i < 250; i++) {
    tb.push((float)i, 50.0f, 400, 10, 1);
  }
  TEST_ASSERT_TRUE(tb.getSpillCount() > 0);
  TEST_ASSERT_TRUE(SPIFFS.exists("/telemetry/pending.bin"));

  TelemetryEntry e;
  int drained = 0;
  while (tb.pop(&e)) {
    drained++;
  }
  TEST_ASSERT_TRUE(drained > 0);
  TEST_ASSERT_FALSE(tb.hasPending());
  TEST_ASSERT_EQUAL_UINT32(0, tb.count());
}

void test_TBUF_count_includes_spiffs_entries(void) {
  TelemetryBuffer tb;
  tb.init(nullptr);
  for (int i = 0; i < 250; i++) {
    tb.push((float)i, 50.0f, 400, 10, 1);
  }
  TEST_ASSERT_TRUE(tb.count() > 200);
}

void test_TBUF_load_from_spiffs_detects_pending(void) {
  TelemetryBuffer tb;
  tb.init(nullptr);
  for (int i = 0; i < 250; i++) {
    tb.push((float)i, 50.0f, 400, 10, 1);
  }
  TEST_ASSERT_TRUE(tb.loadFromSPIFFS());

  TelemetryBuffer tb2;
  tb2.init(nullptr);
  TEST_ASSERT_TRUE(tb2.hasPending());
  TEST_ASSERT_TRUE(tb2.count() > 0);
}

void test_TBUF_clear_resets_ram_counters(void) {
  TelemetryBuffer tb;
  tb.init(nullptr);
  tb.push(1.0f, 2.0f, 3, 4, 5);
  tb.push(2.0f, 3.0f, 4, 5, 6);
  TEST_ASSERT_EQUAL_UINT32(2, tb.count());
  tb.clear();
  TEST_ASSERT_EQUAL_UINT32(0, tb.count());
  TEST_ASSERT_FALSE(tb.hasPending());
  TelemetryEntry e;
  TEST_ASSERT_FALSE(tb.pop(&e));
  TEST_ASSERT_EQUAL_UINT32(0, tb.getSpillCount());
}

void test_TBUF_clear_spiffs_removes_disk_buffer(void) {
  TelemetryBuffer tb;
  tb.init(nullptr);
  for (int i = 0; i < 250; i++) {
    tb.push((float)i, 50.0f, 400, 10, 1);
  }
  TEST_ASSERT_TRUE(SPIFFS.exists("/telemetry/pending.bin"));
  tb.clearSPIFFS();
  TEST_ASSERT_FALSE(SPIFFS.exists("/telemetry/pending.bin"));
  tb.clear();
  TEST_ASSERT_EQUAL_UINT32(0, tb.count());
}
