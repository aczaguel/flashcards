# Study App — Revisión Técnica del SPEC v1.1

**Documento revisado:** Study App — Especificación Técnica Completa  
**Versión revisada:** 1.1  
**Objetivo:** Identificar ajustes necesarios antes de iniciar implementación.

---

## 1. Resumen ejecutivo

La arquitectura general del sistema está bien planteada y es consistente con el objetivo principal de la aplicación:

- El código no conoce certificaciones específicas.
- Todo el contenido académico se define mediante archivos JSON.
- El progreso del usuario se almacena localmente en IndexedDB.
- La aplicación puede funcionar como PWA.
- El contenido y el estado del usuario permanecen separados.
- La arquitectura permite una futura migración hacia backend, sincronización cloud o multiusuario.

Sin embargo, antes de marcar el documento como definitivamente listo para implementación, conviene realizar algunos ajustes relacionados principalmente con:

- Repetición espaciada.
- Semántica de `streak`.
- Historial de revisiones.
- Versionado de contenido.
- Índices de IndexedDB.
- Estado de sesión.
- Estrategia offline.
- Estados derivados.
- Importación/exportación.
- Validación de schemas.
- Construcción de sesiones de estudio.

La recomendación es crear una **versión 1.2 del SPEC** incorporando estos cambios antes de iniciar el desarrollo.

---

# 2. Arquitectura general

## Estado

**Mantener sin cambios estructurales.**

La separación propuesta es correcta:

```text
JSON Content
     ↓
Content Service
     ↓
Study / Progress / Exam Engines
     ↓
UI
```

También es adecuada la separación de almacenamiento:

```text
Contenido académico     → JSON read-only
Progreso del usuario    → IndexedDB
Estados calculados      → memoria
Preferencias visuales   → localStorage
```

Esta arquitectura permitirá posteriormente migrar:

```text
IndexedDB
   ↓
Storage Service
   ↓
API / DynamoDB / MongoDB / RDS
```

sin modificar el Study Engine ni la UI.

---

# 3. Corregir la semántica de `streak`

Actualmente `streak` se define como:

```text
Respuestas satisfactorias consecutivas.
```

Pero el comportamiento establecido es:

```text
UNKNOWN → streak = 0
HARD    → streak no cambia
GOOD    → streak + 1
EASY    → streak + 1
```

Esto genera una inconsistencia.

Ejemplo:

```text
EASY
EASY
HARD
EASY
```

El resultado actual sería:

```text
streak = 3
```

aunque no hubo tres respuestas satisfactorias consecutivas.

## Recomendación

Modificar el comportamiento.

Opción recomendada:

```text
UNKNOWN → 0

HARD →
  max(0, streak - 1)

GOOD →
  streak + 1

EASY →
  streak + 1
```

Esto mantiene cierta tolerancia para `HARD` sin considerarlo equivalente a una respuesta correcta.

Alternativamente podría utilizarse una política más estricta:

```text
UNKNOWN → 0
HARD    → 0
GOOD    → streak + 1
EASY    → streak + 1
```

La primera opción es preferible para el MVP.

---

# 4. Revisar el algoritmo de repetición espaciada

Actualmente el intervalo depende principalmente de `reviewCount`.

Ejemplo:

```text
UNKNOWN → 1 día
HARD    → 3 días
GOOD    → max(3, reviewCount × 3)
EASY    → max(7, reviewCount × 7)
```

con un máximo de 60 días.

## Problema

`reviewCount` representa cuántas veces se ha visto una tarjeta, pero no necesariamente cuánto se domina.

Ejemplo:

```text
Una tarjeta ha sido vista 20 veces.

La mayoría de las respuestas fueron:
UNKNOWN
HARD
UNKNOWN
HARD
...
```

Si finalmente el usuario responde:

```text
EASY
```

el cálculo actual puede producir:

```text
20 × 7 = 140 días
→ máximo 60 días
```

Una tarjeta difícil podría desaparecer durante 60 días después de una sola respuesta EASY.

Esto no representa correctamente el aprendizaje.

---

# 5. Nuevo algoritmo recomendado

El intervalo debería depender principalmente del rendimiento reciente.

Una implementación sencilla para el MVP podría utilizar el intervalo anterior.

```text
UNKNOWN
→ 1 día

HARD
→ 2 días

GOOD
→ max(3, previousInterval × 2)

EASY
→ max(7, previousInterval × 2.5)
```

Con:

```text
MAX_INTERVAL = 60 días
```

Otra alternativa todavía más sencilla sería utilizar `streak`.

