# Decisions log

Each entry says whose voice it is: **[Marta]** said it, **[Elina]** decided it, **[AI]** suggested it
and it is not yet agreed. Newest first.

## 2026-10-16: What kind of words

**[Marta]**, by WhatsApp, replying to Elina's question "what counts as a foreign-origin word?":

> Not only words from other languages. In Polish language we use *słownik wyrazów obcych*
> (dictionary of foreign words) to explain meaning of the word. Don't need to be foreign word.

So the scope is *difficult* words, not etymology. That matches the dictionary's own title,
*Wielki słownik wyrazów obcych i trudnych* (Great dictionary of foreign and difficult words).
Marta also gave a thumbs-up to two of Elina's points: "we shouldn't automatically assume she wants
both" recognition and active use, and "curate the pool, then randomise within it". A thumbs-up is
light agreement, not a decision.

**[Elina]** Target register: words that make Marta sound articulate and sophisticated in
professional and public-affairs settings (politics, policy, law, economics, diplomacy). This is
Elina's reading, based on what she knows about Marta's plans and background. Marta's degree is in
chemistry, so policy and public-affairs vocabulary was not part of her education, while science
terms are likely already familiar.

**[AI]** Consequences for the word pool:

- Bookish words (dictionary label *książk.*, 338 entries) are the core.
- Subject-field words are no longer filtered out wholesale. Fields relevant to public affairs
  are boosted: law (*w prawie*, 57), economics (78), finance (34), banking (26), philosophy (50),
  sociology (18), politics (6), diplomacy (3). Science fields are deprioritised: chemistry (155),
  physics (168), biology (162).
- Usefulness is judged by "would an articulate person use this in a meeting, an email or a
  newspaper column?", not by etymology.
- Cards should help with confident, correct use: typical word combinations, where a word fits
  and where it sounds pompous, and common mistakes (the dictionary's 231 UWAGA (usage warning)
  notes). Whether Marta wants active use as well as recognition is still open.

## 2026-10-16: Source data

**[Elina]** Build the word pool from the Markowski & Pawelec dictionary, extracted to
`data/lexicon.csv`, then remove the PDF. **[AI]** Dictionary wording stays in `_source` columns
for reference; the app shows our own definitions.

## 2026-10-16: The ChatGPT spec

**[Elina]** The handover document and the "Mój osobisty słownik wyrazów obcych" (My personal
dictionary of foreign words) spec were written by ChatGPT. The spec is in Marta's first person but
mostly contains ChatGPT's proposals. Marta's own words are in her original messages; the spec is
treated as a list of suggestions.
