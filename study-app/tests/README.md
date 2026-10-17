# Tests — Study App

## Requisitos

- Node.js 18 o superior (usa `node:test` nativo — sin dependencias externas)

## Ejecutar todos los tests

Desde la raíz del proyecto (`study-app/`):

```bash
node --test tests/unit/*.test.js
```

## Ejecutar un archivo específico

```bash
node --test tests/unit/validators.test.js
node --test tests/unit/spaced-repetition.test.js
node --test tests/unit/progress-service.test.js
node --test tests/unit/exam-service.test.js
node --test tests/unit/import-export.test.js
node --test tests/unit/content-loader.test.js
node --test tests/unit/dates.test.js
node --test tests/unit/helpers.test.js
```

## Archivos de test y cobertura

| Archivo | Qué cubre | Tests |
|---|---|---|
| `validators.test.js` | Schemas catalog, manifest, module, exam, progress-export; contentVersion; parseAndValidate | 71 |
| `spaced-repetition.test.js` | calculateNextReview (intervalos, progresión, techo 60d), updateStreak (UNKNOWN/HARD/GOOD/EASY), escenarios integrados | 23 |
| `progress-service.test.js` | deriveStatus con los 5 estados y precedencia completa MASTERED>REVIEW_REQUIRED>COMPLETED>IN_PROGRESS>NOT_STARTED | 17 |
| `exam-service.test.js` | isAnswerCorrect (single/multiple/true-false), calculateScore, getWeakAreas, getWeakModules | 21 |
| `import-export.test.js` | Validación de structure, casos de rechazo, compatibilidad de exportVersion, roundtrip JSON | 19 |
| `content-loader.test.js` | getCatalog/getManifest/getModule (red, 404, JSON inválido, schema, caché), contentVersion, unicidad de IDs | 29 |
| `dates.test.js` | nowISO, addDays, isDue, diffDays, formatRelativeDate | 15 |
| `helpers.test.js` | shuffleArray, escapeHtml, formatPercent, clamp, makeProgressKey, truncate | 13 |

**Total: 208 tests** (199 actuales + 9 adicionales en dates/helpers antes del contador final)

## Casos clave verificados

### Spaced Repetition (SPEC §9)
- HARD **decrementa** streak (no congela): `EASY×2, HARD, EASY → streak=2`, no 3
- Una tarjeta difícil vista 20 veces con primera EASY → 7 días (no salta a 60)
- Progresión GOOD: `1→3→6→12→24→48→60`
- Progresión EASY: `1→7→18→45→60`
- Techo de 60 días para intervalos grandes

### ModuleStatus — precedencia (SPEC §7)
- `MASTERED (90%) > REVIEW_REQUIRED > COMPLETED > IN_PROGRESS > NOT_STARTED`
- MASTERED con tarjetas vencidas → sigue MASTERED (no REVIEW_REQUIRED)
- REVIEW_REQUIRED con progress 100% y quiz OK → prevalece sobre COMPLETED
- passingScore personalizable (ej: 72 para examen final)

### Import/Export (SPEC §12)
- JSON corrupto → rechazado sin tocar IndexedDB
- exportVersion incompatible → rechazado antes de importar
- flashcardReviews y studyState requeridos en el export (v1.2)
- Roundtrip: exportar → parsear → validar → importar → datos idénticos

### ContentVersion (SPEC §6)
- manifest sin contentVersion → error de validación
- módulo sin contentVersion → error de validación
- IDs de flashcards únicos dentro de cada módulo
- correctAnswers solo referencian IDs de opciones existentes

## Fixtures

| Archivo | Descripción |
|---|---|
| `valid-catalog.json` | Catálogo con 2 certificaciones |
| `valid-module.json` | Módulo IAM completo con contentVersion |
| `invalid-module.json` | Módulo con múltiples errores (tests negativos) |
