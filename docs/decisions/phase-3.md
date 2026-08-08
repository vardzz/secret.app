# Phase 3 Decision Log

## Open Questions & Deliberations

### 1. Markdown Sanitization Approach
**@Frontend-Agent:** For rendering Markdown, I propose using `marked` for parsing and `DOMPurify` for sanitization. `DOMPurify` is the industry standard for this. It aggressively strips `<script>` tags, inline event handlers (`onclick`, `onload`, etc.), and `javascript:` URIs by default. 

**@Security-Agent:** Approved. `DOMPurify` is robust. However, ensure it is configured to run *after* Markdown parsing, not before, and explicitly assert that it strips `javascript:` URIs in hrefs. We will write a specific QA test payload containing a script tag and an `onclick` handler to verify this in the final build.

### 2. Preview Surface Sandboxing
**@Frontend-Agent:** I'll render the sanitized HTML inside an `<iframe>`. 

**@Security-Agent:** An `<iframe>` alone is not a sandbox. We must ensure it has zero access to the Tauri IPC bridge. 
We will use a blob URI or `srcdoc` iframe with the `sandbox` attribute set strictly. 
Specifically: `sandbox="allow-same-origin"` but intentionally omitting `allow-scripts`. Since the notes are just Markdown (text, images, links), we don't need to allow JavaScript execution within the preview iframe at all. If the iframe cannot execute scripts, it cannot call the Tauri IPC even if `__TAURI_IPC__` leaked or sanitization failed. 
To handle clickable links, we can add `allow-popups allow-popups-to-escape-sandbox`, which lets links with `target="_blank"` open in the user's default browser, but still restricts local script execution.

### 3. Folder Taxonomy Implementation
**@Backend-Agent:** For `note_folders`, we have a `parent_id` column. Given a single-user local context, the total number of folders will easily be under 1,000. Instead of complex recursive CTEs in SQL, we can fetch all folders in one simple `SELECT * FROM note_folders` and construct the tree in memory on the frontend.
**@Frontend-Agent & @UIUX-Agent:** Agreed. To maintain UI sanity in the sidebar, we will enforce a hard depth limit of 3 levels. Attempting to nest deeper will be rejected by the UI. 

### 4. Search Implementation for Notes
**@Backend-Agent:** We need to decide between SQLite FTS5 (Full-Text Search) and simple `LIKE` queries. For a single user with realistic note volumes (e.g., 5,000 notes), a `LIKE '%term%'` query on `title` and `content_markdown` will execute in milliseconds. Setting up FTS5 triggers, shadow tables, and ensuring they encrypt properly inside SQLCipher adds unnecessary schema complexity for Phase 3. Let's start with `LIKE` and only migrate to FTS5 if performance drops.

### 5. Task Board Interaction Model
**@UIUX-Agent:** Drag-and-drop (DnD) boards (like Trello) are common, but they add significant accessibility and state-management complexity (e.g. `dnd-kit`). Given our "premium, restrained" design system (`PLAN.md` §5), I propose we skip drag-and-drop for v1. Instead, we use explicit inline status controls: clicking the status badge (To Do / In Progress / Done) on a task card opens a minimal, elegant popover to change its status. It's fully accessible, avoids accidental drops, and fits the quiet-luxury aesthetic perfectly.

## Decisions
1. **Sanitization:** Use `marked` + `DOMPurify`. Configure `DOMPurify` to explicitly strip scripts, event handlers, and `javascript:` URIs.
2. **Sandboxing:** Render preview in an `<iframe srcdoc="...">` with `sandbox="allow-popups allow-popups-to-escape-sandbox"`. Crucially, `allow-scripts` is OMITTED, guaranteeing zero access to the IPC bridge and full script inertness.
3. **Folder Taxonomy:** Fetch all folders flat; build the tree in-memory. Hard UI nesting limit of 3 levels.
4. **Notes Search:** Use simple `LIKE` queries on title and content. No FTS5 schema overhead for v1.
5. **Task Interaction:** Explicit inline status-change controls (styled popovers/dropdowns) rather than drag-and-drop.

## Sign-off
[x] Verified by @QA-Agent: XSS test payloads (script tags, inline handlers, javascript: URIs) are successfully neutralized by DOMPurify. Strict iframe sandbox guarantees zero script execution.
[x] @Security-Agent explicitly signs off on the `DOMPurify` + strict `sandbox` iframe architecture.
