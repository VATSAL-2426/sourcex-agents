#!/usr/bin/env python3
"""
call_tracker.py — SOURCE X Daily Outreach Tracker

Tracks every cold call and LinkedIn touchpoint. Keeps you from losing track
when doing 25 dials a day. All data in .tmp/outreach.json

Usage:
  python3 tools/call_tracker.py today          # show today's call queue
  python3 tools/call_tracker.py log            # log a call interactively
  python3 tools/call_tracker.py pipeline       # show full pipeline status
  python3 tools/call_tracker.py summary        # weekly numbers
  python3 tools/call_tracker.py followups      # who needs a follow-up today
  python3 tools/call_tracker.py add            # add a new prospect manually
"""

import json
import os
import sys
import argparse
from datetime import date, datetime, timedelta

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP_DIR    = os.path.join(BASE_DIR, ".tmp")
DATA_FILE  = os.path.join(TMP_DIR, "outreach.json")
os.makedirs(TMP_DIR, exist_ok=True)

# ─── Call outcomes ─────────────────────────────────────────────────────────
OUTCOMES = {
    "1": "no_answer",
    "2": "voicemail",
    "3": "not_interested",
    "4": "callback_requested",
    "5": "audit_booked",
    "6": "call_booked",
    "7": "gatekeeper",
    "8": "wrong_number",
    "9": "already_has_solution",
}

OUTCOME_LABELS = {
    "no_answer":          "No answer",
    "voicemail":          "Voicemail left",
    "not_interested":     "Not interested",
    "callback_requested": "Callback requested",
    "audit_booked":       "AUDIT BOOKED ★",
    "call_booked":        "CALL BOOKED ★★",
    "gatekeeper":         "Gatekeeper / couldn't reach DM",
    "wrong_number":       "Wrong number",
    "already_has_solution": "Has existing solution",
}

# ─── Pipeline stages ────────────────────────────────────────────────────────
STAGES = ["new", "contacted", "audit_sent", "call_booked", "proposal_sent", "closed_won", "closed_lost", "nurture"]


def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE) as f:
            return json.load(f)
    return {"prospects": [], "calls": []}


def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


def get_prospects_from_clinics():
    """Pull verified prospects from clinic_tracker that aren't yet in outreach."""
    clinic_file = os.path.join(TMP_DIR, "clinics.json")
    if not os.path.exists(clinic_file):
        return []
    try:
        with open(clinic_file) as f:
            raw = json.load(f)
        # Handle both list-of-dict and dict-of-dict formats
        if isinstance(raw, list):
            clinics = raw
        elif isinstance(raw, dict):
            clinics = list(raw.values())
        else:
            return []
        verified = [c for c in clinics if isinstance(c, dict) and c.get("status") in ("verified", "linkedin_checked")]
        return verified
    except Exception:
        return []


def sync_from_clinics(data):
    """Import verified clinics from clinic_tracker into outreach prospects."""
    existing_names = {p.get("clinic_name", "").lower() for p in data["prospects"]}
    clinics = get_prospects_from_clinics()
    added = 0
    for c in clinics:
        # clinic_tracker uses "clinic_name" key, not "name"
        name = c.get("clinic_name", c.get("name", "")).lower()
        if name and name not in existing_names:
            data["prospects"].append({
                "id":           c.get("id", ""),
                "clinic_name":  c.get("clinic_name", c.get("name", "")),
                "city":         c.get("city", ""),
                "phone":        c.get("phone", c.get("phone_maps", "")),
                "website":      c.get("website", ""),
                "owner_name":   c.get("owner_name", ""),
                "owner_title":  c.get("owner_title", ""),
                "linkedin_url": c.get("linkedin_url", ""),
                "emr":          c.get("emr", ""),
                "locations":    c.get("location_count", ""),
                "stage":        "new",
                "linkedin_msg": 0,
                "call_count":   0,
                "last_contact": None,
                "next_followup": None,
                "audit_sent":   False,
                "audit_date":   None,
                "notes":        "",
                "added_date":   str(date.today()),
            })
            existing_names.add(name)
            added += 1
    return added


def cmd_today(data):
    """Show today's call queue — new + due for follow-up."""
    today = str(date.today())
    new_prospects = [p for p in data["prospects"] if p["stage"] == "new" and p["call_count"] == 0]
    due_followups = [
        p for p in data["prospects"]
        if p.get("next_followup") and p["next_followup"] <= today
        and p["stage"] not in ("closed_won", "closed_lost")
    ]

    print(f"\n{'━'*60}")
    print(f"  SOURCE X — Today's Call Queue  ({today})")
    print(f"{'━'*60}\n")

    if new_prospects:
        print(f"  NEW PROSPECTS ({len(new_prospects)} to call):")
        for i, p in enumerate(new_prospects[:15], 1):
            name = p.get("owner_name") or "Owner"
            print(f"  {i:2}. {p['clinic_name']} · {p['city']}  |  {name}  |  {p.get('phone','no phone')}")
    else:
        print("  No new prospects queued.")

    if due_followups:
        print(f"\n  FOLLOW-UPS DUE ({len(due_followups)}):")
        for p in due_followups:
            name = p.get("owner_name") or "Owner"
            stage_label = p["stage"].replace("_", " ").title()
            print(f"  · {p['clinic_name']} · {p['city']}  |  {name}  |  Stage: {stage_label}  |  {p.get('phone','')}")

    total_pipeline = len([p for p in data["prospects"] if p["stage"] not in ("closed_won","closed_lost")])
    print(f"\n  Pipeline: {total_pipeline} active  |  Run `log` after each call\n")


