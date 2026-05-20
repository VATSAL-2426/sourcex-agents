#!/usr/bin/env python3
"""
audit_server.py — SOURCE X Automated Audit Server

Prospect fills out form → server calculates their numbers →
sends a personalized audit email automatically → done.

Local:  python3 tools/audit_server.py
Render: gunicorn tools.audit_server:app
"""

import os
import sys
import math
from datetime import date
from flask import Flask, request, jsonify, render_template_string
from dotenv import load_dotenv

# Load .env from project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

SENDGRID_API_KEY  = os.environ.get("SENDGRID_API_KEY", "")
FROM_EMAIL        = os.environ.get("FROM_EMAIL", "workwithsourcex@gmail.com")
FROM_NAME         = os.environ.get("FROM_NAME", "Vatsal | SOURCE X")
BOOKING_LINK      = "https://zeeg.me/vatsalsourcex/15-minute-dollar10k-clinic-fix-roi-snapshot-call"
SOURCEX_SITE      = "https://getsourcex.com"
NOTIFY_EMAIL      = os.environ.get("NOTIFY_EMAIL", FROM_EMAIL)

app = Flask(__name__)

# ─── Ontario Benchmarks ──────────────────────────────────────────────────────
MISSED_CALL_RATE         = 0.10
MISSED_CONVERSION        = 0.35
NO_SHOW_RATE             = 0.10
NO_SHOW_RECOVERY         = 0.30
DORMANT_PER_LOCATION     = 350
REACTIVATION_RATE        = 0.15
VISITS_PER_REACTIVATION  = 4
APPTS_PER_LOCATION_DAY   = 25
CALLS_PER_LOCATION_DAY   = 30
WORKING_DAYS_MONTH       = 22
SETUP_FEE                = 7500
MONTHLY_FEE              = 1500


def calculate(locations, daily_calls, avg_fee):
    missed_day    = daily_calls * MISSED_CALL_RATE
    lost_bkgs_day = missed_day * MISSED_CONVERSION
    missed_month  = lost_bkgs_day * WORKING_DAYS_MONTH * avg_fee

    appts_day     = locations * APPTS_PER_LOCATION_DAY
    noshows_day   = appts_day * NO_SHOW_RATE
    recover_day   = noshows_day * NO_SHOW_RECOVERY
    noshows_month = recover_day * WORKING_DAYS_MONTH * avg_fee

    dormant       = locations * DORMANT_PER_LOCATION
    reactivatable = math.floor(dormant * REACTIVATION_RATE)
    reactiv_month = (reactivatable * avg_fee * VISITS_PER_REACTIVATION) / 3

    total_month   = missed_month + noshows_month + reactiv_month
    year1_recover = total_month * 12 * 0.60
    year1_cost    = SETUP_FEE + (MONTHLY_FEE * 11)
    roi_multiple  = year1_recover / year1_cost
    payback_days  = math.ceil(SETUP_FEE / (total_month * 0.60 / 30))

    def fmt(n): return f"${n:,.0f}"

    return {
        "missed_month":    fmt(missed_month),
        "missed_day":      round(missed_day, 1),
        "lost_bkgs_day":   round(lost_bkgs_day, 1),
        "noshows_month":   fmt(noshows_month),
        "noshows_day":     round(noshows_day, 1),
        "recover_day":     round(recover_day, 1),
        "dormant":         f"{dormant:,}",
        "reactivatable":   reactivatable,
        "reactiv_month":   fmt(reactiv_month),
        "total_month":     fmt(total_month),
        "total_year":      fmt(total_month * 12),
        "year1_recover":   fmt(year1_recover),
        "roi_multiple":    f"{roi_multiple:.1f}x",
        "payback_days":    payback_days,
        "avg_fee":         fmt(avg_fee),
        "appts_day":       appts_day,
        "daily_calls":     daily_calls,
    }


