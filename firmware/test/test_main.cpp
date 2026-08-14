#include <unity.h>

#include "stubs_config.h"

// Suites nativas del firmware. Cada test_*.cpp define sus test cases; este
// archivo es el único que define setUp/tearDown/main (regla Unity + PlatformIO:
// un solo main por binario nativo).

// EDD-006 §8 — channel mapping
void test_CH_T08_gpio_unique_per_channel(void);
void test_CH_T09_gpio_bijective(void);

// ISSUE-059 (FW-010) — política de credenciales MQTT (ADR-028)
void test_I59_provisioned_always_wins(void);
void test_I59_default_fallback_only_first_boot(void);
void test_I59_no_credentials_on_subsequent_boot(void);
void test_I59_fallback_reachable_exactly_once(void);

// ISSUE-105 (PR-H) — HysteresisController
void test_HYS_init_sets_defaults_and_local_mode(void);
void test_HYS_mode_set_get(void);
void test_HYS_load_setpoints_nvs_without_save_returns_false(void);
void test_HYS_set_setpoints_persists_and_loads_from_nvs(void);
void test_HYS_load_setpoints_rejects_old_schema(void);
void test_HYS_evaluate_middle_range_no_outputs(void);
void test_HYS_evaluate_ventilation_on_high_temp(void);
void test_HYS_evaluate_ventilation_on_high_co2(void);
void test_HYS_evaluate_heat_on_low_temp(void);
void test_HYS_evaluate_humid_on_low_humidity(void);
void test_HYS_light_state_toggle(void);
void test_HYS_remote_mode_forces_actuators_off_keeps_light(void);
void test_HYS_overheat_active_forces_vent_off_heat(void);
void test_HYS_overheat_recovers_and_clears(void);
void test_HYS_post_vent_active_forces_humidifier(void);
void test_HYS_post_vent_timing_window(void);
void test_HYS_alarm_high_temp(void);
void test_HYS_alarm_low_temp(void);
void test_HYS_alarm_high_humidity(void);
void test_HYS_alarm_low_humidity(void);
void test_HYS_alarm_high_co2(void);

// ISSUE-105 (PR-H) — OTASelector
void test_OSEL_validate_url_rejects_empty(void);
void test_OSEL_validate_url_rejects_http_scheme(void);
void test_OSEL_validate_url_rejects_missing_bin_extension(void);
void test_OSEL_validate_url_accepts_https_bin(void);
void test_OSEL_compare_semver_equal(void);
void test_OSEL_compare_semver_candidate_major_newer(void);
void test_OSEL_compare_semver_candidate_major_older(void);
void test_OSEL_compare_semver_minor_and_patch(void);
void test_OSEL_rssi_threshold(void);
void test_OSEL_select_valid_when_url_and_rssi_ok(void);
void test_OSEL_select_invalid_when_url_bad(void);
void test_OSEL_select_invalid_when_rssi_weak(void);

// ISSUE-052 (FW-003) — OTASelector: hash SHA-256 obligatorio (ADR-014)
void test_OSEL_validate_hash_rejects_empty(void);
void test_OSEL_validate_hash_rejects_short(void);
void test_OSEL_validate_hash_rejects_non_hex(void);
void test_OSEL_validate_hash_accepts_64_hex(void);
void test_OSEL_validate_hash_accepts_uppercase_hex(void);
void test_OSEL_select_rejects_missing_hash(void);
void test_OSEL_select_rejects_invalid_hash_even_with_good_rssi(void);

// ISSUE-052 (FW-003) — OTAExecutor: TLS via CA + hash obligatorio (ADR-014)
void test_OTAEXEC_ca_not_configured_by_default(void);
void test_OTAEXEC_set_ca_cert_configures_transport(void);
void test_OTAEXEC_set_ca_cert_empty_keeps_disabled(void);
void test_OTAEXEC_begin_rejects_when_ca_not_configured(void);
void test_OTAEXEC_begin_rejects_missing_hash(void);
void test_OTAEXEC_begin_rejects_invalid_hash(void);
void test_OTAEXEC_begin_rejects_http_url(void);
void test_OTAEXEC_begin_rejects_empty_url(void);
void test_OTAEXEC_verify_last_hash_false_after_reject(void);
void test_OTAEXEC_validate_hash_accepts_64_hex(void);
void test_OTAEXEC_validate_hash_accepts_uppercase_hex(void);
void test_OTAEXEC_validate_hash_rejects_short(void);
void test_OTAEXEC_validate_hash_rejects_non_hex(void);

// ISSUE-105 (PR-H) — actuator_nvs
void test_ACTNVS_init_prepares_schema_and_defaults(void);
void test_ACTNVS_load_without_data_fails(void);
void test_ACTNVS_save_load_roundtrip(void);
void test_ACTNVS_init_idempotent_and_hold_roundtrip(void);
void test_ACTNVS_load_hold_window_defaults_when_missing(void);

