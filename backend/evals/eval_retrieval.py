"""Đo chất lượng tìm kiếm. Chạy: python -m evals.eval_retrieval [--show-misses]

Tắt ngưỡng điểm khi tìm kiếm để xem được phân bố điểm, từ đó chọn search_min_score.
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

from app.config import settings
from app.db import SessionLocal
from app.services.knowledge import parse_markdown, search_docs

CASES = Path(__file__).with_name("retrieval_cases.json")


def title_by_prefix() -> dict[str, str]:
    paths = Path(settings.knowledge_dir).glob("[0-9]*.md")
    return {
        path.name[:2]: parse_markdown(path.read_text(encoding="utf-8")).title for path in paths
    }


def main() -> None:
    show_misses = "--show-misses" in sys.argv
    settings.search_min_score = -1.0
    titles = title_by_prefix()
    cases = json.loads(CASES.read_text(encoding="utf-8"))

    stats = defaultdict(lambda: {"n": 0, "hit1": 0, "hit3": 0, "hit5": 0})
    in_scope_scores, out_scope_scores = [], []
    with SessionLocal() as db:
        for case in cases:
            hits = search_docs(db, case["q"], top_k=5)
            top_score = hits[0]["score"]
            if not case["expect"]:
                out_scope_scores.append((top_score, case["q"]))
                continue

            in_scope_scores.append((top_score, case["q"]))
            expected = {titles[prefix] for prefix in case["expect"]}
            ranks = [i for i, hit in enumerate(hits) if hit["title"] in expected]
            first = ranks[0] + 1 if ranks else None
            for group in (case["kind"], "tat_ca"):
                stats[group]["n"] += 1
                stats[group]["hit1"] += first == 1
                stats[group]["hit3"] += first is not None and first <= 3
                stats[group]["hit5"] += first is not None
            if show_misses and first != 1:
                print(f"[hạng {first}] {case['q']} -> {hits[0]['title']}")

    print(f"{'Nhóm':<12}{'Số câu':>8}{'Top 1':>8}{'Top 3':>8}{'Top 5':>8}")
    for group, row in stats.items():
        n = row["n"]
        print(
            f"{group:<12}{n:>8}{row['hit1'] / n:>8.0%}{row['hit3'] / n:>8.0%}{row['hit5'] / n:>8.0%}"
        )

    print(f"\nĐiểm cao nhất, câu trong phạm vi: thấp nhất {min(in_scope_scores)}")
    print(f"Điểm cao nhất, câu ngoài phạm vi: cao nhất {max(out_scope_scores)}")


if __name__ == "__main__":
    main()
