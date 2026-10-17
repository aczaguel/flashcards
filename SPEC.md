# Study App — Especificación Técnica Completa

**Versión:** 1.2  
**Fecha:** 2026-09-25  
**Estado:** Aprobado para implementación

> **Changelog v1.2** (basado en revisión `SPEC_REVIEW_v1.1.md`):
> 1. Corregida semántica de `streak`: HARD resta 1 (con mínimo 0), no congela
> 2. Nuevo algoritmo de repetición espaciada basado en `intervalDays` + streak
> 3. Agregado campo `intervalDays` a `FlashcardProgress`
> 4. Nuevo store `flashcardReviews` — historial completo de revisiones
> 5. Nuevo store `studyState` — última actividad para "Continuar estudiando"
> 6. Índices compuestos `[certificationId, moduleId]` en `flashcardProgress` y `quizAttempts`
> 7. Agregado `contentVersion` a manifest y module (separado de `schemaVersion`)
> 8. Definida política de actualización de contenido (PATCH / MINOR / MAJOR)
> 9. Definido comportamiento de reaprendizaje dentro de la sesión (`learningQueue`)
> 10. Formalizado `buildStudySession()` con prioridad: due → relearning → new
> 11. Clarificada diferencia entre `dailyGoal` y `sessionSize`
> 12. Schema formal de `study-progress.json` con `exportVersion`
> 13. Importación de progreso definida como transaccional completa
> 14. Precedencia explícita de `ModuleStatus` documentada
> 15. Redacción de comportamiento offline corregida (lazy loading + cache)
> 16. `mastery` documentado como indicador de estudio, no medición científica
> 17. Criterios de verificación PWA basados en comportamiento, no solo Lighthouse
> 18. Agregados nuevos casos de test para SR, IndexedDB, content versioning, import, offline

> **Changelog v1.1** (basado en revisión `flashcards_review.md`):
> - Agregado campo `streak` a `FlashcardProgress`
> - Separadas métricas `progress` y `mastery`
> - Agregado campo `language` (BCP 47)
> - Consolidado almacenamiento: `studySettings` en IndexedDB, `theme` en `localStorage`
> - Definidos design tokens CSS obligatorios

---

## Índice

