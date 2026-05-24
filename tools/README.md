# WordWar vocab pipeline

One-time preprocessing that builds `public/vocab.json` from a CEFR
wordlist + WordNet. The game ships the JSON as a static asset and never
touches NLTK at runtime.

## Files

| Path                     | Role                                                |
| ------------------------ | --------------------------------------------------- |
| `build_vocab.py`         | The pipeline script                                 |
| `cefr_a2_b1.txt`         | Seed wordlist (A2 + B1 from CEFR-J)                 |
| `cefr_a1.txt`            | Filter-pool expansion (A1 from CEFR-J, not seeded)  |
| `_cefrj_raw.csv`         | Upstream CSV download (kept for traceability)       |
| `../public/vocab.json`   | Final output, minified                              |

## Source data attribution

Wordlists are derived from the **CEFR-J Vocabulary Profile 1.5**
(<https://github.com/openlanguageprofiles/olp-en-cefrj>). The CEFR-J
project permits academic and commercial reuse with citation. Cite as:

> Tono, Yukio (ed.) *CEFR-J Wordlist Version 1.5.* Tokyo University of
> Foreign Studies. <http://cefr-j.org/download.html>

## Re-running

From the repo root:

```powershell
# install once
python -m pip install --user nltk

# build (auto-downloads WordNet on first run)
python tools/build_vocab.py
```

Output is deterministic — repeated runs produce byte-identical
`vocab.json` (same sha256).

## Regenerating the seed wordlists

If you want to refresh from the upstream CEFR-J CSV:

```powershell
curl -sSL https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv `
  -o tools/_cefrj_raw.csv
```

then re-run the CSV-to-txt step (see commit history) and `build_vocab.py`.

## Output shape

```json
{
  "accept": {
    "pos": "v",
    "syn": ["admit", "assume", "bear", "have", "swallow", "take"],
    "ant": ["refuse", "reject"]
  }
}
```

POS uses WordNet's single-letter scheme — `n` noun, `v` verb, `a` adjective,
`r` adverb. Adjective satellites (`s`) are folded into `a`. Both `syn` and
`ant` are sorted; `ant` may be an empty array.

## Tuning knobs (inside `build_vocab.py`)

- `MIN_SYNONYMS` — bar for keeping an entry (default 2). Lower this to
  grow the corpus at the cost of weaker rounds.
- `WORDNET_POS_KEEP` — drop a POS class entirely if it's noisy in the game.
- `EXTRA_POOL_LIST` — point at additional wordlists to allow more
  synonyms/antonyms through the filter without seeding new entries.