def send_audit_email(prospect, nums):
    """Send the personalized audit email to the prospect via SendGrid."""
    if not SENDGRID_API_KEY:
        raise RuntimeError("SENDGRID_API_KEY not set in .env")

    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, To

    clinic  = prospect["clinic_name"]
    owner   = prospect["owner_name"].split()[0]  # first name
    emr     = prospect["emr"]
    city    = prospect["city"]
    locs    = prospect["locations"]
    today   = date.today().strftime("%B %d, %Y")

    emr_notes = {
        "Jane":           "Jane App has a native API — our integration is typically live within 5 business days.",
        "Juvonno":        "Juvonno's API is our most-deployed integration — pre-built connectors are ready to go.",
        "ClinicSense":    "ClinicSense supports webhook integration — setup typically under a week.",
        "PracticePerfect":"PracticePerfect's HL7 interface allows full EMR integration with audit trail logging.",
    }
    emr_note = emr_notes.get(emr, f"We've built integrations for most major Ontario EMRs and will confirm {emr} compatibility on our audit call.")

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px;">
<tr><td align="center">

  <!-- WRAPPER -->
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- HEADER -->
    <tr><td style="background:#1E3A8A;padding:28px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.9);">SOURCE X</td>
          <td align="right" style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.1em;text-transform:uppercase;">Confidential · {today}</td>
        </tr>
      </table>
    </td></tr>

    <!-- HERO -->
    <tr><td style="background:#1e2f6a;padding:40px 40px 32px;">
      <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#93C5FD;">Revenue Leak Audit — Prepared for {owner}</p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:#FFFFFF;line-height:1.15;">How Much Is {clinic}<br>Losing Every Month?</h1>
      <p style="margin:0 0 28px;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.65;">
        Based on your clinic profile — {locs} location{'s' if int(locs)>1 else ''} in {city}, running {emr} — here is your personalized revenue leak estimate across the three gaps every multi-location Ontario clinic has.
      </p>
      <!-- Top stat row -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.12);">
        <tr>
          <td align="center" style="padding:16px;border-right:1px solid rgba(255,255,255,0.12);">
            <div style="font-size:22px;font-weight:900;color:#FCA5A5;margin-bottom:4px;">{nums['total_month']}</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#93C5FD;">Monthly Revenue at Risk</div>
          </td>
          <td align="center" style="padding:16px;border-right:1px solid rgba(255,255,255,0.12);">
            <div style="font-size:22px;font-weight:900;color:#FFFFFF;margin-bottom:4px;">{nums['payback_days']}d</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#93C5FD;">Est. Payback Period</div>
          </td>
          <td align="center" style="padding:16px;">
            <div style="font-size:22px;font-weight:900;color:#FFFFFF;margin-bottom:4px;">{nums['roi_multiple']}</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#93C5FD;">Estimated Year-1 ROI</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- GAP 1: MISSED CALLS -->
    <tr><td style="background:#FFFFFF;padding:32px 40px 24px;border-left:4px solid #DC2626;">
      <p style="margin:0 0 6px;font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#DC2626;">Revenue Gap 01 — Missed Inbound Calls</p>
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:900;color:#0F172A;line-height:1.2;">{clinic} is missing an estimated <span style="color:#DC2626;">{nums['missed_day']} calls per day.</span></h2>
      <p style="margin:0 0 20px;font-size:12px;color:#475569;line-height:1.65;">
        With {nums['daily_calls']} daily inbound calls at a 10% missed-call rate, approximately {nums['missed_day']} calls go unanswered each day.
        At a 35% conversion rate for callers reached within 60 seconds, that is {nums['lost_bkgs_day']} lost bookings per day
        — <strong style="color:#0F172A;">{nums['missed_month']} per month</strong> in first-visit revenue that never enters your system.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF1F2;border:1px solid #FFE4E6;">
        <tr>
          <td style="padding:16px 20px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#991B1B;margin-bottom:4px;">Missed Calls · Monthly Cost</div>
            <div style="font-size:28px;font-weight:900;color:#991B1B;">{nums['missed_month']}</div>
            <div style="font-size:10px;color:#7F1D1D;margin-top:4px;">First-visit revenue only — excludes follow-up visits and referrals</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="background:#FFFFFF;height:1px;padding:0 40px;"><div style="background:#F1F5F9;height:1px;"></div></td></tr>

    <!-- GAP 2: NO-SHOWS -->
    <tr><td style="background:#FFFFFF;padding:24px 40px;border-left:4px solid #D97706;">
      <p style="margin:0 0 6px;font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#D97706;">Revenue Gap 02 — No-Show Recovery</p>
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:900;color:#0F172A;line-height:1.2;">An estimated <span style="color:#D97706;">{nums['noshows_day']} slots go empty</span> every day without automated recovery.</h2>
      <p style="margin:0 0 20px;font-size:12px;color:#475569;line-height:1.65;">
        At a 10% no-show rate across {nums['appts_day']} daily appointments, {nums['noshows_day']} slots are lost each day.
        Research shows 30% are recoverable the same day with automation that fires within 15 minutes of registration.
        That is {nums['recover_day']} recovered slots per day — <strong style="color:#0F172A;">{nums['noshows_month']} per month</strong> currently treated as permanent loss.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FEF3C7;">
        <tr>
          <td style="padding:16px 20px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#92400E;margin-bottom:4px;">No-Shows · Recoverable Monthly</div>
            <div style="font-size:28px;font-weight:900;color:#92400E;">{nums['noshows_month']}</div>
            <div style="font-size:10px;color:#78350F;margin-top:4px;">With same-day automated SMS + voice rebook sequences</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="background:#FFFFFF;height:1px;padding:0 40px;"><div style="background:#F1F5F9;height:1px;"></div></td></tr>

    <!-- GAP 3: REACTIVATION -->
    <tr><td style="background:#FFFFFF;padding:24px 40px 32px;border-left:4px solid #1E3A8A;">
      <p style="margin:0 0 6px;font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#1E3A8A;">Revenue Gap 03 — Dormant Patient Reactivation</p>
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:900;color:#0F172A;line-height:1.2;"><span style="color:#1E3A8A;">{nums['dormant']} patients</span> in your database haven't returned in 90+ days.</h2>
      <p style="margin:0 0 20px;font-size:12px;color:#475569;line-height:1.65;">
        These are patients {clinic} already acquired and treated. Re-acquiring them costs nothing.
        A PHIPA-compliant quarterly outreach campaign converts ~15% back to active — that is {nums['reactivatable']} patients per campaign,
        worth <strong style="color:#0F172A;">{nums['reactiv_month']} per month</strong> on a rolling basis.
      </p>
      <!-- EMR note -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#DBEAFE;border-left:3px solid #1E3A8A;margin-bottom:16px;">
        <tr><td style="padding:12px 16px;">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#1E3A8A;margin-bottom:4px;">EMR Note — {emr}</div>
          <div style="font-size:10px;color:#1e2f6a;line-height:1.55;">{emr_note}</div>
        </td></tr>
      </table>
    </td></tr>

    <!-- TOTAL SUMMARY -->
    <tr><td style="background:#0F172A;padding:28px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">Total Monthly Revenue at Risk — {clinic}</div>
            <div style="font-size:32px;font-weight:900;color:#FCA5A5;">{nums['total_month']}/month</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;">
              Missed calls {nums['missed_month']} &nbsp;·&nbsp; No-shows {nums['noshows_month']} &nbsp;·&nbsp; Reactivation {nums['reactiv_month']}
            </div>
          </td>
          <td align="right" style="padding-left:20px;">
            <div style="font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">Annual Projection</div>
            <div style="font-size:22px;font-weight:900;color:#86EFAC;">{nums['total_year']}/year</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;">Conservative estimate</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- GUARANTEE -->
    <tr><td style="background:#F0FDF4;padding:20px 40px;border:1px solid #DCFCE7;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:18px;color:#16A34A;padding-right:12px;vertical-align:top;">✓</td>
          <td style="font-size:11px;color:#166534;line-height:1.6;">
            <strong>60-Day ROI Guarantee.</strong> If the system doesn't recover at least the $7,500 setup fee in measurable booked revenue within 60 days of go-live, SOURCE X refunds the setup fee in full and runs the system another 30 days at no cost.
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- CTA -->
    <tr><td style="background:#1E3A8A;padding:36px 40px;">
      <p style="margin:0 0 6px;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#93C5FD;">Free · No Commitment · 20 Minutes</p>
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:900;color:#FFFFFF;line-height:1.2;">Book Your Clinic Revenue Gap Audit Call</h2>
      <p style="margin:0 0 24px;font-size:12px;color:rgba(255,255,255,0.7);line-height:1.65;">
        Walk through these numbers together. Vatsal will confirm which gaps are highest-priority for {clinic} specifically and show you the Etobicoke case study — a live deployment with real numbers. Zero obligation. Founding-member pricing ends at 10 clients.
      </p>
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#FFFFFF;padding:14px 28px;">
            <a href="{BOOKING_LINK}" style="font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#1E3A8A;text-decoration:none;">Book Your Free Audit Call →</a>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background:#0F172A;padding:20px 40px;">
      <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);line-height:1.7;">
        SOURCE X · AI Operations for Ontario Healthcare Clinics<br>
        {SOURCEX_SITE} · workwithsourcex@gmail.com<br>
        Confidential — Prepared exclusively for {prospect['owner_name']} · {clinic}<br>
        <br>
        Founding-member pricing ($7,500 setup + $1,500/mo) locked for first 10 clinics only.
      </p>
    </td></tr>

  </table>
