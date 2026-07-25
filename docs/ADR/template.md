# ADR-NNN: [Título de la decisión]

**Estado:** Propuesto | Aceptado | Reemplazado | Obsoleto | Rechazado

**Fecha:** YYYY-MM-DD

**Autores:** ...

**Decisores:** ...

---

# Resumen

Una descripción de tres o cuatro líneas que permita entender la decisión sin leer el resto del documento.

---

# Contexto

Describe el problema que obliga a tomar una decisión.

Debe responder preguntas como:

- ¿Qué ocurre actualmente?
- ¿Qué limitaciones existen?
- ¿Qué requisitos deben cumplirse?
- ¿Qué riesgos existen si no se hace nada?

No debe contener todavía la solución.

---

# Decisión

Describe exactamente qué se decidió.

Debe escribirse en presente.

Ejemplo:

> El firmware implementará un gestor centralizado de Fail-Safe independiente del controlador climático.

Si existen varias decisiones relacionadas, dividirlas.

## 1. ...

## 2. ...

## 3. ...

---

# Justificación

Explica por qué esta solución fue elegida.

Debe responder:

- ¿Qué ventajas aporta?
- ¿Qué problemas resuelve?
- ¿Qué trade-offs acepta?

Aquí vive el razonamiento arquitectónico.

---

# Alternativas consideradas

## Alternativa A

Descripción.

### Ventajas

-

### Desventajas

-

### Motivo del descarte

...

---

## Alternativa B

...

---

# Consecuencias

## Positivas

-

-

## Negativas

-

-

## Riesgos

-

-

---

# Impacto en la arquitectura

Indica qué partes del sistema quedan afectadas.

| Componente | Impacto |
|------------|---------|
| Firmware | ... |
| Backend | ... |
| Frontend | ... |
| API | ... |
| Hardware | ... |

---

# Reglas derivadas

Las reglas que el resto del proyecto deberá respetar.

Ejemplo

| ID | Regla |
|----|--------|
| ADR-024-01 | Ningún controlador puede ignorar un Fail-Safe activo. |
| ADR-024-02 | Toda decisión sobre actuadores deberá consultar el estado global de seguridad. |

---

# Implementación (Opcional)

Esta sección únicamente aparece cuando la decisión requiere aclaraciones técnicas.

No debe describir código.

Puede incluir:

- nuevos módulos
- nuevas interfaces
- contratos
- eventos
- protocolos

Nunca rutas de archivos.

---

# Validación

¿Cómo sabemos que la decisión está correctamente implementada?

Ejemplo:

- Simular pérdida del sensor.
- Simular temperatura crítica.
- Verificar prioridad sobre modo manual.
- Verificar recuperación.

---

# ADR relacionados

- ADR-009
- ADR-012
- ADR-031

---

# Referencias

Normas, documentación, papers, datasheets, RFC, etc.

---

# Historial

| Versión | Fecha | Cambio |
|----------|---------|--------|
|1.0|...|Creación|