def cmd_log(data):
    """Log a call interactively."""
    print(f"\n{'━'*60}")
    print("  LOG A CALL")
    print(f"{'━'*60}\n")

    # Find prospect
    search = input("  Clinic name (or partial match): ").strip().lower()
    matches = [p for p in data["prospects"] if search in p["clinic_name"].lower()]

    if not matches:
        print(f"  No match for '{search}'. Add them with: python3 tools/call_tracker.py add")
        return
    if len(matches) == 1:
        prospect = matches[0]
    else:
        print(f"  Multiple matches:")
        for i, p in enumerate(matches, 1):
            print(f"    {i}. {p['clinic_name']} · {p['city']}")
        idx = int(input("  Select number: ").strip()) - 1
        prospect = matches[idx]

    print(f"\n  Logging call for: {prospect['clinic_name']} · {prospect['city']}")
    print(f"  Owner: {prospect.get('owner_name','Unknown')}\n")

    # Outcome
    print("  Outcome:")
    for k, v in OUTCOMES.items():
        print(f"    {k}. {OUTCOME_LABELS[v]}")
    outcome_key = input("\n  Select outcome [1-9]: ").strip()
    outcome = OUTCOMES.get(outcome_key, "no_answer")

    notes = input("  Notes (what they said, objection, vibe): ").strip()

    # Auto-set next follow-up
    followup_days = {
        "no_answer":          3,
        "voicemail":          5,
        "not_interested":     90,
        "callback_requested": 2,
        "audit_booked":       2,
        "call_booked":        1,
        "gatekeeper":         7,
        "wrong_number":       None,
        "already_has_solution": 60,
    }
    fd = followup_days.get(outcome)
    next_followup = str(date.today() + timedelta(days=fd)) if fd else None

    # Update prospect
    prospect["call_count"] = prospect.get("call_count", 0) + 1
    prospect["last_contact"] = str(date.today())
    prospect["next_followup"] = next_followup

    # Update stage
    if outcome == "audit_booked":
        prospect["stage"] = "audit_sent" if prospect.get("audit_sent") else "audit_sent"
        prospect["audit_sent"] = False  # flag to send
    elif outcome == "call_booked":
        prospect["stage"] = "call_booked"
    elif outcome == "not_interested":
        prospect["stage"] = "nurture"
    elif outcome in ("callback_requested", "voicemail", "no_answer", "gatekeeper"):
        if prospect["stage"] == "new":
            prospect["stage"] = "contacted"

    # Log the call
    data["calls"].append({
        "date":        str(date.today()),
        "time":        datetime.now().strftime("%H:%M"),
        "clinic_name": prospect["clinic_name"],
        "city":        prospect["city"],
        "owner_name":  prospect.get("owner_name", ""),
        "outcome":     outcome,
        "notes":       notes,
    })

    if notes:
        prospect["notes"] = (prospect.get("notes") or "") + f"\n[{date.today()}] {notes}"

    save_data(data)
    print(f"\n  ✓ Logged: {OUTCOME_LABELS[outcome]}")
    if next_followup:
        print(f"  Next follow-up: {next_followup}")
    print()


def cmd_pipeline(data):
    """Show full pipeline with stage breakdown."""
    from collections import defaultdict
    stages = defaultdict(list)
    for p in data["prospects"]:
        stages[p["stage"]].append(p)

    print(f"\n{'━'*60}")
    print("  SOURCE X PIPELINE")
    print(f"{'━'*60}\n")

    stage_order = ["new", "contacted", "audit_sent", "call_booked", "proposal_sent", "closed_won", "closed_lost", "nurture"]
    for stage in stage_order:
        prospects = stages.get(stage, [])
        if not prospects:
            continue
        label = stage.replace("_", " ").upper()
        print(f"  {label} ({len(prospects)})")
        for p in prospects:
            name = p.get("owner_name") or "—"
            last = p.get("last_contact") or "never"
            nxt  = p.get("next_followup") or "—"
            print(f"    · {p['clinic_name']:<30} {p['city']:<15} {name:<20} last:{last}  next:{nxt}")
        print()


