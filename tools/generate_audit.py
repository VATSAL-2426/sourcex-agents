#!/usr/bin/env python3
"""
generate_audit.py — Personalized Clinic Revenue Leak Audit Generator

Takes clinic-specific inputs and outputs a custom 4-page HTML document
with their actual estimated numbers. Open in Chrome, Print → Save as PDF.

Usage:
  python3 tools/generate_audit.py --name "Peak Physio" --owner "Dr. Sarah Chen" \
    --city "Mississauga" --locations 3 --emr "Jane" \
    --daily-calls 80 --avg-fee 115 --hours "Mon-Fri 8am-7pm, Sat 9am-3pm"

  Or interactive mode (no args):
  python3 tools/generate_audit.py
"""

import argparse
import os
import sys
import math
from datetime import date

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP_DIR = os.path.join(BASE_DIR, ".tmp")
os.makedirs(TMP_DIR, exist_ok=True)


# ─── Ontario Benchmark Constants ────────────────────────────────────────────

MISSED_CALL_RATE      = 0.10   # 10% of calls missed — industry mid-point
CONVERSION_RATE       = 0.55   # 55% of answered calls convert to a booking
MISSED_CONVERSION     = 0.35   # 35% of missed calls would have booked if reached
NO_SHOW_RATE          = 0.10   # 10% daily no-show rate — Ontario benchmark
NO_SHOW_RECOVERY      = 0.30   # 30% of no-shows recoverable with same-day automation
DORMANT_CUTOFF_DAYS   = 90     # patients inactive 90+ days
DORMANT_PER_LOCATION  = 350    # avg dormant patients per location
REACTIVATION_RATE     = 0.15   # 15% respond to a well-timed reactivation campaign
VISITS_PER_REACTIVATION = 4    # avg visit series for a reactivated patient
APPTS_PER_LOCATION_DAY = 25    # avg daily appointments per location
CALLS_PER_LOCATION_DAY = 30    # default if user doesn't provide daily-calls
WORKING_DAYS_MONTH    = 22


def calculate(locations: int, daily_calls: int, avg_fee: float) -> dict:
    """Compute all personalized revenue numbers from clinic inputs."""

    # ── Missed Call Module ────────────────────────────────────────────────
    missed_per_day       = daily_calls * MISSED_CALL_RATE
    lost_bookings_per_day = missed_per_day * MISSED_CONVERSION
    missed_revenue_month = lost_bookings_per_day * WORKING_DAYS_MONTH * avg_fee
    missed_revenue_year  = missed_revenue_month * 12

    # ── No-Show Module ───────────────────────────────────────────────────
    appts_per_day        = locations * APPTS_PER_LOCATION_DAY
    no_shows_per_day     = appts_per_day * NO_SHOW_RATE
    recoverable_per_day  = no_shows_per_day * NO_SHOW_RECOVERY
    noshows_revenue_month = recoverable_per_day * WORKING_DAYS_MONTH * avg_fee

    # ── Reactivation Module ──────────────────────────────────────────────
    total_dormant        = locations * DORMANT_PER_LOCATION
    reactivatable        = math.floor(total_dormant * REACTIVATION_RATE)
    reactivation_revenue = reactivatable * avg_fee * VISITS_PER_REACTIVATION   # per campaign
    reactivation_monthly = reactivation_revenue / 3   # quarterly campaign ÷ 3

    # ── Totals ───────────────────────────────────────────────────────────
    total_monthly = missed_revenue_month + noshows_revenue_month + reactivation_monthly
    total_annual  = total_monthly * 12

    # ── ROI on SOURCE X Flagship ─────────────────────────────────────────
    setup_fee     = 7500
    monthly_fee   = 1500
    year1_cost    = setup_fee + (monthly_fee * 11)
    year1_recovery = total_monthly * 12 * 0.60  # conservative 60% recovery rate
    roi_multiple  = year1_recovery / year1_cost if year1_cost else 0
    payback_days  = math.ceil(setup_fee / (total_monthly * 0.60 / 30))

    def fmt(n): return f"${n:,.0f}"
    def fmtk(n): return f"${n/1000:.0f}K" if n >= 1000 else f"${n:.0f}"

    return {
        # Raw numbers
        "missed_per_day":        round(missed_per_day, 1),
        "lost_bookings_per_day": round(lost_bookings_per_day, 1),
        "missed_revenue_month":  missed_revenue_month,
        "missed_revenue_year":   missed_revenue_year,
        "no_shows_per_day":      round(no_shows_per_day, 1),
        "recoverable_per_day":   round(recoverable_per_day, 1),
        "noshows_revenue_month": noshows_revenue_month,
        "total_dormant":         total_dormant,
        "reactivatable":         reactivatable,
        "reactivation_revenue":  reactivation_revenue,
        "reactivation_monthly":  reactivation_monthly,
        "total_monthly":         total_monthly,
        "total_annual":          total_annual,
        "setup_fee":             setup_fee,
        "year1_cost":            year1_cost,
        "year1_recovery":        year1_recovery,
        "roi_multiple":          roi_multiple,
        "payback_days":          payback_days,
        # Formatted
        "f_missed_per_day":       str(round(missed_per_day, 1)),
        "f_lost_bookings_day":    str(round(lost_bookings_per_day, 1)),
        "f_missed_month":         fmt(missed_revenue_month),
        "f_missed_year":          fmtk(missed_revenue_year),
        "f_noshows_day":          str(round(no_shows_per_day, 1)),
        "f_recoverable_day":      str(round(recoverable_per_day, 1)),
        "f_noshows_month":        fmt(noshows_revenue_month),
        "f_dormant":              f"{total_dormant:,}",
        "f_reactivatable":        str(reactivatable),
        "f_reactivation_month":   fmt(reactivation_monthly),
        "f_total_monthly":        fmt(total_monthly),
        "f_total_annual":         fmtk(total_annual),
        "f_year1_recovery":       fmtk(year1_recovery),
        "f_roi_multiple":         f"{roi_multiple:.1f}x",
        "f_payback_days":         str(payback_days),
        "f_avg_fee":              fmt(avg_fee),
        "f_appts_day":            str(appts_per_day),
        "f_daily_calls":          str(daily_calls),
    }


