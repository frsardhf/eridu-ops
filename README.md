# EriduOps

A free, client-side planner for [Blue Archive](https://bluearchive.nexon.com) — track student bond progress, gear upgrades, skill levels, and material requirements, all stored locally in your browser.

**Live:** https://eriduops.com

---

## Features

- **Bond** — Track current and target bond levels, calculate XP needed, manage gifts and selector boxes
- **Upgrade** — Plan skill levels, character levels, and potential/talent upgrades with material cost breakdowns
- **Gear** — Track equipment tier progression and exclusive weapon (EX Weapon) levels
- **Inventory** — Manage owned materials, equipment, and gifts across all students
- **Student grid** — Search, sort, pin, and bulk-edit students
- **Import / Export** — Back up and share your planner data as JSON
- **Multi-language** — English and Japanese UI

All data is stored locally in IndexedDB — no account, no server, no tracking.

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Language | TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| Storage | Dexie (IndexedDB) |
| Data source | [SchaleDB](https://schaledb.com) API |

---

## Getting Started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # preview production build locally
```

---

## Project Structure

```
src/
  components/
    display/       # Student grid, card, bulk-modify, ToolsRail
    inventory/     # GlobalInventoryModal, ItemsGrid, EquipmentGrid, ResourceSummary, ResourceCard
    modal/         # StudentModal and all tab sections
      bond/        # Bond tracking, gift grid, gift options
      gear/        # Equipment growth, exclusive weapon, eleph/eligma
      info/        # Info tab — skills, weapon, gear display
      upgrade/     # Level, skill, potential sections
      shared/      # MaterialsSection (shared across tabs)
    navbar/        # Navigation bar, import/export, credits
  composables/     # Lightweight display composables (useTooltip, useStudentColors, …)
  consumables/
    hooks/         # Form-state composables bridging components ↔ IndexedDB
    services/      # SchaleDB fetch, IndexedDB service, form initialization
    stores/        # Reactive stores (studentStore, localizationStore, …)
    utils/         # Pure utility functions (sort, filter, material calc, …)
  types/           # TypeScript interfaces (StudentProps, GiftProps, gear, upgrade, …)
  locales/         # i18n translations (en, jp)
  styles/          # Global CSS, modal CSS, resource display CSS
```

### Architecture

```
Components  →  Composables  →  Hooks  →  Services / Stores / IndexedDB
(UI layer)     (display)       (form      (persistence layer)
                                state)
```

- **Composables** (`src/composables/`) — pure display helpers: computed colors, level display state, tooltips
- **Hooks** (`src/consumables/hooks/`) — heavier form-state managers that read/write IndexedDB and expose reactive data to components
- **Stores** (`src/consumables/stores/`) — singleton reactive state (student data, localization, cached resources)

---

## Data

Student, item, and equipment data is fetched from [SchaleDB](https://schaledb.com) and cached in IndexedDB. No data is sent to any server — everything runs in the browser.

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss larger changes.
