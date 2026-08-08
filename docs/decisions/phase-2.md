# Phase 2 Decision Log

## Open Questions
1. Where password generation actually happens — frontend (crypto.getRandomValues) vs. core process (platform CSPRNG) — and why.
2. The exact rejection-sampling implementation for avoiding modulo bias (plan.md §6.2).
3. Provider icon resolution approach — bundled icon set scope and the local domain-matching logic (plan.md §6.1).
4. Clipboard-clear implementation across target platforms (plan.md §0 and Vault module spec in §4) and handling intervening user copies.

## Discussion
**[2026-08-07T19:20:00+08:00] @Frontend-Agent (UI/React):**
Regarding Q1: I propose generating passwords entirely on the frontend. `crypto.getRandomValues` is a cryptographically secure PRNG available in the WebView. Generating it locally means we don't have to pass raw passwords back and forth over IPC just for the user to preview and copy them during the generation phase.
Regarding Q3: For offline icon resolution, I suggest bundling a curated set of single-weight SVG brand icons for the top 50-100 domains (e.g., github, google, apple) and rendering them with our `--color-bone` token. For unmapped domains, we fall back to a generic `Globe` or `Key` icon from our standard icon set (e.g., Lucide React). No live favicon fetching allowed.

**[2026-08-07T19:22:00+08:00] @Security-Agent (Auth & Crypto):**
Regarding Q1: I agree with the frontend approach. The less secret data crosses the IPC boundary, the better. `crypto.getRandomValues` in WebView2 is perfectly secure for this.
Regarding Q2: To prevent modulo bias, we must use rejection sampling. If our character set has `N` characters, we can't just do `byte % N`. 
The algorithm should be:
1. Determine `N = charset.length`.
2. Find the largest multiple of `N` that is `<= 256`. Let's call this `max_valid = 256 - (256 % N)`.
3. Draw random bytes using `crypto.getRandomValues`.
4. For each byte `b`, if `b < max_valid`, the index is `b % N`. 
5. If `b >= max_valid`, discard `b` and draw another byte.
This ensures a perfectly uniform distribution across the charset.
Regarding Q4: The clipboard clear must happen in the core process, because the frontend could be paused, closed, or refreshed. Furthermore, if the user copies a *different* piece of text to their clipboard during that 30-second window, we must NOT wipe their new text. 

**[2026-08-07T19:25:00+08:00] @Backend-Agent (Core Systems):**
Regarding Q4: I will implement the clipboard logic in Rust. When the frontend calls the IPC command to copy a password, the Rust core will:
1. Write the text to the OS clipboard.
2. Read `clipboard_clear_seconds` from `app_settings`.
3. Spawn a detached `tokio` task that sleeps for that duration.
4. After waking up, read the current OS clipboard text.
5. If the current text exactly matches the copied text, clear the clipboard (set to empty string).
This ensures we don't overwrite unrelated user clipboard data.

## Decisions
1. **Password Generation Location:** Frontend (`crypto.getRandomValues`). Reduces IPC traffic for sensitive material.
2. **Rejection Sampling Algorithm:** Frontend will implement standard rejection sampling. Random bytes `>= (256 - (256 % N))` are discarded and redrawn to ensure perfect uniformity.
3. **Provider Icon Resolution:** A local JSON map of top domains to bundled SVG files or Lucide generic icons. No external network requests will be made. If a domain isn't in the bundle, a generic fallback icon is used.
4. **Clipboard Auto-Clear:** Handled by the Rust core process via a `tokio::spawn` task. It checks if the clipboard content still matches the copied secret before clearing to avoid deleting user's intervening copies.

## QA Sign-off
[x] Verified by @QA-Agent: End-to-end Vault CRUD, generator entropy, provider icons, and clipboard auto-clear behave as specified. Phase 2 complete.
