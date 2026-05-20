#!/usr/bin/env python3
"""
clinic_tracker.py — State management for the Ontario clinic prospecting task.
All persistent state lives in .tmp/clinics.json. Use this as the single source
of truth across sessions.

Usage:
  python3 tools/clinic_tracker.py summary
  python3 tools/clinic_tracker.py list [status]
  python3 tools/clinic_tracker.py add --name "..." --city "..." --address "..." --website "..." --phone "..." --term "..."
  python3 tools/clinic_tracker.py reject <id> "reason"
  python3 tools/clinic_tracker.py verify <id> ["notes"]
"""

import json
import os
import sys
import hashlib
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLINICS_PATH = os.path.join(BASE_DIR, ".tmp", "clinics.json")

CHAIN_NAMES = [
    "lifemark", "physiocare", "hhs", "sunnybrook", "unity health",
    "trillium", "runnymede", "st. michael", "osler", "rouge valley",
    "st. joseph", "baycrest", "lakeridge", "michael garron",
    "william osler", "headwaters", "halton healthcare",
]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _make_id(name: str, city: str) -> str:
    key = f"{name.lower().strip()}{city.lower().strip()}"
    return hashlib.md5(key.encode()).hexdigest()[:12]


def load_clinics() -> dict:
    if not os.path.exists(CLINICS_PATH):
        os.makedirs(os.path.dirname(CLINICS_PATH), exist_ok=True)
        return {}
    with open(CLINICS_PATH, "r") as f:
        return json.load(f)


def save_clinics(clinics: dict) -> None:
    tmp_path = CLINICS_PATH + ".tmp"
    with open(tmp_path, "w") as f:
        json.dump(clinics, f, indent=2)
    os.replace(tmp_path, CLINICS_PATH)


def add_clinic(name: str, city: str, address: str = "", website: str = "",
               phone: str = "", search_term: str = "") -> tuple:
    clinics = load_clinics()
    cid = _make_id(name, city)

    if cid in clinics:
        # Merge: add search_term to list, fill empty fields
        c = clinics[cid]
        terms = c.get("search_terms", [c.get("search_term", "")])
        if search_term and search_term not in terms:
            terms.append(search_term)
        c["search_terms"] = terms
        for field, val in [("address", address), ("website", website), ("phone_maps", phone)]:
            if val and not c.get(field):
                c[field] = val
        c["updated_at"] = _now()
        save_clinics(clinics)
        return cid, False

    # Check for chain name
    is_chain = any(chain in name.lower() for chain in CHAIN_NAMES)

    clinics[cid] = {
        "id": cid,
        "clinic_name": name,
        "city": city,
        "address": address,
        "website": website,
        "phone_maps": phone,
        "search_terms": [search_term] if search_term else [],
        "status": "rejected" if is_chain else "raw",
        "rejection_reason": "chain_detected" if is_chain else "",
        # Website check
        "location_count": 0,
        "location_method": "",
        "has_ai_signals": False,
        "ai_signal_matches": [],
        "phone_website": "",
        "website_pass": False,
        # Revenue
        "revenue_estimate_low": 0,
        "revenue_estimate_high": 0,
        "revenue_estimate_label": "",
        # LinkedIn
        "owner_name": "",
        "owner_title": "",
        "linkedin_url": "",
        "linkedin_found": False,
        # ICP final
        "icp_pass": False,
        "notes": "",
        # Meta
        "added_at": _now(),
        "updated_at": _now(),
    }
    save_clinics(clinics)
    return cid, True


def update_clinic(clinic_id: str, updates: dict) -> None:
    clinics = load_clinics()
    if clinic_id not in clinics:
        raise KeyError(f"Clinic {clinic_id} not found")
    clinics[clinic_id].update(updates)
    clinics[clinic_id]["updated_at"] = _now()
    save_clinics(clinics)


def mark_verified(clinic_id: str, notes: str = "") -> None:
    update_clinic(clinic_id, {
        "status": "verified",
        "icp_pass": True,
        "notes": notes,
    })


def mark_rejected(clinic_id: str, reason: str) -> None:
    update_clinic(clinic_id, {
        "status": "rejected",
        "icp_pass": False,
        "rejection_reason": reason,
    })


def get_by_status(status: str) -> list:
    clinics = load_clinics()
    return [c for c in clinics.values() if c.get("status") == status]


