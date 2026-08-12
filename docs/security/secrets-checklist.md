# Checklist de Secretos Locales — Mush2

> Evidencia de avance de **ISSUE-084 (INF-025)** en el Ciclo 1 (PR-M). El *scanning automático* de secretos queda diferido a **ISSUE-076 (F1, CI gates)**; este checklist documenta la verificación manual del árbol y la migración de credenciales de firmware a NVS (ISSUE-059).

## 1. Alcance

Verifica que el working tree no contiene secretos reales commiteados ni credenciales en claro persistentes en código compilado.

## 2. Estado (verificado en PR-M, 2026-08-11)

| Ítem | Estado | Evidencia |
|---|---|---|
| `**/config.h` ignorado por git | ✅ | `.gitignore` incluye `**/config.h` y `**/secrets.h`; `git check-ignore firmware/src/config.h` lo confirma; `git ls-files` no lista ningún `config.h` |
| `.env*` ignorado por git | ✅ | `.gitignore` incluye `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.test` |
| `password_file` de Mosquitto ignorado | ✅ | `.gitignore` incluye `docker/mosquitto/*/password_file` |
| Claves TLS del broker ignoradas | ✅ | `.gitignore` incluye `docker/mosquitto/certs/*.key` y `*.crt` |
| `config.example.h` con placeholders (sin secretos reales) | ✅ | `MQTT_USER=""`, `MQTT_PASS=""`, `TS_API_KEY="your_ts_api_key"`, `OTA_PASSWORD="CHANGE_ME_OTA_PASSWORD"` |
| Credenciales MQTT de firmware migradas a NVS (fuera de RAM) | ✅ | ISSUE-059/PR-M: `http_poller.h` sin `_mqttUser`/`_mqttPass`; credenciales persistidas en NVS (`device_manager`, namespace `mush2`) tras el primer registro |
| Fallback a defaults solo primer arranque | ✅ | ISSUE-059/PR-M: `mqtt_credential_policy.h` + `MQTTClient::init(allowDefaultFallback)` |
| Scanning automático en CI | ⏳ **Pendiente (I076, F1)** | No inventado en este ciclo; se documenta la carencia |

## 3. Verificación manual (comando)

```bash
# Secretos reales no deben aparecer en el árbol versionado:
git ls-files | grep -Ei 'config\.h$|secrets\.h$|\.env'   # → sin resultados
git check-ignore firmware/src/config.h                    # → firmware/src/config.h
```

## 4. Hallazgo de fase (evidencia del cierre diferido)

- **ISSUE-084 → `IN_PROGRESS`** con la migración NVS (I59) + checklist + `.gitignore` completos.
- **Cierre (scanning) diferido a ISSUE-076 (F1, EPIC-CI-GATES)** — ver `phase-10-cycle-1-plan.md` §6.

## 5. Regla de uso

- Nunca commitees `config.h` con credenciales reales: los valores locales van en `firmware/src/config.h` (ignorado) y los defaults/documentados en `config.example.h`.
- Las credenciales MQTT del dispositivo se obtienen por registro (ADR-028) y viven en NVS, no en el código.
