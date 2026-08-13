#include <unity.h>

#include "hysteresis_controller.h"
#include "stubs_config.h"

// Compilar el modulo de produccion en esta TU (cobertura nativa de PR-H/I105).
#include "../src/hysteresis_controller.cpp"

// I105 · PR-H — HysteresisController: control local por histeresis + overheat + post-vent.
// Constantes de config (TEMP_CRITICAL etc.) provistas via build_flags en platformio.test.ini
// (config.h es gitignored, no se lee en la suite nativa).

static Setpoints defaultSP(void) {
  Setpoints sp;
  sp.tempMin = 20.0f;
  sp.tempMax = 24.0f;
  sp.humMin = 78.0f;
  sp.humMax = 85.0f;
  sp.co2Max = 1200;
  return sp;
}

void test_HYS_init_sets_defaults_and_local_mode(void) {
  HysteresisController c;
  c.init(defaultSP());
  TEST_ASSERT_EQUAL_INT(CTRL_LOCAL, (int)c.getMode());
  Setpoints sp = c.getSetpoints();
  TEST_ASSERT_EQUAL_FLOAT(20.0f, sp.tempMin);
  TEST_ASSERT_EQUAL_FLOAT(24.0f, sp.tempMax);
  TEST_ASSERT_EQUAL_FLOAT(78.0f, sp.humMin);
  TEST_ASSERT_EQUAL_FLOAT(85.0f, sp.humMax);
  TEST_ASSERT_EQUAL_UINT16(1200, sp.co2Max);
  TEST_ASSERT_FALSE(c.isPostVentActive());
  TEST_ASSERT_EQUAL_INT(OH_NONE, (int)c.getOverheatState());
  TEST_ASSERT_FALSE(c.getLightState());
}

void test_HYS_mode_set_get(void) {
  HysteresisController c;
  c.init(defaultSP());
  c.setMode(CTRL_OFF);
  TEST_ASSERT_EQUAL_INT(CTRL_OFF, (int)c.getMode());
  c.setMode(CTRL_REMOTE);
  TEST_ASSERT_EQUAL_INT(CTRL_REMOTE, (int)c.getMode());
}

void test_HYS_load_setpoints_nvs_without_save_returns_false(void) {
  HysteresisController c;
  c.init(defaultSP());
  TEST_ASSERT_FALSE(c.loadSetpointsNVS());
}

void test_HYS_set_setpoints_persists_and_loads_from_nvs(void) {
  HysteresisController c;
  c.init(defaultSP());
  Setpoints sp = defaultSP();
  sp.tempMin = 18.0f;
  sp.tempMax = 26.0f;
  c.setSetpoints(sp);  // saveSetpointsNVS
  Setpoints loaded = c.getSetpoints();
  TEST_ASSERT_EQUAL_FLOAT(18.0f, loaded.tempMin);
  TEST_ASSERT_EQUAL_FLOAT(26.0f, loaded.tempMax);

  HysteresisController c2;
  c2.init(defaultSP());
  TEST_ASSERT_TRUE(c2.loadSetpointsNVS());
  Setpoints got = c2.getSetpoints();
  TEST_ASSERT_EQUAL_FLOAT(18.0f, got.tempMin);
  TEST_ASSERT_EQUAL_FLOAT(26.0f, got.tempMax);
}

void test_HYS_load_setpoints_rejects_old_schema(void) {
  HysteresisController c;
  c.init(defaultSP());
  Setpoints sp = defaultSP();
  Preferences p;
  p.begin("hysteresis", false);
  p.putUChar("schema", 0);  // schema viejo (< HYST_NVS_SCHEMA_VER)
  p.putBytes("setpoints", &sp, sizeof(Setpoints));
  p.end();
  TEST_ASSERT_FALSE(c.loadSetpointsNVS());
}

