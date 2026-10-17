# Tarea para Kiro — Migrar contenido Terraform Associate 003 a 004

## Contexto y objetivo

Actúa como **experto en Terraform 1.12, instructor de HashiCorp Terraform Associate (004), ingeniero DevOps y editor de contenido educativo**. Este repositorio contiene una plataforma de estudio que consume contenido de certificaciones en JSON. Quiero **actualizar directamente los archivos existentes dentro del repositorio**, crear los módulos que falten y disponer este fin de semana de tarjetas y quizzes útiles en móvil.

**Resultado esperado:** una biblioteca rigurosa, amplia y progresiva de flashcards + quizzes por módulo y un examen final tipo simulacro. No prometas que memorizar tarjetas garantiza aprobar: exige interpretación de HCL y resolución de escenarios. Las preguntas son originales de preparación, **no preguntas oficiales ni filtradas del examen**.

**Acción principal:** inspecciona el repositorio antes de modificarlo, identifica las rutas reales, genera contenidos en esas rutas y ejecuta validaciones. No respondas solamente pegando JSON en el chat. No despliegues ni hagas commit sin mi confirmación. Haz respaldo o utiliza el control de versiones; evita sobreescrituras destructivas sin poder recuperar originales.

## Archivos existentes (localízalos en el repositorio)

- `manifest.json` de la certificación `terraform-associate`.
- `modules/01-core-concepts.json` (`core-concepts`).
- `modules/02-providers.json` (`providers`).
- `modules/03-state.json` (`state`).
- `modules/04-resources-modules.json` (`resources-modules`).
- `exams/final.json` (`final`).

**Importante:** el manifest original declara examen **003** y referencia `exams/final.json`, el cual actualmente solo tiene **15 preguntas**. Sustitúyelos por material 004, conservando la relación manifest-rutas. Si las rutas reales difieren, utilízalas en lugar de crear una estructura duplicada. Si hay archivos de esquema, tipos TypeScript, importadores o validadores, analízalos primero.

## Fuente oficial y ámbito temporal

La guía oficial de Terraform Associate (004) evalúa **Terraform 1.12** y define ocho dominios. Consulta los objetivos y la documentación oficial antes de redactar. Prioriza comportamiento documentado para 1.12 y distingue funciones de versiones más recientes, legadas, experimentales o deprecadas.

- Objetivos: https://developer.hashicorp.com/terraform/tutorials/certification-004/associate-review-004
- Ruta oficial: https://developer.hashicorp.com/terraform/tutorials/certification-004/associate-study-004
- Backend S3: https://developer.hashicorp.com/terraform/language/backend/s3

Dominios de la guía oficial: **1 IaC; 2 fundamentos/providers/state; 3 workflow CLI; 4 configuración HCL, tipos complejos, expresiones, dependencias, condiciones y valores efímeros; 5 módulos; 6 state; 7 mantenimiento/import/logging; 8 HCP Terraform.** Usa la enumeración real de subobjetivos de la guía y construye una matriz trazable de cobertura. Incluye explícitamente los cambios 004: `depends_on`/`create_before_destroy`, condiciones personalizadas, valores `ephemeral` y argumentos `write-only`, proyectos y workspaces de HCP Terraform.

## Formato obligatorio de un módulo

Respeta el esquema existente; no lo rediseñes ni agregues campos incompatibles:

```json
{
  "schemaVersion": "1.0",
  "contentVersion": "2.0.0",
  "type": "study-module",
  "certificationId": "terraform-associate",
  "language": "es-MX",
  "module": {
    "id": "core-concepts",
    "order": 1,
    "name": "Conceptos Fundamentales",
    "description": "...",
    "estimatedMinutes": 60
  },
  "flashcards": [
    {
      "id": "core-concepts-001",
      "question": "¿...?",
      "answer": "Respuesta precisa.",
      "explanation": "Por qué, cuándo y ejemplo o advertencia.",
      "difficulty": "basic",
      "tags": ["iac", "workflow"]
    }
  ],
  "quiz": {
    "passingScore": 85,
    "questions": [
      {
        "id": "core-concepts-q001",
        "type": "single-choice",
        "question": "¿...?",
        "options": [
          {"id": "a", "text": "..."},
          {"id": "b", "text": "..."},
          {"id": "c", "text": "..."},
          {"id": "d", "text": "..."}
        ],
        "correctAnswers": ["b"],
        "explanation": "Razonamiento y por qué las demás no aplican."
      }
    ]
  }
}
```