</td></tr>
</table>

</body>
</html>"""

    plain = f"""SOURCE X — Revenue Leak Audit for {clinic}
Prepared for: {prospect['owner_name']} | {today}

SUMMARY
Monthly revenue at risk: {nums['total_month']}
Annual projection: {nums['total_year']}
Estimated payback: {nums['payback_days']} days

GAP 1 — MISSED CALLS: {nums['missed_month']}/month
{nums['missed_day']} missed calls/day × {WORKING_DAYS_MONTH} working days × 35% conversion × {nums['avg_fee']} avg fee

GAP 2 — NO-SHOW RECOVERY: {nums['noshows_month']}/month
{nums['recover_day']} recoverable slots/day with same-day automated rebook

GAP 3 — DORMANT PATIENTS: {nums['reactiv_month']}/month
{nums['dormant']} patients inactive 90+ days · {nums['reactivatable']} reactivatable per campaign

EMR NOTE ({emr}): {emr_note}

60-DAY ROI GUARANTEE
If the system doesn't recover at least $7,500 in measurable booked revenue within 60 days, full refund + 30 days free.

BOOK YOUR FREE AUDIT CALL (20 min, no obligation):
{BOOKING_LINK}

—
Vatsal | SOURCE X
{SOURCEX_SITE} | workwithsourcex@gmail.com
"""

    message = Mail(
        from_email=(FROM_EMAIL, FROM_NAME),
        to_emails=To(prospect["email"]),
        subject=f"Your Revenue Leak Audit — {clinic} ({city})",
        plain_text_content=plain,
        html_content=html,
    )

    sg = SendGridAPIClient(SENDGRID_API_KEY)
    sg.send(message)


def send_owner_notification(prospect, nums):
    """Notify Vatsal that a new audit was submitted and sent."""
    if not SENDGRID_API_KEY:
        return

    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, To

    clinic = prospect["clinic_name"]
    city   = prospect["city"]
    locs   = prospect["locations"]
    emr    = prospect["emr"]
    email  = prospect["email"]
    phone  = prospect.get("phone", "not provided")
    calls  = prospect.get("daily_calls", "not provided")
    notes  = prospect.get("notes", "none")

    body = f"""NEW AUDIT REQUEST — SOURCE X