```text
UNKNOWN
→ 1 día

HARD
→ 2 días

GOOD
→ min(3 × 2^(streak-1), 60)

EASY
→ min(7 × 2^(streak-1), 60)
```

Ejemplo:

```text
GOOD

3
6
12
24
48
60
```

```text
EASY

7
14
28
56
60
```

Esto es más coherente con un sistema real de repetición espaciada.

---

# 6. Agregar reaprendizaje durante la misma sesión

Actualmente una tarjeta evaluada como:

```text
UNKNOWN
```

se programa para el día siguiente.

Sin embargo, para memorización es útil volver a mostrarla durante la misma sesión.

Ejemplo:

```text
Sesión:

1
2
3
4
5
6
7
8
9
10
```

Si el usuario falla la tarjeta:

```text
3
```

la sesión podría convertirse en:

```text
1
2
3
4
5
6
7
8
9
10
3
```

## Recomendación

Agregar al `Study Engine` una cola temporal:

```text
learningQueue
```

Comportamiento:

```text
UNKNOWN
→ nextReview = mañana
→ insertar tarjeta nuevamente al final de la sesión
```

Esta cola no necesariamente necesita persistirse en IndexedDB.

---

# 7. Agregar historial de revisiones

Actualmente `FlashcardProgress` conserva solamente el estado actual.

Ejemplo:

```text
confidence
reviewCount
streak
lastReviewed
nextReview
```

Esto no permite reconstruir completamente el historial de aprendizaje.

Además, dificulta una migración futura hacia algoritmos como:

```text
SM-2
FSRS
```

## Nuevo object store

Agregar:

```text
flashcardReviews
```

Ejemplo:

```json
{
  "id": 123,
  "certificationId": "terraform-associate",
  "moduleId": "providers",
  "flashcardId": "providers-017",
  "reviewedAt": "2026-10-02T15:21:00Z",
  "rating": "GOOD",
  "previousStreak": 2,
  "newStreak": 3,
  "previousIntervalDays": 6,
  "newIntervalDays": 12
}
```

Esto permite separar:

```text
flashcardProgress
→ estado actual

flashcardReviews
→ historial completo
```

Con esta información, una migración futura hacia SM-2 o FSRS será mucho más sencilla.

---

# 8. Agregar `previousIntervalDays`

`FlashcardProgress` debería guardar el intervalo actual.

Ejemplo:

```typescript
interface FlashcardProgress {

  id: string;

  certificationId: string;

  moduleId: string;

  flashcardId: string;

  confidence:
    | "UNKNOWN"
    | "HARD"
    | "GOOD"
    | "EASY";

  reviewCount: number;

  streak: number;

  intervalDays: number;

  lastReviewed: string | null;

  nextReview: string | null;

  status:
    | "active"
    | "suspended";

  createdAt: string;

  updatedAt: string;

}
```

Esto facilita enormemente calcular el próximo intervalo.

---

# 9. Corregir índices de IndexedDB

Actualmente existe:

```text
by-module → moduleId
```

Esto puede producir resultados ambiguos.

Ejemplo:

```text
aws-saa / iam

aws-security / iam

aws-developer / iam
```

En los tres casos:

```text
moduleId = "iam"
```

Una búsqueda únicamente por `moduleId` podría mezclar información de distintas certificaciones.

## Recomendación

Crear índice compuesto:

```javascript
["certificationId", "moduleId"]
```

Nombre sugerido:

```text
by-certification-module
```

Esto debería aplicarse al menos en:

```text
flashcardProgress
quizAttempts
```

---

# 10. Agregar versionado de contenido

Actualmente existe:

```json
"schemaVersion": "1.0"
```

Esto indica qué estructura tiene el JSON.

Sin embargo, no indica qué versión del contenido académico contiene.

Los conceptos deben separarse.

```text
schemaVersion
→ versión de la estructura técnica

contentVersion
→ versión del contenido académico
```

## Ejemplo

```json
{
  "schemaVersion": "1.0",
  "contentVersion": "1.2.0",
  "certificationId": "terraform-associate"
}
```

Además, opcionalmente un módulo podría incluir:

```json
"revision": 3
```

Esto permitirá detectar cuando una tarjeta cambió entre versiones.

---

# 11. Problema de IDs y actualización de contenido

Ejemplo:

Versión inicial:

```text
providers-001
```

Pregunta:

```text
¿Qué es un provider?
```

El usuario la domina:

```text
confidence = EASY
streak = 7
```

Posteriormente una IA genera una nueva versión y accidentalmente reutiliza:

