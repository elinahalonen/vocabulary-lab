# The lexicon (`data/lexicon.csv`)

One row per headword from Markowski & Pawelec, *Wielki słownik wyrazów obcych i trudnych*
(Wilga, 2001), extracted from an OCR'd PDF with `tools/extract_dictionary.py`. This is the pool
the app draws words from. The PDF itself is not needed once this file exists.

12,987 rows: 12,203 words, 620 multi-word phrases, 146 affixes (e.g. `alo-`), 18 abbreviations.

## Columns

| Column | Meaning |
| --- | --- |
| `id` | Stable key, ASCII slug of the headword (`I`/`II` homonyms get `-i`, `-ii`). |
| `headword` | Lower-case headword as printed. |
| `homonym` | `I`, `II`… when the dictionary splits unrelated words with the same spelling. |
| `variants` | Alternative spellings given with *albo* / *lub* / *inaczej*. |
| `kind` | `word`, `phrase`, `affix` or `abbreviation`. |
| `page` | Page in the printed dictionary (1–780). |
| `registers` | Labels before the definition: `książk`, `przestarz`, `pot`, `żart`… |
| `domains` | Subject fields named as "w fizyce", "w prawie"… (lower-case, inflected as printed). |
| `sense_count` | Number of quoted definitions found. 0 means the parser missed them. |
| `origin_lang` | First language named in the etymology: `la`, `fr`, `en`, `grc`, `de`, `it`… |
| `freq`, `freq_rank` | Rough frequency in film subtitles (see below). Empty = not found. |
| `definition_source` | The dictionary's own definitions, numbered. **Reference only.** |
| `uwaga_source` | The dictionary's usage warnings (UWAGA). **Reference only.** |
| `origin_source` | The dictionary's etymology text. |
| `ocr_suspect` | 1 = something looks garbled; check against the page before using. |

**Reference only** means we write our own wording from it. The app never shows these columns
as they are.

## Known weaknesses

- OCR errors survive in the text: merged words, odd characters, a few misread headwords.
  458 rows are flagged `ocr_suspect`; 336 have no definition found.
- Etymology is printed once per *nest* (a family of related words). The parser gives it to
  words sharing the first four letters with the last word of the nest, so some related words get
  none and, rarely, an unrelated one gets the wrong one.
- `domains` has some false positives where "w <word>" appears before the first definition for
  another reason.
- `freq` counts the headword plus forms that share a stem of six letters or more, in a list built
  from Polish film subtitles. It is noisy: subtitle language is conversational, names collide with
  words (*jin*), and short words only count their exact form. Treat it as "roughly common" versus
  "roughly rare", not as a precise rank.
- Not in this dictionary at all: some words that feel "foreign and educated" but are absent here,
  e.g. *ewentualny*, *indolencja*, *kuriozalny*, *inklinacja*.

## Rebuilding

```sh
pdftotext -layout "<dictionary>.pdf" slownik.txt
python3 tools/extract_dictionary.py slownik.txt pl_full.txt data/lexicon.csv
```

Frequency list: `pl_full.txt` from [FrequencyWords](https://github.com/hermitdave/FrequencyWords)
by Hermit Dave, built from OpenSubtitles. Content licensed CC-BY-SA 4.0; the `freq` columns are
derived from it.
