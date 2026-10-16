"""Assemble the public site in dist/. Netlify runs this on every push to main.

Only files listed here are published. Everything else in the repository
(data/lexicon.csv, the dictionary PDF, docs) stays private.

    python3 tools/build_site.py
"""
import shutil
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
dist = root / "dist"

# What gets published, as (source, destination in dist/).
FILES = [
    ("calibration/index.html", "index.html"),          # the 40-word test is the front page for now
    ("index.html", "prototype-1/index.html"),
    ("app.js", "prototype-1/app.js"),
    ("style.css", "prototype-1/style.css"),
    ("data/words.json", "prototype-1/data/words.json"),
]

subprocess.run([sys.executable, str(root / "tools/build_calibration.py")], check=True)
shutil.rmtree(dist, ignore_errors=True)
for src, dest in FILES:
    target = dist / dest
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(root / src, target)
print(f"dist/ ready: {len(FILES)} files")