```text
providers-001
```

para otra pregunta.

IndexedDB seguirá considerando esa tarjeta dominada.

## Recomendación

Utilizar:

```text
contentVersion
```

y definir una política para cambios de contenido.

Por ejemplo:

```text
PATCH
→ cambios menores sin reset de progreso

MINOR
→ nuevas tarjetas

MAJOR
→ contenido incompatible
```

---

# 12. Agregar estado de sesión

La visión del sistema establece que el usuario puede cerrar la app y continuar donde estaba.

Actualmente se persiste el progreso, pero no necesariamente el punto exacto de navegación.

Agregar un object store:

```text
studyState
```

Ejemplo:

```json
{
  "key": "lastActivity",
  "value": {
    "type": "flashcards",
    "certificationId": "terraform-associate",
    "moduleId": "providers",
    "route": "#/certification/terraform-associate/module/providers/flashcards",
    "updatedAt": "2026-10-02T15:30:00Z"
  }
}
```

El dashboard podría utilizar este objeto para:

```text
Continuar estudiando
```

---

# 13. Nueva estructura recomendada de IndexedDB

```text
study-app-db

├── flashcardProgress
├── flashcardReviews
├── quizAttempts
├── examAttempts
├── studySettings
└── studyState
```

Responsabilidades:

```text
flashcardProgress
→ estado actual de cada tarjeta

flashcardReviews
→ historial de evaluaciones

quizAttempts
→ historial de quizzes

examAttempts
→ historial de exámenes

studySettings
→ preferencias académicas

studyState
→ última actividad / contexto de estudio
```

---

# 14. Aclarar el comportamiento offline

Actualmente existen dos conceptos que pueden parecer contradictorios:

```text
Funciona offline después del primer uso.
```

y:

```text
Los módulos descargados funcionan offline.
```

Dado que los módulos utilizan lazy loading, no todo el contenido necesariamente ha sido descargado.

## Redacción recomendada

```text
La aplicación y todo el contenido previamente descargado
funcionan completamente offline.

Los módulos nunca descargados requieren conexión
la primera vez que se abren.
```

Esto mantiene correctamente:

```text
PWA
+
lazy loading
+
cache
```

sin descargar todo el catálogo al iniciar.

---

# 15. Revisar `ModuleStatus`

Actualmente:

```text
NOT_STARTED
IN_PROGRESS
REVIEW_REQUIRED
COMPLETED
MASTERED
```

Las condiciones pueden superponerse.

Ejemplo:

```text
progress = 100
quiz = 95
dueToday = 8
mastery = 70
```

Esto podría ser simultáneamente:

```text
COMPLETED
```

y:

```text
REVIEW_REQUIRED
```

## Opción simple para MVP

Definir claramente la precedencia:

```text
MASTERED
    ↓
REVIEW_REQUIRED
    ↓
COMPLETED
    ↓
IN_PROGRESS
    ↓
NOT_STARTED
```

---

# 16. Posible evolución de estados

En versiones futuras sería conceptualmente más limpio separar estados.

Ejemplo:

```text
completionStatus

NOT_STARTED
IN_PROGRESS
COMPLETED
```

```text
reviewStatus

CURRENT
REVIEW_REQUIRED
```

```text
masteryStatus

LEARNING
MASTERED
```

Esto permitiría representar correctamente:

```text
COMPLETED
+
REVIEW_REQUIRED
```

Sin embargo, no es obligatorio para el MVP.

---

# 17. Mantener `progress` y `mastery` separados

La separación actual es correcta.

```text
progress
→ cuánto contenido ha recorrido el usuario

mastery
→ qué tan bien domina el contenido
```

No deben volver a combinarse en una sola métrica.

---

# 18. Documentar que `mastery` es un indicador

Actualmente parte importante de `mastery` depende de autoevaluaciones:

```text
UNKNOWN
HARD
GOOD
EASY
```

Esto significa que el usuario podría incrementar artificialmente su dominio seleccionando siempre:

```text
EASY
```

Por lo tanto conviene documentar:

```text
mastery representa un indicador de estudio,
no una medición científica del conocimiento.
```

Los quizzes y exámenes proporcionan métricas más objetivas.

En el futuro se podría relacionar:

```text
quiz questions
        ↓
tags
        ↓
flashcards relacionadas
```

para reforzar automáticamente contenido incorrecto.

---

# 19. Definir completamente `buildStudySession()`

Actualmente existe la intención de implementar:

```javascript
buildStudySession()
```

pero debe especificarse cómo selecciona tarjetas.

