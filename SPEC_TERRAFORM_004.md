# Terraform Associate 004 — Especificación de Contenido

**Versión:** 1.2  
**Fecha:** 2026-10-16  
**Estado:** Aprobado para implementación  
**Fuente:** `KIRO_TERRAFORM_ASSOCIATE_004.md`  
**Certificación objetivo:** HashiCorp Terraform Associate (004) — Terraform 1.12  

> **Changelog v1.2** (correcciones finales pre-implementación)
> 1. **C1:** nombre correcto del lockfile nativo de S3: sufijo `.tflock`, no `.terraform.tfstate.lock.info`
> 2. **Modo práctica:** verificado en código — `exam.js` ya soporta `timeLimit: null` sin cambiar JS. Documentado con precisión: qué funciona hoy vs qué requeriría JS adicional (opcional, futuro)
> 3. **Cobertura:** IDs completos en la matriz — `operations-troubleshooting-012`, no `ops-012`
> 4. **Distribución de tipos de preguntas:** marcada como proporción pedagógica propia, no oficial de HashiCorp
> 5. **passingScore 85%:** clarificado como objetivo interno de rendimiento, no criterio oficial de aprobación

> **Changelog v1.1**
> 1. Corregida inconsistencia entre metas individuales (163) y total (~170) — el total ahora refleja la suma real: 163
> 2. Examen: `timeLimit 60` (duración oficial) + `timeLimit null` para modo práctica sin límite
> 3. Agregada corrección C10: `version` dentro del bloque `provider` está deprecado
> 4. Corregida C1: DynamoDB deprecated pero usable durante migración hacia `use_lockfile = true`
> 5. Agregada C11: backend `remote` documentado pero `cloud` block es la integración recomendada
> 6. Definido sistema de etiquetas `cert` / `prod` para diferenciar alcance del contenido
> 7. Definida política de idioma: términos técnicos en inglés, algunas preguntas en inglés, explicaciones en español
> 8. Verificado número real de tests: 199 (35 suites)
> 9. Deploy bloqueado: sin `--delete` ni invalidaciones sin autorización; usar `--dryrun` primero
> 10. IDs existentes conservados; compatibilidad con `schemaVersion: "1.0"` garantizada

---

## 1. Contexto y punto de partida

### Estado actual del contenido (`contentVersion: 1.0.0`)

| Archivo | Flashcards | Quiz | Estado |
|---|---|---|---|
| `01-core-concepts.json` | 10 | 7 | Actualizar + ampliar |
| `02-providers.json` | 8 | 6 | Actualizar + ampliar |
| `03-state.json` | 10 | 7 | Corregir (DynamoDB, refresh) + ampliar |
| `04-resources-modules.json` | 10 | 7 | Actualizar + ampliar |
| `exams/final.json` | — | 15 | Reescribir a 60 preguntas 004 |

### Archivos nuevos a crear

| Archivo | Módulo |
|---|---|
| `05-hcl-expressions.json` | `hcl-expressions` |
| `06-lifecycle-validation.json` | `lifecycle-validation` |
| `07-secrets-ephemeral.json` | `secrets-ephemeral` |
| `08-operations-troubleshooting.json` | `operations-troubleshooting` |
| `09-hcp-terraform.json` | `hcp-terraform` |

### Tests automatizados actuales

La suite de tests de la app (validators, spaced repetition, progress, etc.) tiene **199 tests en 35 suites, 0 fallos**. No están relacionados con el contenido JSON — validan el motor de la app. El criterio de cierre es que sigan en 199/199 después de generar contenido.

---

## 2. Objetivos cuantitativos

### Metas por módulo

| Módulo | Flashcards | Quiz | Total quiz |
|---|---|---|---|
| `core-concepts` | 30 | 18 | 18 |
| `providers` | 28 | 16 | 16 |
| `state` | 35 | 20 | 20 |
| `resources-modules` | 35 | 20 | 20 |
| `hcl-expressions` | 35 | 20 | 20 |
| `lifecycle-validation` | 30 | 18 | 18 |
| `secrets-ephemeral` | 25 | 15 | 15 |
| `operations-troubleshooting` | 30 | 18 | 18 |
| `hcp-terraform` | 30 | 18 | 18 |
| **TOTAL** | **278** | **163** | **163** |

> **Nota:** el total real de preguntas de quiz es **163**, no ~170. La diferencia era una estimación redondeada del spec anterior. El criterio de aceptación usa 163 como número exacto objetivo.

### Examen final

| Campo | Valor |
|---|---|
| Preguntas | 60 |
| `passingScore` | 85 |
| `timeLimit` (simulacro oficial) | **60 minutos** |
| Modo práctica | `timeLimit: null` — sin límite de tiempo |
| `shuffleQuestions` | true |
| `shuffleOptions` | true |

> **Nota sobre `passingScore`:** El 85% es un **objetivo interno de rendimiento** para prepararse rigurosamente, no el criterio oficial de aprobación del examen TA-004. HashiCorp no publica el puntaje de corte exacto; el examen usa puntuación escalada, no un porcentaje directo. Apuntar a 85% en los simulacros es una meta conservadora y pedagógicamente adecuada para llegar bien preparado.

