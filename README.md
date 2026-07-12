# Trading-Dashboard
# Multi-Timeframe Trading Dashboard

A responsive, real-time market analysis dashboard rendering four synchronised
timeframes (4H / 1H / 15M / 5M) for a single instrument, designed around the
top-down analysis workflow used by discretionary traders.

Built with Next.js 14 (App Router), TypeScript, Zustand, and Tailwind.

---

## Motivation

Discretionary traders rarely analyse a single timeframe in isolation — a valid
setup on the 5M is only tradeable if it agrees with structure on the 4H.
Existing tools force manual tab-switching, which introduces friction and
recency bias at exactly the moment when judgement matters most.

This dashboard renders all four timeframes simultaneously and keeps them
locked to a single selected instrument, so switching from Gold to EUR/USD
updates every chart in one action.

---

## Features

- **Synchronised multi-timeframe grid** — 4H / 1H / 15M / 5M rendered
  concurrently; a single asset selection propagates to all four panes via
  centralised state.
- **Cross-asset-class coverage** — commodities (XAUUSD, XAGUSD), FX
  (GBPUSD, EURUSD), equities (NVDA, TSLA), and indices (UK100), each mapped
  to its correct exchange feed.
- **Isolated widget lifecycle** — each chart instance is namespaced with a
  React `useId` and fully torn down on unmount, preventing DOM collisions and
  memory leaks when multiple third-party widgets share a page.
- **Analysis sidebar** — a chat-style panel for market commentary
  (currently a deterministic mock; see Roadmap).
- **Fully responsive** — stacked layout on mobile, split-pane on desktop.

---

## Architecture
