# Study App

Motor genérico de estudio basado en flashcards, repetición espaciada, quizzes y exámenes finales. Funciona completamente offline como PWA.

**El código no conoce ninguna certificación específica.** Todo el contenido académico vive en archivos JSON. Agregar una nueva certificación no requiere modificar JavaScript.

---

## Índice

1. [Ejecutar localmente](#1-ejecutar-localmente)
2. [Agregar una certificación](#2-agregar-una-certificación)
3. [Agregar un módulo](#3-agregar-un-módulo)
4. [Crear flashcards](#4-crear-flashcards)
5. [Crear quizzes](#5-crear-quizzes)
6. [Crear un examen final](#6-crear-un-examen-final)
7. [Generar contenido con IA](#7-generar-contenido-con-ia)
8. [Validar archivos JSON](#8-validar-archivos-json)
9. [Exportar e importar progreso](#9-exportar-e-importar-progreso)
10. [Instalar como PWA](#10-instalar-como-pwa)
11. [Desplegar en AWS S3 + CloudFront](#11-desplegar-en-aws-s3--cloudfront)
12. [Arquitectura del proyecto](#12-arquitectura-del-proyecto)

---

## 1. Ejecutar localmente

Cualquier servidor HTTP estático sirve la app. No se necesita Node.js en producción ni ningún proceso de build.

```bash
# Con Python (viene en macOS/Linux)
cd study-app
python3 -m http.server 8080

# Con Node.js
npx serve .

# Con PHP
php -S localhost:8080
```

Abrir: `http://localhost:8080`

> El Service Worker requiere HTTPS o `localhost`. No funciona servido desde `file://`.

---

## 2. Agregar una certificación

### Paso 1 — Crear la carpeta de contenido

```
content/
└── mi-certificacion/
    ├── manifest.json
    ├── modules/
    └── exams/
```

### Paso 2 — Crear `manifest.json`

```json
{
  "schemaVersion": "1.0",
  "contentVersion": "1.0.0",
  "certificationId": "mi-certificacion",
  "name": "Mi Certificación",
  "description": "Descripción del programa de estudio",
  "language": "es-MX",
  "totalEstimatedHours": 20,
  "modules": [
    {
      "id": "modulo-uno",
      "order": 1,
      "name": "Módulo 1",
      "description": "Descripción del módulo",
      "file": "modules/01-modulo-uno.json"
    }
  ],
  "exams": []
}
```

### Paso 3 — Registrar en `catalog.json`

```json
{
  "schemaVersion": "1.0",
  "certifications": [
    {
      "id": "mi-certificacion",
      "name": "Mi Certificación",
      "description": "Descripción breve",
      "icon": "📘",
      "manifest": "mi-certificacion/manifest.json",
      "enabled": true
    }
  ]
}
```

### Paso 4 — Abrir la app

La certificación aparece automáticamente en el dashboard.

---

## 3. Agregar un módulo

### Paso 1 — Crear el archivo JSON del módulo

```
content/mi-certificacion/modules/01-modulo-uno.json
```

Estructura mínima:

```json
{
  "schemaVersion": "1.0",
  "contentVersion": "1.0.0",
  "type": "study-module",
  "certificationId": "mi-certificacion",
  "language": "es-MX",
  "module": {
    "id": "modulo-uno",
    "order": 1,
    "name": "Módulo 1",
    "description": "Descripción",
    "estimatedMinutes": 30
  },
  "flashcards": [],
  "quiz": {
    "passingScore": 80,
    "questions": []
  }
}
```

### Paso 2 — Registrar en `manifest.json`

Agregar la entrada en el array `modules` del manifest de la certificación.

### Regla

Agregar módulos **nunca requiere modificar JavaScript**.

---

## 4. Crear flashcards

Las flashcards van en el array `flashcards` del archivo de módulo.

```json
{
  "id": "modulo-001",
  "question": "¿Qué es X?",
  "answer": "X es...",
  "explanation": "Explicación adicional (opcional)",
  "difficulty": "basic",
  "tags": ["tag1", "tag2"]
}
```

**Convención de IDs:** `{moduleId}-{NNN}` — Ej: `modulo-uno-001`, `modulo-uno-002`

**Dificultad:** `basic` · `intermediate` · `advanced` (opcional)

**Tags:** array de strings en kebab-case (opcional, usado para "áreas a reforzar")

---

## 5. Crear quizzes

Las preguntas van en `quiz.questions` del archivo de módulo.

### Single choice

```json
{
  "id": "modulo-q001",
  "type": "single-choice",
  "question": "¿Cuál es la respuesta correcta?",
  "options": [
    { "id": "a", "text": "Opción A" },
    { "id": "b", "text": "Opción B" },
    { "id": "c", "text": "Opción C" }
  ],
  "correctAnswers": ["a"],
  "explanation": "Porque A es correcto."
}
```

### Multiple choice

```json
{
  "id": "modulo-q002",
  "type": "multiple-choice",
  "question": "¿Cuáles son correctas?",
  "options": [
    { "id": "a", "text": "Opción A" },
    { "id": "b", "text": "Opción B" },
    { "id": "c", "text": "Opción C" }
  ],
  "correctAnswers": ["a", "c"],
  "explanation": "A y C son correctas."
}
```

### Verdadero / Falso

```json
{
  "id": "modulo-q003",
  "type": "true-false",
  "question": "¿Esta afirmación es verdadera?",
  "options": [
    { "id": "true",  "text": "Verdadero" },
    { "id": "false", "text": "Falso" }
  ],
  "correctAnswers": ["false"],
  "explanation": "Es falsa porque..."
}
```

**Convención de IDs de preguntas:** `{moduleId}-q{NNN}` — Ej: `modulo-uno-q001`

---

## 6. Crear un examen final

Crea `content/mi-certificacion/exams/final.json`:

```json
{
  "schemaVersion": "1.0",
  "type": "exam",
  "certificationId": "mi-certificacion",
  "language": "es-MX",
  "exam": {
    "id": "final",
    "name": "Examen Final",
    "description": "Simulacro del examen oficial",
    "passingScore": 72,
    "timeLimit": 60,
    "shuffleQuestions": true,
    "shuffleOptions": true
  },
  "questions": [
    {
      "id": "exam-q001",
      "type": "single-choice",
      "moduleId": "modulo-uno",
      "question": "¿Pregunta del examen?",
      "options": [
        { "id": "a", "text": "Opción A" },
        { "id": "b", "text": "Opción B" }
      ],
      "correctAnswers": ["a"],
      "explanation": "Explicación.",
      "tags": ["tag1"]
    }
  ]
}
```

Registra el examen en `manifest.json`:

```json
"exams": [
  {
    "id": "final",
    "name": "Examen Final",
    "file": "exams/final.json"
  }
]
```

---

## 7. Generar contenido con IA

Study App está diseñado para que una IA genere módulos compatibles directamente.

### Prompt base

```
Genera un módulo de estudio en formato JSON usando Study Content Schema v1.

Parámetros:
- certificationId: {id}
- contentVersion: "1.0.0"
- moduleId: {id}
- order: {número}
- name: {nombre del módulo}
- language: es-MX
- estimatedMinutes: {minutos}
- flashcards: mínimo {N} tarjetas con id, question, answer, explanation, difficulty, tags
- quiz: mínimo {N} preguntas (mix de single-choice, multiple-choice, true-false)
- passingScore: {porcentaje}

Reglas:
- Incluir schemaVersion: "1.0" y contentVersion: "1.0.0"
- IDs de flashcards: {moduleId}-{NNN}  (ej: iam-001)
- IDs de preguntas: {moduleId}-q{NNN}  (ej: iam-q001)
- Los correctAnswers deben referenciar IDs de opciones existentes
- El resultado debe ser JSON válido sin comentarios
```

### Flujo completo

```
1. Pedir a la IA el módulo JSON
2. Guardar en content/{certId}/modules/{NN}-{moduleId}.json
3. Registrar en content/{certId}/manifest.json
4. Abrir la app → el módulo aparece automáticamente
```

---

## 8. Validar archivos JSON

### Desde Node.js (sin dependencias)

```bash
node --input-type=module <<'EOF'
import { validate } from './src/utils/validators.js';
import { readFileSync } from 'fs';

const file   = 'content/aws-saa/modules/01-iam.json';
const data   = JSON.parse(readFileSync(file, 'utf-8'));
const result = validate(data, 'module');

if (result.valid) {
  console.log('✔ Archivo válido');
} else {
  console.error('✖ Errores encontrados:');
  result.errors.forEach(e => console.error(' -', e));
}
EOF
```

### Schemas disponibles

| Schema | Archivo |
|---|---|
| `catalog` | `catalog.json` |
| `certification-manifest` | `manifest.json` |
| `module` | `modules/*.json` |
| `exam` | `exams/*.json` |
| `progress-export` | `study-progress.json` |

### Ejecutar tests del validador

```bash
node --test tests/unit/validators.test.js
```

---

## 9. Exportar e importar progreso

### Exportar

1. Abrir la app → ⚙️ Configuración → **Exportar progreso**
2. Se descarga `study-progress-YYYY-MM-DD.json`

### Importar

1. Abrir la app → ⚙️ Configuración → **Importar progreso**
2. Seleccionar el archivo `.json`
3. Revisar el resumen y confirmar

**La importación es transaccional:** si el archivo es inválido o hay un error, no se modifica nada en la base de datos local.

### Transferir entre dispositivos

```
Dispositivo A → Exportar → study-progress.json
                                    ↓
                           Copiar el archivo
                                    ↓
Dispositivo B → Importar → study-progress.json
```

---

## 10. Instalar como PWA

### Chrome / Edge (desktop y Android)

1. Abrir la app en el navegador
2. Clic en el ícono de instalación en la barra de direcciones (⊕)
3. O menú → "Instalar Study App"

### Safari (iOS)

1. Abrir la app en Safari
2. Botón compartir (□↑) → "Agregar a la pantalla de inicio"

### Requisitos

- Servido desde HTTPS o `localhost`
- Haber abierto la app al menos una vez con conexión

### Uso offline

Después de instalar, la app funciona completamente sin conexión para:
- Estudiar módulos **previamente descargados**
- Evaluar flashcards
- Realizar quizzes
- Ver estadísticas

Los módulos **nunca visitados** requieren conexión la primera vez.

---

## 11. Desplegar en AWS S3 + CloudFront

Ver la guía completa en [`docs/deploy-aws.md`](./docs/deploy-aws.md).

---

## 12. Arquitectura del proyecto

```
study-app/
│
├── index.html                  ← SPA shell
├── manifest.webmanifest        ← PWA manifest
├── sw.js                       ← Service Worker
│
├── assets/
│   ├── css/
│   │   ├── main.css            ← Reset + design tokens
│   │   ├── themes.css          ← Dark mode
│   │   ├── layout.css          ← Header, nav, página
│   │   └── components.css      ← Cards, botones, badges...
│   └── icons/
│
├── src/
│   ├── app.js                  ← Entry point
│   ├── router.js               ← Hash router
│   ├── config.js               ← Constantes globales
│   │
│   ├── services/
│   │   ├── content-service.js  ← Carga JSON (catalog, manifests, módulos)
│   │   ├── storage-service.js  ← IndexedDB (único punto de acceso)
│   │   ├── progress-service.js ← Progreso del usuario
│   │   ├── study-service.js    ← Sesiones de estudio
│   │   └── exam-service.js     ← Scoring de quizzes y exámenes
│   │
│   ├── components/
│   │   ├── dashboard.js        ← Lista de certificaciones
│   │   ├── certification-detail.js  ← Dashboard de una cert
│   │   ├── module-view.js      ← Vista de módulo
│   │   ├── flashcard.js        ← Sesión de flashcards
│   │   ├── quiz.js             ← Quiz por módulo
│   │   ├── exam.js             ← Examen final
│   │   ├── progress-bar.js     ← Barra reutilizable
│   │   ├── statistics.js       ← Estadísticas
│   │   └── settings.js         ← Configuración y backup
│   │
│   └── utils/
│       ├── validators.js       ← Validación de schemas JSON
│       ├── spaced-repetition.js← Algoritmo SR v1.2
│       ├── dates.js            ← Utilidades de fecha
│       └── helpers.js          ← shuffle, escapeHtml, etc.
│
├── content/
│   ├── catalog.json            ← Registro de certificaciones
│   └── aws-saa/
│       ├── manifest.json
│       ├── modules/
│       └── exams/
│
├── schemas/                    ← JSON Schema estándar (documentación)
├── tests/                      ← Tests con node:test nativo
└── docs/
    └── deploy-aws.md
```

### Principio fundamental

```
EL CÓDIGO NO CONOCE LAS CERTIFICACIONES.
EL CÓDIGO SOLO CONOCE EL STUDY CONTENT SCHEMA.
```

### Separación de responsabilidades

| Dato | Dónde vive |
|---|---|
| Preguntas, flashcards, respuestas | JSON en `/content/` (read-only) |
| Progreso del usuario | IndexedDB (via `storage-service`) |
| Tema visual | `localStorage` |
| Estados calculados | Memoria (derivados, nunca almacenados) |
