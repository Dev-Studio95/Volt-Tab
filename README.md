# ⚡ Volt Legacy

> A precision-engineered new tab dashboard for Chromium — built to run clean on low-resource hardware.

Volt Legacy is the stripped-back edition of the Volt new tab extension. Same dark, minimal aesthetic. Same draggable widget canvas. Just no GPU-heavy effects, no cloud auth, and no AI overhead — so it stays fast on machines with 2GB RAM, older CPUs, or integrated graphics.

---

## Screenshots

<img width="1365" height="649" alt="Capture" src="https://github.com/user-attachments/assets/347852c6-f9fc-423f-95b3-ce27105cfc56" />

---

## Features

- **Draggable widget canvas** — freely position every widget, positions persist across sessions
- **Live clock** — 12-hour or 24-hour mode
- **Google search bar** — hit Enter to search instantly
- **Custom shortcuts** — add, edit, or delete nav shortcuts via right-click
- **Live weather** — current temperature via Open-Meteo (no API key required)
- **Bitcoin price tracker** — live BTC/USD from CoinGecko
- **Daily quote** — random quote on load
- **RAM monitor** — system memory usage with a progress bar
- **Pomodoro timer** — 25-minute focus timer with start/pause/reset
- **Scratchpad** — persistent notes, autosaved on blur
- **Settings sidebar** — toggle any widget, lock the workspace, toggle footer
- **Reset layout** — one click to restore default positions

---

## What was removed from Volt v1.2

This is a legacy/lite build. The following were intentionally stripped:

| Feature | Reason removed |
|---|---|
| `backdrop-filter: blur()` on all elements | High GPU compositor cost |
| Animated mesh gradient background | Continuous paint loop, wasted cycles |
| Google Account identity sync | Required `identity` permission, external avatar fetch |
| OpenRouter AI chatbot | Heavy API dependency, large DOM overhead |
| Widget collision detection engine | Per-drag rect math across all widgets |
| Save / Load preset system | Extra storage round trips |
| CPU usage monitor | Replaced with RAM-only to reduce polling scope |
| `Roboto` font import | Was unused |

The result is a build that uses **no persistent animation loops**, **no blur compositing**, and **no external auth** — just clock ticks, a 4-second RAM poll (when visible), and on-demand API calls for weather/crypto/quote.

---

## Install

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `volt-legacy` folder
5. Open a new tab

```
git clone https://github.com/Dev-Studio95/volt-legacy.git
```

---

## Permissions

| Permission | Why |
|---|---|
| `storage` | Persist layout, shortcuts, notes, and settings |
| `system.memory` | RAM widget — reads available vs total memory |

No `identity`, no `system.cpu`, no third-party auth of any kind.

---

## Widget Reference

| Widget | Default | Data source |
|---|---|---|
| Volt Branding | On | — |
| Clock | On | System time |
| Search Bar | On | Google |
| Weather | Off | [Open-Meteo](https://open-meteo.com) |
| Bitcoin Tracker | Off | [CoinGecko](https://coingecko.com) |
| Daily Quote | Off | [DummyJSON](https://dummyjson.com) |
| RAM Monitor | Off | `chrome.system.memory` |
| Focus Timer | Off | Local |
| Scratchpad | Off | `chrome.storage.local` |

---

## Usage Tips

**Moving widgets** — click and drag any widget to reposition. Positions are saved automatically on release.

**Lock the workspace** — open Settings → enable *Lock Workspace* to prevent accidental drags.

**Shortcuts** — click **+ ADD** in the navbar to add a shortcut. Right-click any shortcut to edit or delete it.

**Notes** — the Scratchpad saves when you click away from it (on blur), not on every keystroke.

**Pomodoro** — defaults to 25 minutes. Hit *Start* to begin, *Pause* to hold, *Reset* to go back to 25:00.

---

## Tech Stack

Pure HTML, CSS, and vanilla JavaScript. Zero frameworks, zero build tools, zero dependencies.

```
volt-legacy/
├── index.html      # markup + widget structure
├── styles.css      # design tokens, layout, widget styles
├── script.js       # all logic — drag, clock, storage, fetchers
└── manifest.json   # MV3 extension config
```

---

## Browser Support

Chromium-based browsers only (Chrome, Edge, Brave, Arc, Opera).

| Browser | Supported |
|---|---|
| Chrome 88+ | ✅ |
| Edge 88+ | ✅ |
| Brave | ✅ |
| Arc | ✅ |
| Firefox | ❌ (MV3 / `chrome.*` APIs) |
| Safari | ❌ |

---

## License

MIT — do whatever you want with it.

---

<p align="center">
  Built by <a href="https://github.com/Dev-Studio95">@Dev-Studio95</a> &nbsp;·&nbsp; VOLT // LEGACY v1.0
</p>