==============================

Clinic:    {clinic}
Owner:     {prospect['owner_name']}
Email:     {email}
Phone:     {phone}
City:      {city}
Locations: {locs}
EMR:       {emr}
Calls/day: {calls}
Notes:     {notes}

AUDIT NUMBERS SENT:
  Monthly risk:   {nums['total_month']}
  Annual:         {nums['total_year']}
  Payback:        {nums['payback_days']} days

Audit email sent automatically to {email}.
Follow up in 3 days with email_follow_up_sequence.md — Email 2.

Add to call tracker:
  python3 tools/call_tracker.py add
"""

    message = Mail(
        from_email=(FROM_EMAIL, FROM_NAME),
        to_emails=To(NOTIFY_EMAIL),
        subject=f"New Audit Request — {clinic} ({city}, {locs} loc, {emr})",
        plain_text_content=body,
    )

    sg = SendGridAPIClient(SENDGRID_API_KEY)
    sg.send(message)


# ─── HTML for the form page ──────────────────────────────────────────────────

FORM_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SOURCE X — Free Clinic Revenue Leak Audit</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { --navy:#1E3A8A; --navy-dark:#1e2f6a; --near-black:#0F172A; --blue-light:#DBEAFE; --blue-mid:#93C5FD; --gray-100:#F1F5F9; --gray-300:#CBD5E1; --gray-500:#64748B; --red-600:#DC2626; --green-600:#16A34A; }
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Montserrat',sans-serif;-webkit-font-smoothing:antialiased;background:#E2E8F0;min-height:100vh;}
    .hero{background:var(--navy);padding:56px 24px 48px;text-align:center;}
    .hero-logo{font-size:11px;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:28px;}
    .hero-badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--blue-mid);border:1px solid rgba(147,197,253,0.3);padding:6px 16px;margin-bottom:24px;}
    .hero-h1{font-size:clamp(24px,4vw,38px);font-weight:900;letter-spacing:-0.02em;line-height:1.1;color:#fff;max-width:580px;margin:0 auto 16px;}
    .hero-h1 em{font-style:normal;color:var(--blue-light);}
    .hero-sub{font-size:13px;color:rgba(255,255,255,0.65);line-height:1.7;max-width:460px;margin:0 auto 36px;}
    .hero-stats{display:flex;justify-content:center;border:1px solid rgba(255,255,255,0.12);max-width:500px;margin:0 auto;}
    .hero-stat{flex:1;padding:14px 16px;border-right:1px solid rgba(255,255,255,0.12);}
    .hero-stat:last-child{border-right:none;}
    .hs-num{font-size:18px;font-weight:900;color:#fff;margin-bottom:2px;}
    .hs-lbl{font-size:8px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--blue-mid);}
    .form-wrap{max-width:600px;margin:-28px auto 56px;padding:0 16px;}
    .form-card{background:#fff;box-shadow:0 8px 40px rgba(0,0,0,0.12);padding:40px 40px 36px;}
    @media(max-width:560px){.form-card{padding:28px 20px;} .hero-stats{flex-direction:column;} .hero-stat{border-right:none;border-bottom:1px solid rgba(255,255,255,0.12);} .hero-stat:last-child{border-bottom:none;}}
    .form-title{font-size:15px;font-weight:800;color:var(--near-black);letter-spacing:-0.01em;margin-bottom:6px;}
    .form-sub{font-size:11px;color:var(--gray-500);line-height:1.6;margin-bottom:28px;}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
    @media(max-width:480px){.form-grid{grid-template-columns:1fr;}}
    .ff{grid-column:1/-1;}
    label{display:block;font-size:9.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--navy);margin-bottom:6px;}
    label .req{color:var(--red-600);}
    input,select{width:100%;padding:10px 12px;border:1px solid var(--gray-300);font-family:'Montserrat',sans-serif;font-size:12px;font-weight:500;color:var(--near-black);background:#fff;outline:none;-webkit-appearance:none;appearance:none;transition:border-color 0.15s;}
    input:focus,select:focus{border-color:var(--navy);}
    select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px;cursor:pointer;}
    .privacy{font-size:9.5px;color:var(--gray-500);line-height:1.6;margin:12px 0 18px;}
    .submit-btn{width:100%;background:var(--navy);color:#fff;border:none;padding:15px 24px;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;cursor:pointer;transition:background 0.15s;}
    .submit-btn:hover{background:#2d4fa3;}
    .submit-btn:disabled{background:#94a3b8;cursor:not-allowed;}
    .submit-note{font-size:10px;color:var(--gray-500);text-align:center;margin-top:10px;line-height:1.6;}
    .success{display:none;background:#F0FDF4;border:1px solid #16A34A;padding:24px 28px;margin-top:20px;}
    .success-title{font-size:14px;font-weight:800;color:var(--green-600);margin-bottom:6px;}
    .success-text{font-size:12px;color:#166534;line-height:1.6;}
    .error-msg{color:var(--red-600);font-size:11px;text-align:center;margin-top:10px;display:none;}
  </style>
</head>
<body>

<div class="hero">
  <div class="hero-logo">SOURCE X · AI Operations for Ontario Healthcare</div>
  <div class="hero-badge">Free · No Commitment · Delivered in 48 Hours</div>
  <h1 class="hero-h1">How Much Is Your Clinic<br><em>Actually</em> Losing?</h1>
  <p class="hero-sub">Submit your clinic info. Within 48 hours you get a personalized revenue leak estimate — specific to your location count, EMR, and call volume. No pitch. Just numbers.</p>
  <div class="hero-stats">
    <div class="hero-stat"><div class="hs-num">$8K–$25K</div><div class="hs-lbl">Monthly leak estimate</div></div>
    <div class="hero-stat"><div class="hs-num">48 hrs</div><div class="hs-lbl">Delivered to your inbox</div></div>
    <div class="hero-stat"><div class="hs-num">0</div><div class="hs-lbl">Obligation or pitch</div></div>
  </div>
</div>

<div class="form-wrap">
  <div class="form-card">
    <div class="form-title">Request Your Free Revenue Leak Audit</div>
    <p class="form-sub">Two minutes. Five questions. You'll receive a personalized 4-section report showing exactly where your clinic is losing revenue and what it would take to stop it.</p>

    <form id="auditForm">
      <div class="form-grid">
        <div><label for="clinic_name">Clinic Name <span class="req">*</span></label><input type="text" id="clinic_name" placeholder="e.g. Peak Physio" required></div>
        <div><label for="owner_name">Your Name <span class="req">*</span></label><input type="text" id="owner_name" placeholder="First and last name" required></div>
        <div><label for="email">Email <span class="req">*</span></label><input type="email" id="email" placeholder="you@clinic.com" required></div>
        <div><label for="phone">Phone (optional)</label><input type="tel" id="phone" placeholder="416-555-0100"></div>
        <div><label for="city">City <span class="req">*</span></label><input type="text" id="city" placeholder="e.g. Mississauga" required></div>
        <div><label for="locations">Locations <span class="req">*</span></label>
          <select id="locations" required>
            <option value="">Select...</option>
            <option value="2">2 locations</option>
            <option value="3">3 locations</option>
            <option value="4">4 locations</option>
            <option value="5">5 locations</option>
            <option value="6">6 locations</option>
          </select>
        </div>
        <div><label for="emr">EMR System <span class="req">*</span></label>
          <select id="emr" required>
            <option value="">Select...</option>
            <option value="Jane">Jane App</option>
            <option value="Juvonno">Juvonno</option>
            <option value="ClinicSense">ClinicSense</option>
            <option value="PracticePerfect">PracticePerfect</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div><label for="daily_calls">Est. Daily Inbound Calls</label>
          <select id="daily_calls">
            <option value="">Not sure</option>
            <option value="35">Under 40</option>
            <option value="50">40–60</option>
            <option value="70">60–80</option>
            <option value="90">80–100</option>
            <option value="120">100+</option>
          </select>
        </div>
        <div class="ff"><label for="hours">Clinic Hours</label><input type="text" id="hours" placeholder="e.g. Mon–Fri 8am–7pm, Sat 9am–3pm"></div>
        <div class="ff"><label for="notes">Anything specific to focus on? (optional)</label><input type="text" id="notes" placeholder="e.g. missed calls are our biggest issue"></div>
      </div>

      <p class="privacy">Your clinic information is used only to build your personalized audit. Never shared or sold. PHIPA-aware handling throughout.</p>

      <button type="submit" class="submit-btn" id="submitBtn">Get My Free Revenue Leak Audit →</button>
      <p class="submit-note">Sent to your inbox within 48 hours · No pitch · No obligation</p>
      <p class="error-msg" id="errorMsg">Something went wrong. Please try again or email workwithsourcex@gmail.com directly.</p>
    </form>

    <div class="success" id="successState">
      <div class="success-title">Done — your audit is on its way.</div>
      <div class="success-text">You'll receive your personalized Revenue Leak Audit at the email you provided within 48 hours. No pitch inside it — just your numbers. Check your inbox (and spam folder just in case).</div>
    </div>
  </div>
</div>

<script>
  document.getElementById('auditForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = document.getElementById('submitBtn');
    var err = document.getElementById('errorMsg');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    err.style.display = 'none';

    var payload = {
      clinic_name:  document.getElementById('clinic_name').value.trim(),
      owner_name:   document.getElementById('owner_name').value.trim(),
      email:        document.getElementById('email').value.trim(),
      phone:        document.getElementById('phone').value.trim(),
      city:         document.getElementById('city').value.trim(),
      locations:    document.getElementById('locations').value,
      emr:          document.getElementById('emr').value,
      daily_calls:  document.getElementById('daily_calls').value,
      hours:        document.getElementById('hours').value.trim(),
      notes:        document.getElementById('notes').value.trim(),
    };

    try {
      var res = await fetch('/submit', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      var data = await res.json();
      if (data.ok) {
        document.getElementById('auditForm').style.display = 'none';
        document.getElementById('successState').style.display = 'block';
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch(ex) {
      err.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Get My Free Revenue Leak Audit →';
    }
  });
</script>
</body>
</html>"""


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template_string(FORM_HTML)


