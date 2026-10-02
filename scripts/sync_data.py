"""Export a pinned Fracture Git snapshot without changing its working tree."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REF = "034b9776d56a4d6ccde317028393f8cb4d7a08d1"
SOURCES = {
    "overview": "Paper/figures/Figure1/figure1_data.json",
    "methods": "Paper/figures/Figure2/figure2_data.json",
    "matched": "Paper/figures/Figure4/matched_cost_controls.json",
    "costs": "Paper/figures/Figure16/adaptation_cost_data.json",
    "questions": "Paper/analysis/research_questions.json",
    "diagnostics": "Paper/analysis/q2_metric_audit_20260926/paired/finqa_scaling_replay.json",
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=ROOT.parent / "Fracture")
    parser.add_argument("--ref", default=DEFAULT_REF)
    args = parser.parse_args()

    def git(*command):
        return subprocess.check_output(["git", "-C", str(args.repo), "-c", "gc.auto=0", *command])

    commit = git("rev-parse", args.ref).decode().strip()
    payload = {
        "schemaVersion": 1,
        "project": "Fracture Atlas",
        "paperTitle": "Can Adaptation Substitute for Model Scale? An Empirical Study of Language Model Capability Gaps",
        "repository": "https://github.com/AetherHeart-AI/Fracture",
        "commit": commit,
        "snapshotDate": "2026-09-26",
        "sources": {},
    }
    for key, path in SOURCES.items():
        raw = git("show", f"{commit}:{path}")
        parsed = json.loads(raw)
        if key == "diagnostics":
            # Keep exact replay aggregates and three examples; full traces remain linked at source.
            for cohort in ["base", "RL", "K3_teacher_train1000"]:
                for replay in parsed[cohort]["replay"].values():
                    replay["examples"] = replay.pop("touched_outcomes", [])[:3]
        payload[key] = parsed
        payload["sources"][key] = {"path": path, "sha256": hashlib.sha256(raw).hexdigest()}
    output = ROOT / "public" / "data" / "study.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    paper = git("show", f"{commit}:Paper/Fracture.pdf")
    (ROOT / "public" / "paper.pdf").write_bytes(paper)
    payload["sources"]["paper"] = {"path": "Paper/Fracture.pdf", "sha256": hashlib.sha256(paper).hexdigest()}
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {len(payload['overview']['records'])} overview records and {len(payload['methods']['records'])} method records from {commit[:7]}.")


if __name__ == "__main__":
    main()
