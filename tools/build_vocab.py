"""
build_vocab.py — WordWar M1 vocabulary pipeline.

Reads a CEFR A2-B1 wordlist (tools/cefr_a2_b1.txt) and pulls synonyms +
antonyms from WordNet via NLTK, filtering both sides against the CEFR pool
(plus an optional A1 pool for "common-word" synonyms) so the game never
teaches obscure vocabulary via the synonym graph.

Usage:
    python tools/build_vocab.py

Inputs (relative to repo root):
    tools/cefr_a2_b1.txt    one lowercase lemma per line — A2+B1 seed words
    tools/cefr_a1.txt       (optional) A1 lemmas — expands the allowed
                            synonym/antonym pool without seeding new entries

Output:
    public/vocab.json       minified {headword: {pos, syn, ant}} map

Each kept entry has >=2 synonyms after filtering. POS uses WordNet's native
single-letter scheme: n=noun, v=verb, a=adjective, r=adverb. Multi-word
lemmas (with underscores or hyphens) and any non-alphabetic forms are
dropped because the game UI only shows single words.

The script is idempotent: sorted iteration + sorted output keys + sorted
syn/ant lists mean repeated runs produce byte-identical JSON.

Auto-downloads the WordNet corpus on first run if missing.
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
TOOLS_DIR = REPO_ROOT / "tools"
PUBLIC_DIR = REPO_ROOT / "public"

SEED_LIST = TOOLS_DIR / "cefr_a2_b1.txt"
EXTRA_POOL_LIST = TOOLS_DIR / "cefr_a1.txt"  # optional, expands filter pool
OUTPUT_JSON = PUBLIC_DIR / "vocab.json"

MIN_SYNONYMS = 2
WORDNET_POS_KEEP = {"n", "v", "a", "r"}  # WordNet's native tags
# WordNet's adjective satellites (s) are functionally adjectives — fold to 'a'.
POS_NORMALIZE = {"s": "a"}


def ensure_wordnet() -> None:
    """Download WordNet corpus if not already present."""
    import nltk

    try:
        from nltk.corpus import wordnet as wn

        wn.synsets("test")  # trigger lazy load
    except LookupError:
        print("[build_vocab] WordNet not found — downloading via nltk...")
        nltk.download("wordnet", quiet=True)
        nltk.download("omw-1.4", quiet=True)
        from nltk.corpus import wordnet as wn  # noqa: F401


def load_wordlist(path: Path) -> set[str]:
    """Read one-word-per-line list, lowercased, alphabetic only."""
    if not path.exists():
        return set()
    words: set[str] = set()
    for raw in path.read_text(encoding="utf-8").splitlines():
        w = raw.strip().lower()
        if not w or not w.isalpha():
            continue
        words.add(w)
    return words


def is_single_word(lemma_name: str) -> bool:
    """WordNet lemmas use underscores for multi-word entries — drop those.

    Also drop hyphens, digits, and any non-alphabetic chars to keep the
    game UI clean.
    """
    return lemma_name.isalpha()


def collect_for_word(word: str, allowed_pool: set[str]) -> dict | None:
    """Pull synonyms + antonyms for `word` from WordNet, filtered to pool.

    Returns the entry dict, or None if it fails the >=2-synonym bar.
    Picks the POS with the most filtered synonyms — a word like "fast"
    has both adj and adv senses; we pick the richer one for the game.
    """
    from nltk.corpus import wordnet as wn

    # Aggregate per POS so we can choose the strongest sense bundle.
    syns_by_pos: dict[str, set[str]] = {}
    ants_by_pos: dict[str, set[str]] = {}

    for synset in wn.synsets(word):
        raw_pos = synset.pos()
        pos = POS_NORMALIZE.get(raw_pos, raw_pos)
        if pos not in WORDNET_POS_KEEP:
            continue
        for lemma in synset.lemmas():
            name = lemma.name().lower()
            if not is_single_word(name) or name == word:
                pass  # still process antonyms below
            else:
                if name in allowed_pool:
                    syns_by_pos.setdefault(pos, set()).add(name)
            # Antonyms hang off individual lemmas, not the synset.
            for ant in lemma.antonyms():
                ant_name = ant.name().lower()
                if (
                    is_single_word(ant_name)
                    and ant_name != word
                    and ant_name in allowed_pool
                ):
                    ants_by_pos.setdefault(pos, set()).add(ant_name)

    if not syns_by_pos:
        return None

    # Choose POS with most synonyms; tie-break by WordNet's canonical order n>v>a>r.
    pos_order = {"n": 0, "v": 1, "a": 2, "r": 3}
    best_pos = max(
        syns_by_pos.keys(),
        key=lambda p: (len(syns_by_pos[p]), -pos_order.get(p, 99)),
    )
    syns = sorted(syns_by_pos[best_pos])
    ants = sorted(ants_by_pos.get(best_pos, set()))

    if len(syns) < MIN_SYNONYMS:
        return None

    return {"pos": best_pos, "syn": syns, "ant": ants}


def main() -> int:
    ensure_wordnet()

    seed_words = load_wordlist(SEED_LIST)
    if not seed_words:
        print(
            f"[build_vocab] ERROR: seed wordlist not found or empty: {SEED_LIST}",
            file=sys.stderr,
        )
        return 1

    extra_pool = load_wordlist(EXTRA_POOL_LIST)
    # The filter pool is what we ALLOW synonyms/antonyms to be drawn from.
    # Seeds (A2+B1) + optional A1 expansion = "words a learner can handle".
    allowed_pool = seed_words | extra_pool

    print(f"[build_vocab] seeds (A2+B1):     {len(seed_words)}")
    print(f"[build_vocab] extra pool (A1):   {len(extra_pool)}")
    print(f"[build_vocab] total filter pool: {len(allowed_pool)}")

    output: dict[str, dict] = {}
    discard_reasons: Counter = Counter()

    # Sorted iteration → deterministic build.
    for word in sorted(seed_words):
        entry = collect_for_word(word, allowed_pool)
        if entry is None:
            # Distinguish reasons for the summary.
            from nltk.corpus import wordnet as wn

            synsets = [
                s
                for s in wn.synsets(word)
                if POS_NORMALIZE.get(s.pos(), s.pos()) in WORDNET_POS_KEEP
            ]
            if not synsets:
                discard_reasons["no_wordnet_entry"] += 1
            else:
                discard_reasons[f"fewer_than_{MIN_SYNONYMS}_syns_after_filter"] += 1
            continue
        output[word] = entry

    # Sort output keys for byte-identical reruns.
    sorted_output = {k: output[k] for k in sorted(output)}

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(
        json.dumps(sorted_output, separators=(",", ":"), ensure_ascii=False),
        encoding="utf-8",
    )

    kept = len(sorted_output)
    processed = len(seed_words)
    discarded = processed - kept

    print()
    print(f"[build_vocab] {processed} words processed, {kept} kept, {discarded} discarded")
    for reason, n in discard_reasons.most_common():
        print(f"               - {reason}: {n}")
    print(f"[build_vocab] wrote {OUTPUT_JSON} ({OUTPUT_JSON.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