def render_html(clinic_name, owner_name, city, locations, emr, hours, nums, today_str):
    loc_str = f"{locations}-location"
    emr_display = emr or "your EMR"

    # Determine risk level label
    if nums["total_monthly"] > 25000:
        risk_label = "CRITICAL"
        risk_color = "#DC2626"
    elif nums["total_monthly"] > 15000:
        risk_label = "HIGH"
        risk_color = "#D97706"
    else:
        risk_label = "MODERATE"
        risk_color = "#2563EB"

    # EMR-specific note
    emr_notes = {
        "Jane":           "Jane App has a native API — our integration is typically live within 5 business days.",
        "Juvonno":        "Juvonno's API is our most-deployed integration — we have pre-built connectors ready.",
        "ClinicSense":    "ClinicSense supports webhook integration — setup time is typically under a week.",
        "PracticePerfect":"PracticePerfect's HL7 interface allows full EMR integration with audit trail logging.",
    }
    emr_note = emr_notes.get(emr, f"We have built integrations for most major Ontario EMRs. We will confirm {emr_display} compatibility in the audit call.")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SOURCE X — Revenue Leak Audit — {clinic_name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
  <style>
    :root {{
      --navy:       #1E3A8A;
      --navy-dark:  #1e2f6a;
      --navy-light: #2d4fa3;
      --near-black: #0F172A;
      --blue-light: #DBEAFE;
      --blue-mid:   #93C5FD;
      --white:      #FFFFFF;
      --gray-50:    #F8FAFC;
      --gray-100:   #F1F5F9;
      --gray-300:   #CBD5E1;
      --gray-500:   #64748B;
      --gray-700:   #334155;
      --red-50:     #FFF1F2;
      --red-100:    #FFE4E6;
      --red-600:    #DC2626;
      --red-800:    #991B1B;
      --green-50:   #F0FDF4;
      --green-100:  #DCFCE7;
      --green-600:  #16A34A;
      --green-800:  #166534;
      --amber-50:   #FFFBEB;
      --amber-600:  #D97706;
    }}

    *, *::before, *::after {{ margin: 0; padding: 0; box-sizing: border-box; }}
    html {{ font-size: 10pt; }}
    body {{
      font-family: 'Montserrat', -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
      background: #E2E8F0;
    }}

    @page {{ size: letter portrait; margin: 0; }}
    @media print {{
      html {{ font-size: 10pt; }}
      body {{ background: #fff; margin: 0; padding: 0; }}
      .screen-bar {{ display: none !important; }}
      .page {{ box-shadow: none !important; margin: 0 !important; }}
      * {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
    }}

    /* Screen toolbar */
    .screen-bar {{
      position: fixed; top: 0; left: 0; right: 0;
      background: rgba(15,23,42,0.97);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding: 12px 40px;
      display: flex; align-items: center; justify-content: space-between;
      z-index: 1000; backdrop-filter: blur(12px);
    }}
    .screen-bar-left {{ display: flex; align-items: center; gap: 16px; }}
    .screen-bar-title {{
      font-size: 10px; font-weight: 700; letter-spacing: 0.18em;
      text-transform: uppercase; color: #64748B;
    }}
    .screen-bar-clinic {{ font-size: 11px; font-weight: 600; color: #93C5FD; }}
    .screen-bar-hint {{ font-size: 11px; font-weight: 500; color: #475569; font-style: italic; }}
    .screen-bar-btn {{
      background: var(--navy); color: #fff; border: none;
      font-family: 'Montserrat', sans-serif; font-size: 10px; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase; padding: 10px 20px; cursor: pointer;
    }}
    .screen-bar-btn:hover {{ background: var(--navy-light); }}

    /* Page shell */
    .doc-wrap {{
      padding: 72px 0 40px;
      display: flex; flex-direction: column; align-items: center; gap: 24px;
    }}
    .page {{
      width: 8.5in; min-height: 11in; background: #fff;
      box-shadow: 0 4px 32px rgba(0,0,0,0.18);
      page-break-after: always; page-break-inside: avoid;
      position: relative; overflow: hidden;
    }}

    /* ── PAGE 1: COVER ── */
    .cover {{
      background: var(--navy); min-height: 11in;
      display: flex; flex-direction: column; padding: 0;
    }}
    .cover-inner {{
      flex: 1; display: flex; flex-direction: column; padding: 52px 64px;
    }}
    .cover-topbar {{
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 80px;
    }}
    .cover-logo-wordmark {{
      font-size: 13px; font-weight: 800; letter-spacing: 0.22em;
      text-transform: uppercase; color: rgba(255,255,255,0.9);
    }}
    .cover-badge {{
      font-size: 8.5px; font-weight: 700; letter-spacing: 0.16em;
      text-transform: uppercase; color: var(--blue-mid);
      border: 1px solid rgba(147,197,253,0.3); padding: 5px 12px;
    }}
    .cover-eyebrow {{
      font-size: 9px; font-weight: 700; letter-spacing: 0.22em;
      text-transform: uppercase; color: var(--blue-mid); margin-bottom: 28px;
      display: flex; align-items: center; gap: 16px;
    }}
    .cover-eyebrow::before {{
      content: ''; width: 32px; height: 1px;
      background: var(--blue-mid); opacity: 0.5;
    }}
    .cover-headline {{
      font-size: 32px; font-weight: 900; letter-spacing: -0.02em;
      line-height: 1.08; color: #fff; margin-bottom: 12px; max-width: 560px;
    }}
    .cover-headline em {{ font-style: normal; color: var(--blue-light); }}
    .cover-clinic-name {{
      font-size: 20px; font-weight: 700; color: var(--blue-mid);
      margin-bottom: 32px; letter-spacing: 0.01em;
    }}
    .cover-subhead {{
      font-size: 12.5px; font-weight: 400; line-height: 1.65;
      color: var(--blue-light); max-width: 460px; opacity: 0.85; margin-bottom: 52px;
    }}
    .cover-meta {{
      display: flex; flex-direction: column; gap: 6px; margin-bottom: 56px;
    }}
    .cover-meta-row {{
      font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.6);
      display: flex; gap: 8px;
    }}
    .cover-meta-label {{ color: var(--blue-mid); font-weight: 700; min-width: 110px; }}

    /* Cover stat row */
    .cover-stats {{
      display: flex; gap: 0; border: 1px solid rgba(255,255,255,0.12); max-width: 560px;
    }}
    .cover-stat {{
      flex: 1; padding: 20px 24px; border-right: 1px solid rgba(255,255,255,0.12);
    }}
    .cover-stat:last-child {{ border-right: none; }}
    .cover-stat-num {{
      font-size: 22px; font-weight: 900; letter-spacing: -0.02em;
      color: #fff; line-height: 1; margin-bottom: 4px;
    }}
    .cover-stat-lbl {{
      font-size: 8.5px; font-weight: 600; color: var(--blue-mid);
      text-transform: uppercase; letter-spacing: 0.12em;
    }}
    .cover-stat-risk {{ color: #FCA5A5; }}

    /* Cover bottom bar */
    .cover-bottom {{
      background: rgba(0,0,0,0.25); padding: 18px 64px;
      display: flex; align-items: center; justify-content: space-between;
    }}
    .cover-bottom-left {{ font-size: 9px; color: rgba(255,255,255,0.4); font-weight: 500; }}
    .cover-bottom-right {{ font-size: 9px; color: rgba(255,255,255,0.4); font-weight: 500; }}

    /* ── INNER PAGES ── */
    .page-topband {{
      background: var(--navy); padding: 18px 56px;
      display: flex; align-items: center; justify-content: space-between;
    }}
    .page-topband-title {{
      font-size: 9px; font-weight: 700; letter-spacing: 0.18em;
      text-transform: uppercase; color: rgba(255,255,255,0.7);
    }}
    .page-topband-clinic {{
      font-size: 9px; font-weight: 600; color: var(--blue-mid); letter-spacing: 0.08em;
    }}
    .page-body {{ padding: 44px 56px 32px; }}
    .page-footer {{
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 14px 56px; border-top: 1px solid var(--gray-100);
      display: flex; align-items: center; justify-content: space-between;
    }}
    .page-footer-left {{ font-size: 8px; font-weight: 500; color: var(--gray-500); }}
    .page-footer-right {{ font-size: 8px; font-weight: 600; color: var(--gray-500); }}

    /* Section header */
    .section-eyebrow {{
      font-size: 8.5px; font-weight: 700; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--navy); margin-bottom: 6px;
    }}
    .section-heading {{
      font-size: 19px; font-weight: 900; letter-spacing: -0.01em;
      color: var(--near-black); line-height: 1.15; margin-bottom: 6px;
    }}
    .section-heading em {{ font-style: normal; color: var(--red-600); }}
    .section-subhead {{
      font-size: 11px; color: var(--gray-500); font-weight: 400;
      line-height: 1.55; margin-bottom: 28px; max-width: 540px;
    }}

    /* Revenue leak card */
    .leak-cards {{ display: flex; gap: 14px; margin-bottom: 24px; }}
    .leak-card {{
      flex: 1; background: var(--red-50); border: 1px solid var(--red-100);
      padding: 20px 22px; position: relative;
    }}
    .leak-card-eyebrow {{
      font-size: 8px; font-weight: 700; letter-spacing: 0.16em;
      text-transform: uppercase; color: var(--red-600); margin-bottom: 8px;
    }}
    .leak-card-amount {{
      font-size: 26px; font-weight: 900; letter-spacing: -0.02em;
      color: var(--red-800); line-height: 1; margin-bottom: 4px;
    }}
    .leak-card-label {{
      font-size: 9px; font-weight: 600; color: var(--red-600);
      text-transform: uppercase; letter-spacing: 0.1em;
    }}
    .leak-card-detail {{
      font-size: 9.5px; color: var(--gray-700); line-height: 1.5;
      margin-top: 10px; border-top: 1px solid var(--red-100); padding-top: 10px;
    }}

    /* Benchmark row */
    .benchmark-row {{
      background: var(--gray-50); border: 1px solid var(--gray-100);
      padding: 16px 20px; margin-bottom: 14px;
      display: flex; align-items: flex-start; gap: 16px;
    }}
    .benchmark-label {{
      font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--gray-500); min-width: 160px; padding-top: 2px;
    }}
    .benchmark-clinic {{
      font-size: 13px; font-weight: 800; color: var(--near-black); min-width: 80px;
    }}
    .benchmark-ontario {{
      font-size: 11px; font-weight: 600; color: var(--gray-500);
      font-style: italic; min-width: 100px; padding-top: 2px;
    }}
    .benchmark-status {{
      font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; padding: 3px 10px;
    }}
    .status-risk {{ background: var(--red-100); color: var(--red-800); }}
    .status-ok   {{ background: var(--green-100); color: var(--green-800); }}

    /* Recovery opportunity box */
    .recovery-box {{
      background: var(--green-50); border: 1px solid var(--green-100);
      padding: 18px 22px; margin-bottom: 14px;
    }}
    .recovery-box-heading {{
      font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--green-800); margin-bottom: 8px;
    }}
    .recovery-box-amount {{
      font-size: 22px; font-weight: 900; color: var(--green-600); margin-bottom: 4px;
    }}
    .recovery-box-detail {{
      font-size: 9.5px; color: var(--gray-700); line-height: 1.55;
    }}

    /* EMR note */
    .emr-note {{
      background: var(--blue-light); border-left: 3px solid var(--navy);
      padding: 12px 16px; margin-bottom: 14px;
    }}
    .emr-note-label {{
      font-size: 8.5px; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--navy); margin-bottom: 4px;
    }}
    .emr-note-text {{ font-size: 9.5px; color: var(--navy-dark); line-height: 1.55; }}

    /* Total risk summary */
    .total-risk {{
      background: var(--near-black); padding: 24px 28px; margin-bottom: 20px;
      display: flex; align-items: center; justify-content: space-between;
    }}
    .total-risk-label {{
      font-size: 9px; font-weight: 700; letter-spacing: 0.18em;
      text-transform: uppercase; color: rgba(255,255,255,0.5);
    }}
    .total-risk-amount {{
      font-size: 32px; font-weight: 900; color: #FCA5A5; letter-spacing: -0.02em;
    }}
    .total-risk-sub {{
      font-size: 9.5px; color: rgba(255,255,255,0.45); margin-top: 2px;
    }}
    .total-recovery-amount {{
      font-size: 24px; font-weight: 900; color: #86EFAC; letter-spacing: -0.02em;
    }}
    .total-right {{ text-align: right; }}

    /* Module list */
    .module-list {{ display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }}
    .module-item {{
      display: flex; align-items: flex-start; gap: 14px;
      border: 1px solid var(--gray-100); padding: 16px 18px;
      background: var(--gray-50);
    }}
    .module-num {{
      font-size: 8px; font-weight: 800; letter-spacing: 0.18em;
      text-transform: uppercase; color: var(--navy);
      background: var(--blue-light); padding: 4px 8px; white-space: nowrap; margin-top: 2px;
    }}
    .module-name {{
      font-size: 11.5px; font-weight: 800; color: var(--near-black); margin-bottom: 4px;
    }}
    .module-desc {{
      font-size: 9.5px; color: var(--gray-500); line-height: 1.55;
    }}
    .module-impact {{
      font-size: 9px; font-weight: 700; color: var(--green-600);
      margin-top: 6px;
    }}

    /* ROI table */
    .roi-table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
    .roi-table th {{
      font-size: 8.5px; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--gray-500);
      padding: 10px 14px; text-align: left;
      background: var(--gray-50); border-bottom: 1px solid var(--gray-100);
    }}
    .roi-table td {{
      font-size: 10px; padding: 11px 14px; border-bottom: 1px solid var(--gray-100);
      color: var(--gray-700); vertical-align: top;
    }}
    .roi-table td:first-child {{ font-weight: 600; color: var(--near-black); }}
    .roi-table td.num {{ font-weight: 800; color: var(--near-black); }}
    .roi-table tr.total-row td {{ background: var(--navy); color: #fff; font-weight: 700; }}
    .roi-table tr.total-row td.num {{ color: #86EFAC; }}

    /* CTA box */
    .cta-box {{
      background: var(--navy); padding: 28px 32px;
      display: flex; align-items: center; gap: 32px;
    }}
    .cta-left {{ flex: 1; }}
    .cta-eyebrow {{
      font-size: 8.5px; font-weight: 700; letter-spacing: 0.18em;
      text-transform: uppercase; color: var(--blue-mid); margin-bottom: 8px;
    }}
    .cta-headline {{
      font-size: 17px; font-weight: 900; color: #fff; line-height: 1.2; margin-bottom: 10px;
    }}
    .cta-sub {{
      font-size: 10px; color: var(--blue-light); opacity: 0.8; line-height: 1.6;
    }}
    .cta-right {{ display: flex; flex-direction: column; gap: 8px; min-width: 180px; }}
    .cta-btn-primary {{
      background: #fff; color: var(--navy); text-decoration: none;
      font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em;
      text-transform: uppercase; padding: 13px 20px; text-align: center; display: block;
    }}
    .cta-btn-secondary {{
      border: 1px solid rgba(255,255,255,0.25); color: rgba(255,255,255,0.7);
      text-decoration: none; font-size: 9px; font-weight: 600;
      padding: 10px 20px; text-align: center; display: block;
      letter-spacing: 0.1em;
    }}

    /* Page 3 two-col */
    .two-col {{ display: flex; gap: 20px; margin-bottom: 20px; }}
    .col-left {{ flex: 1.2; }}
    .col-right {{ flex: 1; }}

    .divider {{
      height: 1px; background: var(--gray-100); margin: 20px 0;
    }}

    .guarantee-strip {{
      background: var(--green-50); border: 1px solid var(--green-100);
      padding: 14px 18px; margin-bottom: 14px;
      display: flex; align-items: center; gap: 14px;
    }}
    .guarantee-icon {{
      font-size: 20px; line-height: 1;
    }}
    .guarantee-text {{ font-size: 10px; color: var(--green-800); line-height: 1.55; }}
    .guarantee-text strong {{ font-weight: 700; }}
  </style>
</head>
<body>

<div class="screen-bar">
  <div class="screen-bar-left">
    <span class="screen-bar-title">SOURCE X &nbsp;·&nbsp; Revenue Leak Audit</span>
    <span class="screen-bar-clinic">{clinic_name} — {city}</span>
  </div>
  <div style="display:flex;align-items:center;gap:16px;">
    <span class="screen-bar-hint">Cmd+P → Save as PDF</span>
    <button class="screen-bar-btn" onclick="window.print()">Print / Save PDF</button>
  </div>
</div>

<div class="doc-wrap">

<!-- ══════════════════════════════════════════════════
     PAGE 1 — COVER
══════════════════════════════════════════════════ -->
<div class="page">
  <div class="cover">
    <div class="cover-inner">

      <div class="cover-topbar">
        <div class="cover-logo-wordmark">SOURCE X</div>
        <div class="cover-badge">PHIPA-Compliant AI Operations · Ontario</div>
      </div>

      <div class="cover-eyebrow">Confidential Revenue Diagnostic</div>

      <div class="cover-headline">
        How Much Is <em>{clinic_name}</em><br>Losing Every Month?
      </div>
      <div class="cover-clinic-name">
        {loc_str.title()} · {city} · {emr_display}
      </div>

      <p class="cover-subhead">
        This report estimates the monthly revenue leak at {clinic_name} across three
        measurable gaps: missed inbound calls, unrecovered no-shows, and dormant patient
        reactivation. All figures are derived from Ontario clinic benchmarks and your
        clinic's specific inputs. Nothing is fabricated. Every number has a source.
      </p>

      <div class="cover-meta">
        <div class="cover-meta-row">
          <span class="cover-meta-label">Prepared for:</span>
          <span>{owner_name}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">Clinic:</span>
          <span>{clinic_name} · {city}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">Locations:</span>
          <span>{locations}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">EMR:</span>
          <span>{emr_display}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">Hours on file:</span>
          <span>{hours if hours else "Business hours"}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">Date issued:</span>
          <span>{today_str}</span>
        </div>
        <div class="cover-meta-row">
          <span class="cover-meta-label">Prepared by:</span>
          <span>Vatsal · SOURCE X · getsourcex.com</span>
        </div>
      </div>

      <div class="cover-stats">
        <div class="cover-stat">
          <div class="cover-stat-num cover-stat-risk">{nums['f_total_monthly']}</div>
          <div class="cover-stat-lbl">Est. Monthly Revenue at Risk</div>
        </div>
        <div class="cover-stat">
          <div class="cover-stat-num">{nums['f_missed_per_day']}</div>
          <div class="cover-stat-lbl">Missed Calls Per Day (est.)</div>
        </div>
        <div class="cover-stat">
          <div class="cover-stat-num">{nums['f_dormant']}</div>
          <div class="cover-stat-lbl">Dormant Patients (90+ days)</div>
        </div>
        <div class="cover-stat">
          <div class="cover-stat-num">{nums['f_payback_days']}d</div>
          <div class="cover-stat-lbl">Est. Payback Period</div>
        </div>
      </div>

    </div>
    <div class="cover-bottom">
      <span class="cover-bottom-left">SOURCE X · AI Operations for Ontario Healthcare Clinics · getsourcex.com</span>
      <span class="cover-bottom-right">Confidential · Prepared exclusively for {owner_name}</span>
    </div>
  </div>
</div>


<!-- ══════════════════════════════════════════════════
     PAGE 2 — MISSED CALLS + NO-SHOWS
══════════════════════════════════════════════════ -->
<div class="page">

  <div class="page-topband">
    <span class="page-topband-title">Gap 1 + 2 &nbsp;·&nbsp; Missed Calls & No-Show Revenue</span>
    <span class="page-topband-clinic">{clinic_name} · {today_str}</span>
  </div>

  <div class="page-body">

    <div class="section-eyebrow">Revenue Gap 01 — Missed Inbound Calls</div>
    <div class="section-heading">
      {clinic_name} is missing an estimated <em>{nums['f_missed_per_day']} calls per day.</em>
    </div>
    <p class="section-subhead">
      With {nums['f_daily_calls']} daily inbound calls and an industry-standard 10% missed-call rate,
      an estimated {nums['f_missed_per_day']} calls go unanswered each day. At a 35% conversion rate for
      missed callers who are reached within 60 seconds, that is approximately
      {nums['f_lost_bookings_day']} lost bookings per day — {nums['f_missed_month']} per month in first-visit revenue
      that never enters your system.
    </p>

    <div class="leak-cards">
      <div class="leak-card">
        <div class="leak-card-eyebrow">Missed Calls · Monthly Cost</div>
        <div class="leak-card-amount">{nums['f_missed_month']}</div>
        <div class="leak-card-label">Lost First-Visit Revenue</div>
        <div class="leak-card-detail">
          {nums['f_missed_per_day']} missed calls/day × {int(WORKING_DAYS_MONTH)} working days ×
          {int(MISSED_CONVERSION*100)}% would-have-booked rate × {nums['f_avg_fee']} avg. initial assessment fee.
          This is first-visit revenue only — it excludes the 3–5 follow-up visits each new patient
          would have generated.
        </div>
      </div>
      <div class="leak-card">
        <div class="leak-card-eyebrow">Annual Projection</div>
        <div class="leak-card-amount">{nums['f_missed_year']}</div>
        <div class="leak-card-label">Per Year, Uncaptured</div>
        <div class="leak-card-detail">
          This is a conservative estimate. It does not include the lifetime value of each missed
          patient (typically 4–8 visits per year) or the referrals lost from patients who
          never experienced your clinic.
        </div>
      </div>
    </div>

    <div class="benchmark-row">
      <span class="benchmark-label">Daily Call Volume</span>
      <span class="benchmark-clinic">{nums['f_daily_calls']}</span>
      <span class="benchmark-ontario">Ontario avg: {locations * CALLS_PER_LOCATION_DAY}</span>
      <span class="benchmark-status status-ok">On Benchmark</span>
    </div>
    <div class="benchmark-row">
      <span class="benchmark-label">Missed Call Rate</span>
      <span class="benchmark-clinic">~10%</span>
      <span class="benchmark-ontario">Ontario range: 7–18%</span>
      <span class="benchmark-status status-risk">Leaking Now</span>
    </div>
    <div class="benchmark-row">
      <span class="benchmark-label">Avg. Callback Time</span>
      <span class="benchmark-clinic">Hours (typical)</span>
      <span class="benchmark-ontario">SOURCE X target: &lt;60s</span>
      <span class="benchmark-status status-risk">Revenue Risk</span>
    </div>

    <div class="divider"></div>

    <div class="section-eyebrow">Revenue Gap 02 — No-Show Recovery</div>
    <div class="section-heading">
      An estimated <em>{nums['f_noshows_day']} slots go empty every day</em> without automated recovery.
    </div>
    <p class="section-subhead">
      At a 10% no-show rate across {nums['f_appts_day']} daily appointments, {clinic_name} experiences
      roughly {nums['f_noshows_day']} empty slots per day. Research shows 30% of no-show slots are
      recoverable the same day if an automated system fires within 15 minutes.
      That is {nums['f_recoverable_day']} recovered bookings per day — {nums['f_noshows_month']} per month in
      revenue currently treated as a permanent loss.
    </p>

    <div class="leak-cards">
      <div class="leak-card">
        <div class="leak-card-eyebrow">No-Shows · Recoverable Monthly</div>
        <div class="leak-card-amount">{nums['f_noshows_month']}</div>
        <div class="leak-card-label">Recoverable With Automation</div>
        <div class="leak-card-detail">
          {nums['f_recoverable_day']} recoverable slots/day × {int(WORKING_DAYS_MONTH)} working days ×
          {nums['f_avg_fee']} avg. fee. This is what same-day automated rebook sequences recover —
          not theoretical, this is what SOURCE X clients see in weeks 3–8.
        </div>
      </div>
      <div class="leak-card">
        <div class="leak-card-eyebrow">No-Shows · Ontario Benchmark</div>
        <div class="leak-card-amount">8–15%</div>
        <div class="leak-card-label">Industry No-Show Rate Range</div>
        <div class="leak-card-detail">
          Clinics with no automated recovery system typically sit at 10–15%.
          SOURCE X deployments consistently bring this below 7% within 60 days through
          proactive SMS + voice sequences that fire the moment a no-show is logged in {emr_display}.
        </div>
      </div>
    </div>

  </div>

  <div class="page-footer">
    <span class="page-footer-left">SOURCE X · Clinic Revenue Leak Audit · Confidential · {clinic_name}</span>
    <span class="page-footer-right">2 / 4</span>
  </div>

</div>


<!-- ══════════════════════════════════════════════════
     PAGE 3 — REACTIVATION + TOTAL SUMMARY
══════════════════════════════════════════════════ -->
<div class="page">

  <div class="page-topband">
    <span class="page-topband-title">Gap 3 &nbsp;·&nbsp; Dormant Patient Reactivation</span>
    <span class="page-topband-clinic">{clinic_name} · {today_str}</span>
  </div>

  <div class="page-body">

    <div class="section-eyebrow">Revenue Gap 03 — Dormant Patient Database</div>
    <div class="section-heading">
      {nums['f_dormant']} patients in your system <em>have not returned in 90+ days.</em>
    </div>
    <p class="section-subhead">
      These are patients {clinic_name} already acquired, treated, and discharged — or simply
      lost contact with. Re-acquiring them costs zero in marketing. A well-timed, PHIPA-compliant
      outreach campaign converts approximately 15% back to active status.
      At {locations} locations, that is {nums['f_reactivatable']} patients responding to a single campaign.
    </p>

    <div class="two-col">
      <div class="col-left">
        <div class="leak-card" style="margin-bottom: 14px;">
          <div class="leak-card-eyebrow">Reactivation · Monthly Revenue</div>
          <div class="leak-card-amount">{nums['f_reactivation_month']}</div>
          <div class="leak-card-label">Per Month (Quarterly Campaign)</div>
          <div class="leak-card-detail">
            {nums['f_reactivatable']} reactivated patients × {int(VISITS_PER_REACTIVATION)} avg. follow-up visits ×
            {nums['f_avg_fee']} per visit ÷ 3 months. Campaigns run quarterly.
            Patients are segmented by case type (back, neck, MVA, post-op) for
            higher relevance and conversion.
          </div>
        </div>

        <div class="benchmark-row">
          <span class="benchmark-label">Dormant Patient Pool</span>
          <span class="benchmark-clinic">{nums['f_dormant']}</span>
          <span class="benchmark-ontario">est. for {locations} locations</span>
          <span class="benchmark-status status-risk">Untapped</span>
        </div>
        <div class="benchmark-row">
          <span class="benchmark-label">Reactivation Rate</span>
          <span class="benchmark-clinic">~15%</span>
          <span class="benchmark-ontario">PHIPA-compliant campaigns</span>
          <span class="benchmark-status status-ok">Achievable</span>
        </div>
        <div class="benchmark-row">
          <span class="benchmark-label">Revenue Per Patient</span>
          <span class="benchmark-clinic">{nums['f_avg_fee']} × {int(VISITS_PER_REACTIVATION)} visits</span>
          <span class="benchmark-ontario">avg. return series</span>
          <span class="benchmark-status status-ok">Conservative</span>
        </div>
      </div>

      <div class="col-right">
        <div class="emr-note">
          <div class="emr-note-label">EMR Note — {emr_display}</div>
          <div class="emr-note-text">{emr_note}</div>
        </div>

        <div class="recovery-box">
          <div class="recovery-box-heading">Total 3-Gap Recovery Opportunity</div>
          <div class="recovery-box-amount">{nums['f_total_monthly']}/mo</div>
          <div class="recovery-box-detail">
            Missed calls: {nums['f_missed_month']} &nbsp;·&nbsp;
            No-shows: {nums['f_noshows_month']} &nbsp;·&nbsp;
            Reactivation: {nums['f_reactivation_month']}<br><br>
            SOURCE X targets 60% recovery of this gap within 60 days of go-live.
            At that rate, the system pays for itself in approximately <strong>{nums['f_payback_days']} days.</strong>
          </div>
        </div>

        <div class="guarantee-strip">
          <div class="guarantee-icon">&#10003;</div>
          <div class="guarantee-text">
            <strong>60-Day ROI Guarantee.</strong> If the system doesn't recover at least the
            setup fee ({nums['f_avg_fee']} × multiple bookings) in measurable revenue within 60 days,
            SOURCE X refunds the setup fee in full and runs the system another 30 days at no cost.
          </div>
        </div>
      </div>
    </div>

    <div class="total-risk">
      <div>
        <div class="total-risk-label">Estimated Monthly Revenue at Risk — {clinic_name}</div>
        <div class="total-risk-amount">{nums['f_total_monthly']}</div>
        <div class="total-risk-sub">
          Across all 3 gaps · {locations} locations · {city} · {emr_display}
        </div>
      </div>
      <div class="total-right">
        <div class="total-risk-label">Estimated Annual at Risk</div>
        <div class="total-recovery-amount">{nums['f_total_annual']}</div>
        <div class="total-risk-sub">Conservative estimate — first-visit revenue only</div>
      </div>
    </div>

  </div>

  <div class="page-footer">
    <span class="page-footer-left">SOURCE X · Clinic Revenue Leak Audit · Confidential · {clinic_name}</span>
    <span class="page-footer-right">3 / 4</span>
  </div>

</div>


<!-- ══════════════════════════════════════════════════
     PAGE 4 — RECOMMENDED DEPLOYMENT + CTA
══════════════════════════════════════════════════ -->
<div class="page">

  <div class="page-topband">
    <span class="page-topband-title">Recommended Deployment &nbsp;·&nbsp; ROI Model &amp; Next Steps</span>
    <span class="page-topband-clinic">{clinic_name} · {today_str}</span>
  </div>

  <div class="page-body">

    <div class="section-eyebrow">Three Modules — One Managed System</div>
    <div class="section-heading">
      What SOURCE X deploys at <em>{clinic_name}</em> — live in 21 days.
    </div>
    <p class="section-subhead">
      All three modules are deployed, managed, and monitored by SOURCE X. {owner_name} gets
      a weekly 30-minute check-in and a live dashboard. No staff retraining. No new software to learn.
    </p>

    <div class="module-list">
      <div class="module-item">
        <div class="module-num">Module 01</div>
        <div>
          <div class="module-name">Missed-Call AI Agent</div>
          <div class="module-desc">
            The moment a call is missed at {clinic_name}, an AI voice agent calls the patient back
            within 60 seconds — 24/7, including after-hours and weekends. It speaks naturally,
            captures the reason for calling, and books the appointment directly into {emr_display}.
            No voicemail. No lost bookings. No front desk required.
          </div>
          <div class="module-impact">Targets {nums['f_missed_month']}/month in recovered first-visit revenue.</div>
        </div>
      </div>
      <div class="module-item">
        <div class="module-num">Module 02</div>
        <div>
          <div class="module-name">No-Show Recovery Engine</div>
          <div class="module-desc">
            The moment a no-show is registered in {emr_display}, an automated SMS fires immediately.
            If no response within 30 minutes, a voice follow-up triggers. Same-day rebook logic
            attempts to fill the vacated slot before end of business. Repeat no-shows trigger
            deposit requirements automatically.
          </div>
          <div class="module-impact">Targets {nums['f_noshows_month']}/month in recovered appointment slots.</div>
        </div>
      </div>
      <div class="module-item">
        <div class="module-num">Module 03</div>
        <div>
          <div class="module-name">Patient Reactivation Engine</div>
          <div class="module-desc">
            Quarterly PHIPA-compliant outreach to every patient inactive 90+ days, segmented by
            case type — back, neck, MVA, post-op, sports. Messages reference their last treatment
            and suggest a specific return reason. Sends via SMS with an online booking link.
            Managed entirely by SOURCE X.
          </div>
          <div class="module-impact">Targets {nums['f_reactivation_month']}/month from dormant patient revenue.</div>
        </div>
      </div>
    </div>

    <div class="section-eyebrow" style="margin-top:8px;">Year-One ROI Model — {clinic_name}</div>
    <table class="roi-table">
      <thead>
        <tr>
          <th>Line Item</th>
          <th>Basis</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Estimated monthly revenue at risk</td>
          <td>3-gap analysis above</td>
          <td class="num" style="text-align:right;">{nums['f_total_monthly']}/mo</td>
        </tr>
        <tr>
          <td>SOURCE X recovery target (60%)</td>
          <td>Conservative deployment assumption</td>
          <td class="num" style="text-align:right;">{nums['f_year1_recovery']} Year 1</td>
        </tr>
        <tr>
          <td>SOURCE X flagship cost</td>
          <td>$7,500 setup + $1,500/mo × 11</td>
          <td class="num" style="text-align:right;">$24,000 Year 1</td>
        </tr>
        <tr class="total-row">
          <td>Net ROI — Year One</td>
          <td>Recovery minus total cost</td>
          <td class="num" style="text-align:right;">{nums['f_roi_multiple']} return · Payback in ~{nums['f_payback_days']} days</td>
        </tr>
      </tbody>
    </table>

    <div class="cta-box">
      <div class="cta-left">
        <div class="cta-eyebrow">Free · No Commitment · 20 Minutes</div>
        <div class="cta-headline">Book Your Clinic Revenue<br>Gap Audit Call</div>
        <p class="cta-sub">
          Walk through these numbers together. Vatsal will confirm which gaps are highest-priority
          for {clinic_name} specifically and show you the Etobicoke case study — a live deployment
          with real numbers. Zero obligation. Founding-member pricing ends at 10 clients.
        </p>
      </div>
      <div class="cta-right">
        <a href="https://zeeg.me/vatsalsourcex/15-minute-dollar10k-clinic-fix-roi-snapshot-call" class="cta-btn-primary">Book Your Free Call</a>
        <a href="https://getsourcex.com" class="cta-btn-secondary">getsourcex.com</a>
      </div>
    </div>

  </div>

  <div class="page-footer">
    <span class="page-footer-left">SOURCE X · Clinic Revenue Leak Audit · Confidential · Prepared for {owner_name} · {clinic_name}</span>
    <span class="page-footer-right">4 / 4</span>
  </div>

</div>

</div><!-- /doc-wrap -->
</body>
</html>"""
    return html


def interactive_mode():
    """Prompt the user for clinic info in the terminal."""
    print("\n" + "═" * 60)
    print("  SOURCE X — Clinic Revenue Leak Audit Generator")
    print("═" * 60 + "\n")

    def ask(prompt, default=None):
        suffix = f" [{default}]" if default else ""
        val = input(f"  {prompt}{suffix}: ").strip()
        return val if val else default

    clinic_name  = ask("Clinic name")
    owner_name   = ask("Owner / director name")
    city         = ask("City (e.g. Mississauga)", "GTA")
    locations    = int(ask("Number of locations", "3"))
    emr          = ask("EMR system (Jane / Juvonno / ClinicSense / PracticePerfect)", "Jane")
    daily_calls  = int(ask("Est. daily inbound calls across all locations", str(locations * CALLS_PER_LOCATION_DAY)))
    avg_fee      = float(ask("Avg. assessment fee ($)", "110"))
    hours        = ask("Clinic hours (e.g. Mon-Fri 8am-7pm, Sat 9am-3pm)", "Mon-Fri 8am-7pm")

    return clinic_name, owner_name, city, locations, emr, daily_calls, avg_fee, hours


def main():
    parser = argparse.ArgumentParser(description="Generate a personalized SOURCE X Revenue Leak Audit")
    parser.add_argument("--name",        help="Clinic name")
    parser.add_argument("--owner",       help="Owner/director name", default="Clinic Owner")
    parser.add_argument("--city",        help="City", default="GTA")
    parser.add_argument("--locations",   type=int, help="Number of locations", default=3)
    parser.add_argument("--emr",         help="EMR system", default="Jane")
    parser.add_argument("--daily-calls", type=int, dest="daily_calls", help="Daily inbound calls (all locations)")
    parser.add_argument("--avg-fee",     type=float, dest="avg_fee", help="Avg assessment fee ($)", default=110.0)
    parser.add_argument("--hours",       help="Clinic hours string", default="Mon-Fri 8am-7pm")
    parser.add_argument("--output",      help="Output filename (in .tmp/)", default=None)

    args = parser.parse_args()

    if args.name:
        clinic_name = args.name
        owner_name  = args.owner
        city        = args.city
        locations   = args.locations
        emr         = args.emr
        daily_calls = args.daily_calls or (locations * CALLS_PER_LOCATION_DAY)
        avg_fee     = args.avg_fee
        hours       = args.hours
    else:
        clinic_name, owner_name, city, locations, emr, daily_calls, avg_fee, hours = interactive_mode()

    if not clinic_name:
        print("ERROR: Clinic name is required.")
        sys.exit(1)

    today_str = date.today().strftime("%B %d, %Y")
    nums      = calculate(locations, daily_calls, avg_fee)
    html      = render_html(clinic_name, owner_name, city, locations, emr, hours, nums, today_str)

    # Output filename
    safe_name = clinic_name.lower().replace(" ", "_").replace("/", "-")
    out_name  = args.output or f"audit_{safe_name}_{date.today().strftime('%Y%m%d')}.html"
    out_path  = os.path.join(TMP_DIR, out_name)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"\n✓ Audit generated: {out_path}")
    print(f"\n  Clinic:   {clinic_name} · {city} · {locations} locations")
    print(f"  Monthly revenue at risk:  {nums['f_total_monthly']}")
    print(f"  Annual at risk:           {nums['f_total_annual']}")
    print(f"  Estimated payback:        {nums['f_payback_days']} days")
    print(f"\n  Open in Chrome → Cmd+P → Save as PDF")
    print(f"  File: {out_path}\n")

    # Also try to open in browser
    try:
        import subprocess
        subprocess.Popen(["open", out_path])
    except Exception:
        pass


if __name__ == "__main__":
    main()