### Reglas innegociables

1. `flashcards[].id`: `{moduleId}-{NNN}` (numeración de tres dígitos o más si se supera 999); `quiz.questions[].id`: `{moduleId}-q{NNN}`. Identificadores **únicos**, sin colisiones. Si el progreso del usuario depende de IDs estables, **conserva los IDs de tarjetas y preguntas existentes cuando mantengas el mismo concepto**, y agrega nuevos con IDs no utilizados. Para tarjetas corregidas, conserva el ID si no cambia el tema.
2. `type` de preguntas: **solo** `single-choice`, `multiple-choice`, `true-false`.
3. `difficulty` de tarjetas: **solo** `basic`, `intermediate`, `advanced`, o campo omitido.
4. `correctAnswers` debe ser un array no vacío cuyos valores existan dentro de `options[].id`; sin duplicados. Una única respuesta correcta para `single-choice`; dos o más para `multiple-choice`; exactamente una (`true` o `false`) para `true-false`.
5. Las opciones de `true-false` deben ser precisamente `[{"id":"true","text":"Verdadero"},{"id":"false","text":"Falso"}]`.
6. `passingScore`: entero **1–100**; usar **85** para quizzes nuevos (es una meta interna, no la puntuación de aprobación oficial).
7. No introducir markdown externo, comentarios JSON, trailing commas, referencias rotas, campos obligatorios omitidos ni estructuras que el importador no reconozca.
8. Texto principal en español claro (es-MX); conservar terminología técnica inglesa (`state`, `plan`, `provider`, `drift`, `workspace`, etc.). No traducir comandos, argumentos ni nombres de bloques de HCL.
9. `estimatedMinutes` debe ser realista para el volumen creado; actualizar `contentVersion` y `totalEstimatedHours` del manifest en correspondencia.
10. Los IDs de opciones pueden ser `a`, `b`, `c`, `d`, `e`; deben ser únicos dentro de su pregunta. Evitar respuestas ambiguas y la opción “todas las anteriores” cuando degrade la calidad.

## Plan de módulos

**Mantén los cuatro IDs existentes.** Añade los restantes con `order` consecutivo, sin alterar sus rutas ya publicadas. Plan sugerido, ajustable a la cobertura oficial:

| Orden | ID del módulo | Nombre / cobertura principal | Ruta sugerida |
|---|---|---|---|
| 1 | `core-concepts` | IaC, ventajas, workflow, CLI, `fmt`, `validate`, `init`, `plan`, `apply`, `destroy` | `modules/01-core-concepts.json` |
| 2 | `providers` | Registry, providers, constraints, lock, aliases, múltiples providers | `modules/02-providers.json` |
| 3 | `state` | State, backends, locking, drift, refresh-only, `moved`, `removed`, state CLI | `modules/03-state.json` |
| 4 | `resources-modules` | Recursos y data sources, variables/outputs, locals, `count`, `for_each`, módulos, registry | `modules/04-resources-modules.json` |
| 5 | `hcl-expressions` | Tipos complejos, funciones, expresiones, `for`, `dynamic`, templates, `null` y valores desconocidos | `modules/05-hcl-expressions.json` |
| 6 | `lifecycle-validation` | Dependencias, `lifecycle`, preconditions, postconditions, variable validation, `check` | `modules/06-lifecycle-validation.json` |
| 7 | `secrets-ephemeral` | `sensitive`, seguridad de state, valores `ephemeral`, argumentos write-only en 1.12 | `modules/07-secrets-ephemeral.json` |
| 8 | `operations-troubleshooting` | Import, `import` blocks, CLI, debugging, `TF_LOG`, `terraform show`, mantenimiento | `modules/08-operations-troubleshooting.json` |
| 9 | `hcp-terraform` | HCP Terraform, remote runs, VCS/CLI workflows, proyectos y workspaces, policies, equipos, variables | `modules/09-hcp-terraform.json` |