def cmd_summary(data):
    """Weekly activity summary."""
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    week_calls = [c for c in data["calls"] if c["date"] >= str(week_start)]
    all_calls  = data["calls"]

    # Outcome counts this week
    from collections import Counter
    week_outcomes = Counter(c["outcome"] for c in week_calls)

    print(f"\n{'━'*60}")
    print(f"  SOURCE X — Weekly Summary  (week of {week_start})")
    print(f"{'━'*60}\n")
    print(f"  This week:  {len(week_calls)} calls")
    for outcome, count in week_outcomes.most_common():
        print(f"    {OUTCOME_LABELS.get(outcome, outcome):<35} {count}")

    print(f"\n  Total pipeline:")
    stages = Counter(p["stage"] for p in data["prospects"])
    for stage, count in stages.most_common():
        print(f"    {stage.replace('_',' ').title():<25} {count}")

    audits_sent = len([p for p in data["prospects"] if p.get("audit_sent")])
    calls_booked = len([p for p in data["prospects"] if p["stage"] == "call_booked"])
    won = len([p for p in data["prospects"] if p["stage"] == "closed_won"])

    print(f"\n  Funnel:")
    print(f"    Prospects total:   {len(data['prospects'])}")
    print(f"    Audits sent:       {audits_sent}")
    print(f"    Calls booked:      {calls_booked}")
    print(f"    Won:               {won}")

    if all_calls:
        print(f"\n  All-time: {len(all_calls)} calls logged\n")


def cmd_followups(data):
    """Show everyone who needs a follow-up today or overdue."""
    today = str(date.today())
    due = [
        p for p in data["prospects"]
        if p.get("next_followup") and p["next_followup"] <= today
        and p["stage"] not in ("closed_won", "closed_lost", "not_interested")
    ]

    print(f"\n{'━'*60}")
    print(f"  FOLLOW-UPS DUE  ({today})")
    print(f"{'━'*60}\n")

    if not due:
        print("  No follow-ups due today. Go make more calls.\n")
        return

    for p in due:
        name     = p.get("owner_name") or "Owner"
        stage    = p["stage"].replace("_"," ").title()
        overdue  = (date.today() - date.fromisoformat(p["next_followup"])).days
        overdue_str = f" [{overdue}d overdue]" if overdue > 0 else ""
        print(f"  · {p['clinic_name']} · {p['city']}")
        print(f"    {name} · Stage: {stage}{overdue_str}")
        print(f"    Phone: {p.get('phone','—')}  |  LinkedIn: {p.get('linkedin_url','—')}")
        last_note = p.get("notes", "").strip().split("\n")[-1] if p.get("notes") else "—"
        print(f"    Last note: {last_note}")
        print()


def cmd_add(data):
    """Add a new prospect manually."""
    print(f"\n{'━'*60}")
    print("  ADD PROSPECT")
    print(f"{'━'*60}\n")

    def ask(prompt, default=""):
        val = input(f"  {prompt}" + (f" [{default}]" if default else "") + ": ").strip()
        return val or default

    clinic_name = ask("Clinic name")
    city        = ask("City")
    phone       = ask("Phone")
    website     = ask("Website")
    owner_name  = ask("Owner/director name")
    owner_title = ask("Title (e.g. Owner, Clinic Director)")
    emr         = ask("EMR (Jane/Juvonno/ClinicSense/PracticePerfect)")
    locations   = ask("# of locations", "2")
    linkedin    = ask("LinkedIn URL")

    data["prospects"].append({
        "id":           "",
        "clinic_name":  clinic_name,
        "city":         city,
        "phone":        phone,
        "website":      website,
        "owner_name":   owner_name,
        "owner_title":  owner_title,
        "linkedin_url": linkedin,
        "emr":          emr,
        "locations":    locations,
        "stage":        "new",
        "linkedin_msg": 0,
        "call_count":   0,
        "last_contact": None,
        "next_followup": None,
        "audit_sent":   False,
        "audit_date":   None,
        "notes":        "",
        "added_date":   str(date.today()),
    })
    save_data(data)
    print(f"\n  ✓ Added: {clinic_name} · {city}\n")


def main():
    parser = argparse.ArgumentParser(description="SOURCE X Outreach Call Tracker")
    parser.add_argument("command", nargs="?", default="today",
                        choices=["today", "log", "pipeline", "summary", "followups", "add", "sync"],
                        help="Command to run")
    args = parser.parse_args()

    data = load_data()

    # Auto-sync from clinic tracker on first run or sync command
    if args.command == "sync" or not data["prospects"]:
        added = sync_from_clinics(data)
        if added:
            save_data(data)
            print(f"\n  ✓ Synced {added} prospects from clinic tracker.\n")

    if args.command == "today":
        cmd_today(data)
    elif args.command == "log":
        cmd_log(data)
    elif args.command == "pipeline":
        cmd_pipeline(data)
    elif args.command == "summary":
        cmd_summary(data)
    elif args.command == "followups":
        cmd_followups(data)
    elif args.command == "add":
        cmd_add(data)
    elif args.command == "sync":
        added = sync_from_clinics(data)
        save_data(data)
        print(f"  ✓ {added} new prospects synced. Total: {len(data['prospects'])}")


if __name__ == "__main__":
    main()
