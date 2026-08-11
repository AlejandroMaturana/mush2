"mush2-backend": patch
---

feat(security): MQTT TLS obligatorio + identidad por dispositivo (ISSUE-015/024)

- Fail-fast TLS (ISSUE-015): `ConfigurationService.validate()` aborta en `NODE_ENV=production` si `MQTT_BROKER_URL` no es `mqtts://`/`tls://`/`ssl://` (ADR-028). Default de `env.js` en prod = `mqtts://localhost:8883`; nuevo `MQTT_REJECT_UNAUTHORIZED` (default `true`, solo `false` para certs self-signed en staging).
- `docker-compose.yml`: el bridge del backend usa `mqtts://mosquitto:8883` (listener TLS 8883, I074/I075).
- Hash `$7$` nativo (ISSUE-024): `mosquittoProvisioningService` reimplementa PBKDF2-SHA512 (mosquitto_passwd v2) en Node nativo (`mosquittoPasswordHash`/`verifyMosquittoHash`, `timingSafeEqual`) — sin subproceso `mosquitto_passwd`, sin password en argv ni plaintext en disco. Provision/revoke con read-modify-write serializado del `password_file`; recarga SIGHUP con debounce 500 ms intacta.
- Tests: `REG-014_mqtt-tls-identity.test.ts` (13) + `REG-015_mqtt-provisioning-argv.test.ts` (10, golden vector real `$7$`).
