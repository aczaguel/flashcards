# Study App — Estado Actual del Sistema

**Fecha:** 2026-09-25  
**SPEC versión:** 1.2 — Aprobado para implementación  
**Estado:** MVP completo y funcional

---

## Resumen ejecutivo

Study App es un motor genérico de estudio offline-first (PWA) basado en flashcards, repetición espaciada, quizzes y exámenes. El código no conoce ninguna certificación — todo el contenido vive en JSON. El MVP está completo: 17 fases implementadas, 199 tests pasando, 2 certificaciones cargadas.

---

## Tests

| Métrica | Valor |
|---|---|
| Tests totales | **199** |
| Tests pasando | **199** |
| Tests fallando | **0** |
| Suites | 35 |
| Archivos de test | 8 |

```
validators.test.js         71 tests
content-loader.test.js     29 tests
spaced-repetition.test.js  23 tests
exam-service.test.js       21 tests
import-export.test.js      19 tests
progress-service.test.js   17 tests
dates.test.js              15 tests
helpers.test.js            13 tests
```

---

## Archivos del proyecto

**Total: 62 archivos** en `study-app/`

### App Shell
| Archivo | Descripción |
|---|---|
| `index.html` | SPA shell con skip link, CSP, meta PWA, safe area |
| `sw.js` | Service Worker: Cache First (shell) + Network First (JSON) |
| `manifest.webmanifest` | PWA manifest con id, scope, iconos, display standalone |

### CSS (design system)
| Archivo | Descripción |
|---|---|
| `assets/css/main.css` | Reset, design tokens completos, prefers-reduced-motion |
| `assets/css/themes.css` | Dark mode override + auto por prefers-color-scheme |
| `assets/css/layout.css` | Header sticky, page mobile-first, stat-grid responsive |
| `assets/css/components.css` | Cards, buttons, badges, progress bars, flashcards, quiz, exam, settings |

### JavaScript — Servicios
| Archivo | Responsabilidad |
|---|---|
| `src/services/content-service.js` | Fetch + caché en memoria de catalog, manifests y módulos |
| `src/services/storage-service.js` | Único punto de acceso a IndexedDB (6 stores, índices compuestos) |
| `src/services/progress-service.js` | Guardar evaluaciones, calcular progress/mastery/ModuleStatus |
| `src/services/study-service.js` | buildStudySession (priorización), studyState, configuración |
| `src/services/exam-service.js` | Scoring de quizzes y exámenes, historial, áreas a reforzar |

### JavaScript — Componentes
| Archivo | Responsabilidad |
|---|---|
| `src/components/dashboard.js` | Lista de certificaciones con progress + mastery + "Continuar" |
| `src/components/certification-detail.js` | Dashboard de cert: stats completas + lista de módulos |
| `src/components/module-view.js` | Vista de módulo: acceso a flashcards y quiz |
| `src/components/flashcard.js` | Sesión de flashcards, evaluación, reaprendizaje, teclado |
| `src/components/quiz.js` | Quiz con 3 tipos de pregunta, resultado, áreas a reforzar |
| `src/components/exam.js` | Examen final con timer, shuffle, historial de intentos |
| `src/components/progress-bar.js` | Barra de progreso reutilizable |
| `src/components/statistics.js` | certStatsHTML + moduleRowHTML para dashboard |
| `src/components/settings.js` | Export/import transaccional, configuración, tema |

### JavaScript — Utils
| Archivo | Responsabilidad |
|---|---|
| `src/utils/validators.js` | Validación de schemas JSON (catalog, manifest, module, exam, export) |
| `src/utils/spaced-repetition.js` | calculateNextReview + updateStreak (algoritmo v1.2) |
| `src/utils/dates.js` | addDays, isDue, diffDays, formatRelativeDate |
| `src/utils/helpers.js` | shuffleArray, escapeHtml, formatPercent, makeProgressKey |
| `src/config.js` | Constantes globales (APP_VERSION, DB_NAME, stores, defaults) |
| `src/router.js` | Hash router con soporte de params (:id, :moduleId) |
| `src/app.js` | Entry point: tema, rutas, Service Worker |

---

## Contenido académico

### Certificaciones activas: 2

#### ☁️ AWS Solutions Architect Associate (`aws-saa`)
| Módulo | Flashcards | Quiz |
|---|---|---|
| IAM (Identity and Access Management) | 10 | 8 preguntas |
| EC2 (Elastic Compute Cloud) | 8 | 5 preguntas |
| **Examen final** | — | 12 preguntas (passingScore: 72%) |
| **Total** | **18 flashcards** | **25 preguntas** |

#### 🏗️ HashiCorp Terraform Associate (`terraform-associate`)
| Módulo | Flashcards | Quiz |
|---|---|---|
| Conceptos Fundamentales | 10 | 7 preguntas |
| Providers y Registry | 8 | 6 preguntas |
| State Management | 10 | 7 preguntas |
| Resources, Variables y Módulos | 10 | 7 preguntas |
| **Examen final** | — | 15 preguntas (passingScore: 70%) |
| **Total** | **38 flashcards** | **42 preguntas** |

**Total de contenido:** 56 flashcards · 67 preguntas de quiz · 27 preguntas de examen

---

## IndexedDB Schema