1. [Visión General](#1-visión-general)
2. [Principios del Sistema](#2-principios-del-sistema)
3. [Requirements](#3-requirements)
4. [Arquitectura](#4-arquitectura)
5. [Estructura de Archivos](#5-estructura-de-archivos)
6. [Study Content Schema v1](#6-study-content-schema-v1)
7. [Data Models](#7-data-models)
8. [IndexedDB Schema](#8-indexeddb-schema)
9. [Algoritmo de Repetición Espaciada](#9-algoritmo-de-repetición-espaciada)
10. [Motor de Sesión de Estudio](#10-motor-de-sesión-de-estudio)
11. [Design Tokens](#11-design-tokens)
12. [Plan de Implementación](#12-plan-de-implementación)

---

## 1. Visión General

**Study App** es un motor genérico de aprendizaje basado en flashcards, repetición espaciada, quizzes y exámenes finales.

El objetivo es que el **código no conozca ninguna certificación específica**. Todo el contenido académico vive en archivos JSON. El código solo conoce el _Study Content Schema_.

### Flujo esperado (sin tocar código)

```
1. Pedir a una IA: "Genera el módulo IAM para AWS SAA usando Study Content Schema v1"
2. Recibir archivos JSON
3. Copiarlos a /content/aws-saa/
4. Agregar la entrada a catalog.json
5. Abrir Study App → la certificación aparece automáticamente
6. Estudiar flashcards, hacer quizzes, presentar examen
7. Cerrar la app → el progreso persiste
8. Abrir la app → continuar exactamente desde donde se quedó
```

### Regla fundamental

```
EL CÓDIGO NO CONOCE LAS CERTIFICACIONES.
EL CÓDIGO SOLO CONOCE EL STUDY CONTENT SCHEMA.
```

---

## 2. Principios del Sistema

Estas reglas son obligatorias y no negociables:

| # | Principio |
|---|---|
| 1 | Mobile-first |
| 2 | Progressive Web App (PWA) instalable |
| 3 | La app y el contenido previamente descargado funcionan offline |
| 4 | Sin backend en el MVP |
| 5 | Sin base de datos externa en el MVP |
| 6 | Sin autenticación en el MVP |
| 7 | Todo el contenido académico proviene de archivos JSON |
| 8 | El progreso del estudiante se almacena en IndexedDB |
| 9 | `localStorage` solo para `theme` y preferencias exclusivamente visuales |
| 10 | Los archivos JSON de contenido son **read-only** |
| 11 | Ninguna certificación hardcodeada en JavaScript |
| 12 | Agregar una certificación NO requiere modificar JavaScript |
| 13 | Agregar un módulo NO requiere modificar JavaScript |
| 14 | Los schemas JSON están versionados (`schemaVersion` + `contentVersion`) |
| 15 | Stack: HTML5 + CSS3 + JS ES6+ nativo. Sin frameworks pesados |
| 16 | Mínimas dependencias externas |
| 17 | Los componentes consumen únicamente design tokens CSS. Sin valores hardcodeados |
| 18 | Todo acceso a IndexedDB pasa por `storage-service` |
| 19 | Todo acceso a contenido JSON pasa por `content-service` |

---

## 3. Requirements

### 3.1 Functional Requirements

**FR-01 — Catálogo de certificaciones**
- El sistema lee `/content/catalog.json` al iniciar.
- Todas las certificaciones con `enabled: true` aparecen en el dashboard.
- Agregar una certificación no requiere modificar JavaScript.

**FR-02 — Módulos**
- Cada certificación expone su lista de módulos mediante `manifest.json`.
- Los módulos se cargan dinámicamente (lazy) desde archivos JSON individuales.
- El orden lo determina el campo `order` del manifest, no el nombre del archivo.

**FR-03 — Flashcards**
- Muestra la pregunta primero; la respuesta está oculta.
- El usuario puede revelar la respuesta.
- Después de ver la respuesta, el usuario evalúa con: **No sabía · Difícil · Bien · Fácil**.
- La evaluación se registra en IndexedDB (`flashcardProgress` y `flashcardReviews`).

**FR-04 — Repetición espaciada**
- El sistema calcula cuándo volver a mostrar cada flashcard usando `intervalDays` y `streak`.
- Una evaluación `UNKNOWN` resetea `streak` a `0` e `intervalDays` a `1`.
- Una evaluación `HARD` decrementa `streak` en 1 (mínimo 0).
- Las tarjetas evaluadas como `UNKNOWN` en una sesión se reinsertan al final de esa misma sesión (`learningQueue`).

**FR-05 — Quiz por módulo**
- Cada módulo puede incluir un quiz con preguntas `single-choice`, `multiple-choice` y `true-false`.
- Al terminar muestra: resultado, preguntas correctas/incorrectas, explicaciones y áreas a reforzar.
- `passingScore` es configurable por módulo.
- Cada intento se guarda en IndexedDB.

**FR-06 — Examen final**
- Cada certificación puede incluir exámenes finales.
- El examen mezcla preguntas de múltiples módulos.
- El número de preguntas, orden y opciones pueden aleatorizarse.
- El historial de intentos se guarda en IndexedDB.

**FR-07 — Dashboard principal**
- Muestra todas las certificaciones habilitadas.
- Por certificación: **progress** (%), **mastery** (%), módulos completados, tarjetas pendientes hoy, último resultado de examen.
- Botón "Continuar estudiando" usa `studyState` para llevar al usuario al punto exacto donde dejó.

**FR-08 — Dashboard de certificación**
- Muestra `progress` y `mastery` como métricas independientes y visualmente distintas.
- Muestra tarjetas estudiadas, dominadas y pendientes de repaso.
- Muestra promedio de quizzes, último/mejor examen.
- Lista todos los módulos con su `progress`, `mastery` y estado calculado.

**FR-09 — Estados de progreso**
- Los estados `NOT_STARTED · IN_PROGRESS · REVIEW_REQUIRED · COMPLETED · MASTERED` se **derivan** del progreso real.
- Nunca se almacenan como verdad absoluta.
- La precedencia de estados es: `MASTERED > REVIEW_REQUIRED > COMPLETED > IN_PROGRESS > NOT_STARTED`.

**FR-10 — Exportar/Importar progreso**
- El usuario puede exportar su progreso completo a `study-progress.json`.
- El usuario puede importar un archivo de progreso válido.
- La importación es **transaccional**: valida el archivo completo antes de escribir nada en IndexedDB.
- Solicita confirmación antes de sobrescribir datos existentes.
- Nunca deja la base de datos en estado parcialmente restaurado.

**FR-11 — Validación de contenido**
- Cada archivo JSON se valida contra su schema al cargarse.
- Si un archivo es inválido, se muestra un error comprensible sin romper la app.
- Los detalles técnicos se registran en consola.

**FR-12 — Light/Dark Mode**
- El usuario puede alternar entre tema claro y oscuro.
- La preferencia se guarda únicamente en `localStorage`.

**FR-13 — Continuar estudiando**
- Al abrir la app, el botón "Continuar estudiando" retoma la última actividad registrada en `studyState`.
- `studyState` se actualiza cada vez que el usuario navega a una vista de estudio.

---

### 3.2 Non-Functional Requirements

**NFR-01 — Performance**
- Dashboard carga en < 2 segundos en conexión 3G típica.
- Los módulos se cargan bajo demanda (lazy loading).

**NFR-02 — Offline**
- La aplicación y todo el contenido previamente descargado funcionan completamente sin conexión.
- Los módulos que nunca han sido descargados requieren conexión la primera vez.
- Service Worker gestiona cache con invalidación por versión.

**NFR-03 — Accesibilidad**
- Navegable por teclado.
- Labels y roles ARIA apropiados.
- Contraste WCAG AA.
- Focus states visibles.

**NFR-04 — Mobile-first**
- Usable con una mano en pantallas de 360px.
- Botones táctiles mínimo 44×44px.
- Sin dependencia de hover states.

**NFR-05 — Seguridad**
- No insertar HTML arbitrario desde archivos JSON.
- Escapar correctamente todo contenido dinámico.
- Implementar Content Security Policy (CSP).
- No ejecutar JavaScript proveniente del contenido.
- Validar y sanear archivos importados.

**NFR-06 — Mantenibilidad**
- El código no conoce ninguna certificación específica.
- Agregar módulo o certificación nunca requiere modificar JavaScript.
- Módulos JS con responsabilidades claras y únicas.

**NFR-07 — Extensibilidad**
- La arquitectura permite agregar en el futuro: cloud sync, multi-usuario, autenticación, generación de contenido por IA, notificaciones y gamificación sin rediseño completo.
- Todo acceso a IndexedDB pasa por `storage-service`, lo que permite sustituirlo por una API HTTP sin tocar el Study Engine ni la UI.
- `FlashcardProgress` incluye `intervalDays`, `streak` y `reviewCount` para facilitar migración futura a SM-2 o FSRS sin perder historial.
- `flashcardReviews` registra el historial completo, habilitando algoritmos más sofisticados en versiones futuras.

**NFR-08 — Compatibilidad**
- Chrome, Safari, Firefox, Edge (últimas 2 versiones).
- iOS Safari y Android Chrome.

**NFR-09 — Internacionalización (preparación)**
- La UI puede permanecer en español en el MVP.
- No tomar decisiones que dificulten la internacionalización posterior.
- El contenido JSON incluye campo `language` (BCP 47) para futura selección de idioma.

---

### 3.3 Technical Requirements

**TR-01 — Stack**
- HTML5, CSS3, JavaScript ES6+ nativo.
- Sin frameworks frontend.
- Sin backend ni base de datos externa en el MVP.
- Mínimas dependencias externas.

**TR-02 — Almacenamiento**
- IndexedDB para todo el progreso del estudiante y configuración de estudio.
- `localStorage` únicamente para `theme` y preferencias exclusivamente visuales.
- Los archivos JSON de contenido son read-only.
- No duplicar ningún dato entre `localStorage` e IndexedDB.

**TR-03 — Módulos JS**
- ES Modules nativos (`import`/`export`).
- Sin bundler en el MVP. La app corre sin compilación.

**TR-04 — Servidor**
- Funciona con cualquier servidor HTTP estático.
- Desplegable en AWS S3 + CloudFront.

**TR-05 — Versionado**
- `schemaVersion` — versión de la estructura técnica del JSON.
- `contentVersion` — versión del contenido académico (semver: `MAJOR.MINOR.PATCH`).
- Ambos campos son requeridos en manifest y módulos.
- La app detecta versiones incompatibles y notifica al usuario.

**TR-06 — Design tokens**
- Todos los valores de color, spacing, border-radius y tipografía se definen como CSS Custom Properties.
- Los componentes nunca usan valores hardcodeados directamente.

---

### 3.4 PWA Requirements

**PWA-01** — `manifest.webmanifest` válido con nombre, iconos (192px, 512px, maskable), colores y `display: standalone`.

**PWA-02** — Service Worker con:
- Cache First para assets estáticos (app shell).
- Network First con fallback para archivos JSON de contenido.
- Limpieza automática de caches obsoletos en `activate`.
- Notificación de actualización disponible.

**PWA-03** — Criterios de verificación PWA (basados en comportamiento):

| Criterio | Cómo verificar |
|---|---|
| `manifest.webmanifest` válido | DevTools → Application → Manifest |
| Service Worker registrado | DevTools → Application → Service Workers |
| App shell disponible offline | Modo avión → recargar → app carga |
| Contenido descargado disponible offline | Modo avión → abrir módulo previamente visitado |
| IndexedDB operativo sin conexión | Modo avión → evaluar flashcard → registro guardado |
| `start_url` funcional | Abre correctamente desde la pantalla de inicio |
| `display: standalone` | Sin barra de navegación del browser al instalar |
| Iconos 192 / 512 / maskable | Visibles al instalar en iOS y Android |
| Sin errores de consola | DevTools → Console en carga inicial |
| Funciona en Chrome y Safari | Prueba manual en ambos navegadores |
| Performance ≥ 90 | Lighthouse |
| Accessibility ≥ 90 | Lighthouse |
| Best Practices ≥ 90 | Lighthouse |

---

### 3.5 Offline Requirements

**OFR-01** — El app shell (HTML, CSS, JS) está cacheado después del primer uso. Disponible en modo avión inmediatamente.

**OFR-02** — La aplicación y todo el contenido previamente descargado funcionan completamente sin conexión. Los módulos que nunca han sido abiertos requieren conexión la primera vez que se accede a ellos. Si el usuario intenta acceder a un módulo no descargado offline, recibe un mensaje claro.

**OFR-03** — IndexedDB funciona completamente offline. Todas las acciones de estudio (evaluar tarjetas, completar quiz) funcionan sin conexión.

**OFR-04** — Cuando la app detecta una versión nueva disponible (al recuperar conexión), notifica al usuario y ofrece actualizar. La actualización nunca borra el progreso almacenado en IndexedDB.

---

### 3.6 Content Requirements

**CR-01** — El código no referencia ninguna certificación, módulo o pregunta específica.

**CR-02** — El schema es estricto, documentado y estable para que una IA pueda generar módulos compatibles directamente.

**CR-03** — Un JSON generado externamente y copiado al directorio correcto funciona sin modificar código.

**CR-04** — Todos los IDs son estables y únicos dentro de su scope. Nunca usar el índice de un array como identificador.

**CR-05** — El contenido inicial de AWS SAA está en español (`es-MX`).

**CR-06 — Política de actualización de contenido:**

| Tipo de cambio | `contentVersion` | Efecto sobre el progreso |
|---|---|---|
| `PATCH` — corrección de texto, typo, mejora de explicación | x.x.N+1 | Sin reset. El progreso se conserva |
| `MINOR` — nuevas flashcards o preguntas | x.N+1.0 | Sin reset. Nuevas tarjetas aparecen como `NOT_STARTED` |
| `MAJOR` — reestructuración de IDs, cambio de contenido incompatible | N+1.0.0 | La app detecta incompatibilidad y advierte al usuario |

Una actualización MAJOR puede invalidar registros de `flashcardProgress` que referencian IDs que ya no existen. La app debe manejar esto sin errores.

---

## 4. Arquitectura

### 4.1 Application Architecture

```
                 ┌──────────────────────┐
                 │      UI Layer        │
                 │  (Components + CSS)  │
                 └──────────┬───────────┘
                            │
                 ┌──────────▼───────────┐
                 │  Application Layer   │
                 │  app · router · cfg  │
                 └──────────┬───────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
┌──────▼───────┐   ┌────────▼────────┐   ┌──────▼───────┐
│ Study Engine │   │ Progress Engine │   │ Exam Engine  │
│ study-svc    │   │ progress-svc    │   │ exam-svc     │
└──────┬───────┘   └────────┬────────┘   └──────┬───────┘
       │                    │                    │
       └──────────────┬─────┴────────────────────┘
                      │
              ┌───────▼────────┐
              │ Storage Layer  │
              │ storage-svc    │
              └───────┬────────┘
                      │
          ┌───────────┴────────────┐
          │                        │
      IndexedDB               JSON Content
   (read/write)               (read-only,
                            via content-svc)
```

**Regla de capas:** Todo acceso a IndexedDB pasa por `storage-service`. Todo acceso a contenido JSON pasa por `content-service`. Los componentes UI no acceden directamente a ninguna de las dos capas.

---

### 4.2 Content Architecture

```
/content/
│
├── catalog.json                    ← Registro de certificaciones
│
└── {cert-id}/
    ├── manifest.json               ← Índice: modules, exams, contentVersion
    ├── modules/
    │   └── {NN}-{id}.json          ← Módulo: flashcards + quiz + contentVersion
    └── exams/
        └── {id}.json               ← Examen final
```

**Flujo de carga:**

```
App inicia
  → GET catalog.json
  → GET manifest.json (por cada cert habilitada)
  → GET modules/{file} (lazy — solo cuando el usuario abre el módulo)
```

---

### 4.3 Storage Architecture

```
IndexedDB: "study-app-db"  version: 1

  flashcardProgress    ← estado actual de cada tarjeta
  flashcardReviews     ← historial completo de revisiones
  quizAttempts         ← intentos de quizzes
  examAttempts         ← intentos de exámenes
  studySettings        ← configuración académica (dailyGoal, sessionSize…)
  studyState           ← última actividad / "Continuar estudiando"

localStorage (SOLO preferencias visuales):
  theme: "light" | "dark"
```

| Dato | Dónde vive |
|---|---|
| Preguntas, respuestas, flashcards | JSON (read-only) |
| Estado actual de cada tarjeta | `flashcardProgress` (IndexedDB) |
| Historial de revisiones | `flashcardReviews` (IndexedDB) |
| Intentos de quizzes/exámenes | `quizAttempts` / `examAttempts` (IndexedDB) |
| Configuración académica | `studySettings` (IndexedDB) |
| Última actividad | `studyState` (IndexedDB) |
| Tema visual | `localStorage` |
| Estados calculados (MASTERED, etc.) | En memoria, derivados |

---

### 4.4 Offline Architecture

**Estrategias por tipo de recurso:**

| Recurso | Estrategia | Razón |
|---|---|---|
| HTML/CSS/JS (app shell) | Cache First | No cambia entre visitas |
| `catalog.json` | Network First, fallback cache | Puede actualizarse |
| `manifest.json` | Network First, fallback cache | Puede actualizarse |
| Módulos JSON | Network First, fallback cache | Lazy — solo los visitados están en cache |
| IndexedDB | N/A (nativo offline) | Siempre disponible |

**Comportamiento offline:** El app shell y los módulos previamente descargados funcionan sin conexión. Un módulo nunca descargado muestra mensaje de error claro al intentar abrirlo offline.

**Invalidación de caché:** `CACHE_VERSION = v{APP_VERSION}`. Al activarse un SW nuevo, elimina todos los caches anteriores. El usuario recibe notificación y puede recargar.

---

### 4.5 Navigation Architecture

```
/#/                                               → Dashboard principal
/#/certification/:id                              → Dashboard de certificación
/#/certification/:id/module/:moduleId             → Vista de módulo
/#/certification/:id/module/:moduleId/flashcards  → Sesión de flashcards
/#/certification/:id/module/:moduleId/quiz        → Quiz del módulo
/#/certification/:id/exam/:examId                 → Examen final
/#/certification/:id/exam/:examId/result          → Resultado del examen
/#/settings                                       → Configuración y backup
```

**Hash-based router** — compatible con S3 static hosting sin configuración adicional.

---

### 4.6 Component Design

#### Services

| Servicio | Responsabilidad |
|---|---|
| `content-service.js` | Fetch, validación y caché en memoria de catalog, manifests y módulos |
| `storage-service.js` | Abstracción de IndexedDB. CRUD genérico. Migración de versiones |
| `progress-service.js` | Calcula `progress`, `mastery`, estados derivados, tarjetas pendientes |
| `study-service.js` | Construye sesiones (`buildStudySession`), registra evaluaciones, gestiona `learningQueue` |
| `exam-service.js` | Aleatoriza, puntúa quizzes/exámenes, registra intentos |

#### Components

| Componente | Responsabilidad |
|---|---|
| `dashboard.js` | Lista de certificaciones con `progress` y `mastery` |
| `certification-detail.js` | Dashboard de certificación: stats + módulos |
| `module-view.js` | Vista de módulo: acceso a flashcards y quiz |
| `flashcard.js` | Tarjeta volteable + evaluación |
| `quiz.js` | Preguntas, respuestas, resultado |
| `exam.js` | Quiz multi-módulo con aleatoriedad |
| `progress-bar.js` | Componente visual reutilizable |
| `statistics.js` | Métricas de progreso |
| `settings.js` | Export/import, configuración |

#### Utils

| Util | Responsabilidad |
|---|---|
| `validators.js` | Validación de JSON contra schemas |
| `spaced-repetition.js` | Algoritmo SR: `calculateNextReview`, `updateStreak`, `updateInterval` |
| `dates.js` | Cálculos de fechas |
| `helpers.js` | shuffle, escapeHtml, formatPercent, makeProgressKey |

---

### 4.7 Decisiones de Arquitectura

**Hash router:** S3 sin CloudFront devuelve 404 en rutas directas. Hash router funciona sin configuración adicional. Migrable a History API cuando haya CloudFront.

**Sin bundler en MVP:** Aceptable porque el SW cachea todos los módulos JS. Agregar esbuild es trivial si el rendimiento lo requiere.

**Validador custom:** Evita dependencias externas. Los archivos `.schema.json` siguen el estándar JSON Schema para documentación y generación por IA; el runtime usa el validador custom liviano.

**Estados calculados nunca almacenados:** Un cambio en la lógica de cálculo se aplica retroactivamente a todos los datos sin migración.

**`storage-service` como único punto de acceso a IndexedDB:** Permite sustituir IndexedDB por una API HTTP en el futuro sin tocar el Study Engine ni la UI.

**`flashcardReviews` separado de `flashcardProgress`:** `flashcardProgress` es el estado actual (lectura frecuente, escritura frecuente). `flashcardReviews` es el historial (escritura frecuente, lectura rara). Separar los stores optimiza ambos patrones de acceso.

---

## 5. Estructura de Archivos

```
study-app/
│
├── index.html
├── manifest.webmanifest
├── sw.js
├── README.md
│
├── assets/
│   ├── css/
│   │   ├── main.css            ← Reset, design tokens
│   │   ├── components.css      ← Cards, buttons, badges
│   │   ├── layout.css          ← Header, nav, page
│   │   └── themes.css          ← Dark mode overrides
│   ├── icons/
│   │   ├── icon-192.svg
│   │   ├── icon-512.svg
│   │   └── icon-maskable.svg
│   └── images/
│
├── src/
│   ├── app.js
│   ├── router.js
│   ├── config.js
│   │
│   ├── services/
│   │   ├── content-service.js
│   │   ├── storage-service.js
│   │   ├── progress-service.js
│   │   ├── study-service.js
│   │   └── exam-service.js
│   │
│   ├── components/
│   │   ├── dashboard.js
│   │   ├── certification-detail.js
│   │   ├── module-view.js
│   │   ├── flashcard.js
│   │   ├── quiz.js
│   │   ├── exam.js
│   │   ├── progress-bar.js
│   │   ├── statistics.js
│   │   └── settings.js
│   │
│   └── utils/
│       ├── validators.js
│       ├── spaced-repetition.js
│       ├── dates.js
│       └── helpers.js
│
├── content/
│   ├── catalog.json
│   │
│   └── aws-saa/
│       ├── manifest.json
│       ├── modules/
│       │   ├── 01-iam.json
│       │   └── 02-ec2.json
│       └── exams/
│           └── final.json
│
├── schemas/
│   ├── catalog.schema.json
│   ├── certification-manifest.schema.json
│   ├── module.schema.json
│   └── exam.schema.json
│
└── tests/
    ├── unit/
    │   ├── validators.test.js
    │   ├── spaced-repetition.test.js
    │   ├── progress-service.test.js
    │   ├── exam-service.test.js
    │   ├── content-loader.test.js
    │   └── import-export.test.js
    ├── fixtures/
    │   ├── valid-catalog.json
    │   ├── valid-module.json
    │   └── invalid-module.json
    └── README.md
```

---

## 6. Study Content Schema v1

### Principios del schema

1. Todos los archivos incluyen `schemaVersion` como primer campo.
2. Manifests y módulos incluyen `contentVersion` (semver) como segundo campo.
3. Todos los IDs son strings estables, únicos dentro de su scope, en kebab-case.
4. Los archivos de contenido son **read-only** desde la aplicación.
5. El schema está diseñado para ser generado por IA sin ambigüedad.
6. Los campos opcionales están marcados explícitamente.

---

### 6.1 catalog.json

```json
{
  "schemaVersion": "1.0",
  "certifications": [
    {
      "id": "aws-saa",
      "name": "AWS Solutions Architect Associate",
      "description": "Preparación para el examen SAA-C03",
      "icon": "☁️",
      "manifest": "aws-saa/manifest.json",
      "enabled": true
    }
  ]
}
```

| Campo | Tipo | Req | Descripción |
|---|---|---|---|
| `schemaVersion` | string | ✓ | Versión de la estructura. Actualmente `"1.0"` |
| `certifications[].id` | string | ✓ | Kebab-case único. Ej: `aws-saa` |
| `certifications[].manifest` | string | ✓ | Ruta relativa desde `/content/` |
| `certifications[].enabled` | boolean | ✓ | `false` oculta del dashboard |

---

### 6.2 certification manifest.json

```json
{
  "schemaVersion": "1.0",
  "contentVersion": "1.0.0",
  "certificationId": "aws-saa",
  "name": "AWS Solutions Architect Associate",
  "description": "Programa de estudio para el examen SAA-C03",
  "language": "es-MX",
  "totalEstimatedHours": 40,
  "modules": [
    {
      "id": "iam",
      "order": 1,
      "name": "Identity and Access Management",
      "description": "Usuarios, roles, políticas y permisos en AWS",
      "file": "modules/01-iam.json"
    }
  ],
  "exams": [
    {
      "id": "final",
      "name": "Examen Final SAA-C03",
      "file": "exams/final.json"
    }
  ]
}
```

| Campo | Tipo | Req | Descripción |
|---|---|---|---|
| `schemaVersion` | string | ✓ | Versión de la estructura técnica |
| `contentVersion` | string | ✓ | Versión semver del contenido académico. Ej: `"1.0.0"` |
| `certificationId` | string | ✓ | Debe coincidir con `id` en `catalog.json` |
| `language` | string | ✓ | BCP 47. Ej: `es-MX`, `en-US` |
| `modules[].order` | integer | ✓ | Define el orden de visualización |
| `modules[].file` | string | ✓ | Ruta relativa al JSON del módulo |

---

### 6.3 module.json

```json
{
  "schemaVersion": "1.0",
  "contentVersion": "1.0.0",
  "type": "study-module",
  "certificationId": "aws-saa",
  "language": "es-MX",
  "module": {
    "id": "iam",
    "order": 1,
    "name": "Identity and Access Management",
    "description": "Conceptos fundamentales de IAM en AWS",
    "estimatedMinutes": 45
  },
  "flashcards": [
    {
      "id": "iam-001",
      "question": "¿Qué es IAM?",
      "answer": "Identity and Access Management. Servicio de AWS para gestionar identidades y permisos.",
      "explanation": "IAM permite crear usuarios, grupos, roles y políticas.",
      "difficulty": "basic",
      "tags": ["iam", "security"]
    }
  ],
  "quiz": {
    "passingScore": 80,
    "questions": [
      {
        "id": "iam-q001",
        "type": "single-choice",
        "question": "¿Cuál es la función principal de IAM?",
        "options": [
          { "id": "a", "text": "Administrar identidades y permisos" },
          { "id": "b", "text": "Almacenar objetos en la nube" },
          { "id": "c", "text": "Crear redes privadas virtuales" },
          { "id": "d", "text": "Monitorear el rendimiento" }
        ],
        "correctAnswers": ["a"],
        "explanation": "IAM controla autenticación y autorización en AWS."
      }
    ]
  }
}
```

| Campo | Tipo | Req | Descripción |
|---|---|---|---|
| `schemaVersion` | string | ✓ | Versión de la estructura técnica |
| `contentVersion` | string | ✓ | Versión semver del contenido del módulo |
| `language` | string | ✓ | BCP 47 |
| `flashcards[].id` | string | ✓ | Formato: `{moduleId}-{NNN}`. Ej: `iam-001` |
| `flashcards[].answer` | string | ✓ | Requerido. No puede estar vacío |
| `quiz.questions[].id` | string | ✓ | Formato: `{moduleId}-q{NNN}`. Ej: `iam-q001` |
| `quiz.questions[].type` | string | ✓ | `single-choice` · `multiple-choice` · `true-false` |

**Tipos de preguntas en v1:** `single-choice`, `multiple-choice`, `true-false`

**Preparados para v2 (no implementar en MVP):** `text-answer`, `ordering`, `matching`

---

### 6.4 exam.json

```json
{
  "schemaVersion": "1.0",
  "type": "exam",
  "certificationId": "aws-saa",
  "language": "es-MX",
  "exam": {
    "id": "final",
    "name": "Examen Final SAA-C03",
    "passingScore": 72,
    "timeLimit": 130,
    "shuffleQuestions": true,
    "shuffleOptions": true
  },
  "questions": [...]
}
```

> El examen no incluye `contentVersion` porque sus preguntas no se mapean directamente al progreso de flashcards. Los intentos se guardan completos en `examAttempts`.

---

### 6.5 Convenciones de IDs

| Elemento | Formato | Ejemplo |
|---|---|---|
| Certificación | `{tema}-{nivel}` | `aws-saa`, `terraform-associate` |
| Módulo | `{tema-corto}` | `iam`, `ec2`, `vpc` |
| Flashcard | `{moduleId}-{NNN}` | `iam-001`, `ec2-023` |
| Pregunta quiz | `{moduleId}-q{NNN}` | `iam-q001`, `ec2-q015` |
| Pregunta examen | `exam-q{NNN}` | `exam-q001` |
| Opción | `a`, `b`, `c`… o `true`/`false` | `a`, `true` |

---

### 6.6 Idiomas soportados (BCP 47)

| Código | Descripción |
|---|---|
| `es-MX` | Español — México (**default del MVP**) |
| `es-ES` | Español — España |
| `en-US` | Inglés — Estados Unidos |
| `en-GB` | Inglés — Reino Unido |

---

### 6.7 Guía para generar módulos con IA

```
Genera un módulo de estudio en formato JSON usando Study Content Schema v1.

Parámetros:
- certificationId: {id}
- contentVersion: "1.0.0"
- moduleId: {id}
- order: {número}
- name: {nombre}
- language: es-MX
- estimatedMinutes: {minutos}
- flashcards: mínimo {N} tarjetas
- quiz: mínimo {N} preguntas (mix de single-choice, multiple-choice y true-false)
- passingScore: {porcentaje}

Reglas:
- IDs de flashcards: {moduleId}-{NNN} (ej: iam-001)
- IDs de preguntas: {moduleId}-q{NNN} (ej: iam-q001)
- Incluir schemaVersion: "1.0" y contentVersion: "1.0.0"
- Incluir language: "es-MX"
- Todos los campos requeridos deben estar presentes
```

---

## 7. Data Models

Tipos en estilo TypeScript para documentación. La app los implementa como objetos JS planos.

### Catálogo y Manifest

```typescript
interface CertificationManifest {
  schemaVersion: string;
  contentVersion: string;      // semver — Ej: "1.0.0"
  certificationId: string;
  name: string;
  description: string;
  language: string;            // BCP 47
  totalEstimatedHours?: number;
  modules: ModuleEntry[];
  exams: ExamEntry[];
}

interface StudyModule {
  schemaVersion: string;
  contentVersion: string;      // semver
  type: "study-module";
  certificationId: string;
  language: string;
  module: ModuleMetadata;
  flashcards: Flashcard[];
  quiz: Quiz;
}
```

### Progreso — Estado actual (IndexedDB: `flashcardProgress`)

```typescript
interface FlashcardProgress {
  id: string;                  // "{certId}::{moduleId}::{cardId}"
  certificationId: string;
  moduleId: string;
  flashcardId: string;
  confidence: "UNKNOWN" | "HARD" | "GOOD" | "EASY";
  reviewCount: number;         // Total de revisiones acumuladas (nunca decrece)
  streak: number;              // Respuestas satisfactorias consecutivas
                               // GOOD/EASY: +1 | HARD: max(0, streak-1) | UNKNOWN: 0
  intervalDays: number;        // Intervalo actual en días (usado por el algoritmo SR)
  lastReviewed: string | null; // ISO 8601
  nextReview: string | null;   // ISO 8601
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}
```

> **Nota de diseño — migración futura a SM-2/FSRS:**
> `reviewCount`, `streak` e `intervalDays` son suficientes para inicializar los parámetros de SM-2 (factor de facilidad EF, intervalo, repeticiones). `flashcardReviews` provee el historial completo para algoritmos que necesiten reconstruir el estado desde cero (FSRS).

### Historial de revisiones (IndexedDB: `flashcardReviews`)

```typescript
interface FlashcardReview {
  id?: number;                 // autoIncrement
  certificationId: string;
  moduleId: string;
  flashcardId: string;
  reviewedAt: string;          // ISO 8601
  rating: "UNKNOWN" | "HARD" | "GOOD" | "EASY";
  previousStreak: number;
  newStreak: number;
  previousIntervalDays: number;
  newIntervalDays: number;
}
```

### Intentos (IndexedDB: `quizAttempts` / `examAttempts`)

```typescript
interface QuizAttempt {
  id?: number;
  certificationId: string;
  moduleId: string;
  attemptedAt: string;
  durationSeconds: number;
  totalQuestions: number;
  correctAnswers: number;
  score: number;               // 0-100
  passed: boolean;
  answers: QuizAnswer[];       // [{ questionId, selectedAnswers, correct }]
}

interface ExamAttempt {
  id?: number;
  certificationId: string;
  examId: string;
  attemptedAt: string;
  durationSeconds: number;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  passed: boolean;
  answers: ExamAnswer[];       // [{ questionId, selectedAnswers, correct, moduleId }]
}
```

### Configuración académica (IndexedDB: `studySettings`)

```typescript
// Key-value store. Claves predefinidas:
interface StudySettingsMap {
  dailyGoal:          number;  // Objetivo total diario de tarjetas. Default: 30
  sessionSize:        number;  // Máximo de tarjetas por sesión. Default: 10
  appVersion:         string;  // Versión instalada
  lastBackup:         string | null;  // ISO 8601 del último export
}
```

> **`dailyGoal` vs `sessionSize`:**
> `dailyGoal = 30` significa que el usuario quiere repasar 30 tarjetas en total hoy.
> `sessionSize = 10` significa que cada sesión individual tiene un máximo de 10 tarjetas.
> El usuario puede completar 3 sesiones de 10 para alcanzar su meta diaria.

### Estado de sesión (IndexedDB: `studyState`)

```typescript
interface StudyState {
  key: "lastActivity";
  value: {
    type: "flashcards" | "quiz" | "exam";
    certificationId: string;
    moduleId?: string;
    examId?: string;
    route: string;              // Hash route completa. Ej: "#/certification/aws-saa/module/iam/flashcards"
    updatedAt: string;          // ISO 8601
  }
}
```

### Progreso Calculado (en memoria, nunca almacenado)

```typescript
interface CertificationProgress {
  certificationId: string;

  // PROGRESS — cobertura: ¿cuánto contenido ha visto el usuario?
  totalFlashcards: number;
  studiedFlashcards: number;       // reviewCount > 0
  progress: number;                // 0-100

  // MASTERY — calidad: ¿qué tan bien domina el contenido?
  // Indicador basado en autoevaluación — ver nota abajo
  masteredFlashcards: number;      // confidence === "EASY" && streak >= 3
  avgStreak: number;
  dueToday: number;
  avgQuizScore: number | null;
  lastQuizScore: number | null;
  lastQuizDate: string | null;
  mastery: number;                 // 0-100

  // Exámenes
  bestExamScore: number | null;
  lastExamScore: number | null;
  lastExamDate: string | null;

  // Estado y detalle por módulo
  status: ModuleStatus;
  modules: ModuleProgress[];
}

type ModuleStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "REVIEW_REQUIRED"
  | "COMPLETED"
  | "MASTERED";
```

> **Nota sobre `mastery`:** Es un indicador de estudio basado en autoevaluación (UNKNOWN/HARD/GOOD/EASY). Un usuario podría seleccionar siempre EASY e inflar artificialmente su mastery. Los quizzes y exámenes ofrecen métricas más objetivas. En versiones futuras se puede correlacionar el rendimiento en quizzes con las flashcards correspondientes por `tags`.

---

### Fórmulas de Progress y Mastery

#### Progress — Cobertura

```
progress = (studiedFlashcards / totalFlashcards) * 100
```

No depende de la calidad de las respuestas, solo de si el usuario visitó la tarjeta.

#### Mastery — Calidad

```
mastery = (masteredFlashcards / totalFlashcards) * 0.5 * 100
        + (avgQuizScore ?? 0)                    * 0.3
        + min(avgStreak / 10, 1.0)               * 0.2 * 100
```

- `masteredFlashcards`: `confidence === "EASY"` **y** `streak >= 3`
- `avgQuizScore`: promedio de todos los intentos de quiz del módulo (0 si no hay intentos)
- `avgStreak`: promedio de `streak` de tarjetas con `reviewCount > 0`

#### ModuleStatus — precedencia explícita

Los estados se evalúan en este orden. El primero que se cumple gana:

```
1. MASTERED         → mastery >= 90
2. REVIEW_REQUIRED  → dueToday > 0 && progress > 0
3. COMPLETED        → progress === 100 && lastQuizScore >= passingScore
4. IN_PROGRESS      → progress > 0
5. NOT_STARTED      → progress === 0 (default)
```

Un módulo puede ser simultáneamente `COMPLETED` y tener tarjetas vencidas. En ese caso se muestra `REVIEW_REQUIRED` para incentivar el repaso.

---

### Schema de exportación (study-progress.json)

```typescript
interface ProgressExport {
  schemaVersion: "1.0";
  exportVersion: "1";          // Versión del formato de exportación (entero como string)
  appVersion: string;          // Versión de Study App que generó el export
  exportedAt: string;          // ISO 8601
  data: {
    flashcardProgress: FlashcardProgress[];
    flashcardReviews:  FlashcardReview[];
    quizAttempts:      QuizAttempt[];
    examAttempts:      ExamAttempt[];
    studySettings:     Array<{ key: string; value: any }>;
    studyState:        StudyState[];
  };
}
```

> Al importar, si `exportVersion` es diferente de la versión soportada, la app muestra un error de incompatibilidad y no importa nada.

---

## 8. IndexedDB Schema

```
Database:  study-app-db
Version:   1
```

### Store: `flashcardProgress`

**Key path:** `id` (`"{certId}::{moduleId}::{cardId}"`)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | PK compuesta |
| `certificationId` | string | |
| `moduleId` | string | |
| `flashcardId` | string | |
| `confidence` | string | `UNKNOWN \| HARD \| GOOD \| EASY` |
| `reviewCount` | number | Total acumulado. Default: 0 |
| `streak` | number | Consecutivas satisfactorias. Default: 0 |
| `intervalDays` | number | Intervalo actual en días. Default: 1 |
| `lastReviewed` | string\|null | ISO 8601 |
| `nextReview` | string\|null | ISO 8601 |
| `status` | string | `active \| suspended` |
| `createdAt` | string | ISO 8601 |
| `updatedAt` | string | ISO 8601 |

**Índices:**

| Índice | Campo(s) | Propósito |
|---|---|---|
| `by-certification` | `certificationId` | Todo el progreso de una cert |
| `by-certification-module` | `[certificationId, moduleId]` | Progreso de un módulo específico (evita ambigüedad si dos certs tienen el mismo moduleId) |
| `by-next-review` | `nextReview` | Tarjetas pendientes de repaso |
| `by-confidence` | `confidence` | Filtrar por nivel |

> **Índice compuesto:** `by-certification-module` resuelve el problema de módulos con el mismo `id` en distintas certificaciones (ej: `iam` en `aws-saa` y en `aws-developer`).

---

### Store: `flashcardReviews`

**Key path:** `id` (autoIncrement)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | number | PK autoIncrement |
| `certificationId` | string | |
| `moduleId` | string | |
| `flashcardId` | string | |
| `reviewedAt` | string | ISO 8601 |
| `rating` | string | `UNKNOWN \| HARD \| GOOD \| EASY` |
| `previousStreak` | number | Streak antes de esta revisión |
| `newStreak` | number | Streak después de esta revisión |
| `previousIntervalDays` | number | |
| `newIntervalDays` | number | |

**Índices:** `by-flashcard` (`[certificationId, moduleId, flashcardId]`), `by-date` (`reviewedAt`)

---

### Store: `quizAttempts`

**Key path:** `id` (autoIncrement)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | number | PK autoIncrement |
| `certificationId` | string | |
| `moduleId` | string | |
| `attemptedAt` | string | ISO 8601 |
| `durationSeconds` | number | |
| `totalQuestions` | number | |
| `correctAnswers` | number | |
| `score` | number | 0-100 |
| `passed` | boolean | |
| `answers` | array | `[{ questionId, selectedAnswers, correct }]` |

**Índices:** `by-certification`, `by-certification-module` (`[certificationId, moduleId]`), `by-date`

---

### Store: `examAttempts`

**Key path:** `id` (autoIncrement)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | number | PK autoIncrement |
| `certificationId` | string | |
| `examId` | string | |
| `attemptedAt` | string | ISO 8601 |
| `durationSeconds` | number | |
| `totalQuestions` | number | |
| `correctAnswers` | number | |
| `score` | number | 0-100 |
| `passed` | boolean | |
| `answers` | array | `[{ questionId, selectedAnswers, correct, moduleId }]` |

**Índices:** `by-certification`, `by-exam`, `by-date`

---

### Store: `studySettings`

**Key path:** `key` (string)

| Key | Tipo | Default | Descripción |
|---|---|---|---|
| `dailyGoal` | number | `30` | Tarjetas totales a repasar por día |
| `sessionSize` | number | `10` | Máximo de tarjetas por sesión |
| `appVersion` | string | `"1.0.0"` | Versión instalada |
| `lastBackup` | string\|null | `null` | ISO 8601 del último export |

---

### Store: `studyState`

**Key path:** `key` (string)

| Key | Tipo | Descripción |
|---|---|---|
| `lastActivity` | object | Última actividad del usuario (ver modelo en §7) |

---

### Estrategia de migración

```javascript
db.onupgradeneeded = (event) => {
  const oldVersion = event.oldVersion;

  if (oldVersion < 1) {
    // v1 inicial: crear todos los stores
    // flashcardProgress, flashcardReviews, quizAttempts,
    // examAttempts, studySettings, studyState
    createAllV1Stores(db);
  }

  if (oldVersion < 2) {
    // Ejemplo de futura migración v1 → v2:
    // addIndex(db, 'flashcardProgress', 'by-streak', 'streak')
  }
};
```

**Reglas:**
1. Nunca borrar datos de usuario durante una migración.
2. Cada migración es idempotente.
3. Si falla, mostrar error y ofrecer exportar datos antes de continuar.

---

## 9. Algoritmo de Repetición Espaciada

Implementado en `src/utils/spaced-repetition.js`. Aislado, sin efectos secundarios, completamente testeable.

### Semántica de `streak` (v1.2)

| Evaluación | Efecto sobre `streak` | Razonamiento |
|---|---|---|
| `UNKNOWN` (No sabía) | `streak = 0` | Reset completo — el usuario no sabe la tarjeta |
| `HARD` (Difícil) | `streak = max(0, streak - 1)` | Penalización parcial — tolera dificultad sin reset completo |
| `GOOD` (Bien) | `streak = streak + 1` | Respuesta satisfactoria |
| `EASY` (Fácil) | `streak = streak + 1` | Respuesta satisfactoria |

> **Por qué HARD descuenta y no congela:** Si el usuario responde EASY×2, HARD, EASY, el resultado con congela sería `streak = 3` aunque no hubo 3 consecutivas. Con descuento: `0→1→2→1→2`, reflejando que hubo una dificultad intermedia.

---

### Algoritmo de intervalos (v1.2)

El intervalo se calcula a partir de `intervalDays` actual y `streak`, **no** de `reviewCount`. Esto evita el problema de una tarjeta vista 20 veces con malas evaluaciones que de pronto salta a 60 días tras una sola respuesta EASY.

```
UNKNOWN → intervalDays = 1

HARD    → intervalDays = 2

GOOD    → intervalDays = max(3, previousIntervalDays × 2)

EASY    → intervalDays = max(7, previousIntervalDays × 2.5)

MAX_INTERVAL = 60 días (techo)
```

`previousIntervalDays` es el `intervalDays` almacenado en `FlashcardProgress` antes de esta evaluación. Para una tarjeta nueva (primera revisión), `previousIntervalDays = 1`.

---

### Pseudocódigo completo

```javascript
const MAX_INTERVAL = 60;

/**
 * Calcula el nuevo intervalDays y la fecha de próxima revisión.
 * @param {string} confidence  - "UNKNOWN" | "HARD" | "GOOD" | "EASY"
 * @param {number} previousIntervalDays  - intervalDays actual de FlashcardProgress
 * @returns {{ intervalDays: number, nextReview: string }}
 */
function calculateNextReview(confidence, previousIntervalDays) {
  let days;
  switch (confidence) {
    case "UNKNOWN": days = 1;                                          break;
    case "HARD":    days = 2;                                          break;
    case "GOOD":    days = Math.max(3, previousIntervalDays * 2);      break;
    case "EASY":    days = Math.max(7, previousIntervalDays * 2.5);    break;
    default:        days = 1;
  }
  days = Math.min(days, MAX_INTERVAL);
  return {
    intervalDays: days,
    nextReview:   addDays(new Date(), days).toISOString(),
  };
}

/**
 * Calcula el nuevo streak.
 * @param {number} currentStreak
 * @param {string} confidence
 * @returns {number}
 */
function updateStreak(currentStreak, confidence) {
  switch (confidence) {
    case "UNKNOWN": return 0;
    case "HARD":    return Math.max(0, currentStreak - 1);
    case "GOOD":
    case "EASY":    return currentStreak + 1;
    default:        return currentStreak;
  }
}
```

---

### Ejemplos concretos de intervalos

| Evaluación | `previousIntervalDays` | Nuevo `intervalDays` |
|---|---|---|
| UNKNOWN | cualquiera | 1 |
| HARD | cualquiera | 2 |
| GOOD | 1 | 3 |
| GOOD | 3 | 6 |
| GOOD | 6 | 12 |
| GOOD | 30 | 60 (techo) |
| EASY | 1 | 7 |
| EASY | 3 | 7 |
| EASY | 4 | 10 |
| EASY | 10 | 25 |
| EASY | 24 | 60 (techo) |

> **Antes (v1.1):** Una tarjeta con `reviewCount=20` y primera respuesta EASY producía `20 × 7 = 140` días → techo 60 días. Con el algoritmo v1.2, el `intervalDays` parte de 1 y crece gradualmente con cada EASY, por lo que llegar a 60 días requiere ~5-6 evaluaciones EASY consecutivas.

---

### Ejemplos de progresión con streak

```
Sesión 1: EASY  → streak: 0→1, interval: 1→7
Sesión 2: EASY  → streak: 1→2, interval: 7→17
Sesión 3: HARD  → streak: 2→1, interval: 17→2  (penalización, vuelve pronto)
Sesión 4: GOOD  → streak: 1→2, interval: 2→4
Sesión 5: EASY  → streak: 2→3, interval: 4→10  (mastered cuando streak≥3)
```

---

### Preparación para SM-2 / FSRS

| Dato necesario | Disponible en v1.2 |
|---|---|
| Número de repeticiones (`n`) | `reviewCount` |
| Intervalo anterior (`I`) | `intervalDays` |
| Historial completo | `flashcardReviews` |
| Respuestas consecutivas correctas | `streak` |

Una migración futura a SM-2 puede derivar el factor de facilidad EF desde `streak` e `intervalDays` sin perder datos.

---

## 10. Motor de Sesión de Estudio

Implementado en `src/services/study-service.js`.

### `buildStudySession(certId, moduleId, options)`

Construye la lista de flashcards para una sesión, respetando `sessionSize` y priorizando por relevancia.

**Parámetros:**

```javascript
{
  certificationId: string,
  moduleId: string,
  mode: "due-only" | "new-only" | "mixed",  // default: "mixed"
  sessionSize: number,                       // desde studySettings.sessionSize
}
```

**Prioridad de selección:**

```
1. Tarjetas vencidas (due)     — nextReview <= now
2. Tarjetas en reaprendizaje   — en learningQueue de la sesión actual
3. Tarjetas nuevas             — reviewCount === 0
4. Repaso adicional            — tarjetas estudiadas no vencidas (si hay espacio)
```

**Ejemplo con `sessionSize = 10`:**

```
Escenario A:
  due = 6,  new = 20
  → 6 due + 4 new = 10 tarjetas

Escenario B:
  due = 15, new = 20
  → 10 due + 0 new = 10 tarjetas (due llena la sesión)

Escenario C:
  due = 0,  new = 20
  → 0 due + 10 new = 10 tarjetas
```

---

### Reaprendizaje dentro de la sesión (`learningQueue`)

Cuando el usuario evalúa una tarjeta como `UNKNOWN` durante una sesión:

1. Se registra la evaluación en IndexedDB (`flashcardProgress` + `flashcardReviews`) con `intervalDays = 1`.
2. La tarjeta se inserta al **final** de la cola de la sesión actual (`learningQueue`).
3. La tarjeta aparecerá nuevamente antes de que termine la sesión.
4. `learningQueue` es una estructura temporal en memoria — no se persiste en IndexedDB.

```
Sesión: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                ↑
         Usuario falla tarjeta 3

Resultado: [1, 2, ✓3, 4, 5, 6, 7, 8, 9, 10, 3]
                                              ↑
                                        Reaprendizaje
```

Si el usuario falla la tarjeta de reaprendizaje también, se vuelve a insertar al final (con límite de 2 reinserciones por tarjeta por sesión para evitar loops infinitos).

---

## 11. Design Tokens

Todos los componentes consumen exclusivamente estos tokens. Los valores se definen en `assets/css/main.css` y se sobreescriben en `assets/css/themes.css`.

```css
:root {
  /* Colores de marca */
  --color-primary:        #4F6EF7;
  --color-primary-hover:  #3A56D4;
  --color-success:        #22C55E;
  --color-warning:        #F59E0B;
  --color-danger:         #EF4444;
  --color-neutral:        #6B7280;

  /* Fondos */
  --bg-primary:           #FFFFFF;
  --bg-secondary:         #F9FAFB;
  --bg-card:              #FFFFFF;
  --bg-overlay:           rgba(0, 0, 0, 0.5);

  /* Texto */
  --text-primary:         #111827;
  --text-secondary:       #6B7280;
  --text-muted:           #9CA3AF;
  --text-inverse:         #FFFFFF;

  /* Bordes */
  --border-color:         #E5E7EB;
  --border-color-strong:  #D1D5DB;

  /* Border radius */
  --radius-sm:    4px;
  --radius-md:    8px;
  --radius-lg:    12px;
  --radius-xl:    16px;
  --radius-full:  9999px;

  /* Spacing (base 4px) */
  --spacing-xs:   4px;
  --spacing-sm:   8px;
  --spacing-md:   16px;
  --spacing-lg:   24px;
  --spacing-xl:   32px;
  --spacing-2xl:  48px;

  /* Tipografía */
  --font-family:          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-size-xs:         12px;
  --font-size-sm:         14px;
  --font-size-md:         16px;
  --font-size-lg:         20px;
  --font-size-xl:         24px;
  --font-size-2xl:        32px;
  --font-weight-normal:   400;
  --font-weight-medium:   500;
  --font-weight-bold:     700;
  --line-height-tight:    1.25;
  --line-height-normal:   1.5;

  /* Sombras */
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
  --shadow-md:  0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg:  0 10px 15px rgba(0,0,0,0.10);

  /* Transiciones */
  --transition-fast:    150ms ease;
  --transition-normal:  250ms ease;

  /* Touch target mínimo (WCAG) */
  --touch-target:  44px;
}
```

**Dark mode** — `[data-theme="dark"]` en `themes.css`:

```css
[data-theme="dark"] {
  --bg-primary:           #0F172A;
  --bg-secondary:         #1E293B;
  --bg-card:              #1E293B;
  --text-primary:         #F1F5F9;
  --text-secondary:       #94A3B8;
  --text-muted:           #64748B;
  --border-color:         #334155;
  --border-color-strong:  #475569;
  --color-primary:        #6B8AF9;
  --color-primary-hover:  #8FA4FB;
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.3);
  --shadow-md:  0 4px 6px rgba(0,0,0,0.4);
  --shadow-lg:  0 10px 15px rgba(0,0,0,0.5);
}
```

---

## 12. Plan de Implementación

17 fases incrementales. Cada fase deja la aplicación en estado funcional y verificable.

**Prompt de implementación por fase:**

```
Implementa exclusivamente la FASE N definida en SPEC.md.

Reglas:
- No implementes funcionalidades de fases posteriores.
- Respeta la arquitectura definida (capas, servicios).
- Todo acceso a IndexedDB pasa por storage-service.
- Todo acceso a contenido JSON pasa por content-service.
- No hardcodees certificaciones ni módulos.
- No agregues dependencias innecesarias.
- Ejecuta los tests correspondientes.

Al terminar:
1. Lista archivos creados y modificados.
2. Explica decisiones técnicas tomadas.
3. Reporta tests ejecutados y resultados.
4. Reporta desviaciones respecto al SPEC.
5. Detente y espera aprobación.
```

---

### FASE 1 — Project Skeleton ✅

**Objetivo:** La aplicación arranca, muestra pantalla de inicio, SW se registra.

- [x] 1.1 Estructura de directorios completa
- [x] 1.2 `index.html` con meta viewport, CSP, links CSS/manifest
- [x] 1.3 `assets/css/main.css` — reset + design tokens
- [x] 1.4 `assets/css/themes.css` — dark mode overrides
- [x] 1.5 `src/config.js` — constantes globales
- [x] 1.6 `src/app.js` — entry point: tema, rutas, SW
- [x] 1.7 `src/router.js` — hash router con params
- [x] 1.8 `sw.js` — Cache First (shell) + Network First (content)
- [x] 1.9 `manifest.webmanifest` válido
- [x] 1.10 Iconos SVG placeholder
- [x] 1.11 `content/catalog.json` inicial

**✓ Criterio:** `python3 -m http.server 8080` sirve la app sin errores. SW en DevTools.

---

### FASE 2 — JSON Schemas ✅

**Objetivo:** Schemas formales y validador funcional.

- [x] 2.1-2.4 Schemas: catalog, certification-manifest, module, exam
- [x] 2.5 `src/utils/validators.js` — `validate()` + `parseAndValidate()`
- [x] 2.6 Fixtures de prueba (valid-catalog, valid-module, invalid-module)
- [x] 2.7-2.8 Tests: 34/34 pasan

**✓ Criterio:** Validador detecta correctamente archivos válidos e inválidos.

---

### FASE 3 — Content Loader ✅

**Objetivo:** Carga dinámica de catálogo, manifests y módulos.

- [x] 3.1-3.4 `content-service.js` — getCatalog, getManifest, getModule, getExam
- [x] 3.5-3.7 Contenido real: catalog.json, manifest.json aws-saa, 01-iam.json
- [x] 3.8 Tests: 21/21 pasan

**✓ Criterio:** getCatalog() retorna catálogo parseado y validado desde consola.

**Pendiente para completar Fase 3:** Actualizar `manifest.json` y `01-iam.json` con campo `contentVersion`.

---

### FASE 4 — Catálogo / Dashboard Principal

**Objetivo:** Dashboard muestra certificaciones con progress y mastery.

- [ ] 4.1-4.2 `components.css` y `layout.css` usando design tokens
- [ ] 4.3 `src/components/dashboard.js` — progress + mastery por cert
- [ ] 4.4 `src/components/progress-bar.js` reutilizable
- [ ] 4.5 Ruta `#/` registrada
- [ ] 4.6 Estados de carga y error
- [ ] 4.7 Verificar mobile 360px

**✓ Criterio:** Dashboard muestra aws-saa. Deshabilitar en catalog → desaparece.

---

### FASE 5 — Navegación de Módulos

- [ ] 5.1-5.2 `certification-detail.js` + ruta `#/certification/:id`
- [ ] 5.3-5.4 `module-view.js` + ruta `#/certification/:id/module/:moduleId`
- [ ] 5.5 Navegación de regreso (breadcrumb)
- [ ] 5.6 Crear `content/aws-saa/modules/02-ec2.json` con `contentVersion`

**✓ Criterio:** Dashboard → aws-saa → módulos IAM y EC2 → entrar a IAM.

---

### FASE 6 — Flashcards (sin persistencia)

- [ ] 6.1 `src/components/flashcard.js`
- [ ] 6.2 Animación CSS de flip
- [ ] 6.3 Botones: No sabía · Difícil · Bien · Fácil
- [ ] 6.4 Navegación entre tarjetas con contador
- [ ] 6.5 Pantalla de resumen al finalizar
- [ ] 6.6 Ruta `#/certification/:id/module/:moduleId/flashcards`
- [ ] 6.7 Teclado: Space = revelar, 1-4 = evaluar
- [ ] 6.8 Touch targets ≥ 44px

**✓ Criterio:** Recorrer y evaluar tarjetas de IAM (sin guardar aún).

---

### FASE 7 — IndexedDB y Progreso de Flashcards

- [ ] 7.1 `src/services/storage-service.js` — CRUD genérico
- [ ] 7.2 Migración v1: stores `flashcardProgress`, `flashcardReviews`, `quizAttempts`, `examAttempts`, `studySettings`, `studyState`
- [ ] 7.3 Índices compuestos: `by-certification-module` en `flashcardProgress` y `quizAttempts`
- [ ] 7.4 `src/services/progress-service.js` — `saveFlashcardEvaluation()`: actualiza `confidence`, `reviewCount`, `streak`, `intervalDays`, `nextReview` en `flashcardProgress` y escribe registro en `flashcardReviews`
- [ ] 7.5 Conectar `flashcard.js` con `progress-service`
- [ ] 7.6 Cargar progreso existente al iniciar sesión
- [ ] 7.7 `src/utils/spaced-repetition.js` — `calculateNextReview(confidence, previousIntervalDays)` y `updateStreak(currentStreak, confidence)`
- [ ] 7.8 `tests/unit/spaced-repetition.test.js`
- [ ] 7.9 Verificar en DevTools → IndexedDB que `streak` e `intervalDays` se actualizan correctamente

**✓ Criterio:** Evaluar tarjetas → cerrar navegador → abrir → estado restaurado. UNKNOWN resetea streak. HARD decrementa streak. `flashcardReviews` registra cada evaluación.

---

### FASE 8 — Repetición Espaciada, Sesión y Reaprendizaje

- [ ] 8.1 `getDueFlashcards(certId, moduleId)` usando índice `by-certification-module`
- [ ] 8.2 `src/services/study-service.js` con `buildStudySession(certId, moduleId, options)` — prioridad: due → relearning → new
- [ ] 8.3 `learningQueue` en memoria — tarjetas UNKNOWN se reincorporan al final de la sesión (máx. 2 reinserciones)
- [ ] 8.4 Actualizar `studyState` al iniciar/continuar una sesión
- [ ] 8.5 Mostrar conteo de tarjetas pendientes hoy en `certification-detail`
- [ ] 8.6 Opciones "Repasar pendientes" y "Estudiar todo"
- [ ] 8.7 Ampliar `tests/unit/progress-service.test.js`

**✓ Criterio:** Tarjetas EASY no aparecen hasta la fecha calculada. Tarjetas UNKNOWN reaparecen en la misma sesión. `studyState` actualizado.

---

### FASE 9 — Quizzes

- [ ] 9.1 `src/components/quiz.js`
- [ ] 9.2 Tipos: single-choice, multiple-choice, true-false
- [ ] 9.3 Navegación entre preguntas
- [ ] 9.4 Resultado: score, passed/failed, explicaciones, áreas a reforzar por tag
- [ ] 9.5 `src/services/exam-service.js` — `scoreQuiz()`, `scoreExam()`
- [ ] 9.6 Guardar intento en `quizAttempts` (con índice compuesto)
- [ ] 9.7 Ruta `#/certification/:id/module/:moduleId/quiz`
- [ ] 9.8 `tests/unit/exam-service.test.js`

**✓ Criterio:** Quiz completado → resultado → intento en IndexedDB con certificationId + moduleId.

---

### FASE 10 — Examen Final

- [ ] 10.1 `content/aws-saa/exams/final.json` — 10+ preguntas, `language: "es-MX"`
- [ ] 10.2 `src/components/exam.js`
- [ ] 10.3 Shuffle de preguntas y opciones
- [ ] 10.4 Resultado con historial y áreas a reforzar por moduleId
- [ ] 10.5 Guardar intento en `examAttempts`
- [ ] 10.6 Rutas de examen y resultado

**✓ Criterio:** Examen completado → resultado → historial de intentos visible.

---

### FASE 11 — Dashboard con Progress y Mastery

- [ ] 11.1 `getCertificationProgress(certId)` — métricas separadas
- [ ] 11.2 Calcular `progress` (cobertura) y `mastery` (calidad) según fórmulas §7
- [ ] 11.3 Calcular `ModuleStatus` con precedencia definida en §7
- [ ] 11.4 Dashboard: progress y mastery visualmente distintos, nota aclaratoria sobre mastery como indicador
- [ ] 11.5 `certification-detail.js` con stats completas
- [ ] 11.6 `src/components/statistics.js`
- [ ] 11.7 Tests de cálculo de progress, mastery y status con todos los casos de precedencia

**✓ Criterio:** Dashboard distingue "avance" de "dominio". Estados de módulos reflejan precedencia correcta.

---

### FASE 12 — Export / Import de Progreso

- [ ] 12.1 `src/components/settings.js`
- [ ] 12.2 `exportProgress()` — genera `study-progress.json` con schema §7 (incluye `flashcardReviews` y `studyState`)
- [ ] 12.3 `importProgress(file)` — flujo transaccional completo:
  - leer → parsear → validar estructura → validar versiones → mostrar resumen → confirmar → abrir transacción IDB → importar todos los stores → commit
  - Si cualquier paso falla, no escribir nada
- [ ] 12.4 Validador de `study-progress.json` (incluye `exportVersion`)
- [ ] 12.5 Ruta `#/settings`
- [ ] 12.6 `tests/unit/import-export.test.js` — JSON corrupto, exportVersion incompatible, rollback

**✓ Criterio:** Exportar → borrar datos → importar → progreso idéntico. JSON parcialmente corrupto no importa nada.

---

### FASE 13 — PWA y Offline

- [ ] 13.1 SW completo con estrategias por tipo de recurso
- [ ] 13.2 Pre-cachear app shell en `install`
- [ ] 13.3 Limpiar caches obsoletos en `activate`
- [ ] 13.4 Notificación de actualización disponible
- [ ] 13.5 Iconos reales (192px, 512px, maskable)
- [ ] 13.6 Verificar criterios PWA §3.4 (tabla completa)
- [ ] 13.7 Probar instalación en Chrome y Safari
- [ ] 13.8 Probar modo avión: app shell, módulo descargado, módulo no descargado
- [ ] 13.9 Verificar Lighthouse Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90

**✓ Criterio:** Todos los criterios de la tabla PWA §3.4 verificados. Módulo no descargado muestra mensaje claro offline.

---

### FASE 14 — Responsive UI y Accesibilidad

- [ ] 14.1 Mobile 360px sin overflow
- [ ] 14.2 Dark mode automático y toggle manual
- [ ] 14.3 Toggle de tema persistido en `localStorage`
- [ ] 14.4 Contraste WCAG AA en light y dark
- [ ] 14.5 `focus-visible` en todos los interactivos
- [ ] 14.6 ARIA en flashcards y quiz
- [ ] 14.7 Teclado completo en flashcards
- [ ] 14.8 Transiciones de vista suaves
- [ ] 14.9 Probar en iPhone Safari y Android Chrome

**✓ Criterio:** Usable con una mano en móvil. Dark mode funciona. Teclado completo.

---

### FASE 15 — Testing Completo

- [ ] 15.1 `validators.test.js` — todos los schemas incluyendo `contentVersion`
- [ ] 15.2 `spaced-repetition.test.js`:
  - UNKNOWN resetea streak
  - HARD decrementa streak (mínimo 0)
  - GOOD/EASY incrementan streak
  - Intervalos basados en `previousIntervalDays`, no en `reviewCount`
  - Tarjeta difícil (reviewCount=20) no salta a 60 días con primera EASY
  - Techo de 60 días
- [ ] 15.3 `progress-service.test.js` — progress, mastery, todos los casos de ModuleStatus con precedencia correcta
- [ ] 15.4 `exam-service.test.js` — scoring por tipo de pregunta
- [ ] 15.5 `import-export.test.js`:
  - JSON corrupto
  - schemaVersion incompatible
  - exportVersion incompatible
  - importación parcialmente inválida → rollback completo
- [ ] 15.6 `content-loader.test.js` — error de red, JSON inválido, contentVersion
- [ ] 15.7 Tests de IndexedDB:
  - Dos certs con mismo moduleId usan índice compuesto correctamente
  - `flashcardReviews` registra previousStreak/newStreak/previousIntervalDays/newIntervalDays
- [ ] 15.8 Documentar en `tests/README.md`

**✓ Criterio:** Todos los tests pasan. Coverage > 80% en funciones críticas.

---

### FASE 16 — Documentación

- [ ] 16.1 `README.md` completo
- [ ] 16.2 Study Content Schema v1 con `contentVersion`
- [ ] 16.3 Política de actualización de contenido (PATCH/MINOR/MAJOR)
- [ ] 16.4 Export/import, PWA, offline
- [ ] 16.5 `content/example/` — plantilla mínima con `contentVersion`
- [ ] 16.6 Prompt base para IA con `contentVersion`

**✓ Criterio:** Agregar certificación en < 5 min siguiendo el README.

---

### FASE 17 — Documentación de Despliegue AWS

- [ ] 17.1 `docs/deploy-aws.md` — S3 static hosting
- [ ] 17.2 CloudFront (origin, behaviors, error pages)
- [ ] 17.3 HTTPS con ACM
- [ ] 17.4 Route 53 para dominio personalizado
- [ ] 17.5 Invalidación de caché en CloudFront
- [ ] 17.6 Troubleshooting: CORS, CSP headers, PWA en subdominio

**✓ Criterio:** Deploy en AWS sin asistencia adicional siguiendo el documento.

---

## Resumen de fases

| Fase | Entregable | Estado | Criterio |
|---|---|---|---|
| 1 | Project skeleton + SW | ✅ Completo | App carga, SW registrado |
| 2 | JSON Schemas + validador | ✅ Completo | 34 tests pasan |
| 3 | Content Loader | ✅ Completo* | 21 tests pasan |
| 4 | Dashboard principal | ⬜ Pendiente | Catálogo dinámico |
| 5 | Navegación de módulos | ⬜ Pendiente | Browse cert → módulos |
| 6 | Flashcards sin persistencia | ⬜ Pendiente | Revisar y evaluar |
| 7 | IndexedDB + SR completo | ⬜ Pendiente | streak, intervalDays, reviews |
| 8 | Sesión + reaprendizaje | ⬜ Pendiente | learningQueue, studyState |
| 9 | Quizzes | ⬜ Pendiente | Quiz con score |
| 10 | Examen final | ⬜ Pendiente | Examen con historial |
| 11 | Dashboard progress + mastery | ⬜ Pendiente | Métricas distintas |
| 12 | Export/Import transaccional | ⬜ Pendiente | Rollback funcional |
| 13 | PWA + Offline | ⬜ Pendiente | Criterios §3.4 |
| 14 | Responsive + Accesibilidad | ⬜ Pendiente | Móvil + teclado |
| 15 | Tests completos | ⬜ Pendiente | Suite verde |
| 16 | Documentación | ⬜ Pendiente | README completo |
| 17 | Docs AWS | ⬜ Pendiente | Deploy sin asistencia |

*Fase 3: pendiente agregar `contentVersion` al contenido JSON de aws-saa.
