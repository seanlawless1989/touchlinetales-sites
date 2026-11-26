#!/usr/bin/env python3
"""Team join codes for the Touchline Tales app (touchlinetales.club/app/).

    python3 tools/app_codes.py /mnt/project-files/touchline-tales/app-store/team_codes.csv
    python3 tools/app_codes.py <csv> --add washington-wolves-u11s "Washington Wolves Under 11s"

The CSV (code,path,name) is the private list and lives in the project files, never in this public repository.
This writes app/codes.json: for each code, a hash to look it up by and the team's address encrypted with the code,
so the file can't be read as a list of teams. The app page does the same sums to turn a typed code into a team.
--add makes a new random code for a team, adds it to the CSV and prints it. Commit app/codes.json afterwards.
"""
import argparse, base64, csv, hashlib, json, os, secrets, sys
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ROOT = Path(__file__).resolve().parent.parent
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"   # no 0/O, 1/I/L


def norm(code):
    return "".join(ch for ch in code.upper() if ch.isalnum())


def entry(code, path, name):
    c = norm(code)
    look = hashlib.sha256(("tt-app:" + c).encode()).hexdigest()
    key = hashlib.sha256(("tt-key:" + c).encode()).digest()
    iv = os.urandom(12)
    ct = AESGCM(key).encrypt(iv, json.dumps({"path": path, "name": name}, separators=(",", ":")).encode(), None)
    return look, {"iv": base64.b64encode(iv).decode(), "ct": base64.b64encode(ct).decode()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv")
    ap.add_argument("--add", nargs=2, metavar=("FOLDER", "NAME"))
    a = ap.parse_args()
    rows = list(csv.DictReader(open(a.csv))) if Path(a.csv).exists() else []
    if a.add:
        folder, name = a.add
        if not (ROOT / folder / "team.js").exists():
            sys.exit(f"No team site at {folder}/")
        taken = {norm(r["code"]) for r in rows}
        code = next(c for c in iter(lambda: "".join(secrets.choice(ALPHABET) for _ in range(6)), None) if c not in taken)
        rows.append({"code": code, "path": f"/{folder}/", "name": name})
        with open(a.csv, "w", newline="") as f:
            w = csv.DictWriter(f, ["code", "path", "name"]); w.writeheader(); w.writerows(rows)
        print(f"{name}: {code}")
    out = dict(entry(r["code"], r["path"], r["name"]) for r in rows)
    (ROOT / "app").mkdir(exist_ok=True)
    (ROOT / "app" / "codes.json").write_text(json.dumps(out, indent=0, sort_keys=True) + "\n")
    print(f"app/codes.json: {len(out)} teams")


if __name__ == "__main__":
    main()