> **Nota sobre `timeLimit`:** La duración oficial del examen Terraform Associate (004) es **60 minutos**. El spec anterior usaba 90, que era incorrecto. El examen JSON usará `timeLimit: 60`.
>
> **Modo práctica sin temporizador:** La app ya soporta `timeLimit: null` de forma nativa, **sin requerir cambios en JavaScript**. En `exam.js`, si `timeLimit` es `null`, la variable `secondsLeft` queda `null` y el timer nunca arranca — la UI muestra solo el contador de progreso. Para un modo práctica, basta con crear un segundo archivo de examen con `"timeLimit": null`, o la UI puede ofrecer la opción de ignorar el timer antes de iniciar (eso sí requeriría un cambio menor de JS, documentado como cambio opcional futuro, no urgente para este contenido).

---

## 3. Correcciones técnicas obligatorias

Estas correcciones se aplican **antes** de agregar contenido nuevo en cada módulo afectado. Están ordenadas por prioridad.

### C1 — State locking en S3: DynamoDB deprecado, migración a `use_lockfile`

**Módulo:** `state`  
**Problema:** el contenido actual presenta DynamoDB como mecanismo obligatorio de locking para el backend S3.  
**Corrección:**
- DynamoDB para locking está **deprecado** desde Terraform 1.10
- El mecanismo nativo y recomendado es `use_lockfile = true`. Con esta opción, Terraform crea un objeto de bloqueo en el mismo bucket S3 con el sufijo **`.tflock`** (ej: `prod/terraform.tfstate.tflock`)
- DynamoDB **puede seguir usándose durante una migración**: si ya tienes una tabla DynamoDB de locking existente, puedes mantenerla mientras migras. No es un error usar DynamoDB; es un camino de migración válido
- Las nuevas configuraciones deben usar `use_lockfile = true`
- Reescribir tarjeta `state-004` (locking) y la pregunta de quiz correspondiente
- Actualizar la pregunta del examen final sobre DynamoDB

```hcl
# Forma recomendada (Terraform ≥ 1.10)
terraform {
  backend "s3" {
    bucket       = "mi-bucket-state"
    key          = "prod/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true   # crea prod/terraform.tfstate.tflock en el mismo bucket
  }
}
```

---

### C2 — `terraform refresh` deprecado

**Módulo:** `state`, `operations-troubleshooting`  
**Problema:** `terraform refresh` se presenta como comando vigente y recomendado.  
**Corrección:**
- `terraform refresh` está **deprecado**. No debe enseñarse como práctica moderna
- Reemplazar por:
  - `terraform plan -refresh-only`: muestra qué cambiaría el state al reconciliarlo con la realidad
  - `terraform apply -refresh-only`: aplica esa reconciliación (actualiza el state sin modificar infraestructura)
- Documentar que `terraform plan` y `terraform apply` hacen un refresh implícito por defecto; se puede deshabilitar con `-refresh=false`

---

### C3 — `terraform state mv` vs bloque declarativo `moved {}`

**Módulo:** `state`  
**Corrección:**
- `terraform state mv` es el método **imperativo** — modifica el state directamente, no queda en el código
- Bloque `moved {}` (Terraform 1.1+) es el método **declarativo** — se declara en HCL, queda en el repositorio, es reproducible y reversible
- Cuándo usar cada uno: `moved {}` para refactoring de código; `terraform state mv` para operaciones de emergencia o cuando no se controla la configuración

---

### C4 — `terraform state rm` vs bloque declarativo `removed {}`

**Módulo:** `state`  
**Corrección:**
- `terraform state rm` es el método imperativo — elimina el recurso del rastreo sin dejar trazabilidad
- Bloque `removed {}` (Terraform 1.7+) es el método declarativo — documenta la intención de dejar de gestionar un recurso

---

### C5 — `terraform init` y el orden con la configuración

**Módulo:** `core-concepts`  
**Corrección:** `terraform init` no es "el primer comando antes de escribir configuración". Es la inicialización requerida **antes de operar un directorio de trabajo**. La configuración puede (y normalmente debe) existir antes de ejecutar `init`. El orden correcto es: escribir configuración → `init` → `plan` → `apply`.

---

### C6 — Idempotencia matizada

**Módulo:** `core-concepts`  
**Corrección:** "Terraform es perfectamente idempotente" es una simplificación. Lo correcto:
- Un `apply` sin cambios de configuración **normalmente** produce "No changes"
- Excepciones: drift externo (alguien modificó el recurso manualmente), atributos calculados que cambian en cada plan, comportamientos específicos de ciertos providers
- Terraform **intenta** ser idempotente; no lo garantiza en todos los escenarios

---

### C7 — CLI workspaces ≠ HCP Terraform workspaces

**Módulo:** `hcp-terraform` (nuevo)  
**Corrección crítica:** nunca presentarlos como equivalentes.