## Prioridad recomendada

```text
1. Tarjetas vencidas (due)
2. Tarjetas en reaprendizaje
3. Tarjetas nuevas
4. Repaso adicional opcional
```

Hasta completar:

```text
sessionSize
```

Ejemplo:

```text
sessionSize = 10

due = 6
new = 20
```

Resultado:

```text
6 due
+
4 new
```

Otro ejemplo:

```text
due = 15
```

Resultado:

```text
10 due
0 new
```

---

# 20. Diferenciar `dailyGoal` y `sessionSize`

Actualmente existen ambas configuraciones.

Debe quedar claro:

```text
dailyGoal
→ objetivo total diario

sessionSize
→ máximo de tarjetas por sesión
```

Ejemplo:

```text
dailyGoal = 30

sessionSize = 10
```

El usuario podría completar:

```text
Sesión 1 → 10

Sesión 2 → 10

Sesión 3 → 10
```

hasta completar su meta diaria.

---

# 21. Formalizar schema de exportación

Agregar un formato oficial:

```text
study-progress.json
```

Ejemplo:

```json
{
  "schemaVersion": "1.0",
  "exportVersion": "1",
  "appVersion": "1.2.0",
  "exportedAt": "2026-10-02T15:30:00Z",
  "data": {
    "flashcardProgress": [],
    "flashcardReviews": [],
    "quizAttempts": [],
    "examAttempts": [],
    "studySettings": [],
    "studyState": []
  }
}
```

---

# 22. Importación debe ser transaccional

La importación debe seguir este flujo:

```text
leer archivo
      ↓
parsear JSON
      ↓
validar estructura completa
      ↓
validar versiones
      ↓
mostrar resumen
      ↓
solicitar confirmación
      ↓
abrir transacción IndexedDB
      ↓
importar todos los stores
      ↓
commit
```

Nunca se debe importar mientras el archivo todavía está siendo validado.

Esto evita bases parcialmente restauradas.

---

# 23. Revisar estrategia de JSON Schema

Actualmente existen archivos:

```text
catalog.schema.json
certification-manifest.schema.json
module.schema.json
exam.schema.json
```

pero también se plantea utilizar un validador custom.

Debe aclararse la estrategia.

## Recomendación

Mantener los archivos `.schema.json` como **JSON Schema estándar real**.

Esto facilita:

```text
validación
generación mediante IA
documentación
integración futura
testing
```

El runtime puede utilizar un validador simplificado si se desea mantener pocas dependencias.

Pero los schemas deberían seguir siendo estándares.

---

# 24. Mantener el contenido separado de la aplicación

La estructura sigue siendo adecuada:

```text
content/

├── catalog.json

└── {certificationId}/

    ├── manifest.json

    ├── modules/

    │   ├── 01-module.json
    │   ├── 02-module.json
    │   └── ...

    └── exams/

        └── final.json
```

Con la mejora:

```text
manifest.json

schemaVersion
contentVersion
language
modules
exams
```

---

# 25. Nueva estructura recomendada del sistema

```text
                 ┌──────────────────────┐
                 │      UI Layer        │
                 └──────────┬───────────┘
                            │
                 ┌──────────▼───────────┐
                 │ Application Layer    │
                 │ router / app / state │
                 └──────────┬───────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
┌──────▼───────┐   ┌────────▼────────┐   ┌──────▼───────┐
│ Study Engine │   │ Progress Engine │   │ Exam Engine  │
└──────┬───────┘   └────────┬────────┘   └──────┬───────┘
       │                    │                    │
       └──────────────┬─────┴────────────────────┘
                      │
              ┌───────▼────────┐
              │ Storage Layer  │
              └───────┬────────┘
                      │
          ┌───────────┴────────────┐
          │                        │
      IndexedDB               JSON Content
```

---

# 26. Arquitectura futura

El sistema debe permitir evolucionar hacia:

```text
PWA actual
     ↓
Backend API
     ↓
Authentication
     ↓
Cloud Sync
     ↓
Multi-device
```

La arquitectura actual ya permite este crecimiento si todo acceso a datos continúa pasando por:

```text
storage-service
```

y:

```text
content-service
```

---

# 27. MongoDB no es necesario en el MVP

Se recomienda mantener:

```text
JSON
+
IndexedDB
```

durante el MVP.

Agregar MongoDB actualmente introduciría:

```text
backend
authentication
API
network dependency
hosting adicional
seguridad
sincronización
```

sin aportar un beneficio necesario para una aplicación inicialmente de un solo usuario.

