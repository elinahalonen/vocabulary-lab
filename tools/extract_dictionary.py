"""Turn the dictionary PDF's text into one row per headword in data/lexicon.csv.

Usage:
    pdftotext -layout "<dictionary>.pdf" slownik.txt
    python3 tools/extract_dictionary.py slownik.txt pl_50k.txt data/lexicon.csv

The second file is an optional word-frequency list ("word count" per line), used
for the rough freq column. The dictionary is gniazdowy (nested): related words
sit in one block and share the etymology line that ends the block.

Everything here is heuristic. The text comes from OCR, so expect errors;
the ocr_suspect column marks rows worth a second look.
"""
import bisect
import csv
import re
import sys
import unicodedata

UPPER = "A-ZĄĆĘŁŃÓŚŹŻ"
HEAD = re.compile(
    rf"^(?:(I|II|III|IV)\s+)?"                        # homonym number
    rf"(-?[{UPPER}][{UPPER}\-]*-?(?:\s+[{UPPER}][{UPPER}\-]*-?)*)"  # headword, maybe multi-word
    rf"(?=\s|$)(.*)$"
)
VARIANT = re.compile(rf"^\s*(?:albo|lub|a\.|inaczej:?)\s+(-?[{UPPER}][{UPPER}\-]*(?:\s+[{UPPER}][{UPPER}\-]*)*)(?=\s|$)")

# Language abbreviations as printed, plus their common OCR misreadings.
LANG = {
    "łac": "la", "lać": "la", "tac": "la", "łać": "la", "lac": "la",
    "gr": "grc", "fr": "fr", "niem": "de", "ang": "en", "wł": "it", "wl": "it",
    "hiszp": "es", "ros": "ru", "tur": "tr", "arab": "ar", "hebr": "he",
    "port": "pt", "niderl": "nl", "hol": "nl", "szw": "sv", "duń": "da",
    "jap": "ja", "chiń": "zh", "czes": "cs", "cześ": "cs", "węg": "hu",
    "sanskr": "sa", "pers": "fa", "ukr": "uk", "norw": "no", "fiń": "fi",
}
ETYM_START = re.compile(
    r"^(?:(" + "|".join(sorted(map(re.escape, LANG), key=len, reverse=True)) + r")\.|od\s|złożenie|skrót|z\s|nazwa|wyraz\s|prawdopodobnie|zapożyczenie|neologizm)",
    re.I,
)
REGISTERS = ["książk", "przestarz", "pot", "żart", "iron", "pejor", "posp", "rzad", "daw", "specj", "euf", "podn", "lit", "środ", "wulg", "przen"]
OCR_FIXES = [(r"\b(lać|tac|łać)\.", "łac."), (r"\bksiazk\.", "książk."), (r"\bjeż\.", "jęz."), (r"\bwl\.", "wł.")]


def load_freq(path):
    freq = {}
    if not path:
        return freq
    with open(path, encoding="utf8") as f:
        for line in f:
            parts = line.split()
            if len(parts) == 2 and parts[1].isdigit():
                freq[parts[0]] = int(parts[1])
    return freq


def dehyphenate(text, words):
    # OCR keeps line-break hyphens mid-word ("o-soba"). Join when the joined form is a known word.
    def fix(m):
        joined = m.group(1) + m.group(2)
        return joined if joined.lower() in words else m.group(0)
    return re.sub(r"(\w+)-(\w+)", fix, text)


def clean(text, words):
    for pat, rep in OCR_FIXES:
        text = re.sub(pat, rep, text)
    text = re.sub(r"\|\|?\s*", "", text)          # stray column marks around UWAGA boxes
    text = re.sub(r"\s+", " ", text).strip()
    return dehyphenate(text, words)


def paragraphs(raw):
    """Yield (page, paragraph) pairs. Each page number sits alone at the bottom of its page,
    so paragraphs are held back until the number that follows them is known."""
    pending = []
    for block in re.split(r"\n\s*\n", raw.replace("\f", "\n\n")):
        p = " ".join(l.strip() for l in block.splitlines()).strip()
        if not p:
            continue
        if re.fullmatch(r"\d{1,4}", p):
            for q in pending:
                yield int(p), q
            pending = []
            continue
        if re.fullmatch(rf"[{UPPER}\-\s]+", p):         # running heads like "AGENCJA  AGONIA"
            continue
        pending.append(p)
    for q in pending:
        yield None, q


def first_lang(etym):
    """The first language named in an etymology, e.g. 'złożenie z łac. ambo…' -> 'la'."""
    m = re.search(r"\b(" + "|".join(sorted(map(re.escape, LANG), key=len, reverse=True)) + r")\.", etym)
    return LANG[m.group(1).lower()] if m else ""


def lemma_freq(lemma, freq, keys):
    """Rough frequency: exact form plus inflected forms sharing a long stem
    (keys is the sorted list of frequency-list words). Overcounts some, undercounts others."""
    w = lemma.lower()
    if " " in w or "-" in w:
        return freq.get(w, 0)
    stem = w[:-1] if w[-1] in "aeiouyąę" else w
    if len(stem) < 6:
        return freq.get(w, 0)
    total, i = 0, bisect.bisect_left(keys, stem)
    while i < len(keys) and keys[i].startswith(stem):
        if len(keys[i]) - len(stem) <= 4:
            total += freq[keys[i]]
        i += 1
    return total