| | CLI workspaces | HCP Terraform workspaces |
|---|---|---|
| Qué son | Múltiples states para una misma configuración/backend | Unidad de infraestructura completa |
| Scope | Un solo repo/directorio | Puede tener su propio VCS, variables, state y ejecuciones |
| Uso | Entornos dev/staging/prod con la misma config | Aislar infraestructuras distintas |
| Comando | `terraform workspace new/select/list` | Gestionados desde la UI/API de HCP |

---

### C8 — `sensitive` ≠ cifrado del state

**Módulo:** `secrets-ephemeral` (nuevo)  
**Corrección:**
- `sensitive = true` **oculta el valor en la salida de CLI** (plan, apply, output) — muestra `(sensitive value)` o `REDACTED`
- El valor **sí se almacena en texto plano en el state file**; `sensitive` no cifra nada
- Para valores que nunca deben persistirse en state: usar `ephemeral` (Terraform 1.10+)
- Para valores que se pasan al provider pero no se leen de vuelta: usar argumentos `write-only` (Terraform 1.12+)

---

### C9 — Referencias a TA-003

**Módulo:** todos  
**Corrección:** actualizar "Terraform Associate 003" → "Terraform Associate (004)" en `name`, `description` y texto visible. Mantener sin cambios:
- `certificationId: "terraform-associate"`
- `id: "final"` en el examen
- Rutas de archivos existentes

---

### C10 — `version` en bloque `provider` deprecado *(nuevo en v1.1)*

**Módulo:** `providers`  
**Corrección:**
- Declarar `version` directamente dentro del bloque `provider {}` está **deprecado**
- Las restricciones de versión **deben** declararse en `required_providers` dentro del bloque `terraform {}`
- La forma deprecada sigue funcionando pero genera advertencias

```hcl
# ❌ Deprecado
provider "aws" {
  region  = "us-east-1"
  version = "~> 5.0"   # No hacer esto
}

# ✅ Correcto
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

---

### C11 — Backend `remote` vs bloque `cloud` *(nuevo en v1.1)*

**Módulo:** `hcp-terraform`  
**Corrección:**
- El backend `remote` para HCP Terraform está **documentado pero en desuso activo**; aún funciona y puede verse en proyectos existentes
- El bloque `cloud {}` es la integración **recomendada** para HCP Terraform desde Terraform 1.1
- Diferencias clave:

```hcl
# Backend remote (documentado, en desuso activo)
terraform {
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "mi-org"
    workspaces {
      name = "mi-workspace"
    }
  }
}

