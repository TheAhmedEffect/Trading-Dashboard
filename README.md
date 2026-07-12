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

app/
layout.tsx            Root layout, fonts, global styles
page.tsx              Composition root: header + chart grid + sidebar
components/
charts/
ChartGrid.tsx       Maps CHART_TIMEFRAMES -> TradingChart instances
TradingChart.tsx    Imperative TradingView widget mount/teardown
header/
AssetSelector.tsx   Writes selected asset to global store
chat/                 Analysis sidebar (presentational + mock engine)
ui/                   shadcn/ui primitives
hooks/
useAssetStore.ts      Zustand store — single source of truth for asset
lib/
assets.ts             Asset registry + timeframe config (typed)
chatMock.ts           Deterministic response engine (placeholder)


**State flow:** `AssetSelector` → `useAssetStore` → `ChartGrid` →
four `TradingChart` instances. One write, four re-renders, no prop drilling.

**Charting:** rendered via the TradingView Advanced Chart embed widget.
Market data, candle aggregation, and indicator computation (MACD) are handled
by TradingView; this application owns the composition, state, and lifecycle
layer.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | RSC-ready, file-based routing |
| Language | TypeScript (strict) | Typed asset/timeframe registries |
| State | Zustand | Minimal global store, no provider tree |
| Styling | Tailwind + shadcn/ui | Consistent primitives, no CSS sprawl |
| Charts | TradingView Embed Widget | Production-grade rendering + data |

---

## Local Installation

```bash
git clone https://github.com/TheAhmedEffect/trading-dashboard.git
cd trading-dashboard
npm install
npm run dev     # http://localhost:3000
```

No API keys required — the TradingView embed is public.

---

## Current Scope & Limitations

Stated explicitly, because they define the next phase of work:

- Market data and indicator computation are **delegated to TradingView**.
  This project does not currently ingest, store, or transform OHLCV data.
- The analysis sidebar returns **deterministic pre-written responses**
  (`lib/chatMock.ts`). It is a UI contract for a future inference layer,
  not a model.
- There is no backend, persistence layer, or authentication.

---

## Roadmap

**Phase 1 — Own the data layer**
- Replace embed-only charting with a real OHLCV pipeline
  (Polygon.io / Alpha Vantage / CCXT), persisted to Postgres/TimescaleDB.
- Render candles client-side with `lightweight-charts` so the app controls
  the data path end-to-end.

**Phase 2 — Analytics**
- Compute indicators in-house (ATR, RSI, MACD, realised volatility) rather
  than consuming them from a vendor.
- Add a Python service (FastAPI) for vectorised time-series work with
  pandas/NumPy.

**Phase 3 — Modelling**
- Baseline forecasting on returns (not price): ARIMA/GARCH for volatility,
  then gradient-boosted trees on engineered features.
- Rigorous evaluation: walk-forward validation, no look-ahead bias,
  transaction-cost-aware backtesting. Report honest out-of-sample metrics
  including the ones that don't flatter the model.

**Phase 4 — Replace the mock**
- Swap `chatMock.ts` for a genuine inference endpoint operating on the
  computed feature set.
