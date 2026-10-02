"""Check the research snapshot's coverage, control alignment and audited endpoints."""
import hashlib
import json
import math
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / "public/data/study.json").read_text(encoding="utf-8"))
overview = data["overview"]["records"]
methods = data["methods"]["records"]
costs = data["costs"]["records"]
assert len(overview) == 80, "Expected 16 benchmarks x 5 model versions/references"
assert len({r["benchmark"] for r in overview}) == 16
assert len(methods) == 122
assert len({(r["benchmark"], r["model"], r["method"]) for r in methods}) == len(methods)
assert sum(r["value"] is not None for r in methods) == 106
assert sum(bool(r["exclusion"]) for r in methods) == 5
assert all(r["value"] is None for r in methods if r["exclusion"])
assert all(r["value"] is None or math.isfinite(r["value"]) for r in methods)

by_key = {(r["benchmark"], r["model"], r["method"]): r for r in methods}
for pair in data["matched"]["pairs"]:
    r = by_key[(pair["benchmark"], pair["model"], pair["method"])]
    assert r["value"] is not None and not r["exclusion"]
    assert abs(r["value"] - pair["endpoint"]) < 0.00001
    assert r["source"]["trace"] == pair["trace"], "Control must align to the saved endpoint trace"
assert len(data["matched"]["pairs"]) == 48
assert by_key[("FinQA", "Qwen3.8-27B", "RL")]["value"] == 34.18
assert by_key[("IFEval", "Qwen3.8-27B", "RL")]["value"] == 81.27
assert by_key[("BFCL V4", "Qwen3.6-27B", "SFT")]["value"] == 46.88
assert len(costs) == 104
for c in costs:
    r = by_key[(c["benchmark"], c["model"], c["method"])]
    assert abs(c["value"] - r["value"]) < 0.00001, "Cost must belong to the current endpoint"
    assert c["trace"] == r["source"]["trace"]
    assert c["total_cost_usd"] is None or c["total_cost_usd"] >= 0
    if c["allocation_interval"]:
        lower, upper = c["adaptation_lower_usd"], c["adaptation_upper_usd"]
        assert (lower is None and upper is None) or (lower is not None and upper is not None and lower <= upper)

assert data["diagnostics"]["base"]["replay"]["strip_final_x100"]["before_correct"] == 397
assert data["diagnostics"]["base"]["replay"]["strip_final_x100"]["after_correct"] == 763
assert "diagnostic" in data["diagnostics"]["status"].lower()
q2 = data["questions"]["q2_sft"]
assert len(q2) == 12
assert sum(abs(r["gap_after"]) < abs(r["gap_before"]) for r in q2) == data["questions"]["q2_summary"]["absolute_narrows"] == 8
assert sum(abs(r["gap_after"]) > abs(r["gap_before"]) for r in q2) == data["questions"]["q2_summary"]["absolute_widens"] == 4
assert hashlib.sha256((root / "public/paper.pdf").read_bytes()).hexdigest() == data["sources"]["paper"]["sha256"]
assert all(len(s["sha256"]) == 64 for s in data["sources"].values())
print("PASS: 16 benchmarks, 106 endpoints, 48 trace-aligned controls, 104 cost records, audited revisions, diagnostic counts and PDF integrity.")