void test_HYS_evaluate_middle_range_no_outputs(void) {
  HysteresisController c;
  c.init(defaultSP());
  uint8_t out[4] = {9, 9, 9, 9};
  c.evaluate(22.0f, 80.0f, 800, out);
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_VENT]);
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_HEAT]);
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_HUMID]);
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_LIGHT]);
  TEST_ASSERT_NULL(c.getAlarmReason());
}

void test_HYS_evaluate_ventilation_on_high_temp(void) {
  HysteresisController c;
  c.init(defaultSP());
  uint8_t out[4];
  c.evaluate(25.5f, 80.0f, 800, out);  // temp >= tempMax+1 → vent
  TEST_ASSERT_EQUAL_UINT8(1, out[IDX_VENT]);
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_HEAT]);   // ventOn ⇒ sin heat
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_HUMID]);  // ventOn ⇒ sin humid
}

void test_HYS_evaluate_ventilation_on_high_co2(void) {
  HysteresisController c;
  c.init(defaultSP());
  uint8_t out[4];
  c.evaluate(20.0f, 80.0f, 1500, out);  // co2 >= co2Max+100 → vent
  TEST_ASSERT_EQUAL_UINT8(1, out[IDX_VENT]);
}

void test_HYS_evaluate_heat_on_low_temp(void) {
  HysteresisController c;
  c.init(defaultSP());
  uint8_t out[4];
  c.evaluate(18.0f, 80.0f, 800, out);  // temp <= tempMin-1 → heat
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_VENT]);
  TEST_ASSERT_EQUAL_UINT8(1, out[IDX_HEAT]);
}

void test_HYS_evaluate_humid_on_low_humidity(void) {
  HysteresisController c;
  c.init(defaultSP());
  uint8_t out[4];
  c.evaluate(22.0f, 60.0f, 800, out);  // hum <= humMin-7 → humid
  TEST_ASSERT_EQUAL_UINT8(1, out[IDX_HUMID]);
}

void test_HYS_light_state_toggle(void) {
  HysteresisController c;
  c.init(defaultSP());
  TEST_ASSERT_FALSE(c.getLightState());
  c.setLightState(true);
  TEST_ASSERT_TRUE(c.getLightState());
  uint8_t out[4];
  c.evaluate(22.0f, 80.0f, 800, out);
  TEST_ASSERT_EQUAL_UINT8(1, out[IDX_LIGHT]);
}

void test_HYS_remote_mode_forces_actuators_off_keeps_light(void) {
  HysteresisController c;
  c.init(defaultSP());
  c.setLightState(true);
  c.setMode(CTRL_REMOTE);
  uint8_t out[4] = {9, 9, 9, 9};
  c.evaluate(30.0f, 50.0f, 2000, out);
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_VENT]);
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_HEAT]);
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_HUMID]);
  TEST_ASSERT_EQUAL_UINT8(1, out[IDX_LIGHT]);
  TEST_ASSERT_NULL(c.getAlarmReason());
}

void test_HYS_overheat_active_forces_vent_off_heat(void) {
  HysteresisController c;
  c.init(defaultSP());
  c.setOverheat(33.0f);  // >= TEMP_CRITICAL (32)
  TEST_ASSERT_EQUAL_INT(OH_ACTIVE, (int)c.getOverheatState());
  uint8_t out[4] = {9, 9, 9, 9};
  c.evaluate(18.0f, 60.0f, 800, out);
  TEST_ASSERT_EQUAL_UINT8(1, out[IDX_VENT]);
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_HEAT]);
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_HUMID]);
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_LIGHT]);
}

void test_HYS_overheat_recovers_and_clears(void) {
  HysteresisController c;
  c.init(defaultSP());
  c.setOverheat(33.0f);
  c.setOverheat(26.0f);  // < TEMP_RECOVERY (28) → OH_RECOVERY
  TEST_ASSERT_EQUAL_INT(OH_RECOVERY, (int)c.getOverheatState());
  uint8_t out[4] = {9, 9, 9, 9};
  c.evaluate(22.0f, 80.0f, 800, out);
  TEST_ASSERT_EQUAL_INT(OH_NONE, (int)c.getOverheatState());
  TEST_ASSERT_EQUAL_STRING("OVERHEAT_CLEAR:22.0", c.getAlarmReason());
}

