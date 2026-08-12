# Checklist de Secretos Locales — Mush2

> Evidencia de cierre de **ISSUE-084 (INF-025)** en el Ciclo 2 (PR-E): el *scanning automático* de secretos quedó activo en CI (gitleaks + `pnpm audit` + osv-scanner, ISSUE-076). Este checklist documenta la verificación manual del árbol y la migración de credenciales de firmware a NVS (ISSUE-059).

## 1. Alcance

Verifica que el working tree no contiene secretos reales commiteados ni credenciales en claro persistentes en código compilado.

## 2. Estado (verificado en PR-M, 2026-08-11; scanning activo en PR-E, 2026-08-12)

| Ítem | Estado | Evidencia |
|---|---|---|
| `**/config.h` ignorado por git | ✅ | `.gitignore` incluye `**/config.h` y `**/secrets.h`; `git check-ignore firmware/src/config.h` lo confirma; `git ls-files` no lista ningún `config.h` |
| `.env*` ignorado por git | ✅ | `.gitignore` incluye `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.test` |
| `password_file` de Mosquitto ignorado | ✅ | `.gitignore` incluye `docker/mosquitto/*/password_file` |
| Claves TLS del broker ignoradas | ✅ | `.gitignore` incluye `docker/mosquitto/certs/*.key` y `*.crt` |
| `config.example.h` con placeholders (sin secretos reales) | ✅ | `MQTT_USER=""`, `MQTT_PASS=""`, `TS_API_KEY="your_ts_api_key"`, `OTA_PASSWORD="CHANGE_ME_OTA_PASSWORD"` |
| Credenciales MQTT de firmware migradas a NVS (fuera de RAM) | ✅ | ISSUE-059/PR-M: `http_poller.h` sin `_mqttUser`/`_mqttPass`; credenciales persistidas en NVS (`device_manager`, namespace `mush2`) tras el primer registro |
| Fallback a defaults solo primer arranque | ✅ | ISSUE-059/PR-M: `mqtt_credential_policy.h` + `MQTTClient::init(allowDefaultFallback)` |
| Scanning automático en CI | ✅ | ISSUE-076/PR-E: job `security` en `ci.yml` — **gitleaks** en cada PR (gate duro de secretos, falla), `pnpm audit --audit-level=critical` (backend+frontend) y **osv-scanner** (reporte SARIF) |
| Umbral de severidad de `pnpm audit` | ✅ | Política de severidad: falla solo en severidad `critical` (vulns `high`/`moderate` sin fix se gestionan vía Dependabot y osv-scanner) |

## 3. Verificación manual (comando)

```bash
# Secretos reales no deben aparecer en el árbol versionado:
git ls-files | grep -Ei 'config\.h$|secrets\.h$|\.env'   # → sin resultados
git check-ignore firmware/src/config.h                    # → firmware/src/config.h
```

## 4. Hallazgo de fase (cierre en Ciclo 2)

- **ISSUE-084 → `DONE` (PR-E, Ciclo 2)**: migración NVS (I59) + checklist + `.gitignore` (Ciclo 1) + **scanning automático activo** (I076, job `security` de `ci.yml`).
- Evidencia: REG-019 (`backend/src/__tests__/regression/REG-019_ci-gates-scanning.test.ts`) valida los gates presentes y el fix `HW_REVISION`.

## 5. Regla de uso

- Nunca commitees `config.h` con credenciales reales: los valores locales van en `firmware/src/config.h` (ignorado) y los defaults/documentados en `config.example.h`.
- Las credenciales MQTT del dispositivo se obtienen por registro (ADR-028) y viven en NVS, no en el código.
