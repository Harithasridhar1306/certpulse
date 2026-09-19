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
- No paid AI API required

## Engineering ideas I'm exploring

The current version is deliberately simple, but the next iterations are focused on making the system more dynamic:

1. Move the question bank into versioned JSON/data sources.
2. Add a normalized question schema with skills, domains and references.
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