El examen oficial tiene **ocho dominios**; estos nueve módulos son una organización **pedagógica de nuestra plataforma**, no una afirmación de que HashiCorp tenga nueve dominios. Algunos conceptos se cruzan: evita duplicados mecánicos.

## Volumen y progresión

**Meta de primera versión completa del curso (si las capacidades del repositorio lo permiten):**
- **Por módulo:** 25–40 tarjetas y 15–25 preguntas de quiz de calidad, equilibradas entre básico/intermedio/avanzado. Módulos amplios pueden superar esa cantidad cuando la cobertura lo justifique.
- **Total objetivo:** aproximadamente 250–350 tarjetas y 150–200 preguntas de quizzes, sin repetir preguntas idénticas entre módulos.
- **Examen final:** **60 preguntas originales** combinadas de todos los dominios, mezclando tipos y dificultad; `timeLimit` 90 minutos como simulación de práctica (NO como afirmación de duración oficial); `passingScore` 85 como meta interna de preparación.
- Dar prioridad a **calidad, exactitud y cobertura** sobre cantidad. Si el contexto/tiempo impide terminar todo, entrega primero una versión **consistente y utilizable** con todos los archivos y señala cuántas tarjetas se generaron realmente. No declares completo lo que está incompleto.

Cada flashcard debe enseñar un concepto o comportamiento preciso. Los quizzes deben evaluar aplicación y comprensión, no ser simples paráfrasis de las tarjetas. Incluir lectura de HCL, diagnósticos de `plan`, state drift, selección de `count` vs `for_each`, provider aliases, conflictos de versiones y decisiones de flujo de trabajo. En distractores, utilizar errores plausibles y explicar en qué fallan.

## Correcciones obligatorias de contenido legado

1. **S3 locking:** actualizar la afirmación de que S3 “usa DynamoDB” como mecanismo obligatorio. En versiones actuales, puede usar `use_lockfile = true`; el bloqueo con DynamoDB está **deprecado**. Ajustar tarjeta, quizzes y final actual (en particular la antigua pregunta sobre DynamoDB).
2. `terraform refresh`: tratarlo como comando **deprecado**, explicar `terraform apply -refresh-only` y distinguirlo de `plan -refresh-only`; no enseñar que es la recomendación moderna.
3. Diferenciar `terraform state mv` de bloques declarativos `moved`, y `terraform state rm` de bloques `removed` cuando corresponda.
4. Evitar afirmar que `terraform init` es literalmente el primer comando **antes de escribir configuración**; es la inicialización requerida antes de operar un directorio de trabajo nuevo.
5. Matizar idempotencia: un `apply` repetido sin cambios externos/configuración normalmente produce **no changes**, pero puede haber drift, atributos calculados y acciones de providers.
6. Precisión entre **CLI workspaces** (varios estados asociados a una configuración/backend) y **HCP Terraform workspaces** (unidades de infraestructura con configuración, variables, estado y ejecuciones propios). No tratarlos como equivalentes.
7. Distinguir `sensitive` de cifrado/ausencia en el state: ocultar salida CLI no significa que el secreto no quede en state; abordar `ephemeral` y `write-only` según Terraform 1.12.
8. Evitar respuestas absolutas engañosas sobre resultados de `count`, `for_each`, recreación de recursos o drift: explicar dependencia de las claves, del provider y del plan real.
9. Actualizar todas las menciones de TA-003 a TA-004 en títulos/descripciones, manteniendo `certificationId: "terraform-associate"` e ID `final`.
10. Evitar afirmaciones específicas de versiones o flags sin comprobarlas en documentación de HashiCorp.

## Manifest y examen

- Edita el `manifest.json` **existente**: conservar `schemaVersion: "1.0"`, `certificationId: "terraform-associate"`, `language: "es-MX"`, `name` apropiado, lista completa de módulos en orden y rutas reales. Cambiar descripción a **Terraform Associate (004)** y ajustar `totalEstimatedHours`.
- Examinar cómo consume la app `exams/final.json` y mantener exactamente el esquema original:

```json
{
  "schemaVersion": "1.0",
  "type": "exam",
  "certificationId": "terraform-associate",
  "language": "es-MX",
  "exam": {
    "id": "final",
    "name": "Simulacro Terraform Associate (004)",
    "description": "Examen de práctica original basado en objetivos 004",
    "passingScore": 85,
    "timeLimit": 90,
    "shuffleQuestions": true,
    "shuffleOptions": true
  },
  "questions": [
    {
      "id": "exam-q001",
      "type": "single-choice",
      "moduleId": "core-concepts",
      "question": "...",
      "options": [
        {"id":"a","text":"..."},
        {"id":"b","text":"..."},
        {"id":"c","text":"..."},
        {"id":"d","text":"..."}
      ],
      "correctAnswers": ["b"],
      "explanation": "...",
      "tags": ["workflow"]
    }
  ]
}
```

- El examen actual contiene **15** preguntas basadas en 003; revisarlas, reescribir las obsoletas y ampliar a **60** preguntas únicas. `moduleId` debe existir en el manifest. IDs únicos (`exam-q001`, etc.), preferiblemente preservar los IDs de preguntas que sigan siendo correctas y equivalentes.
- No copiar literalmente evaluaciones modulares al examen final: usar escenarios diferentes.
- El orden aleatorio de preguntas/opciones debe funcionar sin alterar `correctAnswers` (la evaluación se basa en IDs, no en posiciones).

## Matriz de cobertura obligatoria

Crea un documento `TERRAFORM_004_COVERAGE.md` (o ubicación documental existente) con una tabla **objetivo oficial (por ejemplo `4g`) → módulos → IDs de tarjetas → IDs de preguntas → nivel de cobertura**. Comprobar que todos los subobjetivos oficiales aparecen; incluir temario prioritario y temas complementarios opcionales sin presentarlos como examinables.

## Validación automatizada exigida

Implementa/reutiliza un validador de JSON y ejecútalo. Verifica:

- Todos los JSON parsean y respetan el esquema que la aplicación acepta (idealmente ejecutar los tests del importador si existen).
- Ningún `module.id` duplicado; `module.order` consecutivo; `manifest.modules[].id` coincide con el `module.id` y `file` existe; rutas relativas correctas.
- Todos los IDs cumplen sus formatos, no se repiten, y reflejan el `module.id`.
- Las opciones contienen IDs únicos y `correctAnswers` es subconjunto correcto; semántica adecuada según `type`.
- `difficulty`, `type`, `passingScore`, `language`, `certificationId` válidos.
- El examen referencia únicamente `moduleId` existentes; las preguntas del final no duplican textualmente las de módulos.
- No hay preguntas ambiguas, dos respuestas válidas en `single-choice`, explicaciones contradictorias o conceptos históricamente obsoletos descritos como vigentes.
- `manifest` y archivos se pueden cargar en la aplicación **sin modificar el contrato actual de importación**.

Además, si la app tiene pruebas automatizadas, ejecútalas. Si no, proporciona al menos un script de validación reutilizable. No simules que se probaron funciones de UI si no se ejecutaron.

## Entrega / reporte de Kiro

1. **Archivos escritos** con sus rutas reales (incluido `manifest.json` y `exams/final.json`).
2. Tabla breve por módulo: flashcards, quiz, objetivo oficial cubierto y dificultades.
3. Total de tarjetas, quizzes y preguntas del examen; validaciones ejecutadas y resultado.
4. Correcciones técnicas importantes y dudas no resueltas.
5. Instrucciones concretas para publicar los cambios en CloudFront **solo cuando yo lo autorice**.
6. Si el tiempo/ventana de contexto no alcanza para generar todo de forma rigurosa, **trabaja por etapas dentro del repositorio**: primero archivos compatibles y cobertura base de TODOS los dominios; luego amplía profundidad y simulacro. Explica lo que queda pendiente sin presentar contenido incompleto como final.

## Criterio de aceptación

Puedo actualizar mi plataforma sin cambiar su contrato JSON, abrir cualquier módulo desde el teléfono, estudiar preguntas correctas y actualizadas de Terraform Associate 004, realizar quizzes coherentes y resolver un simulacro de 60 preguntas. Quiero contenido útil para prepararme seriamente, no solo un gran número de definiciones.
