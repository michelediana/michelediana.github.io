# Finch

A private, local-first personal finance dashboard — track income, expenses,
budgets and net worth. Built with Angular (standalone components + signals)
and deployed to GitHub Pages via GitHub Actions.

Everything is stored in the browser's `localStorage`; nothing is sent to a
server. A seeded sample dataset loads automatically on first visit.

## Features

- KPI row (net balance, income, expenses, savings rate) with period deltas
  and sparklines
- Balance-over-time line chart and monthly income-vs-expenses bar chart,
  hand-rolled SVG with hover tooltips and a crosshair
- Spending-by-category ranked bars and per-category monthly budget meters
- Sortable/filterable/searchable transactions table with add/edit/delete
  (Angular Reactive Forms)
- JSON export/import, light/dark theme toggle

## Development

```bash
npm install
npm start        # ng serve, http://localhost:4200
```

```bash
npm run build     # production build to dist/finch/browser
```

## Deployment

Pushes to `master` trigger `.github/workflows/deploy.yml`, which builds the
app and publishes `dist/finch/browser` to GitHub Pages via
`actions/deploy-pages`. In the repo settings, **Pages → Build and
deployment → Source** must be set to **GitHub Actions** for this to take
effect.
