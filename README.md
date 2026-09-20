# CertPulse

**Free, browser-based cloud certification practice with a local-first AI tutor and learner analytics.**

Live app: https://harithasridhar1306.github.io/certpulse/

## Why I built it

Certification prep often tells you *what* the right answer is, but not whether you actually understand the concept.

CertPulse is an experiment in building a lightweight learning loop:

**Practice → Review → Understand → Track weak areas → Practice again**

I started with a small static prototype and am evolving it toward a real learning platform while keeping the core experience free.

## Current architecture

```
GitHub Pages
    │
    ├── index.html / style.css
    │
    ├── data/exams.json
    │    └── versioned question bank
    │
    └── app.js
          │
          ├── Exam engine
          │    ├── random question selection
          │    ├── difficulty + question-type filters
          │    └── timed 20-question mocks
          │
          ├── Learner state
          │    └── browser localStorage
          │         ├── attempts
          │         ├── scores
          │         └── domain performance
          │
          └── Local AI Tutor
               └── Transformers.js + SmolLM2
                    ├── WebGPU when available
                    └── WASM fallback
```

GitHub Pages is intentionally used as a static hosting layer; the current learner profile is stored locally in the browser, so no login or paid database is required.

## Features

- Dynamic question bank loaded from versioned JSON at runtime
- GCP Associate Cloud Engineer practice
- CKA practice
- CKAD practice
- 20-question timed mock exams
- Easy / Medium / Hard filters
- MCQ / Scenario / Terminal / Architecture filters
- Kubernetes YAML playground with browser-side checks
- Official documentation references
- Review with explanations after an attempt
- Local learner dashboard
- Domain-level knowledge map
- Recent-attempt history
- Browser-local AI Tutor
- AI output validation + deterministic fallback when the local model produces unusable output
- No paid AI API required for the browser tutor

## Resource-grounded dynamic question generation

CertPulse now has a resource-ingestion pipeline for keeping the question bank fresh.

```
Official public documentation
          ↓
     data/resources.json
          ↓
   GitHub Actions (daily/manual)
          ↓
   Fetch + extract source text
          ↓
   Gemini generates ORIGINAL practice questions
          ↓
   Validate schema + references
          ↓
      data/exams.json
          ↓
       GitHub Pages
```

The generated questions are grounded in public documentation and the published certification scope. They are **not live exam questions, leaked questions, or recalled proprietary exam content**. The goal is to create fresh, original practice material that reflects current public documentation.

To enable the refresh workflow, add a GitHub Actions secret named `GEMINI_API_KEY`. The workflow can also be run manually from the Actions tab. Without the secret, the existing question bank remains unchanged.

The resource list lives in `data/resources.json`, and the generator is `scripts/refresh-bank.mjs`.

## Engineering ideas I'm exploring

The current version is deliberately simple, but the next iterations are focused on making the system more dynamic:

1. Expand the versioned JSON question bank to 100–200+ questions per certification.
2. Add a normalized question schema with skills, tags and richer source metadata.
3. Build adaptive question selection from learner history.
4. Add richer terminal validation with real YAML parsing.
5. Add an optional backend for cross-device progress.
6. Add an ingestion pipeline that can turn official documentation into reviewed question candidates.
7. Containerize the API and deploy the platform on GKE.
8. Use Terraform + GitHub Actions for repeatable infrastructure and delivery.
9. Add observability around API latency, question generation and model usage.

## AI approach

The AI Tutor is intentionally **local-first**.

Instead of sending a learner's answers to a paid hosted LLM API, the browser downloads a quantized instruction model and runs inference locally where supported.

The model is treated as a *rewriter/tutor*, not the source of truth:

```
Verified explanation
       ↓
Question + learner answer
       ↓
Local model
       ↓
Output validation
       ↓
Usable AI explanation
       │
       └── invalid output → verified deterministic fallback
```

This was important because small browser models can produce repetitive or low-quality output. The product therefore does not blindly display model output.

## Disclaimer

CertPulse is an independent learning project and is not affiliated with Google Cloud, CNCF, Linux Foundation or any certification provider.


## Platform architecture — v0.9

CertPulse is being evolved from a static learning app into a deployable cloud-native platform.

    Browser
      |
      +-- GitHub Pages
      |     +-- adaptive learner
      |     +-- local AI tutor
      |     +-- versioned question bank
      |
      +-- Optional API
            +-- /health
            +-- /metrics
            +-- /api/certifications
            +-- /api/questions/:cert
            +-- /api/validate/yaml
                     |
                     +-- js-yaml parser + task validation

Dynamic content refresh:
GitHub Actions -> public documentation -> Gemini -> validated questions -> exams.json -> GitHub Pages

Delivery:
GitHub Actions -> Docker -> Artifact Registry -> Cloud Run/GKE

Infrastructure:
Terraform -> Google Cloud

Kubernetes:
k8s/deployment.yaml + kustomization.yaml

The backend is intentionally optional for the public GitHub Pages demo. The free static app remains usable while the repository contains a realistic API and cloud deployment path.

### Hands-on validation

The API parses submitted Kubernetes YAML rather than relying only on string matching. It validates syntax first and can then check task-specific fields such as apiVersion, kind, metadata.name and container requirements.

### Observability

The API exposes lightweight Prometheus-compatible /metrics plus /health. This is the starting point for structured logs, traces, Cloud Monitoring and SLOs.

### Production path

1. Container image build and CI validation.
2. Artifact Registry image publishing.
3. Terraform-managed GCP infrastructure.
4. GKE deployment with Workload Identity.
5. API-backed learner profiles.
6. Persistent database for cross-device progress.
7. OpenTelemetry + Cloud Monitoring.
8. GitOps deployment with FluxCD.

No cloud credentials, project IDs or paid-service secrets are committed to the repository.
