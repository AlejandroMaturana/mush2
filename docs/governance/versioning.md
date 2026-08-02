# Versionado — Mush2

Todos los componentes usan **Versionado Semántico** (`MAJOR.MINOR.PATCH`).

## Reglas SemVer

| Componente | MAJOR | MINOR | PATCH |
|---|---|---|---|
| **Firmware** | Cambio incompatible en protocolo o hardware | Nueva funcionalidad (sensor, actuador) | Bugfix, optimización |
| **Backend** | Breaking change en API REST | Nuevo endpoint, nuevo modelo DB | Bugfix, parche seguridad |
| **Frontend** | Rediseño completo, breaking UI | Nueva página, nuevo componente | Bugfix, ajuste CSS |
| **Protocol** | Cambio incompatible en tópicos/payloads | Nuevo tópico, nuevo campo opcional | Corrección de especificación |

## Fuente de verdad

La **única fuente de verdad** es el campo `version` de los `package.json`:

```
package.json (raíz)          → versión del sistema
backend/package.json         → backend
frontend/package.json        → frontend
firmware/package.json        → firmware
docs/package.json            → docs
```

No se editan versiones a mano en ningún otro lugar.

## Archivos derivados (generados, no editados a mano)

`node scripts/aggregate-changelog.cjs` (script `aggregate` / `version-packages`) sincroniza
automáticamente los derivados a partir de los `package.json`:

| Derivado | Generado por |
|---|---|
| `VERSION`, `backend/VERSION`, `frontend/VERSION`, `firmware/VERSION`, `docs/VERSION` | `syncVersionFile()` |
| `firmware/platformio.ini` → `-DFIRMWARE_VERSION` | `syncPlatformIO()` |
| `frontend/public/version-manifest.json` | `generateVersionManifest()` |
| `scripts/release.bat` | `generateReleaseScript()` |

`frontend/public/version-manifest.json` es el **único** manifest versionado: lo consume el
frontend en runtime (`useVersionManifest.js`). No existe copia en `.changeset/`.

## Flujo definitivo de release

```
1. Cambios en un componente → su CHANGELOG.md
2. pnpm version-packages
   ├─ changeset version       → bumpear versions en package.json
   └─ node scripts/aggregate-changelog.cjs
       ├─ sincroniza VERSION files desde package.json
       ├─ bumpea versión raíz (patch)
       ├─ regenera frontend/public/version-manifest.json
       ├─ regenera scripts/release.bat
       └─ agrega sección al CHANGELOG.md raíz y limpia CHANGELOGs por componente
3. Ejecutar scripts/release.bat → commit de release
4. Tag vX.Y.Z
```

## Matriz de Compatibilidad

| Firmware | Backend | Protocol | Estado |
|---|---|---|---|
| 0.1.x | 0.1.x | 1.0.x | Desarrollo |
| 1.0.x | 1.0.x | 1.0.x | Producción (futuro) |

El campo `protocol` en cada mensaje MQTT permite al backend validar compatibilidad en tiempo real.

## Changelog

Cada componente mantiene su propio `CHANGELOG.md`:

```
firmware/CHANGELOG.md
backend/CHANGELOG.md
frontend/CHANGELOG.md
CHANGELOG.md (raíz — cambios del proyecto completo)
```

Formato: [Keep a Changelog](https://keepachangelog.com/) v1.1.0.

Los `CHANGELOG.md` por componente se agregan al raíz y se limpian durante `aggregate-changelog.cjs`.
