# Prototype 1: design notes

What this prototype is for: finding out whether Marta enjoys opening it on day 2, 5 and 10.
Everything else is secondary.

Labels used below, so suggestions do not quietly become requirements:

- **[Marta]** something Marta asked for or said
- **[Elina]** a decision Elina made
- **[AI]** a suggestion from the assistant, not yet agreed

## 1. Vocabulary data

File: `data/words.json`. 33 words. Run `node tools/check-words.mjs` after editing.

```jsonc
{
  "id": "hermetyczny",            // stable key used by saved progress; never rename once used
  "lemma": "hermetyczny",
  "pos": "adjective",             // noun | adjective | verb | adverb | phrase
  "gender": "f",                  // nouns only: m | f | n | pl
  "difficulty": 2,                // 1–3, assistant's guess [AI]
  "register": "general",          // general | bookish | colloquial | specialist
  "senses": [                     // ordered; most words have one
    { "definition": "...", "examples": ["..."] },
    { "label": "przen.", "definition": "...", "examples": ["..."] }
  ],
  "origin": { "lang": "la", "etymon": "hermeticus", "gloss": "...", "note": "..." },
  "note": "...",                  // optional: false friends, usage warnings
  "related": { "synonyms": [], "antonyms": [], "derived": [] },
  "provenance": "ai_suggested",   // marta_example | ai_suggested | marta_request | elina_choice
  "verification": { "status": "ai_draft", "checkedBy": null, "checkedAgainst": null, "checkedOn": null }
}
```

Why these fields:

- `senses` is a list from the start because adding it later means migrating every entry.
  Three already need it: hermetyczny, meander, trywialny.
- `provenance` records where each word came from. The 6 words from the discovery conversation are
  `marta_example`; the other 27 are `ai_suggested`. This is the "keep three voices separate" rule,
  applied to data.
- `verification` exists because every definition and example is AI-drafted. Nothing should be
  treated as correct until someone has checked it against a real source. Free sources:
  [WSJP](https://wsjp.pl) (PAN) and [SJP PWN](https://sjp.pwn.pl). Write our own wording; do not
  paste theirs.
- Not included yet: syllabification, stress, audio, frequency data, quiz distractors. Each is a
  plausible later field; none is needed to test discovery.

How the 27 extra words were chosen **[AI]**: foreign origin (the literal request), plausibly met in
educated conversation or the press, and something interesting to notice (false friends such as
*ewentualny* and *egzaltacja*, a second figurative sense, a good etymology). Difficulty is a guess.
This is exactly the part most worth arguing with.

Known weak spots to check first: the Bleuler attribution on *ambiwalentny*, the French route for
*pejoratywny*, the second sense of *trywialny*, and whether *aprobata*, *sarkazm* and *paradoks* are
too familiar to be worth a slot.

## 2. Daily session flow

```
open site
  └─ Dziś: N słów  ── [Zaczynamy]
        └─ card 1 ─ Dalej → card 2 … card N ─ Zakończ
                                               └─ Na dziś to wszystko (list of today's words, tap to reopen)
```

- One card at a time. Back and forward allowed; arrow keys work on desktop. **[AI]**
- Today's words are fixed on the first visit of the day, so reloading never reshuffles. **[AI]**
- Leaving mid-session is fine. On return: "Jesteś przy słowie 3 z 5" and a Kontynuuj button.
- Unfinished words are not carried as debt. If she stops at 3 of 5, the other 2 simply stay unseen
  and may turn up another day. No backlog, no streak. **[AI, following the handover's "no punitive"
  principle]**
- Selection: random order **[Marta]**, filled from difficulty 1 first, then 2, then 3. This is a
  placeholder for "difficulty increasing over time" **[Marta]**, and a crude one: with 33 words
  she sees almost all the level-1 words in the first two or three days.
- Daily count: 3, 5 or 7, default 5 **[Marta: "about five"]**. Changes apply from the next day.
- "Coś tu nie gra?" on each card lets Marta leave a note on a word. **[AI]** She is a native speaker,
  so she is also the first reviewer of the content. Notes travel with the backup.

Not in this prototype, on purpose: quizzes, spaced repetition, favourites, search. These are
Prototype 2 and 3 in the handover.

## 3. Persistence

One key in `localStorage`, `vocablab.v1`:

```jsonc
{
  "version": 1,
  "settings": { "dailyCount": 5 },
  "seen":  { "paradoks": { "first": "2026-10-16", "last": "2026-10-18" } },
  "notes": { "paradoks": { "date": "2026-10-16", "text": "..." } },
  "days":  { "2026-10-16": { "words": ["paradoks", "..."], "pos": 2 } }
}
```

- A word counts as **encountered** when its card is shown. That is the weakest of the four outcomes
  in the handover (encounter, recognise, recall, use), and it is the only one this prototype
  measures. Prototype 2's quiz results would go into a new `reviews` list, not into `seen`.
- Dates are local calendar dates, not UTC.
- `days` keeps a small history (which words on which day). Cheap, and useful later for scheduling.

Risks, stated plainly:

- **localStorage is per browser and per device.** Phone and laptop will not share progress.
- **Safari can delete it.** On iPhone and Mac, Safari may clear site storage for sites not visited
  in about a week. For a daily habit that is mostly fine; after a holiday it is not. If Marta uses
  an iPhone, this matters more than any other technical choice here.
- Mitigation for now: Ustawienia → Kopia postępów (copy as text, paste back). Clunky, but it works
  and it also lets Marta send her notes to Elina.
- The proper fix (Prototype 3 or earlier if Safari bites): a small backend or a sync service. Do not
  build it until there is a reason.

## 4. Implementation plan

Stack: plain HTML, CSS and JavaScript, no build step. **[AI recommendation; Elina to decide]**

Why not React yet: the app has four screens and one state object. React would add a build tool, a
second mental model (components, hooks) and little else. The code is already organised the way
React would organise it (state → render function → screen), so moving later is a translation, not
a rewrite. The point at which React earns its place is roughly when quizzes, scheduling and the
library start sharing pieces of UI and state.

Suggested order of work for Elina, each step small enough to try in an evening:

1. Run it locally (README). Read `app.js` top to bottom; it is about 400 lines in three sections.
2. Change one thing on purpose, e.g. the brand name or a colour token in `style.css`.
3. Check 5 words against WSJP and edit `words.json`; set `verification.status` to `checked`.
4. Put it on GitHub Pages (same as Elina's other sites) and send Marta the link.
5. Watch Marta use it once, in person or on a call, without explaining anything. Note where she
   hesitates.
6. Only then decide what Prototype 2 needs.

## 5. Questions for Marta's first session

- Is 5 right? Does she want "one more" after finishing?
- Are the words too easy, too hard, or the wrong kind? (Show her a level-1 and a level-3 word.)
- Does she read the etymology, or skip it?
- Are two examples enough? Too many?
- Would she rather guess the meaning before seeing it? (This is the first step towards quizzes and
  might matter more than any visual change.)
- Phone or computer? iPhone or Android? (See the Safari risk above.)
