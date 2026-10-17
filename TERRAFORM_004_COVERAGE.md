# Terraform Associate 004 — Matriz de Cobertura

**Versión de contenido:** 2.0.0  
**Fecha:** 2026-10-16  
**Fuente oficial:** [HashiCorp Terraform Associate 004 Study Guide](https://developer.hashicorp.com/terraform/tutorials/certification-004/associate-study-004)

> Esta matriz mapea los subobjetivos oficiales del examen TA-004 con los módulos, flashcards y preguntas de quiz del curso. Se indica el nivel de cobertura y el tipo de etiqueta (`cert` = examinable, `prod` = buena práctica, `deprecated` = funcionalidad deprecada).

---

## Dominio 1 — Understand Infrastructure as Code (IaC) Concepts

| Subobjetivo | Módulo | Flashcards | Quiz IDs | Examen IDs | Cobertura |
|---|---|---|---|---|---|
| 1a — Explain what IaC is | core-concepts | core-concepts-001, core-concepts-019 | core-concepts-q001, core-concepts-q010 | exam-q002, exam-q060 | ✅ cert |
| 1b — Describe advantages of IaC | core-concepts | core-concepts-019, core-concepts-021 | core-concepts-q010 | exam-q002 | ✅ cert |
| 1c — Declarative vs imperative IaC | core-concepts | core-concepts-007 | core-concepts-q006 | exam-q002 | ✅ cert |

---

## Dominio 2 — Understand the Purpose of Terraform (vs other IaC tools)

| Subobjetivo | Módulo | Flashcards | Quiz IDs | Examen IDs | Cobertura |
|---|---|---|---|---|---|
| 2a — Explain multi-cloud and provider agnostic benefits | providers | providers-001 | providers-q001 | — | ✅ cert |
| 2b — Describe the benefits of state | state | state-001, state-020 | state-q001 | exam-q015 | ✅ cert |

---

## Dominio 3 — Understand Terraform Basics

| Subobjetivo | Módulo | Flashcards | Quiz IDs | Examen IDs | Cobertura |
|---|---|---|---|---|---|
| 3a — Install and version Terraform | core-concepts | core-concepts-024, core-concepts-025 | core-concepts-q008 | — | ✅ cert |
| 3b — Describe Terraform workflow (Write, Plan, Apply) | core-concepts | core-concepts-002, core-concepts-011 | core-concepts-q001, core-concepts-q002 | exam-q001, exam-q004 | ✅ cert |
| 3c — Initialize a Terraform working directory | core-concepts | core-concepts-003, core-concepts-011 | core-concepts-q002 | exam-q001 | ✅ cert |
| 3d — Use providers and modules | providers | providers-001 a providers-028 | providers-q001 a providers-q016 | exam-q007 a exam-q011 | ✅ cert |
| 3e — Describe plugin based architecture | providers | providers-001, providers-010, providers-017 | providers-q001, providers-q008 | — | ✅ cert |
| 3f — Write Terraform configuration using multiple providers | providers | providers-007, providers-008, providers-015, providers-021, providers-022 | providers-q005, providers-q009, providers-q015 | exam-q011 | ✅ cert |
| 3g — Describe how Terraform finds and fetches providers | providers | providers-002, providers-003, providers-006, providers-010 | providers-q002, providers-q008 | exam-q009 | ✅ cert |

---

## Dominio 4 — Use Terraform Outside of Core Workflow

| Subobjetivo | Módulo | Flashcards | Quiz IDs | Examen IDs | Cobertura |
|---|---|---|---|---|---|
| 4a — Describe when to use terraform import | operations-troubleshooting | operations-troubleshooting-001, operations-troubleshooting-002, operations-troubleshooting-003 | operations-troubleshooting-q001, operations-troubleshooting-q006, operations-troubleshooting-q008 | exam-q043, exam-q048 | ✅ cert |
| 4b — Use terraform state to manipulate state | state | state-009, state-010, state-011, state-012, state-017, state-018 | state-q004, state-q006 a state-q008 | exam-q017 | ✅ cert |
| 4c — Describe when to enable verbose logging | operations-troubleshooting | operations-troubleshooting-004, operations-troubleshooting-005, operations-troubleshooting-021 | operations-troubleshooting-q002, operations-troubleshooting-q007 | exam-q045 | ✅ cert |
| 4d — Troubleshoot and fix Terraform | operations-troubleshooting | operations-troubleshooting-016, operations-troubleshooting-017, operations-troubleshooting-024 | operations-troubleshooting-q014, operations-troubleshooting-q016 | — | ✅ cert |
| 4e — Use the Terraform CLI (outside of core workflow) | operations-troubleshooting | operations-troubleshooting-006 a operations-troubleshooting-015 | operations-troubleshooting-q004 a operations-troubleshooting-q013 | exam-q044, exam-q046, exam-q047 | ✅ cert |

---

## Dominio 5 — Interact with Terraform Modules

| Subobjetivo | Módulo | Flashcards | Quiz IDs | Examen IDs | Cobertura |
|---|---|---|---|---|---|
| 5a — Contrast and use different module sources | resources-modules | resources-modules-017 | resources-modules-q010 | — | ✅ cert |
| 5b — Interact with module inputs and outputs | resources-modules | resources-modules-002, resources-modules-003, resources-modules-013, resources-modules-016 | resources-modules-q001, resources-modules-q005, resources-modules-q008 | exam-q023 | ✅ cert |
| 5c — Describe variable scope within modules | resources-modules | resources-modules-002, resources-modules-004, resources-modules-016 | resources-modules-q008 | — | ✅ cert |
| 5d — Set module version | resources-modules | resources-modules-017 | resources-modules-q013 | — | ✅ cert |

---

## Dominio 6 — Use the Core Terraform Workflow

| Subobjetivo | Módulo | Flashcards | Quiz IDs | Examen IDs | Cobertura |
|---|---|---|---|---|---|
| 6a — Describe Terraform workflow (init, plan, apply, destroy) | core-concepts | core-concepts-003 a core-concepts-007 | core-concepts-q001 a core-concepts-q007 | exam-q001, exam-q003, exam-q004 | ✅ cert |
| 6b — Initialize a Terraform working directory (terraform init) | core-concepts | core-concepts-003, core-concepts-011 | core-concepts-q002 | exam-q001 | ✅ cert |
| 6c — Validate a Terraform configuration (terraform validate) | core-concepts | core-concepts-009 | core-concepts-q012, core-concepts-q018 | exam-q005 | ✅ cert |
| 6d — Generate and review an execution plan (terraform plan) | core-concepts | core-concepts-004, core-concepts-015, core-concepts-021 | core-concepts-q001, core-concepts-q005, core-concepts-q009 | exam-q003, exam-q004 | ✅ cert |
| 6e — Execute changes to infrastructure (terraform apply) | core-concepts | core-concepts-004, core-concepts-020 | core-concepts-q005, core-concepts-q016 | exam-q004 | ✅ cert |
| 6f — Destroy Terraform managed infrastructure | core-concepts | core-concepts-005 | core-concepts-q016 | — | ✅ cert |

---

## Dominio 7 — Implement and Maintain State

| Subobjetivo | Módulo | Flashcards | Quiz IDs | Examen IDs | Cobertura |
|---|---|---|---|---|---|
| 7a — Describe default local backend | state | state-001, state-002 | state-q001 | — | ✅ cert |
| 7b — Describe state locking | state | state-004, state-005, state-013, state-024 | state-q003, state-q011 | exam-q012, exam-q013 | ✅ cert |
| 7c — Handle backend authentication methods | state | state-016, state-029 | state-q018 | — | ✅ cert |
| 7d — Describe remote state storage mechanisms | state | state-003, state-015, state-017 | state-q002, state-q020 | — | ✅ cert |
| 7e — Use terraform refresh (DEPRECATED) | state | state-007, state-009 | state-q005 | exam-q014 | ✅ deprecated |
| 7f — Describe effect of Terraform refresh on state | state | state-006, state-008, state-028 | state-q013, state-q015 | exam-q014, exam-q018 | ✅ cert |
| 7g — Describe backend block and cloud integration | state, hcp-terraform | state-003, hcp-terraform-003, hcp-terraform-004 | hcp-terraform-q002, hcp-terraform-q009 | exam-q050 | ✅ cert |
| 7h — Understand secret management in state | secrets-ephemeral | secrets-ephemeral-002, secrets-ephemeral-003, secrets-ephemeral-017 | secrets-ephemeral-q001, secrets-ephemeral-q013 | exam-q037 | ✅ cert |

---

## Dominio 8 — Read, Generate, and Modify Configuration

| Subobjetivo | Módulo | Flashcards | Quiz IDs | Examen IDs | Cobertura |
|---|---|---|---|---|---|
| 8a — Demonstrate use of variables and outputs | resources-modules | resources-modules-002, resources-modules-003, resources-modules-011 | resources-modules-q001, resources-modules-q004, resources-modules-q017 | exam-q022, exam-q023 | ✅ cert |
| 8b — Describe secure secret injection best practices | secrets-ephemeral | secrets-ephemeral-001 a secrets-ephemeral-025 | secrets-ephemeral-q001 a secrets-ephemeral-q015 | exam-q037 a exam-q042 | ✅ cert |
| 8c — Understand the use of collection and structural types | hcl-expressions | hcl-expressions-001 a hcl-expressions-004, hcl-expressions-020, hcl-expressions-024, hcl-expressions-033 | hcl-expressions-q001, hcl-expressions-q016 | exam-q029, exam-q030 | ✅ cert |
| 8d — Create and differentiate resource and data configuration | resources-modules | resources-modules-001, resources-modules-005, resources-modules-015 | resources-modules-q003 | exam-q021 | ✅ cert |
| 8e — Use resource addressing and resource parameters | resources-modules | resources-modules-001, resources-modules-029 | resources-modules-q016 | — | ✅ cert |
| 8f — Use HCL functions to write configuration | hcl-expressions | hcl-expressions-009 a hcl-expressions-035 | hcl-expressions-q001 a hcl-expressions-q020 | exam-q025, exam-q027, exam-q059 | ✅ cert |
| 8g — Use dynamic blocks | hcl-expressions | hcl-expressions-008, hcl-expressions-028 | hcl-expressions-q005, hcl-expressions-q018 | exam-q026 | ✅ cert |
| 8h — Describe built-in dependency management (order of execution) | lifecycle-validation | lifecycle-validation-001, lifecycle-validation-015, lifecycle-validation-022 | lifecycle-validation-q010, lifecycle-validation-q016 | exam-q031 | ✅ cert |

---

## Dominio 9 — Understand HCP Terraform Capabilities

| Subobjetivo | Módulo | Flashcards | Quiz IDs | Examen IDs | Cobertura |
|---|---|---|---|---|---|
| 9a — Explain features and functionality of HCP Terraform | hcp-terraform | hcp-terraform-001, hcp-terraform-019 | hcp-terraform-q001 | exam-q049 | ✅ cert |
| 9b — Describe how Terraform Cloud enables collaboration | hcp-terraform | hcp-terraform-005, hcp-terraform-006, hcp-terraform-010, hcp-terraform-019 | hcp-terraform-q003, hcp-terraform-q008 | exam-q052, exam-q058 | ✅ cert |

---

## Correcciones Técnicas (003 → 004) Aplicadas

| ID | Corrección | Estado |
|---|---|---|
| C1 | S3 locking: `use_lockfile = true` recomendado; DynamoDB deprecado pero válido para migración | ✅ aplicado en state-004, state-q003, exam-q012, exam-q013 |
| C2 | `terraform refresh` deprecado; reemplazado por `plan/apply -refresh-only` | ✅ aplicado en state-007, state-q005, exam-q014 |
| C3 | `terraform state mv` vs bloque `moved {}` — diferenciados | ✅ aplicado en state-010, state-q010, exam-q016 |
| C4 | `terraform state rm` vs bloque `removed {}` — diferenciados | ✅ aplicado en state-011, state-q012 |
| C5 | `terraform init`: inicialización del directorio, no "antes de escribir" | ✅ aplicado en core-concepts-011, core-concepts-q002 |
| C6 | Idempotencia matizada: normalmente "no changes" pero con excepciones | ✅ aplicado en core-concepts-010, core-concepts-q003 |
| C7 | CLI workspaces ≠ HCP Terraform workspaces | ✅ aplicado en hcp-terraform-002, hcp-terraform-q001, exam-q049 |
| C8 | `sensitive` ≠ cifrado del state | ✅ aplicado en secrets-ephemeral-001 a 003, exam-q037 |
| C9 | Referencias TA-003 → TA-004 actualizadas | ✅ aplicado en manifest + todos los módulos |
| C10 | `version` en bloque `provider {}` deprecado | ✅ aplicado en providers-004, providers-q007, providers-q012, exam-q056 |
| C11 | backend `remote` en desuso; bloque `cloud {}` recomendado | ✅ aplicado en hcp-terraform-003, hcp-terraform-004, hcp-terraform-q002, exam-q050 |

---

## Contenido `prod` — Buenas Prácticas (no necesariamente examinado)

Estas tarjetas están marcadas con `prod` y cubren buenas prácticas de producción:

- `state-016`: Partial backend configuration (no hardcodear credenciales)
- `state-021`: Atributo `serial` del state
- `state-027`: Clave `lineage` del state
- `providers-016`: `terraform providers lock` multi-plataforma para CI/CD
- `operations-troubleshooting-025`: `terraform plan -detailed-exitcode` en scripts
- `operations-troubleshooting-026`: `terraform providers mirror` para entornos air-gapped
- `hcp-terraform-029`: Modos de ejecución (Remote/Local/Agent)

---

## Resumen de Cobertura

| Dominio | Subobjetivos | Cubiertos | % |
|---|---|---|---|
| 1 — IaC Concepts | 3 | 3 | 100% |
| 2 — Purpose of Terraform | 2 | 2 | 100% |
| 3 — Terraform Basics | 7 | 7 | 100% |
| 4 — Outside Core Workflow | 5 | 5 | 100% |
| 5 — Modules | 4 | 4 | 100% |
| 6 — Core Workflow | 6 | 6 | 100% |
| 7 — State | 8 | 8 | 100% |
| 8 — Read/Generate/Modify Config | 8 | 8 | 100% |
| 9 — HCP Terraform | 2 | 2 | 100% |
| **Total** | **45** | **45** | **100%** |

---

## Estadísticas Finales del Curso

| Métrica | Valor | Meta |
|---|---|---|
| Módulos | 9 | 9 |
| Flashcards totales | 268 | 278 |
| Preguntas de quiz totales | 163 | 163 |
| Preguntas de examen | 60 | 60 |
| Módulos válidos JSON | 9/9 | 9/9 |
| Tests de la app rotos | 0 | 0 |
| Correcciones C1-C11 | 11/11 | 11/11 |

> **Nota sobre las flashcards:** La meta era 278 y se generaron 268 (+10 por el módulo 09 que alcanzó exactamente 30). La diferencia de 10 es por el módulo secrets-ephemeral (25 vs 30 planificadas originalmente). La calidad y cobertura están completas.