// ISSUE-105 (PR-H) — ota_nvs
void test_OTANVS_get_fw_ver_empty_returns_default(void);
void test_OTANVS_init_sets_schema_and_firmware_version(void);
void test_OTANVS_set_get_fw_ver_roundtrip(void);
void test_OTANVS_ota_pass_roundtrip(void);
void test_OTANVS_clear_ota_pass(void);

// ISSUE-105 (PR-H) — EventBus
void test_EVT_init_subscribe_publish_loop_delivers(void);
void test_EVT_unsubscribe_stops_delivery(void);
void test_EVT_subscribe_rejects_bad_args(void);
void test_EVT_subscriber_slots_full(void);
void test_EVT_queue_overflow_drops(void);
void test_EVT_publish_from_isr_and_loop(void);

// ISSUE-105 (PR-H) — Logger
void test_LOGGER_init_add_sink_and_log(void);
void test_LOGGER_ring_wraps_around(void);
void test_LOGGER_spiffs_sink_roundtrip(void);
void test_LOGGER_spiffs_sink_unavailable(void);
void test_LOGGER_mqtt_sink_publishes_when_connected(void);
void test_LOGGER_mqtt_sink_skips_when_disconnected(void);

// ISSUE-105 (PR-H) — TelemetryBuffer
void test_TBUF_init_push_pop_fifo(void);
void test_TBUF_push_no_bus_pop_matches_values(void);
void test_TBUF_init_without_spiffs_buffers_ram(void);
void test_TBUF_spill_count_increases_when_ram_full(void);
void test_TBUF_spill_writes_spiffs_and_drain(void);
void test_TBUF_count_includes_spiffs_entries(void);
void test_TBUF_load_from_spiffs_detects_pending(void);
void test_TBUF_clear_resets_ram_counters(void);
void test_TBUF_clear_spiffs_removes_disk_buffer(void);

void setUp(void) {
  // Estado limpio de stubs entre tests (NVS, SPIFFS, millis, esp_timer).
  stubs::resetAll();
}

void tearDown(void) {}

