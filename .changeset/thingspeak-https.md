---
"firmware": patch
---

feat(thingspeak): transporte HTTPS con CA root embebida (ISSUE-051 / FW-002)

- `thingspeak_client.cpp`: `WiFiClientSecure` con `TS_CA_ROOT` (DigiCert Global Root G2 + intermedio embebidos en `thingspeak_ca_root.h`), `https=true` sobre `TS_PORT` 443.
- La API key ya no viaja en el query string: se envía en el header `X-ApiKey` (DECISION-007).
- `config.example.h`: `TS_PORT` por defecto 443 (con guard `#ifndef` para compatibilidad con `config.h` local y placeholder de CI).
- Docs actualizadas: ADR-004 (transporte HTTPS, no supersede), ADR-013 (mitigación implementada), firmware.md, architecture.md, deployment.md, engineering-backlog (ISSUE-051 IN_PROGRESS, avance parcial PR-D).
