"""Build the calibration page from calibration/body.html and calibration/words.json.

Writes calibration/index.html (standalone page) and, if a path is given, an artifact
version without the <!doctype>/<html> wrapper.
    python3 tools/build_calibration.py [artifact-out.html]
"""
import json, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent / "calibration"
body = (root / "body.html").read_text(encoding="utf8")
words = json.loads((root / "words.json").read_text(encoding="utf8"))
page = body.replace("__WORDS__", json.dumps(words, ensure_ascii=False))
head = '<!doctype html>\n<html lang="pl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
(root / "index.html").write_text(head + page.replace("<div id=\"app\">", "</head>\n<body>\n<div id=\"app\">", 1) + "\n</body>\n</html>\n", encoding="utf8")
if len(sys.argv) > 1:
    Path(sys.argv[1]).write_text(page, encoding="utf8")
print("built", len(words), "words")