@app.route("/submit", methods=["POST"])
def submit():
    try:
        data = request.get_json(force=True)

        # Required fields
        required = ["clinic_name", "owner_name", "email", "city", "locations", "emr"]
        for field in required:
            if not data.get(field):
                return jsonify({"ok": False, "error": f"Missing field: {field}"}), 400

        locations   = int(data["locations"])
        daily_calls = int(data.get("daily_calls") or str(locations * CALLS_PER_LOCATION_DAY))
        avg_fee     = 110.0  # Ontario benchmark default

        nums = calculate(locations, daily_calls, avg_fee)

        prospect = {
            "clinic_name": data["clinic_name"],
            "owner_name":  data["owner_name"],
            "email":       data["email"],
            "phone":       data.get("phone", ""),
            "city":        data["city"],
            "locations":   str(locations),
            "emr":         data["emr"],
            "daily_calls": daily_calls,
            "hours":       data.get("hours", ""),
            "notes":       data.get("notes", ""),
        }

        send_audit_email(prospect, nums)

        # Notify Vatsal (best-effort — don't fail the request if this errors)
        try:
            send_owner_notification(prospect, nums)
        except Exception:
            pass

        return jsonify({"ok": True})

    except RuntimeError as e:
        return jsonify({"ok": False, "error": str(e)}), 500
    except Exception as e:
        app.logger.error(f"Submit error: {e}")
        return jsonify({"ok": False, "error": "Internal server error"}), 500


@app.route("/health")
def health():
    return jsonify({"status": "ok", "sendgrid": bool(SENDGRID_API_KEY)})


# ─── Local run ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    if not SENDGRID_API_KEY:
        print("\n⚠️  WARNING: SENDGRID_API_KEY not set in .env — emails will fail.\n")
    print(f"\n✓ SOURCE X Audit Server running → http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=False)
