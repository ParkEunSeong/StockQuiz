"""Convert the supplied quiz workbook into the app's static question bank.

Usage: python scripts/import_questions.py path/to/questions.xlsx
"""

import json
import sys
import warnings
from pathlib import Path

import openpyxl


def main() -> None:
    source = Path(sys.argv[1])
    warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")
    book = openpyxl.load_workbook(source, read_only=True, data_only=True)
    questions = []
    for difficulty in ("하", "중", "상"):
        for kind in ("4지선다", "OX"):
            sheet = book[f"{difficulty}_{kind}"]
            rows = sheet.iter_rows(values_only=True)
            for _ in range(5):
                next(rows)
            for row in rows:
                if not isinstance(row[0], int):
                    continue
                if kind == "4지선다":
                    _, qid, category, prompt, *rest = row
                    options = list(rest[:4])
                    answer = rest[6]
                    explanation = rest[7]
                    reference = rest[9]
                    assert len(options) == 4 and all(options)
                    assert answer in (1, 2, 3, 4)
                    answer = answer - 1
                else:
                    _, qid, category, prompt, _, _, answer, explanation, _, reference = row
                    options = ["O", "X"]
                    assert answer in options
                    answer = options.index(answer)
                assert qid and category and prompt and explanation
                questions.append({
                    "id": qid,
                    "category": category,
                    "difficulty": difficulty,
                    "kind": kind,
                    "prompt": prompt,
                    "options": options,
                    "answer": answer,
                    "explanation": explanation,
                    "reference": reference or "",
                })
    ids = [q["id"] for q in questions]
    assert len(questions) == 1000 and len(set(ids)) == 1000
    output = Path(__file__).parents[1] / "src" / "data" / "questions.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(questions, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Imported {len(questions)} questions from {source.name} -> {output}")


if __name__ == "__main__":
    main()