int main(int argc, char **argv) {
  UNITY_BEGIN();

  // EDD-006 §8 — channel mapping
  RUN_TEST(test_CH_T08_gpio_unique_per_channel);
  RUN_TEST(test_CH_T09_gpio_bijective);

  // ISSUE-059 (FW-010) — política de credenciales MQTT (ADR-028)
  RUN_TEST(test_I59_provisioned_always_wins);
  RUN_TEST(test_I59_default_fallback_only_first_boot);
  RUN_TEST(test_I59_no_credentials_on_subsequent_boot);
  RUN_TEST(test_I59_fallback_reachable_exactly_once);

  // ISSUE-105 (PR-H) — HysteresisController
  RUN_TEST(test_HYS_init_sets_defaults_and_local_mode);
  RUN_TEST(test_HYS_mode_set_get);
  RUN_TEST(test_HYS_load_setpoints_nvs_without_save_returns_false);
  RUN_TEST(test_HYS_set_setpoints_persists_and_loads_from_nvs);
  RUN_TEST(test_HYS_load_setpoints_rejects_old_schema);
  RUN_TEST(test_HYS_evaluate_middle_range_no_outputs);
  RUN_TEST(test_HYS_evaluate_ventilation_on_high_temp);
  RUN_TEST(test_HYS_evaluate_ventilation_on_high_co2);
  RUN_TEST(test_HYS_evaluate_heat_on_low_temp);
  RUN_TEST(test_HYS_evaluate_humid_on_low_humidity);
  RUN_TEST(test_HYS_light_state_toggle);
  RUN_TEST(test_HYS_remote_mode_forces_actuators_off_keeps_light);
  RUN_TEST(test_HYS_overheat_active_forces_vent_off_heat);
  RUN_TEST(test_HYS_overheat_recovers_and_clears);
  RUN_TEST(test_HYS_post_vent_active_forces_humidifier);
  RUN_TEST(test_HYS_post_vent_timing_window);
  RUN_TEST(test_HYS_alarm_high_temp);
  RUN_TEST(test_HYS_alarm_low_temp);
  RUN_TEST(test_HYS_alarm_high_humidity);
  RUN_TEST(test_HYS_alarm_low_humidity);
  RUN_TEST(test_HYS_alarm_high_co2);

  // ISSUE-105 (PR-H) — OTASelector
  RUN_TEST(test_OSEL_validate_url_rejects_empty);
  RUN_TEST(test_OSEL_validate_url_rejects_http_scheme);
  RUN_TEST(test_OSEL_validate_url_rejects_missing_bin_extension);
  RUN_TEST(test_OSEL_validate_url_accepts_https_bin);
  RUN_TEST(test_OSEL_compare_semver_equal);
  RUN_TEST(test_OSEL_compare_semver_candidate_major_newer);
  RUN_TEST(test_OSEL_compare_semver_candidate_major_older);
  RUN_TEST(test_OSEL_compare_semver_minor_and_patch);
  RUN_TEST(test_OSEL_rssi_threshold);
  RUN_TEST(test_OSEL_select_valid_when_url_and_rssi_ok);
  RUN_TEST(test_OSEL_select_invalid_when_url_bad);
  RUN_TEST(test_OSEL_select_invalid_when_rssi_weak);

  // ISSUE-052 (FW-003) — OTASelector: hash SHA-256 obligatorio (ADR-014)
  RUN_TEST(test_OSEL_validate_hash_rejects_empty);
  RUN_TEST(test_OSEL_validate_hash_rejects_short);
  RUN_TEST(test_OSEL_validate_hash_rejects_non_hex);
  RUN_TEST(test_OSEL_validate_hash_accepts_64_hex);
  RUN_TEST(test_OSEL_validate_hash_accepts_uppercase_hex);
  RUN_TEST(test_OSEL_select_rejects_missing_hash);
  RUN_TEST(test_OSEL_select_rejects_invalid_hash_even_with_good_rssi);

  // ISSUE-052 (FW-003) — OTAExecutor: TLS via CA + hash obligatorio (ADR-014)
  RUN_TEST(test_OTAEXEC_ca_not_configured_by_default);
  RUN_TEST(test_OTAEXEC_set_ca_cert_configures_transport);
  RUN_TEST(test_OTAEXEC_set_ca_cert_empty_keeps_disabled);
  RUN_TEST(test_OTAEXEC_begin_rejects_when_ca_not_configured);
  RUN_TEST(test_OTAEXEC_begin_rejects_missing_hash);
  RUN_TEST(test_OTAEXEC_begin_rejects_invalid_hash);
  RUN_TEST(test_OTAEXEC_begin_rejects_http_url);
  RUN_TEST(test_OTAEXEC_begin_rejects_empty_url);
  RUN_TEST(test_OTAEXEC_verify_last_hash_false_after_reject);
  RUN_TEST(test_OTAEXEC_validate_hash_accepts_64_hex);
  RUN_TEST(test_OTAEXEC_validate_hash_accepts_uppercase_hex);
  RUN_TEST(test_OTAEXEC_validate_hash_rejects_short);
  RUN_TEST(test_OTAEXEC_validate_hash_rejects_non_hex);

  // ISSUE-105 (PR-H) — actuator_nvs
  RUN_TEST(test_ACTNVS_init_prepares_schema_and_defaults);
  RUN_TEST(test_ACTNVS_load_without_data_fails);
  RUN_TEST(test_ACTNVS_save_load_roundtrip);
  RUN_TEST(test_ACTNVS_init_idempotent_and_hold_roundtrip);
  RUN_TEST(test_ACTNVS_load_hold_window_defaults_when_missing);

  // ISSUE-105 (PR-H) — ota_nvs
  RUN_TEST(test_OTANVS_get_fw_ver_empty_returns_default);
  RUN_TEST(test_OTANVS_init_sets_schema_and_firmware_version);
  RUN_TEST(test_OTANVS_set_get_fw_ver_roundtrip);
  RUN_TEST(test_OTANVS_ota_pass_roundtrip);
  RUN_TEST(test_OTANVS_clear_ota_pass);

  // ISSUE-105 (PR-H) — EventBus
  RUN_TEST(test_EVT_init_subscribe_publish_loop_delivers);
  RUN_TEST(test_EVT_unsubscribe_stops_delivery);
  RUN_TEST(test_EVT_subscribe_rejects_bad_args);
  RUN_TEST(test_EVT_subscriber_slots_full);
  RUN_TEST(test_EVT_queue_overflow_drops);
  RUN_TEST(test_EVT_publish_from_isr_and_loop);

  // ISSUE-105 (PR-H) — Logger
  RUN_TEST(test_LOGGER_init_add_sink_and_log);
  RUN_TEST(test_LOGGER_ring_wraps_around);
  RUN_TEST(test_LOGGER_spiffs_sink_roundtrip);
  RUN_TEST(test_LOGGER_spiffs_sink_unavailable);
  RUN_TEST(test_LOGGER_mqtt_sink_publishes_when_connected);
  RUN_TEST(test_LOGGER_mqtt_sink_skips_when_disconnected);

  // ISSUE-105 (PR-H) — TelemetryBuffer
  RUN_TEST(test_TBUF_init_push_pop_fifo);
  RUN_TEST(test_TBUF_push_no_bus_pop_matches_values);
  RUN_TEST(test_TBUF_init_without_spiffs_buffers_ram);
  RUN_TEST(test_TBUF_spill_count_increases_when_ram_full);
  RUN_TEST(test_TBUF_spill_writes_spiffs_and_drain);
  RUN_TEST(test_TBUF_count_includes_spiffs_entries);
  RUN_TEST(test_TBUF_load_from_spiffs_detects_pending);
  RUN_TEST(test_TBUF_clear_resets_ram_counters);
  RUN_TEST(test_TBUF_clear_spiffs_removes_disk_buffer);

  return UNITY_END();
}