```
DB: study-app-db  version: 1

flashcardProgress    ← estado actual (confidence, streak, intervalDays, nextReview)
flashcardReviews     ← historial completo de revisiones
quizAttempts         ← intentos de quizzes por módulo
examAttempts         ← intentos de exámenes finales
studySettings        ← dailyGoal (30), sessionSize (10), lastBackup
studyState           ← última actividad para "Continuar estudiando"
```

**Índices clave:**
- `by-certification-module` en `flashcardProgress` y `quizAttempts` — evita ambigüedad entre certs con mismo moduleId
- `by-next-review` — tarjetas vencidas para repetición espaciada

---

## Algoritmo de Repetición Espaciada (v1.2)

Basado en `intervalDays` (no en `reviewCount`), resuelve el bug donde una tarjeta difícil vista 20 veces saltaba a 60 días con una sola evaluación EASY.

| Evaluación | Nuevo `intervalDays` | Efecto en `streak` |
|---|---|---|
| UNKNOWN | 1 día | Reset a 0 |
| HARD | 2 días | max(0, streak - 1) |
| GOOD | max(3, prev × 2) | streak + 1 |
| EASY | max(7, round(prev × 2.5)) | streak + 1 |

Techo: 60 días. Progresión GOOD: `1→3→6→12→24→48→60`. Progresión EASY: `1→7→18→45→60`.

---

## Métricas de progreso

### Progress (cobertura)
```
progress = (studiedFlashcards / totalFlashcards) * 100
```

### Mastery (calidad) — indicador basado en autoevaluación
```
mastery = (masteredFlashcards / total) * 0.5 * 100
        + avgQuizScore * 0.3
        + min(avgStreak / 10, 1.0) * 0.2 * 100
```
`masteredFlashcards` = tarjetas con confidence EASY **y** streak ≥ 3

### ModuleStatus — precedencia
```
MASTERED (mastery ≥ 90) > REVIEW_REQUIRED (due > 0) > COMPLETED > IN_PROGRESS > NOT_STARTED
```

---

## Funcionalidades del MVP

| Feature | Estado |
|---|---|
| Dashboard con progress + mastery | ✅ |
| Flashcards con reveal + evaluación | ✅ |
| Repetición espaciada (intervalDays + streak) | ✅ |
| Reaprendizaje dentro de la sesión (learningQueue) | ✅ |
| "Continuar estudiando" (studyState) | ✅ |
| Quiz (single/multiple/true-false) + resultado | ✅ |
| Examen final con timer + shuffle + historial | ✅ |
| Navegación por teclado (Space/1/2/3/4) | ✅ |
| IndexedDB con 6 stores + índices compuestos | ✅ |
| Export/Import transaccional | ✅ |
| Light/Dark mode + prefers-color-scheme | ✅ |
| Mobile-first (360px) + safe area iOS | ✅ |
| PWA instalable (manifest + Service Worker) | ✅ |
| Offline (app shell + contenido descargado) | ✅ |
| Validación de schemas JSON con errores descriptivos | ✅ |
| Agregar cert/módulo sin modificar JS | ✅ |
| Accesibilidad: skip link, ARIA, focus-visible, reduced motion | ✅ |

---

## Ejecutar localmente

```bash
cd study-app
python3 -m http.server 8080
# → http://localhost:8080
```

```bash
# Tests
node --test tests/unit/*.test.js
```

---

## Próximos pasos sugeridos

### Opción A — Usar en el celular desde cualquier lugar (sin sync)
1. Subir a S3 + CloudFront siguiendo `docs/deploy-aws.md`
2. Instalar como PWA desde Safari/Chrome
3. Estudia offline después del primer acceso

### Opción B — Sync multi-dispositivo (celular + Mac)
Requiere backend. Stack recomendado:
```
Cognito (Google login)
    ↓
API Gateway + Lambda
    ↓
DynamoDB
```
La arquitectura ya está preparada (SPEC §34). `storage-service.js` es el único archivo que necesita una capa de adaptación.

### Opción C — Más contenido
- AWS SAA: faltan VPC, S3, RDS, Lambda, ELB, Auto Scaling (~6 módulos más)
- Terraform: HCL expressions, funciones, Terraform Cloud (~3 módulos más)
- Nueva certificación: Kubernetes CKA, AWS Developer, Docker

---

## Estructura de archivos (árbol)

```
study-app/
├── index.html
├── manifest.webmanifest
├── sw.js
├── README.md
├── assets/
│   ├── css/ (4 archivos)
│   └── icons/ (3 SVGs)
├── content/
│   ├── catalog.json
│   ├── aws-saa/
│   │   ├── manifest.json
│   │   ├── modules/ (01-iam, 02-ec2)
│   │   └── exams/ (final)
│   ├── terraform-associate/
│   │   ├── manifest.json
│   │   ├── modules/ (01-core-concepts, 02-providers, 03-state, 04-resources-modules)
│   │   └── exams/ (final)
│   └── example/ (plantilla mínima)
├── docs/
│   └── deploy-aws.md
├── schemas/ (4 JSON Schema)
├── src/
│   ├── app.js · router.js · config.js
│   ├── services/ (5 archivos)
│   ├── components/ (9 archivos)
│   └── utils/ (4 archivos)
└── tests/
    ├── unit/ (8 archivos, 199 tests)
    └── fixtures/ (3 archivos)
```
