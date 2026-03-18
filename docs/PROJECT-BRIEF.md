# Project Brief Template

Use this at the start of a project or major refactor.

The goal is to make product direction, current truth, constraints, and delivery expectations clear early so implementation moves faster with fewer course corrections.

---

## 1. Project Summary

### Project name

`<project name>`

### One-line goal

`<what this product should do in one sentence>`

### Why this exists

- `<business or personal reason 1>`
- `<business or personal reason 2>`
- `<why now>`

---

## 2. Current Truth

Write what is true today, not what you hope to build later.

### Current product reality

- `<how users access it today>`
- `<what actually works today>`
- `<what is manual today>`
- `<what is broken or awkward today>`

### Current user flows

- `<main user flow 1>`
- `<main user flow 2>`
- `<admin or operator flow>`

### Current source of truth

- data lives in: `<db / sheets / files / external APIs>`
- writes happen through: `<app / script / admin tool>`
- reads happen through: `<app / script / direct DB / API>`

---

## 3. Target Outcome

Describe the destination state clearly.

### What success looks like

- `<user-facing outcome 1>`
- `<user-facing outcome 2>`
- `<operator/admin outcome>`
- `<technical outcome>`

### What should be different after this work

- from: `<old model>`
- to: `<new model>`

---

## 4. Scope Boundaries

### In scope now

- `<things we are definitely building now>`

### Out of scope now

- `<things we are explicitly not building yet>`

### Future direction

- `<likely future capability 1>`
- `<likely future capability 2>`

Important:
- separate “future direction” from “current requirement”
- do not mix future ideas into current implementation unless necessary

---

## 5. Users And Roles

### Primary users

- `<user type 1>`
- `<user type 2>`

### Admin / operator users

- `<admin type>`

### Trust model

- public actions: `<open / authenticated / moderated>`
- admin actions: `<password / login / RBAC>`
- sensitive operations: `<what must be protected>`

---

## 6. Non-Negotiables

These are the things that should be known before design or implementation starts.

### UX non-negotiables

- `<mobile behavior that must stay>`
- `<layout or workflow that users already expect>`
- `<must be one-screen / must be fast / must be simple>`

### Product non-negotiables

- `<rule 1>`
- `<rule 2>`

### Technical non-negotiables

- hosting: `<Vercel / Netlify / custom>`
- datastore: `<Supabase / Postgres / etc>`
- auth model for now: `<hidden admin / login / RBAC>`

---

## 7. Constraints

### Team constraints

- `<solo builder / small team / shared ownership>`

### Budget constraints

- `<free tier only / low cost / okay to pay>`

### Traffic / usage expectations

- `<low traffic / bursty / internal only>`

### Delivery constraints

- `<deadline / phased rollout / must avoid rewrite>`

---

## 8. Data Reality

This section saves a lot of time. Put messy truths here early.

### Data sources

- `<players source>`
- `<matches source>`
- `<historical import source>`

### Known data issues

- `<missing timestamps>`
- `<inconsistent names>`
- `<duplicates>`
- `<handwritten records>`

### Domain rules

- `<grouping rules>`
- `<level/category rules>`
- `<date rules>`
- `<scoring rules>`

### Canonical identifiers

- players are identified by: `<slug / id / display name>`
- matches are identified by: `<id / import key / timestamp + participants>`

---

## 9. Architecture Preferences

### Build strategy

- [ ] evolve existing code
- [ ] rewrite from scratch
- [ ] hybrid: keep UI, replace backend

### Preferred tradeoffs

- `<ship quickly over perfect abstraction>`
- `<favor maintainability>`
- `<prefer typed domain layer>`

### Things to avoid

- `<duplicate logic>`
- `<manual spreadsheet coupling>`
- `<long-running work on page load>`

---

## 10. Delivery Plan

### Phase order

1. `<phase 1>`
2. `<phase 2>`
3. `<phase 3>`

### Immediate next task

`<the thing the coding agent should start with>`

### Definition of done for the next phase

- `<done signal 1>`
- `<done signal 2>`

---

## 11. Required Documentation

List the docs that should exist for this project.

- [ ] master plan
- [ ] API contract
- [ ] schema / data model
- [ ] migration notes
- [ ] operations runbook
- [ ] implementation tracker

Canonical planning doc:

`<which file is the single source of truth>`

---

## 12. Test And Verification Expectations

### What must be tested

- `<happy path>`
- `<admin path>`
- `<mobile path>`
- `<data processing path>`

### Acceptable verification

- `<manual QA only>`
- `<typecheck + manual>`
- `<automated tests required>`

---

## 13. Open Questions

Only include questions that materially affect architecture or delivery.

- `<question 1>`
- `<question 2>`

---

## 14. Starter Prompt For A Coding Agent

Copy and adapt this:

```text
Read this project brief first and use it as the source of truth.

Goal:
<one-line goal>

Current truth:
- <true thing 1>
- <true thing 2>

Constraints:
- <constraint 1>
- <constraint 2>

Non-negotiables:
- <non-negotiable 1>
- <non-negotiable 2>

What I want from you:
- <deliverable 1>
- <deliverable 2>

Start by reading the relevant docs/code, then implement the highest-priority next step.
```

---

## 15. Notes From This Project

These are the learnings this template was designed to capture earlier:

- state current truth early
- separate current requirements from future ideas
- provide UX reference screens early if they are important
- document messy data realities early
- define admin vs public responsibilities clearly
- keep one canonical planning doc once the project becomes real
