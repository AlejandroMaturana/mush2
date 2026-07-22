# Task Templates — Mush2

> Plantillas pre-aprobadas para tareas comunes. Sigue el template sin preguntar — ya están validados.

---

## Template 1: Agregar Endpoint Nuevo (Backend)

**Nivel**: 1 | **Zona**: Amarilla (nuevo endpoint) | **Tiempo estimado**: 30-60 min

### Pasos

1. **Definir el endpoint** en `docs/contracts/api-contract.md` ANTES de implementar
2. **Crear route** en `backend/src/routes/<nombre>.js` siguiendo patrón existente:
   ```javascript
   import { Router } from 'express';
   import { authenticate, optionalAuth } from '../middlewares/auth.js';
   import { checkApiRateLimit } from '../middlewares/subscriptionRateLimit.js';
   import { tenantScope } from '../middlewares/tenant.js';
   
   const router = Router();
   
   // GET - list
   router.get('/', optionalAuth, checkApiRateLimit, tenantScope, async (req, res) => {
     // implementación
   });
   
   export default router;
   ```
3. **Registrar en** `backend/src/routes/index.js`:
   ```javascript
   import nombreRouter from './nombre.js';
   // ...
   router.use('/nombre', nombreRouter);
   ```
4. **Crear tests** en `backend/src/__tests__/<nombre>.test.js`:
   - Test respuesta exitosa (200)
   - Test error de validación (400)
   - Test no autorizado (401) si aplica
   - Test no encontrado (404)
5. **Actualizar CHANGELOG.md**

### Checklist
- [ ] Endpoint documentado en `api-contract.md`
- [ ] Route con middlewares correctos (auth, rateLimit, tenant)
- [ ] Tests escritos y pasando
- [ ] CHANGELOG actualizado
- [ ] No rompe endpoints existentes

---

## Template 2: Agregar Modelo Nuevo (Backend)

**Nivel**: 2 | **Zona**: Amarilla | **Tiempo estimado**: 1-2 horas

### Pasos

1. **Crear modelo** en `backend/src/models/<Nombre>.js`:
   ```javascript
   import { DataTypes } from 'sequelize';
   import { sequelize } from '../config/database.js';
   
   const Nombre = sequelize.define('Nombre', {
     id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
     // campos
   }, { tableName: 'nombres', timestamps: true });
   
   export default Nombre;
   ```
2. **Registrar associations** en `backend/src/models/index.js`
3. **Crear route** siguiendo Template 1
4. **Ejecutar sync**: `pnpm run db:sync`
5. **Crear seed data** si es necesario en `backend/src/seed.js`
6. **Tests** para CRUD completo
7. **Actualizar**: `api-contract.md`, `CHANGELOG.md`, `PROJECT_JOURNAL.md`

### Checklist
- [ ] Modelo definido con tipos correctos
- [ ] Associations en `index.js`
- [ ] Route con middlewares correctos
- [ ] DB sync ejecutado sin errores
- [ ] Tests de CRUD
- [ ] Documentación actualizada

---

## Template 3: Agregar Página React (Frontend)

**Nivel**: 1 | **Zona**: Verde | **Tiempo estimado**: 30-60 min

### Pasos

1. **Crear página** en `frontend/src/pages/<Nombre>.jsx`:
   ```jsx
   import { useState, useEffect } from 'react';
   import { getNombres } from '../api/client';
   
   export function Nombre() {
     const [data, setData] = useState([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState(null);
   
     useEffect(() => {
       getNombres()
         .then(setData)
         .catch(err => setError(err.message))
         .finally(() => setLoading(false));
     }, []);
   
     if (loading) return <div>Cargando...</div>;
     if (error) return <div>Error: {error}</div>;
     
     return (
       <div className="page">
         <h1>Nombre</h1>
         {/* contenido */}
       </div>
     );
   }
   ```
2. **Agregar ruta** en `App.jsx`:
   ```jsx
   <Route path="/nombre" element={<Nombre />} />
   ```
3. **Agregar link** en `Sidebar.jsx` o `BottomNav.jsx` si aplica
4. **Verificar build**: `npx vite build`
5. **Actualizar CHANGELOG.md**

### Checklist
- [ ] Página sigue estructura existente (useState/useEffect pattern)
- [ ] Usa funciones de `client.js` para API calls
- [ ] Maneja loading, error, y empty states
- [ ] Ruta registrada en `App.jsx`
- [ ] Build exitoso
- [ ] CHANGELOG actualizado

---

## Template 4: Agregar Componente UI (Frontend)

**Nivel**: 1 | **Zona**: Verde | **Tiempo estimado**: 15-30 min

### Pasos

1. **Crear componente** en `frontend/src/components/ui/<Nombre>.jsx`
2. **Seguir patrón**: props desestructuradas, PropTypes, export nombrado
3. **Usar design tokens** de `docs/design/design-tokens.md` para colores/espaciado
4. **Verificar build**: `npx vite build`

### Checklist
- [ ] Componente es reutilizable (no depende de estado global)
- [ ] Props documentadas con PropTypes
- [ ] Sigue design tokens
- [ ] Build exitoso

---

## Template 5: Fix Bug (Cualquier Componente)

**Nivel**: 1 | **Zona**: Verde | **Tiempo estimado**: 15-60 min

### Pasos

1. **Buscar en DEBUG-RUNBOOK.md** si el error ya es conocido
2. **Reproducir el bug** — entender la causa raíz
3. **Corregir** en el archivo más pequeño posible
4. **Crear test** que reproduzca el bug (regression test)
5. **Verificar** que no rompa nada más
6. **Actualizar CHANGELOG.md**