def slug(s):
    s = unicodedata.normalize("NFKD", s.lower().replace("ł", "l"))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def main(src, freq_path, out):
    freq = load_freq(freq_path)
    words, keys = set(freq), sorted(freq)
    raw = open(src, encoding="utf8").read()
    intro_end = raw.find("\nXVII\n")                 # last page of the introduction
    start = intro_end + 6 if intro_end >= 0 else 0

    entries, group = [], []

    def close_group(etym):
        etym = clean(etym, words)
        lang = first_lang(etym)
        # The etymology ends a nest of related words. Entries before the nest that had no
        # etymology of their own also sit in the group; only give it to words sharing the root.
        root = group[-1]["headword"][:4]
        for e in group:
            if e["headword"][:4] == root:
                e["origin_source"], e["origin_lang"] = etym, lang
        group.clear()

    for page, p in paragraphs(raw[start:]):
        m = HEAD.match(p)
        is_head = m and not m.group(2).startswith("UWAGA") and len(m.group(2).replace("-", "")) >= 2
        if is_head:
            rest = m.group(3)
            variants = []
            while (v := VARIANT.match(rest)):
                variants.append(v.group(1))
                rest = rest[v.end():]
            e = {"headword": m.group(2).strip(), "homonym": m.group(1) or "", "variants": "; ".join(variants),
                 "page": page or "", "body": rest, "origin_source": "", "origin_lang": ""}
            entries.append(e)
            group.append(e)
        elif ETYM_START.match(p) and group:
            close_group(p)
        elif entries:
            entries[-1]["body"] += " " + p

    seen = {}
    rows = []
    for e in entries:
        body = clean(e["body"], words)
        uwaga = ""
        if "UWAGA" in body:
            body, uwaga = body.split("UWAGA", 1)
            uwaga = uwaga.lstrip(": ").strip()
        # Etymology printed inline at the end of the block instead of on its own line.
        if not e["origin_source"]:
            tail = list(re.finditer(r"\s(" + "|".join(LANG) + r")\.\s", body))
            if tail and tail[-1].start() > len(body) * 0.5:
                cut = tail[-1].start()
                e["origin_source"], e["origin_lang"] = body[cut:].strip(), first_lang(body[cut:])
                body = body[:cut]
        defs = re.findall(r"'([^']{3,}?)'", body)
        label_zone = body.split("'", 1)[0]
        registers = [r for r in REGISTERS if re.search(rf"\b{r}\.", label_zone)]
        domains = sorted(set(re.findall(r"\bw ([a-ząćęłńóśźż]{4,})\b", " ".join(s.split("'", 1)[0] for s in re.split(r"\b\d\.\s|\bl\.\s", body)))))
        domains = [d for d in domains if d not in ("liczbie", "połączeniu", "znaczeniu", "dawnej", "języku")]
        head = e["headword"]
        kind = ("affix" if head.startswith("-") or head.endswith("-") else "abbreviation" if body.startswith("skrót")
                else "phrase" if " " in head else "word")
        base = slug(head) + (f"-{e['homonym'].lower()}" if e["homonym"] else "")
        seen[base] = seen.get(base, 0) + 1
        rid = base if seen[base] == 1 else f"{base}-{seen[base]}"
        lemma = head.lower()
        f = lemma_freq(lemma, freq, keys) if kind == "word" else freq.get(lemma, 0)
        suspect = (not defs) or bool(re.search(r"[0-9@#]|\w-\w", lemma)) or bool(re.search(r"[a-ząćęłńóśźż][A-ZĄĆĘŁŃÓŚŹŻ]", body))
        rows.append({
            "id": rid, "headword": lemma, "homonym": e["homonym"], "variants": e["variants"].lower(),
            "kind": kind, "page": e["page"], "registers": "; ".join(registers), "domains": "; ".join(domains),
            "sense_count": len(defs), "origin_lang": e["origin_lang"], "freq": f,
            "definition_source": " | ".join(f"{i + 1}. {d.strip()}" for i, d in enumerate(defs)),
            "uwaga_source": uwaga, "origin_source": e["origin_source"], "ocr_suspect": int(suspect),
        })

    ranked = sorted((r for r in rows if r["freq"]), key=lambda r: -r["freq"])
    for i, r in enumerate(ranked, 1):
        r["freq_rank"] = i
    cols = ["id", "headword", "homonym", "variants", "kind", "page", "registers", "domains", "sense_count",
            "origin_lang", "freq", "freq_rank", "definition_source", "uwaga_source", "origin_source", "ocr_suspect"]
    with open(out, "w", encoding="utf8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            r.setdefault("freq_rank", "")
            w.writerow(r)
    print(f"{len(rows)} rows -> {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None, sys.argv[3] if len(sys.argv) > 3 else "data/lexicon.csv")