void test_HYS_post_vent_active_forces_humidifier(void) {
  HysteresisController c;
  c.init(defaultSP());
  uint8_t out[4];
  // 1) dispara ventilacion
  c.evaluate(25.5f, 80.0f, 800, out);
  TEST_ASSERT_EQUAL_UINT8(1, out[IDX_VENT]);
  // 2) condiciones normales mientras ventila → se marca post-vent (start=0)
  stubs::millisValue() = 0;
  c.evaluate(20.0f, 80.0f, 800, out);
  TEST_ASSERT_EQUAL_UINT8(0, out[IDX_VENT]);
  // 3) dentro de la ventana post-vent, humid=1 aunque la humedad no lo pida
  stubs::millisValue() = 20000;
  TEST_ASSERT_TRUE(c.isPostVentActive());
  uint8_t out2[4] = {9, 9, 9, 9};
  c.evaluate(20.0f, 80.0f, 800, out2);
  TEST_ASSERT_EQUAL_UINT8(1, out2[IDX_HUMID]);
}

void test_HYS_post_vent_timing_window(void) {
  HysteresisController c;
  c.init(defaultSP());
  uint8_t out[4];
  c.evaluate(25.5f, 80.0f, 800, out);  // vent on
  stubs::millisValue() = 1000;
  c.evaluate(20.0f, 80.0f, 800, out);   // vent off → postVentStart=1000
  TEST_ASSERT_FALSE(c.isPostVentActive());              // elapsed 0 < DELAY
  stubs::millisValue() = 1000 + 10000;                  // borde: DELAY exacto
  TEST_ASSERT_TRUE(c.isPostVentActive());
  stubs::millisValue() = 1000 + 10000 + 30000;          // >= DELAY+DURATION → expira
  TEST_ASSERT_FALSE(c.isPostVentActive());
  TEST_ASSERT_FALSE(c.isPostVentActive());
  c.resetPostVent();
  TEST_ASSERT_FALSE(c.isPostVentActive());
}

void test_HYS_alarm_high_temp(void) {
  HysteresisController c;
  c.init(defaultSP());
  uint8_t out[4];
  c.evaluate(28.0f, 80.0f, 800, out);  // temp > tempMax+3 → HIGH_TEMP
  TEST_ASSERT_EQUAL_STRING("HIGH_TEMP:28.0", c.getAlarmReason());
}

void test_HYS_alarm_low_temp(void) {
  HysteresisController c;
  c.init(defaultSP());
  uint8_t out[4];
  c.evaluate(16.0f, 80.0f, 800, out);  // temp < tempMin-3 → LOW_TEMP
  TEST_ASSERT_EQUAL_STRING("LOW_TEMP:16.0", c.getAlarmReason());
}

void test_HYS_alarm_high_humidity(void) {
  HysteresisController c;
  c.init(defaultSP());
  uint8_t out[4];
  c.evaluate(22.0f, 91.0f, 800, out);  // hum > humMax+5 → HIGH_HUM
  TEST_ASSERT_EQUAL_STRING("HIGH_HUM:91.0", c.getAlarmReason());
}

void test_HYS_alarm_low_humidity(void) {
  HysteresisController c;
  c.init(defaultSP());
  uint8_t out[4];
  c.evaluate(22.0f, 70.0f, 800, out);  // hum < humMin-5 → LOW_HUM
  TEST_ASSERT_EQUAL_STRING("LOW_HUM:70.0", c.getAlarmReason());
}

void test_HYS_alarm_high_co2(void) {
  HysteresisController c;
  c.init(defaultSP());
  uint8_t out[4];
  c.evaluate(22.0f, 80.0f, 2000, out);  // co2 > co2Max+500 → HIGH_CO2
  TEST_ASSERT_EQUAL_STRING("HIGH_CO2:2000", c.getAlarmReason());
}