Cuando se implemente:

```text
multi-device
multi-user
cloud sync
```

podrá evaluarse:

```text
DynamoDB
MongoDB
PostgreSQL
```

sin cambiar el Study Engine.

---

# 28. Revisar criterio de PWA

Evitar utilizar exclusivamente un criterio como:

```text
Lighthouse PWA >= 90
```

El criterio debería centrarse en comportamiento verificable.

## Criterios recomendados

```text
manifest válido

service worker registrado

app shell disponible offline

contenido previamente descargado disponible offline

IndexedDB operativo sin conexión

start_url funcional

display standalone

iconos 192 / 512 / maskable

HTTPS

sin errores de consola

funciona en Chrome

funciona en Safari

Performance >= 90

Accessibility >= 90

Best Practices >= 90
```

---

# 29. Testing adicional recomendado

Agregar tests para los siguientes casos.

## Spaced repetition

```text
UNKNOWN resetea streak

HARD reduce streak

GOOD incrementa streak

EASY incrementa streak

intervalo máximo = 60

tarjeta difícil no salta a 60 días
por tener reviewCount alto
```

## IndexedDB

```text
dos certificaciones pueden tener moduleId idéntico

índice compuesto devuelve resultados correctos
```

## Content versioning

```text
contentVersion incompatible

module revision modificada

IDs inexistentes después de actualización
```

## Import

```text
JSON corrupto

schemaVersion incompatible

exportVersion incompatible

importación parcialmente inválida

rollback de transacción
```

## Offline

```text
app shell offline

módulo descargado offline

módulo nunca descargado offline

actualización del Service Worker
```

---

# 30. Estrategia recomendada de implementación

No pedir a una IA implementar todas las fases simultáneamente.

Ejecutar:

```text
FASE 1
↓
validar
↓
tests
↓
commit
↓
FASE 2
↓
validar
↓
tests
↓
commit
```

y continuar secuencialmente.

Prompt sugerido para cada fase:

```text
Implementa exclusivamente la FASE N definida en SPEC.md.

Reglas:

- No implementes funcionalidades de fases posteriores.
- Respeta estrictamente la arquitectura definida.
- No agregues dependencias innecesarias.
- No hardcodees certificaciones.
- Todo acceso a contenido debe pasar por content-service.
- Todo acceso a IndexedDB debe pasar por storage-service.
- Ejecuta las pruebas correspondientes.
- No avances a la siguiente fase.

Al terminar:

1. Lista los archivos creados.
2. Lista los archivos modificados.
3. Explica brevemente las decisiones técnicas.
4. Indica las pruebas ejecutadas.
5. Reporta cualquier desviación respecto al SPEC.
6. Detente.
```

---

# 31. Cambios obligatorios para SPEC v1.2

Antes de iniciar implementación se recomienda incorporar:

1. Corregir semántica de `streak`.
2. Modificar el algoritmo de repetición espaciada.
3. Agregar `intervalDays` a `FlashcardProgress`.
4. Agregar `flashcardReviews`.
5. Agregar reaprendizaje dentro de la sesión.
6. Corregir índices compuestos de IndexedDB.
7. Agregar `contentVersion`.
8. Definir política de actualización de contenido.
9. Agregar `studyState`.
10. Aclarar funcionamiento offline.
11. Definir precedencia completa de `ModuleStatus`.
12. Formalizar `buildStudySession()`.
13. Diferenciar claramente `dailyGoal` y `sessionSize`.
14. Crear schema formal de `study-progress.json`.
15. Hacer importación transaccional.
16. Confirmar uso de JSON Schema estándar.
17. Actualizar criterios de validación PWA.
18. Agregar nuevos casos de prueba.

---

# 32. Estado recomendado del documento

Cambiar temporalmente:

```text
Estado:
Aprobado para implementación
```

por:

```text
Estado:
Aprobado con ajustes requeridos para v1.2
```

Después de incorporar los puntos anteriores:

```text
Versión: 1.2
Estado: Aprobado para implementación
```

---

# Conclusión

La arquitectura fundamental del Study App es sólida y no requiere un rediseño.

Las principales mejoras propuestas se concentran en:

```text
calidad del aprendizaje
persistencia correcta
historial
versionado
offline
mantenibilidad
migración futura
```

La recomendación es realizar una revisión `v1.2` del SPEC antes de iniciar la implementación de la Fase 1.

Después de estos cambios, el documento puede utilizarse como contrato técnico para desarrollar la aplicación incrementalmente mediante Kiro, Claude u otro agente de programación.