def summary() -> dict:
    clinics = load_clinics()
    counts = {}
    for c in clinics.values():
        s = c.get("status", "unknown")
        counts[s] = counts.get(s, 0) + 1
    counts["total"] = len(clinics)
    return counts


def estimate_revenue(location_count: int) -> tuple:
    PER_LOW = 350_000
    PER_HIGH = 600_000
    low = location_count * PER_LOW
    high = location_count * PER_HIGH
    if high >= 1_000_000:
        label = f"${low/1_000_000:.1f}M–${high/1_000_000:.1f}M"
    else:
        label = f"${low//1000}K–${high//1000}K"
    return low, high, label


def export_csv(status_filter: str = "verified") -> str:
    import csv
    import io
    clinics = load_clinics()
    rows = [c for c in clinics.values() if status_filter == "all" or c.get("status") == status_filter]

    headers = [
        "Clinic Name", "City", "Website", "Phone", "Location Count",
        "Revenue Estimate", "Has AI Signals", "AI Signal Matches",
        "Owner Name", "Title", "LinkedIn URL", "ICP Pass",
        "Rejection Reason", "Search Terms", "Notes"
    ]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for c in rows:
        writer.writerow([
            c.get("clinic_name", ""),
            c.get("city", ""),
            c.get("website", ""),
            c.get("phone_website") or c.get("phone_maps", ""),
            c.get("location_count", ""),
            c.get("revenue_estimate_label", ""),
            c.get("has_ai_signals", ""),
            "; ".join(c.get("ai_signal_matches", [])),
            c.get("owner_name", ""),
            c.get("owner_title", ""),
            c.get("linkedin_url", ""),
            c.get("icp_pass", ""),
            c.get("rejection_reason", ""),
            ", ".join(c.get("search_terms", [])),
            c.get("notes", ""),
        ])
    return output.getvalue()


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]

    if not args or args[0] == "summary":
        s = summary()
        print("\n── Clinic Tracker Summary ──")
        for k, v in sorted(s.items()):
            print(f"  {k:20s} {v}")
        print()

    elif args[0] == "list":
        status = args[1] if len(args) > 1 else "verified"
        rows = get_by_status(status)
        print(f"\n── {len(rows)} clinics with status='{status}' ──")
        for c in rows:
            print(f"  [{c['id']}] {c['clinic_name']} ({c['city']}) — {c.get('rejection_reason') or c.get('owner_name') or ''}")
        print()

    elif args[0] == "add":
        import argparse
        parser = argparse.ArgumentParser()
        parser.add_argument("--name", required=True)
        parser.add_argument("--city", required=True)
        parser.add_argument("--address", default="")
        parser.add_argument("--website", default="")
        parser.add_argument("--phone", default="")
        parser.add_argument("--term", default="")
        parsed = parser.parse_args(args[1:])
        cid, is_new = add_clinic(parsed.name, parsed.city, parsed.address,
                                  parsed.website, parsed.phone, parsed.term)
        print(f"{'Added' if is_new else 'Updated'} [{cid}] {parsed.name}")

    elif args[0] == "reject" and len(args) >= 3:
        mark_rejected(args[1], args[2])
        print(f"Rejected {args[1]}: {args[2]}")

    elif args[0] == "verify" and len(args) >= 2:
        notes = args[2] if len(args) > 2 else ""
        mark_verified(args[1], notes)
        print(f"Verified {args[1]}")

    elif args[0] == "export":
        status = args[1] if len(args) > 1 else "verified"
        csv_path = os.path.join(BASE_DIR, ".tmp", f"clinics_{status}.csv")
        with open(csv_path, "w") as f:
            f.write(export_csv(status))
        print(f"Exported to {csv_path}")

    elif args[0] == "add_batch":
        # Read JSON from stdin: [{name, city, address, website, phone, term}, ...]
        data = json.load(sys.stdin)
        added, updated = 0, 0
        for item in data:
            cid, is_new = add_clinic(
                item.get("name", ""),
                item.get("city", ""),
                item.get("address", ""),
                item.get("website", ""),
                item.get("phone", ""),
                item.get("term", ""),
            )
            if is_new:
                added += 1
            else:
                updated += 1
        print(f"Batch complete: {added} added, {updated} updated")
        s = summary()
        print(f"Total raw: {s.get('raw', 0)}, Total: {s.get('total', 0)}")

    else:
        print(__doc__)
