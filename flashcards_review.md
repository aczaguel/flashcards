# Revisión y aprobación condicionada de SPEC v1

La arquitectura general está aprobada.

Antes de comenzar la implementación, realiza los siguientes ajustes a la especificación.

## 1. Repetición espaciada

Mantener un algoritmo simple para el MVP. No implementar SM-2 todavía.

Sin embargo, agregar `streak` al modelo `FlashcardProgress`.

El modelo debe permitir distinguir:

- `reviewCount`: cantidad total de revisiones.
- `streak`: cantidad de respuestas satisfactorias consecutivas.
- `confidence`: última evaluación.
- `lastReviewed`.
- `nextReview`.

Una evaluación `UNKNOWN` debe resetear `streak` a `0`.

El diseño debe facilitar una futura migración hacia SM-2 o FSRS sin modificar los IDs ni perder el historial existente.

---

## 2. Separar Progress de Mastery

No utilizar una única fórmula `60% flashcards + 40% quizzes` como representación general del progreso.

Separar conceptualmente:

### Progress

Representa cuánto contenido ha recorrido el usuario.

Como base:

`progress = studiedFlashcards / totalFlashcards * 100`

### Mastery

Representa qué tan bien domina el contenido.

Puede considerar:

- tarjetas dominadas;
- confidence;
- streak;
- quizzes;
- tarjetas pendientes de repaso.

Diseñar una fórmula inicial sencilla y documentada.

El dashboard debe mostrar ambas métricas independientemente:

- Progreso.
- Dominio.

No confundir avance con conocimiento.

---

## 3. Estados derivados

Mantener:

- NOT_STARTED
- IN_PROGRESS
- REVIEW_REQUIRED
- COMPLETED
- MASTERED

Pero actualizar sus reglas para utilizar `progress` y `mastery` por separado.

Los estados continúan siendo derivados y nunca deben convertirse en fuente de verdad persistida.

---

## 4. Idioma

El contenido inicial de AWS SAA debe estar en español.

Agregar al Study Content Schema soporte explícito de idioma mediante BCP 47.

Ejemplo:

```json
{
  "language": "es-MX"
}
```

El sistema debe permitir posteriormente contenidos como:

- `es-MX`
- `es-ES`
- `en-US`
- `en-GB`

La UI de Study App puede permanecer inicialmente en español.

No implementar internacionalización completa de la UI en el MVP, pero evitar decisiones que la dificulten posteriormente.

---

## 5. Contenido de ejemplo

Utilizar AWS Solutions Architect Associate como certificación real de prueba.

Utilizar IAM como primer módulo.

El contenido inicial solo tiene como objetivo validar técnicamente el Study Content Schema y la aplicación.

Mantener el contenido desacoplado completamente del código.

No introducir lógica específica de AWS dentro de JavaScript.

---

## 6. Almacenamiento de preferencias

Eliminar duplicidad entre `localStorage` e IndexedDB.

Utilizar:

### localStorage

Solo preferencias simples de UI:

- `theme`
- otras preferencias exclusivamente visuales si aparecen posteriormente.

### IndexedDB

Datos de estudio:

- flashcardProgress
- quizAttempts
- examAttempts
- studySettings

`studySettings` puede contener:

- dailyGoal
- sessionSize
- reviewPreferences

No guardar `theme` simultáneamente en IndexedDB.

---

## 7. Diseño visual

Mantener diseño:

- minimalista;
- mobile-first;
- limpio;
- orientado a sesiones rápidas de estudio;
- dark/light mode;
- alto contraste;
- accesible.

No utilizar colores hardcodeados directamente en componentes.

Definir design tokens mediante CSS Custom Properties.

Ejemplo conceptual:

```css
:root {
  --color-primary: ...;
  --color-success: ...;
  --color-warning: ...;
  --color-danger: ...;

  --bg-primary: ...;
  --bg-secondary: ...;

  --text-primary: ...;
  --text-secondary: ...;

  --border-color: ...;

  --radius-sm: ...;
  --radius-md: ...;
  --radius-lg: ...;

  --spacing-xs: ...;
  --spacing-sm: ...;
  --spacing-md: ...;
  --spacing-lg: ...;
}
```

Los componentes deben consumir únicamente estos tokens.

---

## 8. Actualizar SPEC.md

Antes de implementar código:

1. Actualiza `SPEC.md` incorporando estas decisiones.
2. Actualiza Data Models.
3. Actualiza IndexedDB Schema.
4. Actualiza algoritmo de repetición espaciada.
5. Actualiza cálculo de Progress y Mastery.
6. Actualiza criterios de aceptación afectados.
7. Marca la especificación como:

`Estado: Aprobado para implementación`

Después de actualizar SPEC.md, puedes comenzar con las fases 1 a 3.

No avances todavía más allá de la FASE 3.

Al terminar las fases 1, 2 y 3:

- ejecuta los tests;
- verifica que no existan errores de consola;
- verifica carga de catalog.json;
- verifica validación de schemas;
- verifica carga dinámica del manifest y módulo IAM;
- entrega un resumen de archivos creados;
- reporta tests ejecutados y resultados;
- reporta cualquier desviación de SPEC.md.

Detente después de FASE 3 para revisión antes de continuar con la interfaz funcional.