### Checklist
- [ ] Bug reproducido antes de fix
- [ ] Fix es mínimo (cambia lo menos posible)
- [ ] Test de regresión creado
- [ ] Todos los tests existentes siguen pasando
- [ ] CHANGELOG actualizado

---

## Template 6: Agregar Sensor al Firmware

**Nivel**: 2 | **Zona**: Amarilla | **Tiempo estimado**: 2-4 horas

### Pasos

1. **Crear driver** siguiendo patrón `ISensor`:
   - `firmware/src/drivers/<sensor>/<sensor>_driver.h`
   - `firmware/src/drivers/<sensor>/<sensor>_driver.cpp`
   - Implementar: `init()`, `read()`, `getName()`, `isPresent()`, `getI2CAddress()`
2. **Registrar** en `sensor_registry.cpp`:
   ```cpp
   #include "drivers/<sensor>/<sensor>_driver.h"
   // En autoDetect():
   if (sensorRegistry.add(new <SensorDriver>(wire))) {
     Serial.println("[SENSOR] <Sensor> detectado");
   }
   ```
3. **Agregar publicación** en `mqtt_client.cpp` o `http_poller.cpp` (depende del protocolo)
4. **Actualizar** `backend/src/models/Sensor.js` si es un nuevo tipo
5. **Actualizar** `docs/contracts/api-contract.md` o `mqtt-contract.md`
6. **Crear test hardware** en `firmware/test/`
7. **Actualizar CHANGELOG.md**

### Checklist
- [ ] Driver implementa ISensor correctamente
- [ ] Auto-detección funciona
- [ ] Telemetría se publica correctamente
- [ ] Backend recibe y almacena los datos
- [ ] Test hardware creado
- [ ] Contratos actualizados
- [ ] CHANGELOG actualizado

---

## Template 7: Crear Migration Script (Backend)

**Nivel**: 2 | **Zona**: Amarilla | **Tiempo estimado**: 30-60 min

### Pasos

1. **Crear script** en `backend/src/scripts/migrate-<nombre>.js`:
   ```javascript
   import { sequelize } from '../config/database.js';
   import { Modelo } from '../models/index.js';
   
   async function migrate() {
     const t = await sequelize.transaction();
     try {
       // lógica de migración
       await t.commit();
       console.log('[MIGRATE] Completado');
     } catch (err) {
       await t.rollback();
       console.error('[MIGRATE] Error:', err);
     }
   }
   
   migrate();
   ```
2. **Probar en local** antes de producción
3. **Documentar** en `PROJECT_JOURNAL.md`

### Checklist
- [ ] Script es idempotente (puede ejecutarse múltiples veces sin daño)
- [ ] Usa transactions para rollback en error
- [ ] Probado en local con datos de prueba
- [ ] Documentado en PROJECT_JOURNAL

---

## Template 8: Agregar Capability (Capability Catalog)

**Nivel**: 3 | **Zona**: Roja (requiere ADR) | **Tiempo estimado**: 1-2 días

### Pasos

1. **Crear ADR** en `docs/ADR/ADR-XXX-<nombre>.md`
2. **Actualizar** `docs/architecture/capability-catalog.md` con la nueva entrada
3. **Implementar enforcement** en el middleware/route apropiado
4. **Actualizar** `docs/architecture/authorization-model.md` si aplica
5. **Crear tests** que validen los límites por plan
6. **Actualizar** todos los contratos afectados
7. **Actualizar CHANGELOG + PROJECT_JOURNAL**

### Checklist
- [ ] ADR creado y aprobado
- [ ] Capability catalog actualizado
- [ ] Enforcement implementado
- [ ] Tests de límites por plan
- [ ] Contratos actualizados
- [ ] Documentación completa

---

## Template 9: Firmware OTA Update

**Nivel**: 2 | **Zona**: Amarilla | **Tiempo estimado**: 1-2 horas

### Pasos

1. **Incrementar versión** en `firmware/VERSION` y `firmware/platformio.ini`
2. **Compilar** ambas configuraciones:
   ```bash
   pio run -e esp32-s3-devkitc-1       # USB
   pio run -e esp32-s3-devkitc-1-ota    # OTA
   ```
3. **Verificar** RAM/Flash dentro de límites (<80%)
4. **Subir binario** al servidor de OTA
5. **Verificar** que `ota_decisor.cpp` acepte la nueva versión
6. **Testing**: verificar que el rollback funciona (simular fallo)

### Checklist
- [ ] Versión incrementada (semver)
- [ ] Ambas configs compilan
- [ ] RAM/Flash dentro de límites
- [ ] Binario subido al servidor
- [ ] Rollback verificado
- [ ] CHANGELOG actualizado

---

## Template 10: Actualizar Dependencias (Cualquier Componente)

**Nivel**: 1 | **Zona**: Verde | **Tiempo estimado**: 15-30 min

### Pasos

1. **Verificar** que no haya vulnerabilidades: `pnpm audit`
2. **Actualizar** en `package.json` o `platformio.ini`
3. **Ejecutar** `pnpm install`
4. **Verificar** que todo compila y tests pasan
5. **Verificar** que no hay breaking changes en changelogs de la dependencia

### Checklist
- [ ] Dependencia actualizada
- [ ] Instalación exitosa
- [ ] Build exitoso
- [ ] Tests pasan
- [ ] No hay breaking changes
- [ ] CHANGELOG actualizado