# Bloque cloud (recomendado)
terraform {
  cloud {
    organization = "mi-org"
    workspaces {
      name = "mi-workspace"
    }
  }
}
```

- El bloque `cloud` soporta tags de workspace, variable sets y características nuevas que el backend `remote` no implementará

---

## 4. Sistema de etiquetas de alcance *(nuevo en v1.1)*

Cada flashcard y pregunta de quiz debe clasificarse con etiquetas que indiquen su relevancia:

| Etiqueta | Significado |
|---|---|
| `cert` | Directamente evaluado en el examen TA-004 |
| `prod` | Buena práctica de producción, no necesariamente en el examen |
| `deprecated` | Funcionalidad deprecada — importante saber que existe y por qué no usarla |
| `new-004` | Novedad específica de la versión 004 (ephemeral, write-only, etc.) |

**Regla:** toda tarjeta que enseñe algo marcado como `deprecated` debe incluir también la alternativa recomendada. No enseñar lo deprecado sin contexto.

**En el campo `tags`** de flashcards y preguntas, agregar las etiquetas de alcance junto con las temáticas:

```json
"tags": ["cert", "state", "locking"]
"tags": ["deprecated", "state", "dynamodb"]
"tags": ["prod", "new-004", "ephemeral"]
```

---

## 5. Política de idioma *(nuevo en v1.1)*

El examen oficial es en inglés. El contenido de estudio mezcla ambos idiomas de forma deliberada:

| Elemento | Idioma |
|---|---|
| Explicaciones y descripciones | Español (es-MX) |
| Terminología técnica de Terraform | Inglés — `plan`, `apply`, `state`, `provider`, `workspace`, `drift`, `backend`, etc. No traducir |
| Comandos y bloques HCL | Inglés siempre |
| ~20% de las preguntas de quiz | En inglés, para practicar la lectura del examen real |
| Opciones de preguntas en inglés | En inglés cuando la pregunta es en inglés |

**Ejemplo de pregunta en inglés:**
```json
{
  "id": "providers-q007",
  "type": "single-choice",
  "question": "Which file should be committed to version control to ensure consistent provider versions across a team?",
  "options": [
    {"id": "a", "text": "terraform.tfstate"},
    {"id": "b", "text": ".terraform.lock.hcl"},
    {"id": "c", "text": ".terraform/providers/"},
    {"id": "d", "text": "terraform.tfvars"}
  ],
  "correctAnswers": ["b"],
  "explanation": ".terraform.lock.hcl registra las versiones exactas de los providers. Commitearlo garantiza que todo el equipo use las mismas versiones, independientemente de los constraints definidos.",
  "tags": ["cert", "providers", "lock"]
}
```

---

## 6. Plan de módulos (9 módulos)

### Módulos existentes a actualizar

#### Módulo 1 — `core-concepts` (orden 1)

**Archivo:** `modules/01-core-concepts.json`  
**Cobertura:** Dominio 1 (IaC), Dominio 3 (workflow CLI)  
**contentVersion:** `2.0.0`  
**Correcciones:** C5, C6, C9  

**Temas:**
- IaC declarativa vs imperativa, ventajas sobre gestión manual y scripts
- Write → Plan → Apply; lugar de `terraform destroy`
- `terraform init`: propósito real (inicialización del directorio de trabajo), no "primer paso antes de escribir"
- `terraform plan`, `apply`, `destroy`, `fmt`, `validate`, `show`, `output`, `console`
- Idempotencia: definición, comportamiento normal vs excepciones (drift, atributos calculados)
- HCL vs JSON como formatos de configuración; extensión `.tf` y `.tf.json`
- Variables de entorno `TF_CLI_ARGS_*`, `TF_LOG`, `TF_VAR_*`
- Paralelismo: `terraform apply -parallelism=N`
- Diferencia entre plan guardado (`-out`) y plan especulativo

**Meta:** 30 flashcards, 18 preguntas (≥ 4 en inglés)  
**IDs conservados:** `core-concepts-001` a `core-concepts-010`, `core-concepts-q001` a `core-concepts-q007`  
**IDs nuevos:** `core-concepts-011`+, `core-concepts-q008`+

---

#### Módulo 2 — `providers` (orden 2)

**Archivo:** `modules/02-providers.json`  
**Cobertura:** Dominio 2 (providers)  
**contentVersion:** `2.0.0`  
**Correcciones:** C9, C10  

**Temas:**
- Provider como plugin que traduce HCL a llamadas de API
- Tiers del Registry: Official, Partner, Community
- `required_providers`: `source`, `version` — forma correcta y obligatoria
- `version` dentro del bloque `provider {}` — **deprecado** (C10), explicar por qué y la alternativa
- Version constraints: `~>`, `>=`, `<=`, `=`, `!=`; semver y su aplicación
- `.terraform.lock.hcl`: cuándo se crea, qué garantiza, cuándo commitear, `terraform init -upgrade`
- `alias`: múltiples configuraciones del mismo provider (multi-region, multi-account)
- Providers implícitos: cuándo Terraform los requiere sin declaración explícita
- `terraform providers` y `terraform providers lock`
- Provider meta-arguments en recursos: `provider = aws.alias`

**Meta:** 28 flashcards, 16 preguntas (≥ 3 en inglés)  
**IDs conservados:** existentes  
**IDs nuevos:** `providers-009`+, `providers-q007`+

---

#### Módulo 3 — `state` (orden 3)

**Archivo:** `modules/03-state.json`  
**Cobertura:** Dominio 6 (state)  
**contentVersion:** `2.0.0`  
**Correcciones:** C1, C2, C3, C4, C9  

**Temas:**
- `terraform.tfstate`: estructura, propósito, por qué es la fuente de verdad de Terraform
- Por qué no commitear `terraform.tfstate` al VCS
- Remote state: S3, GCS, Azure Blob, HCP Terraform
- State locking:
  - `use_lockfile = true` — mecanismo nativo recomendado (Terraform ≥ 1.10)
  - DynamoDB — **deprecado**, pero válido para migración desde configuraciones existentes (C1)
  - `terraform force-unlock` — cuándo y cómo usarlo
- State drift: qué es, cómo ocurre, cómo detectarlo
- `terraform plan -refresh-only` y `terraform apply -refresh-only` — reemplazo de `terraform refresh` (C2)
- `terraform refresh` — **deprecado** (C2)
- `terraform state list`, `state show`, `state pull`, `state push`
- `terraform state mv` (imperativo) vs bloque `moved {}` (declarativo, 1.1+) — C3
- `terraform state rm` (imperativo) vs bloque `removed {}` (declarativo, 1.7+) — C4
- CLI workspaces: propósito, `terraform workspace new/select/list/delete`, limitaciones
- Outputs de remote state con `terraform_remote_state` data source
- Partial configuration para backends (no hardcodear credenciales)

**Meta:** 35 flashcards, 20 preguntas (≥ 4 en inglés)  
**IDs conservados:** los que no requieran corrección técnica  
**Reescribir:** tarjeta `state-004` (DynamoDB como obligatorio) y preguntas `state-q001`, `state-q003` del examen

---

#### Módulo 4 — `resources-modules` (orden 4)

**Archivo:** `modules/04-resources-modules.json`  
**Cobertura:** Dominio 4 (recursos parcial), Dominio 5 (módulos)  
**contentVersion:** `2.0.0`  
**Correcciones:** C9  

**Temas:**
- Sintaxis de `resource`: tipo, nombre local, argumentos
- Meta-arguments: `count`, `for_each`, `depends_on`, `provider`, `lifecycle`
- `count` vs `for_each`: estabilidad de índice vs clave, cuándo preferir cada uno
- `for_each` con `map` y `set`; `each.key`, `each.value`
- `data` sources: propósito, cuándo se evalúan (plan vs apply), diferencia con `resource`
- Variables de input: tipos básicos y complejos, `default`, `description`, `sensitive`, `nullable`
- Validación de variables con bloque `validation` (pertenece a este módulo como introducción; profundiza en módulo 6)
- Outputs: `value`, `description`, `sensitive`, `depends_on`
- `locals`: cuándo preferirlos sobre variables, diferencia con variables de input
- Archivos `.tfvars` y `*.auto.tfvars`: carga automática, precedencia de valores
- Módulos: `source` local (`./`), Registry (`namespace/module/provider`), Git
- `version` en módulos del Registry
- `module` block: inputs y outputs, cómo acceder a outputs (`module.nombre.output`)
- Módulo raíz vs módulos hijos; `terraform get` vs `terraform init`
- Diferencia entre recursos de módulo y recursos del raíz en el state

**Meta:** 35 flashcards, 20 preguntas (≥ 4 en inglés)  
**IDs conservados:** existentes

---

### Módulos nuevos a crear

#### Módulo 5 — `hcl-expressions` (orden 5)

**Archivo:** `modules/05-hcl-expressions.json`  
**Cobertura:** Dominio 4 (tipos, expresiones, funciones)  
**contentVersion:** `1.0.0`  

**Temas:**
- Tipos primitivos: `string`, `number`, `bool`; coerción implícita
- Tipos complejos: `list(T)`, `set(T)`, `map(T)`, `object({...})`, `tuple([...])`
- Tipo `any` y cuándo evitarlo
- Interpolación `"${var.name}"`, expresiones de referencia sin interpolación
- Heredoc `<<-EOF ... EOF` (indented) vs `<<EOF ... EOF`
- Expresión `for`: `[for x in list : expr]`, `{for k, v in map : k => expr}`, filtro `if`
- Bloque `dynamic`: generación de bloques repetibles (Ej: `dynamic "ingress"`)
- Operador condicional: `condition ? true_val : false_val`
- Funciones de colecciones: `length`, `toset`, `tolist`, `tomap`, `keys`, `values`, `lookup`, `merge`, `concat`, `flatten`, `zipmap`
- Funciones de string: `join`, `split`, `format`, `upper`, `lower`, `trimspace`, `replace`, `substr`
- Funciones de control de errores: `try`, `can`
- Funciones de codificación: `jsonencode`, `jsondecode`, `base64encode`, `base64decode`
- `coalesce` y `coalescelist`
- `null`: semántica, cómo se comporta en diferentes contextos
- Valores desconocidos `(known after apply)`: por qué ocurren, impacto en `count` y `for_each`
- `templatefile(path, vars)` y `file(path)`

**Meta:** 35 flashcards, 20 preguntas (≥ 4 en inglés)  
**IDs nuevos:** `hcl-expressions-001`+, `hcl-expressions-q001`+

---

#### Módulo 6 — `lifecycle-validation` (orden 6)

**Archivo:** `modules/06-lifecycle-validation.json`  
**Cobertura:** Dominio 4 (dependencias, lifecycle, condiciones)  
**contentVersion:** `1.0.0`  
**Novedad 004:** preconditions/postconditions, bloque `check`  

**Temas:**
- `depends_on`: cuándo es necesario (dependencia no expresable como referencia), impacto en plan y orden de operaciones
- `lifecycle` block:
  - `create_before_destroy`: orden alternativo, por qué importa en recursos con nombre único
  - `prevent_destroy`: protección contra destrucción accidental
  - `ignore_changes`: cuáles atributos ignorar, riesgos
  - `replace_triggered_by`: reemplazo cuando otro recurso cambia
- Orden por defecto de operaciones: destroy antes de create
- Por qué Terraform destruye y recrea un recurso (cambio de atributo `ForceNew`)
- Preconditions en `resource` y `data source`: `condition`, `error_message`
- Postconditions: validación post-apply del estado real del recurso
- Validación de variables: bloque `validation` con `condition` y `error_message`
- Bloque `check` (Terraform 1.5+): assertions de salud de infraestructura independientes del ciclo de vida
- Diferencia entre `variable validation`, `precondition`, `postcondition` y `check`

**Meta:** 30 flashcards, 18 preguntas (≥ 3 en inglés)  
**IDs nuevos:** `lifecycle-validation-001`+, `lifecycle-validation-q001`+

---

#### Módulo 7 — `secrets-ephemeral` (orden 7)

**Archivo:** `modules/07-secrets-ephemeral.json`  
**Cobertura:** Dominio 4 (valores efímeros), novedad clave 004  
**contentVersion:** `1.0.0`  

**Temas:**
- `sensitive = true` en variables: oculta en output de CLI, **no cifra en state** (C8)
- `sensitive = true` en outputs: marca el output, se propaga a recursos que lo consumen
- Riesgo real de secretos en el state: el state es texto plano (JSON), puede contener contraseñas
- Valores `ephemeral` (Terraform 1.10+) `[new-004]`:
  - Qué son: valores que existen solo en memoria durante el run
  - **No se persisten en el state**
  - Recursos y data sources que soportan ephemeral
  - `ephemeral` en outputs de módulos
- Argumentos `write-only` en providers (Terraform 1.12+) `[new-004]`:
  - Se envían al provider pero Terraform no los lee de vuelta ni los guarda en state
  - Diferencia con `sensitive`: `write-only` nunca aparece en state; `sensitive` sí
- Diferencia clara: `sensitive` vs `ephemeral` vs `write-only`
- Prácticas para secretos: `TF_VAR_*` como variable de entorno, HashiCorp Vault provider, AWS Secrets Manager data source
- `REDACTED` en plan/apply para valores sensitive

**Meta:** 25 flashcards, 15 preguntas (≥ 3 en inglés)  
**IDs nuevos:** `secrets-ephemeral-001`+, `secrets-ephemeral-q001`+

---

#### Módulo 8 — `operations-troubleshooting` (orden 8)

**Archivo:** `modules/08-operations-troubleshooting.json`  
**Cobertura:** Dominio 7 (mantenimiento, import, logging)  
**contentVersion:** `1.0.0`  

**Temas:**
- `terraform import` (imperativo): sintaxis, por qué requiere configuración previa, limitaciones
- Bloque `import {}` declarativo (Terraform 1.5+): ventajas (reproducible, revisable, generate config)
- `terraform plan -generate-config-out` (experimental 1.5, estable 1.6+)
- `TF_LOG` levels: `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`; `TF_LOG_CORE`, `TF_LOG_PROVIDER`; `TF_LOG_PATH`
- `terraform show`: leer state o plan file en formato legible
- `terraform output [-json] [nombre]`
- `terraform console`: evaluación interactiva de expresiones HCL
- `terraform plan -out=planfile` y `terraform apply planfile`: flujo determinista
- `-target=resource`: cuándo usarlo y cuándo evitarlo (no para flujo normal)
- `-replace=resource`: reemplazo forzado (reemplaza a `terraform taint`)
- `terraform taint` / `untaint`: **deprecados** desde 1.0, reemplazados por `-replace`
- Cycle errors: qué son, cómo depurarlos
- Provider errors vs configuration errors: cómo distinguirlos en la salida
- `terraform graph`: visualización de dependencias (conceptual)
- `terraform version`: verificar versión instalada

**Meta:** 30 flashcards, 18 preguntas (≥ 3 en inglés)  
**IDs nuevos:** `operations-troubleshooting-001`+, `operations-troubleshooting-q001`+

---

#### Módulo 9 — `hcp-terraform` (orden 9)

**Archivo:** `modules/09-hcp-terraform.json`  
**Cobertura:** Dominio 8 (HCP Terraform)  
**contentVersion:** `1.0.0`  
**Correcciones:** C7, C11  

**Temas:**
- HCP Terraform (antes Terraform Cloud): qué es, tier gratuito, diferencia con Terraform OSS
- **CLI workspaces vs HCP Terraform workspaces** — diferencia crítica (C7):
  - CLI: múltiples states para una misma configuración, separados por nombre
  - HCP: unidad de infraestructura con state, variables, runs, historial y VCS propios
- Bloque `cloud {}` — integración recomendada (C11):
  - Reemplaza al backend `remote` en nuevas configuraciones
  - Soporta tags de workspace, variable sets y nuevas características
- Backend `remote` — documentado pero en desuso activo (C11)
- VCS-driven workflow: plan/apply automático en commits y PRs
- CLI-driven workflow: `terraform plan/apply` con ejecución remota en HCP
- API-driven workflow: automatización sin CLI
- Remote runs: plan remoto, apply remoto, auto-apply, speculative plans
- Variables en HCP: workspace variables, variable sets, types (Terraform vs Env), sensitive
- Proyectos: organización de workspaces en HCP Terraform
- Teams y permisos (RBAC): read, plan, write, admin
- Private Registry: módulos y providers privados
- Sentinel y OPA: policy as code (conceptual, nivel de awareness para el examen)
- Run tasks: integración de herramientas externas en el pipeline

**Meta:** 30 flashcards, 18 preguntas (≥ 3 en inglés)  
**IDs nuevos:** `hcp-terraform-001`+, `hcp-terraform-q001`+

---

## 7. Examen final

**Archivo:** `exams/final.json`  
**ID:** `final`  
**Nombre:** `Simulacro Terraform Associate (004)`  
**Descripción:** "Examen de práctica original basado en los objetivos oficiales del examen TA-004. Duración oficial: 60 minutos, 57 preguntas. Este simulacro usa 60 preguntas originales como preparación adicional."

```json
{
  "exam": {
    "id": "final",
    "name": "Simulacro Terraform Associate (004)",
    "passingScore": 85,
    "timeLimit": 60,
    "shuffleQuestions": true,
    "shuffleOptions": true
  }
}
```

> El modo práctica sin límite de tiempo se implementa en la UI: si `timeLimit` es `null` o el usuario elige "Modo práctica", el timer no corre. El JSON define el tiempo oficial (60 min). La UI puede ofrecer ambos modos.

### Distribución de preguntas (60 total)

| moduleId | Preguntas | Justificación |
|---|---|---|
| `core-concepts` | 7 | Dominios 1 + 3 |
| `providers` | 6 | Dominio 2 |
| `state` | 9 | Dominio 6 — peso más alto |
| `resources-modules` | 8 | Dominios 4 + 5 |
| `hcl-expressions` | 8 | Dominio 4 — peso alto |
| `lifecycle-validation` | 7 | Dominio 4 (lifecycle, conditions) |
| `secrets-ephemeral` | 6 | Novedad clave 004 |
| `operations-troubleshooting` | 5 | Dominio 7 |
| `hcp-terraform` | 4 | Dominio 8 |
| **Total** | **60** | |

### Reglas de calidad del examen

- Sin preguntas idénticas ni parafraseadas de los quizzes de módulos — escenarios nuevos y distintos
- Distribución de tipos **pedagógica propia** (no oficial): ~50% `single-choice`, ~30% `multiple-choice`, ~20% `true-false`. El examen real de HashiCorp no publica su distribución exacta de tipos; esta proporción busca cubrir bien los distintos formatos de comprensión
- Distribución de dificultad: ~30% `basic`, ~50% `intermediate`, ~20% `advanced`
- ~30% de preguntas en inglés (para practicar lectura del examen real)
- IDs: `exam-q001` a `exam-q060`; preservar IDs de las 15 preguntas 003 que sean correctas y equivalentes
- Las preguntas con C1 (DynamoDB) y C2 (terraform refresh) del examen 003 se reescriben
- Todo `moduleId` debe existir en el manifest final

---

## 8. Documento de cobertura

**Archivo:** `TERRAFORM_004_COVERAGE.md`  
**Ubicación:** `/Users/miguelangel/Sites/estudiar/flashcards/`  
**Propósito:** trazabilidad completa subobjetivo oficial → módulo → tarjetas → preguntas de quiz → preguntas de examen

### Formato

```markdown
| Subobjetivo oficial 004 | Módulo | Tarjetas | Quiz IDs | Examen IDs | Cobertura |
|---|---|---|---|---|---|
| 1a — Explain what IaC is | core-concepts | core-concepts-001 | core-concepts-q001, core-concepts-q002 | exam-q001 | ✅ cert |
| 4f — Use dynamic blocks | hcl-expressions | hcl-expressions-015 | hcl-expressions-q012 | exam-q041 | ✅ cert |
| 7d — Use terraform taint (deprecated) | operations-troubleshooting | operations-troubleshooting-012 | operations-troubleshooting-q008 | — | ✅ deprecated |
```

---

## 9. Validaciones requeridas

Ejecutar después de cada módulo y al finalizar todo el contenido:

### 9.1 Suite existente (no debe romperse)

```bash
cd /Users/miguelangel/Sites/estudiar/flashcards/study-app
node --test tests/unit/*.test.js
# Resultado esperado: 199 tests, 0 fallos
```

### 9.2 Validación de schema JSON (validators.js de la app)

```bash
node --input-type=module <<'EOF'
import { validate } from './src/utils/validators.js';
import { readFileSync, readdirSync } from 'fs';

const modules = readdirSync('content/terraform-associate/modules')
  .filter(f => f.endsWith('.json'))
  .map(f => [`content/terraform-associate/modules/${f}`, 'module']);

const files = [
  ['content/terraform-associate/manifest.json', 'certification-manifest'],
  ['content/terraform-associate/exams/final.json', 'exam'],
  ...modules,
];

let ok = 0, fail = 0;
for (const [path, schema] of files) {
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  const r = validate(data, schema);
  r.valid ? (ok++, console.log('✔', path))
           : (fail++, console.error('✖', path, r.errors));
}
console.log(`\n${ok} válidos, ${fail} errores`);
EOF
```

### 9.3 Checklist de reglas de contenido

- `module.id` en el JSON coincide con el `id` declarado en `manifest.json`
- `module.order` consecutivo sin saltos ni repeticiones
- Todos los IDs de flashcards siguen el formato `{moduleId}-{NNN}`; sin colisiones
- Todos los IDs de preguntas siguen el formato `{moduleId}-q{NNN}`; sin colisiones
- `correctAnswers` ⊆ `options[].id`; no vacío; sin duplicados
- `single-choice` → exactamente 1 en `correctAnswers`
- `true-false` → exactamente 1 (`"true"` o `"false"`); opciones exactamente `[{"id":"true","text":"Verdadero"},{"id":"false","text":"Falso"}]`
- `multiple-choice` → 2 o más en `correctAnswers`
- `passingScore` entero 1–100
- `difficulty` en `{basic, intermediate, advanced}` o campo ausente
- Examen: todos los `moduleId` existen en el manifest
- No hay preguntas textuales idénticas entre quiz de módulos y examen final

---

## 10. Archivos a modificar / crear

```
content/terraform-associate/
├── manifest.json                           MODIFICAR
│                                           — actualizar name/description a 004
│                                           — totalEstimatedHours: 40
│                                           — añadir módulos 5-9 en orden
│
├── modules/
│   ├── 01-core-concepts.json               MODIFICAR  cv: 2.0.0  correcciones C5, C6, C9
│   ├── 02-providers.json                   MODIFICAR  cv: 2.0.0  correcciones C9, C10
│   ├── 03-state.json                       MODIFICAR  cv: 2.0.0  correcciones C1, C2, C3, C4, C9
│   ├── 04-resources-modules.json           MODIFICAR  cv: 2.0.0  corrección C9
│   ├── 05-hcl-expressions.json             CREAR      cv: 1.0.0
│   ├── 06-lifecycle-validation.json        CREAR      cv: 1.0.0
│   ├── 07-secrets-ephemeral.json           CREAR      cv: 1.0.0
│   ├── 08-operations-troubleshooting.json  CREAR      cv: 1.0.0
│   └── 09-hcp-terraform.json               CREAR      cv: 1.0.0
│
└── exams/
    └── final.json                          MODIFICAR  reescribir 15→60 preguntas

TERRAFORM_004_COVERAGE.md                  CREAR
```

---

## 11. Plan de implementación por etapas

| Etapa | Trabajo | Criterio de cierre |
|---|---|---|
| **E1** | Correcciones C1-C11 en módulos 1-4 + manifest actualizado | Tests 199/199, correcciones aplicadas, JSON válido |
| **E2** | Ampliar módulos 1-4 al volumen objetivo | 28-35 fc y 16-20 quiz por módulo |
| **E3** | Crear módulos 5-9 desde cero | 5 archivos nuevos, JSON válido, cobertura base |
| **E4** | Examen final a 60 preguntas | Distribución correcta, sin duplicados, `timeLimit: 60` |
| **E5** | Documento de cobertura | Todos los subobjetivos 004 mapeados |
| **E6** | Validación completa | 199/199 tests, 0 errores de schema, checklist completo |

Cada etapa termina con una validación completa antes de pasar a la siguiente.

---

## 12. Instrucciones de deploy (bloqueado hasta autorización)

```bash
# PASO 0 — DRY RUN primero (obligatorio, no modifica nada)
cd /Users/miguelangel/Sites/estudiar/flashcards/study-app

aws s3 sync . s3://certifications-main-data \
  --exclude ".git/*" --exclude "tests/*" \
  --exclude "docs/*" --exclude "*.test.js" --exclude "*.md" \
  --dryrun

# Revisar la salida del dryrun, confirmar los cambios

# PASO 1 — Subir a S3 (solo con autorización explícita, SIN --delete)
aws s3 sync . s3://certifications-main-data \
  --exclude ".git/*" --exclude "tests/*" \
  --exclude "docs/*" --exclude "*.test.js" --exclude "*.md"

# PASO 2 — Invalidar CloudFront (solo con autorización explícita)
aws cloudfront create-invalidation \
  --distribution-id E10YUABM664R12 \
  --paths "/*"

# PASO 3 — Commit al repo
git add .
git commit -m "content: Terraform Associate 004 — 9 módulos, 278 flashcards, 163 quiz, 60 examen"
git push
```

> **Sin `--delete`**: no eliminar archivos del bucket sin revisión previa explícita.  
> **Sin deploy sin autorización**: presentar el reporte completo y esperar confirmación antes de ejecutar cualquier comando AWS.

---

## 13. Criterio de aceptación final

- [ ] 9 módulos válidos contra el schema de la app (`schemaVersion: "1.0"`)
- [ ] 278 flashcards en total (suma de los 9 módulos)
- [ ] 163 preguntas de quiz en total (suma exacta)
- [ ] Examen de 60 preguntas, `timeLimit: 60`, `passingScore: 85`
- [ ] Correcciones C1-C11 aplicadas y verificadas
- [ ] Sistema de etiquetas `cert`/`prod`/`deprecated`/`new-004` en uso
- [ ] ~20-30% de preguntas en inglés distribuidas entre módulos
- [ ] Documento `TERRAFORM_004_COVERAGE.md` completo
- [ ] Tests 199/199 pasando
- [ ] Manifest actualizado con 9 módulos y rutas correctas
- [ ] Sin IDs duplicados, sin `correctAnswers` rotos, sin JSON inválido
- [ ] Contenido cargable en la app sin modificar JavaScript
- [ ] Dry-run de S3 revisado antes de cualquier deploy
