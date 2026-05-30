# asyar-browser-companions

Browser-side companion extensions for the [Asyar](https://github.com/Xoshbin/asyar) launcher.

A companion installs **in your browser** and connects to the launcher's local
bridge over a WebSocket, so Asyar can search your tabs, read the current page,
and drive actions (activate/close/open tabs, web search, page snapshot/query).

> Not to be confused with `asyar-browser-extension`, which installs **inside the
> Asyar launcher**. This repo is the **browser** half that talks to it.

## Companions

| Browser | Path | Status |
|---------|------|--------|
| Chromium (Chrome, Edge, Brave, Vivaldi, Opera) | [`chromium/`](chromium/) | ✅ |
| Firefox | `firefox/` | planned |
| Safari | `safari/` | planned |

## Develop (Chromium)

```bash
cd chromium
pnpm install
pnpm build        # outputs dist/
pnpm test         # vitest
```

Then load `chromium/` as an unpacked extension via `chrome://extensions`
(Developer mode → Load unpacked).
