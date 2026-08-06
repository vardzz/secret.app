<div align="center">

# Secret

**A private vault for the parts of your life you don't hand over to the cloud.**

_Offline. Encrypted. Yours._

</div>

---

## What is Secret

Secret is a desktop application that holds the things you'd rather keep off someone else's server — passwords, notes, tasks, income records, and working data — behind a single encrypted vault that never touches the internet.

There's no account. No sync. No server to trust. One master password unlocks a local, AES-256-encrypted database; close the app, and everything goes dark again.

It was built on a simple premise: the most sensitive information in your life deserves software that answers to no one but you.

---

## Why it exists

Most password managers and personal-data tools ask you to trust a company, a cloud, and a network connection — three things Secret refuses to depend on. It's built for people who want:

- **Zero cloud exposure.** Your data never leaves your machine, by design, not by setting.
- **One vault, several rooms.** Credentials, notes, tasks, income, and a local data workspace — one encrypted source of truth instead of five separate tools.
- **Real security engineering underneath**, not a marketing claim: Argon2id key derivation, SQLCipher encryption at rest, RAM zeroization on lock, and a threat model you can actually read.

---

## Inside the vault

|                    |                                                                                 |
| ------------------ | ------------------------------------------------------------------------------- |
| **My Vault**       | Zero-knowledge credential store with a smart, entropy-scored password generator |
| **Notes**          | A Markdown workspace with Write/Preview modes and folder taxonomy               |
| **Tasks**          | A grouped board — To Do, In Progress, Done — with priorities and due dates      |
| **Income**         | A quiet personal ledger with monthly and all-time totals                        |
| **Data Workspace** | A local analytics station for importing and exploring your own datasets         |
| **Activity Log**   | An immutable record of every sensitive action the vault has taken               |

---

## How it's secured

Secret's security isn't a feature list — it's the foundation everything else sits on.

- **Argon2id** derives your session key from your master password; the key exists in memory only and is zeroized the moment the vault locks.
- **SQLCipher** encrypts the entire database at rest with AES-256 — one file, fully encrypted, hardened against the temp-file and journal leaks that catch weaker setups.
- **Process isolation** means the interface never holds your master key, even in memory — only the core process does.
- **No network calls, anywhere.** Not for updates, not for icons, not for telemetry. If it's not on your disk, it doesn't exist to Secret.

The full threat model — what Secret protects against, and what it honestly doesn't — lives in [`PLAN.md`](./PLAN.md).

---

## Design

Two colors. No noise.

`#0F0E0D` obsidian, `#F4EDE4` bone — everything else is weight, opacity, and restraint. Secret is built to feel like a well-made object, not a dashboard: dark by default, quiet by intention, with the accent color reserved for the moments that matter.

---

## Built with

`Tauri` · `Rust` · `React` · `Next.js` · `TypeScript` · `Tailwind CSS` · `SQLCipher` · `Argon2id`

---

## Getting started

```bash
git clone <repository-url>
cd secret
npm install
npm run tauri dev
```

First launch walks you through setting a master password. There is no recovery flow by design — the password _is_ the key. Choose it well, and back it up (see the encrypted export in Settings) before you rely on Secret for anything that matters.

---

## Project documentation

This repository is developed against a set of binding internal specs — useful reading whether you're contributing or just curious how it's put together:

- [`PLAN.md`](./PLAN.md) — architecture, threat model, database schema, and the phased build roadmap
- [`CLAUDE.md`](./CLAUDE.md) — the operating rules for how work happens in this repo
- [`AGENTS.md`](./AGENTS.md) — the specialist roles and engineering standards behind every change

---

## Status

In active development. Secret is currently built for a single user, offline, on a single device — that scope is intentional, not a limitation waiting to be lifted carelessly.

---

<div align="center">

_Some things aren't meant to be in the cloud._

</div>
