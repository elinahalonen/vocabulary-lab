# Marta's Vocabulary Lab

A small website for learning Polish words of foreign origin, a few a day.
Prototype 1: daily discovery only. No quizzes yet.

Design notes, data schema and open questions: [docs/prototype-1.md](docs/prototype-1.md).

## Run it locally

The page loads `data/words.json` with `fetch`, which browsers block for files opened straight from
disk. Start a tiny local server from this folder instead:

```sh
python3 -m http.server 8000
```

then open http://localhost:8000.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page shell. Loads fonts, `style.css` and `app.js`. |
| `style.css` | All styling. Colours and fonts are tokens at the top. |
| `app.js` | The app: saved state, word selection, and one function per screen. |
| `data/words.json` | The vocabulary. Every entry is an AI draft until checked. |
| `tools/check-words.mjs` | `node tools/check-words.mjs` checks the word file for mistakes. |

## Editing words

1. Edit `data/words.json`.
2. Run `node tools/check-words.mjs`.
3. When you have checked an entry against WSJP or SJP PWN, set
   `"verification": { "status": "checked", "checkedBy": "Elina", "checkedAgainst": "WSJP", "checkedOn": "2026-10-20" }`.

Never change a word's `id` after Marta has seen it: saved progress refers to words by id.

## Testing as a new user

Ustawienia → Zacznij od nowa clears progress in this browser.
