# Descripción

**No eres un programador que documenta**, sino un **ingeniero que diseña sistemas**. Lo que implica que tu flujo de trabajo puede parecer más "pesado" que el de un desarrollador que simplemente escribe código, pero que a la larga:
-  reduce retrabajo y
- mejora la calidad de las decisiones.

El reto es evitar caer en la **parálisis por documentación**. La documentación debe acompañar al desarrollo, no reemplazarlo.

## La propuesta es trabajar en capas

No todos los cambios requieren el mismo proceso.

### Nivel 1: Cambios pequeños (80% de los casos)

Ejemplos:

- Corregir un bug.
- Añadir un sensor al dashboard.
- Cambiar un algoritmo menor.
- Mejorar una pantalla.

Flujo:

```text
Issue
 ↓
Programar
 ↓
Probar
 ↓
Actualizar Changelog
 ↓
Commit
```

No necesitas RFC ni EDD.

---

### Nivel 2: Funcionalidades nuevas

Ejemplos:

- Incorporar BLE.
- Agregar recetas.
- Añadir autenticación.
- Crear el módulo OTA.

Flujo:

```text
Roadmap
 ↓
RFC
 ↓
EDD
 ↓
Implementación
 ↓
ADR (si hubo decisiones arquitectónicas)
 ↓
Tests
 ↓
Merge
 ↓
Tag
 ↓
Release
```

Aquí sí tiene sentido invertir tiempo en diseño.

---

### Nivel 3: Cambios estructurales

Ejemplos:

- Migrar ESP8266 → ESP32-S3.
- Cambiar MQTT por WebSocket.
- Pasar de HTTP a gRPC.
- Reestructurar el repositorio.

Flujo:

```text
Investigación
 ↓
RFC
 ↓
Prototipo
 ↓
EDD
 ↓
Implementación gradual
 ↓
ADR
 ↓
Migración
 ↓
Release
```

Aquí el prototipo antes de la implementación suele ahorrar mucho tiempo.

---

# Tu ciclo diario podría ser así

### 1. Revisar el roadmap

No para modificarlo constantemente, sino para elegir un objetivo concreto.

Ejemplo:

> "Hoy implementaré la lectura del sensor ENS160."

Ese objetivo debe ser pequeño y alcanzable.

---

### 2. Leer el contexto

Cinco minutos bastan para recordar:

- restricciones,
- convenciones,
- decisiones previas,
- arquitectura.

Eso evita contradicciones.

---

### 3. Si la tarea es grande, escribir primero

No código.

Primero un pequeño RFC.

No más de una página.

Responder:

- ¿Qué quiero hacer?
- ¿Por qué?
- ¿Qué alternativas tengo?
- ¿Qué riesgos existen?

Muchas veces, escribir estas respuestas revela problemas antes de abrir el editor.

---

### 4. Diseñar

Solo si la funcionalidad lo amerita.

Un EDD sencillo con:

- diagrama,
- flujo,
- módulos afectados,
- pruebas previstas.

---

### 5. Programar

Ahora sí.

Con un objetivo claro.

---

### 6. Actualizar la documentación

Solo la que realmente cambió.

Por ejemplo:

- Changelog.
- ADR (si hubo una decisión importante).
- Project Context (si cambió el estado general).

No hace falta tocar todos los documentos.

---

### 7. Etiquetar

Cuando el incremento sea estable.

---

# Tu aprendizaje también puede estructurarse

Algo que creo que puedes aprovechar mucho es separar el aprendizaje del desarrollo.

Yo tendría una carpeta como:

```text
research/
```

o

```text
knowledge/
```

Con documentos como:

```text
BLE.md
FreeRTOS.md
MQTT.md
OTA.md
Charts.md
ESP32-S3.md
```

No son documentación del proyecto.

Son tus apuntes técnicos.

Cuando aprendas algo nuevo:

- lo sintetizas,
- lo guardas ahí,
- luego decides si impacta el proyecto.

Así evitas contaminar la documentación del proyecto con notas de estudio.

---

# Un aspecto que considero clave en tu caso

Has comentado varias veces que eres de los que **reúne mucha información, la sintetiza y luego actúa**. Esa es una fortaleza, pero tiene un riesgo: seguir investigando indefinidamente.

Una práctica que usan muchos equipos es el **timeboxing**.

Por ejemplo:

- Investigación: máximo 2 horas.
- RFC: 30 minutos.
- EDD: 1 hora.
- Implementación: el resto del día.

Si al terminar ese tiempo aún faltan respuestas, se documentan como riesgos o preguntas abiertas y se continúa. No hace falta resolver todas las incógnitas antes de escribir la primera línea de código.

---

## El flujo que imagino para ti

No lo veo como una secuencia lineal, sino como un ciclo de ingeniería.

```text
                  Idea
                   │
                   ▼
          Investigación
                   │
                   ▼
                 RFC
                   │
                   ▼
                 EDD
                   │
                   ▼
           Implementación
                   │
                   ▼
      Tests + Validación
                   │
                   ▼
                  ADR
                   │
                   ▼
      Tag + Changelog + Release
                   │
                   ▼
      Lecciones aprendidas
                   │
                   └──────────────┐
                                  ▼
                           Próxima iteración
```

Fíjate que **las lecciones aprendidas** cierran el ciclo. No son un simple registro histórico: alimentan la siguiente iteración. Ahí es donde tu `PROJECT_JOURNAL.md` puede convertirse en una herramienta muy valiosa. En lugar de ser solo una bitácora, puede responder preguntas como:

- ¿Qué supuse correctamente?
- ¿Qué salió distinto de lo esperado?
- ¿Qué decisión volvería a tomar?
- ¿Qué haría diferente la próxima vez?

Ese ejercicio, repetido durante meses, acelera la curva de aprendizaje mucho más que acumular documentación. Convierte la experiencia del proyecto en conocimiento reutilizable, y eso es precisamente lo que distingue a un ingeniero que mejora continuamente de uno que solo acumula horas de desarrollo.

## Resumen de comandos rápidos

| Objetivo [7]                                          | Comando                                                  |
| ----------------------------------------------------- | -------------------------------------------------------- |
| Borrar todo y copiar el servidor                      | git fetch origin seguido de git reset --hard origin/main |
| Deshacer cambios sin borrar commits                   | git restore .                                            |
| Traer datos nuevos                                    | git pull                                                 |
| Borrar el último commit definitivamente               | git reset --hard HEAD~1                                  |
| Deshacer el último commit pero conservar los archivos | git reset --soft HEAD~1                                  |
| Borrar el último commit de GitHub                     | git push origin main --force                           |
| Borrado estándar de rama local                        | git branch -d nombre_de_la_rama                          |
| Borrado estándar de rama remota                       | git push origin --delete nombre_de_la_rama               |
| Guardar cambios temporalmente                         | git stash                                                |
| Recuperar cambios temporales                          | git stash pop                                            |
| Sacar los archivos del área de preparación            | git restore --staged directorio/                         |
|                                                       |                                                          |
