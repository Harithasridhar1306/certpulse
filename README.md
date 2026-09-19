# CertPulse

**Free cloud certification practice — built for understanding, not just passing.**

CertPulse is a lightweight, browser-based mock exam and hands-on practice app for cloud and Kubernetes certification preparation. The goal is to combine exam-style questions with practical troubleshooting and manifest-writing exercises.

## Current certifications

- Google Cloud Associate Cloud Engineer (GCP ACE)
- Certified Kubernetes Administrator (CKA)
- Certified Kubernetes Application Developer (CKAD)

## Features

### Mock exam mode

- 45-minute timed exam
- 20 questions per attempt
- One question at a time
- Randomized question sets
- Multiple-choice, scenario, terminal, and architecture-style questions
- Difficulty selection: Easy, Medium, Hard, or Any
- Question-style selection: MCQ, Scenario, Terminal, Architecture, or Any
- Live progress and score tracking
- Final score and complete answer review
- Explanations for every question
- Links to relevant official documentation

### Terminal / manifest playground

CKA and CKAD terminal questions are designed as hands-on exercises rather than ordinary multiple-choice questions.

The flow is:

`Write YAML → Check manifest → Fix issues → Continue`

Exercises include Kubernetes resources such as:

- Pods
- Deployments
- Services
- ConfigMaps
- Secrets
- Jobs
- CronJobs
- NetworkPolicies
- Readiness probes

The current checker performs browser-side validation against the exercise requirements and reports how many checks passed. It does not execute `kubectl` or create real Kubernetes resources.

## Tech stack

- HTML
- CSS
- Vanilla JavaScript
- GitHub Pages
- GitHub Actions

The current version is intentionally static and does not require a paid backend or API key.

## Run locally

Clone the repository and open `index.html` in a browser, or serve the repository with any static web server.

```bash
git clone https://github.com/Harithasridhar1306/certpulse.git
cd certpulse
```

Then open `index.html`.

## Project structure

```text
certpulse/
├── index.html
├── style.css
├── app.js
├── .nojekyll
├── README.md
└── .github/
    └── workflows/
        └── pages.yml
```

## Deployment

CertPulse is deployed as a static site through GitHub Pages.

Every push to `main` triggers the GitHub Actions workflow in `.github/workflows/pages.yml`, which uploads the repository as a Pages artifact and deploys it.

## Roadmap

- Expand question banks across every certification, difficulty, and question style
- Add more scenario-based questions
- Expand the terminal playground with more Kubernetes troubleshooting exercises
- Parse YAML and provide more structured validation feedback
- Add kubectl-style validation and more realistic Kubernetes checks
- Add hints and progressive guidance for hands-on exercises
- AI-generated question sets
- User accounts and test history
- Weak-area analytics
- More cloud certifications

## Learning philosophy

CertPulse is intended to test **understanding and practical reasoning**, not memorization.

For hands-on questions, the aim is to make the learner:

1. Read a requirement.
2. Translate it into a Kubernetes or cloud resource.
3. Write the configuration.
4. Validate it.
5. Understand what is wrong when validation fails.

## Important note

CertPulse uses original practice questions and is **not an exam-dump repository**. It is an independent learning project and is not affiliated with Google, Kubernetes, CNCF, or any certification provider.

## Live site

https://harithasridhar1306.github.io/certpulse/

## Repository

https://github.com/Harithasridhar1306/certpulse
