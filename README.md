# EriduOps

A free, client-side planner for [Blue Archive](https://bluearchive.nexon.com) — track student bond progress, gear upgrades, skill levels, and material requirements, all stored locally in your browser.

**Live:** https://eriduops.com

---

## Features

- **Student grid** (`/students`) — Search, sort, pin, filter (school, equipment slot, attack/defense type, rarity, availability), and bulk-edit students
- **Student planner** — Per-student modal for skill levels, character levels, potentials, equipment tiers, and exclusive weapon (EX Weapon) levels with material cost breakdowns
- **Bond planner** (`/bonds`) — Tracked-students view with gift allocation, cafe-tap projection (start/end dates), bonus EXP from lessons, and per-gift EXP breakdowns
- **Bond 100 Hall** (`/hall`) — Community wall of senseis who've reached bond level 100 with each student; search, server filters, sorting, friend-code submission, and a per-student entries view (data via arona.icu)
- **Inventory** — Manage owned materials, equipment, and gifts across all students; bulk-update from a single screenshot via OCR scan
- **Tools** (ToolsRail on `/students`) — Bulk bond update (paste `name bond` pairs), bulk modify students, crafting fodder picker, equipment farming suggestions, deck builder
- **Themes** — 7 built-in colour themes (dark, light, ocean, forest, sunset, rose, violet)
- **Import / Export** — Back up and share your planner data as JSON
- **Multi-language** — English and Japanese UI

Planner data is stored locally in IndexedDB — no account and no tracking. The optional Inventory Scanner sends uploaded screenshots to the EriduOps parser API and receives detected inventory quantities as JSON.

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

## Inventory Scanner API

The screenshot scanner calls an external parser API. Configure it with:

```bash
VITE_PARSER_URL=/api
```

In production, `/api` routes to the hosted parser service. In local development, Vite proxies `/api/inventory/*` to the local parser service.

---

## Project Structure

Folders under `components/` map to a **route surface** (`students/`, `bonds/`, `bond100/`) or a **cross-page domain** (`inventory/`, `navbar/`, `shared/`).

```
src/
  pages/                # Route components — LandingPage, StudentsPage, BondsPage, Bond100Page
  router/               # vue-router config
  components/
    students/           # /students surface
      modal/            #   StudentModal + Info / Upgrade / Gear / Shared subtrees
      tools/            #   ToolsRail-triggered modals (BondUpdate, BulkModify, CraftingFodder, EquipmentFarming, DeckBuilder)
    bonds/              # /bonds surface — BondsStudentEditor, BondsStudentPicker, OtherExpPanel
      gift/             #   Gift allocation building blocks (GiftCard, GiftGrid, GiftOption, …)
    bond100/            # /hall surface — Bond100Wall, Bond100EntriesModal, Bond100SubmitModal, Bond100StatsPopover
    inventory/          # GlobalInventoryModal, ItemsGrid, EquipmentGrid, ResourceCard, ResourceSummary
    navbar/             # GlobalNavbar, SearchNavbar, GlobalControls, FilterPanel
      modals/           #   Navbar-triggered modals (Contact, Credits, Import, InventoryScreenshot)
    shared/             # Cross-page components (MetaHeader, StudentStrip)
  composables/          # Stateless display helpers (useStudentInfo, useResourceTooltip, useTooltip, …)
  lib/
    constants/          # Game limits, gift box IDs, linked-student pairs, synthetic entities
    db/                 # database.ts — Dexie schema (v3)
    hooks/              # Domain hooks bridging components ↔ IndexedDB
    services/           # External I/O (SchaleDB fetch, IndexedDB form init, bulk ops)
    stores/             # Singleton reactive caches (studentStore, resourceCacheStore, …)
    utils/              # Pure helpers (sort, filter, material/gear/bondExp calcs, hydration, migration)
  types/                # TypeScript interfaces
  locales/              # i18n (en, jp) + $t helper
  styles/               # Global + shared CSS
public/
  image-cache-sw.js     # Service worker — cache-first for schaledb.com images
```

### Architecture

```
Components  →  Composables / Hooks  →  Services  →  IndexedDB (source of truth)
                       ↓
                    Stores (in-memory reactive caches)
```

- **Components** consume data via hooks/composables; never import directly from `lib/`
- **Composables** (`src/composables/`) — pure display helpers (colors, level state, tooltips)
- **Hooks** (`src/lib/hooks/`) — domain-scoped form-state managers (gifts, gear, upgrades, …)
- **Services** (`src/lib/services/`) — external I/O (SchaleDB fetch, bulk ops)
- **Stores** (`src/lib/stores/`) — singleton reactive state
- **IndexedDB** (Dexie) — single source of truth for persisted user data
- **Settings** (localStorage) — UI preferences (theme, sort, filters, tracked bonds)

See `CLAUDE.md` for a deeper architecture reference (data loading pipeline, store layer, hook domains, persistence pattern).

---

## Data

Student, item, and equipment data is fetched from [SchaleDB](https://schaledb.com) and cached in IndexedDB. User planner data stays in the browser. Inventory screenshots are only sent when using the optional scanner feature, which posts the image to the configured parser API and applies the returned JSON after user review.

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss larger changes.

---

## License

[GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0) — © 2026 EriduOps.

You're welcome to study, modify, and self-host this project. AGPL-3.0 is copyleft: if you run a modified version as a public/network service, you must make your modified source available to its users.

The license covers this project's own source code only. Blue Archive artwork, names, and game data are the property of Nexon / Nexon Games / Yostar and are sourced via [SchaleDB](https://schaledb.com); they are not covered by this license.
