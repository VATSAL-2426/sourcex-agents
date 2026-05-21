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
LOGO_URL          = "https://sourcex-audit-server.onrender.com/static/sourcex-logo.png"
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

    # Derive appointments from call volume (calls convert ~65% to held appts),
    # capped at realistic per-location capacity of 35 chairs/day
    appts_per_loc = min(round((daily_calls / max(locations, 1)) * 0.65), 35)
    appts_day     = appts_per_loc * locations
    noshows_day   = round(appts_day * NO_SHOW_RATE, 1)
    recover_day   = round(noshows_day * NO_SHOW_RECOVERY, 1)
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
    <tr><td style="background:#1E3A8A;padding:20px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">
            <img src="{LOGO_URL}" alt="SOURCE X" width="52" height="52" style="display:block;border:0;outline:none;">
          </td>
          <td align="right" style="vertical-align:middle;font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.1em;text-transform:uppercase;">Complimentary · {today}</td>
        </tr>
      </table>
    </td></tr>

    <!-- HERO -->
    <tr><td style="background:#1e2f6a;padding:40px 40px 32px;">
      <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#93C5FD;">Complimentary Revenue Audit — Prepared for {owner}</p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:#FFFFFF;line-height:1.15;">Here's What We Found<br>When We Ran {clinic}'s Numbers.</h1>
      <p style="margin:0 0 24px;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.7;">
        {owner}, I ran your clinic profile — {locs} location{'s' if int(locs)>1 else ''} in {city}, running {emr} — through the same revenue model we use across every Ontario multi-location practice we work with. What came back is worth your full attention. Three gaps. Real numbers. Specific to you.
      </p>
      <!-- Top stat row -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.12);">
        <tr>
          <td align="center" style="padding:16px;border-right:1px solid rgba(255,255,255,0.12);">
            <div style="font-size:22px;font-weight:900;color:#FCA5A5;margin-bottom:4px;">{nums['total_month']}</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#93C5FD;">Left on the Table / Month</div>
          </td>
          <td align="center" style="padding:16px;border-right:1px solid rgba(255,255,255,0.12);">
            <div style="font-size:22px;font-weight:900;color:#FFFFFF;margin-bottom:4px;">{nums['total_year']}</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#93C5FD;">Annual Revenue Gap</div>
          </td>
          <td align="center" style="padding:16px;">
            <div style="font-size:22px;font-weight:900;color:#86EFAC;margin-bottom:4px;">3 Gaps</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#93C5FD;">Every one is fixable</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- GAP 1: MISSED CALLS -->
    <tr><td style="background:#FFFFFF;padding:32px 40px 24px;border-left:4px solid #DC2626;">
      <p style="margin:0 0 6px;font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#DC2626;">Revenue Gap 01 — Missed Inbound Calls</p>
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:900;color:#0F172A;line-height:1.2;">Most owners assume their front desk gets to every call.<br><span style="color:#DC2626;">The data says otherwise.</span></h2>
      <p style="margin:0 0 20px;font-size:12px;color:#475569;line-height:1.7;">
        At {nums['daily_calls']} daily inbound calls, Ontario clinics your size miss roughly <strong style="color:#0F172A;">{nums['missed_day']} calls every single day</strong> — that's not a front desk problem, it's a volume problem. Most of those callers don't leave voicemails. They Google the next clinic and book there. At a 35% booking rate for calls answered within 60 seconds, that's <strong style="color:#0F172A;">{nums['lost_bkgs_day']} lost appointments per day</strong> that never touch your {emr} system.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF1F2;border:1px solid #FFE4E6;">
        <tr>
          <td style="padding:16px 20px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#991B1B;margin-bottom:4px;">What This Gap Costs {clinic} Each Month</div>
            <div style="font-size:28px;font-weight:900;color:#991B1B;">{nums['missed_month']}</div>
            <div style="font-size:10px;color:#7F1D1D;margin-top:4px;">First-visit revenue only — doesn't count follow-up visits, referrals, or lifetime patient value</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="background:#FFFFFF;height:1px;padding:0 40px;"><div style="background:#F1F5F9;height:1px;"></div></td></tr>

    <!-- GAP 2: NO-SHOWS -->
    <tr><td style="background:#FFFFFF;padding:24px 40px;border-left:4px solid #D97706;">
      <p style="margin:0 0 6px;font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#D97706;">Revenue Gap 02 — No-Show Recovery</p>
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:900;color:#0F172A;line-height:1.2;">A no-show isn't just a missed appointment.<br><span style="color:#D97706;">It's a slot you already paid staff to cover.</span></h2>
      <p style="margin:0 0 20px;font-size:12px;color:#475569;line-height:1.7;">
        Across {nums['appts_day']} daily appointments, a standard 10% no-show rate means <strong style="color:#0F172A;">{nums['noshows_day']} chairs sit empty every day</strong>. The part most clinics don't know: 30% of those patients are reachable and willing to rebook — if you contact them within 15 minutes of their missed slot. Without automation, that window closes every time. With it, you recover <strong style="color:#0F172A;">{nums['recover_day']} appointments per day</strong> that would otherwise be written off.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FEF3C7;">
        <tr>
          <td style="padding:16px 20px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#92400E;margin-bottom:4px;">Recoverable Monthly — No-Shows</div>
            <div style="font-size:28px;font-weight:900;color:#92400E;">{nums['noshows_month']}</div>
            <div style="font-size:10px;color:#78350F;margin-top:4px;">Currently treated as permanent loss — recoverable with same-day automated outreach</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="background:#FFFFFF;height:1px;padding:0 40px;"><div style="background:#F1F5F9;height:1px;"></div></td></tr>

    <!-- GAP 3: REACTIVATION -->
    <tr><td style="background:#FFFFFF;padding:24px 40px 32px;border-left:4px solid #1E3A8A;">
      <p style="margin:0 0 6px;font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#1E3A8A;">Revenue Gap 03 — Dormant Patient Reactivation</p>
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:900;color:#0F172A;line-height:1.2;">You already did the hard work acquiring these patients.<br><span style="color:#1E3A8A;">Reactivating them costs almost nothing.</span></h2>
      <p style="margin:0 0 20px;font-size:12px;color:#475569;line-height:1.7;">
        <strong style="color:#0F172A;">{nums['dormant']} patients</strong> in your database haven't returned in 90+ days. They didn't leave because they were unhappy — life got busy, they forgot, nobody followed up. A PHIPA-compliant quarterly outreach sequence converts ~15% back to active in a single campaign — that's <strong style="color:#0F172A;">{nums['reactivatable']} patients per quarter</strong>, each averaging multiple return visits. This is the highest-margin revenue gap of the three because the acquisition cost is zero.
      </p>
      <!-- EMR note -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#DBEAFE;border-left:3px solid #1E3A8A;margin-bottom:20px;">
        <tr><td style="padding:14px 18px;">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#1E3A8A;margin-bottom:5px;">Your EMR — {emr}</div>
          <div style="font-size:11px;color:#1e2f6a;line-height:1.6;">{emr_note}</div>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border:1px solid #DBEAFE;">
        <tr>
          <td style="padding:16px 20px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1E3A8A;margin-bottom:4px;">Reactivation Revenue — Rolling Monthly</div>
            <div style="font-size:28px;font-weight:900;color:#1E3A8A;">{nums['reactiv_month']}</div>
            <div style="font-size:10px;color:#1e40af;margin-top:4px;">From patients already in your database — acquisition cost: zero</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- TOTAL SUMMARY -->
    <tr><td style="background:#0F172A;padding:32px 40px;">
      <div style="font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:10px;">Combined Monthly Revenue Gap — {clinic}</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:top;">
            <div style="font-size:36px;font-weight:900;color:#FCA5A5;line-height:1;">{nums['total_month']}<span style="font-size:16px;font-weight:600;color:rgba(255,255,255,0.4);margin-left:4px;">/month</span></div>
            <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:8px;line-height:1.6;">
              Missed calls {nums['missed_month']} &nbsp;·&nbsp; No-shows {nums['noshows_month']} &nbsp;·&nbsp; Reactivation {nums['reactiv_month']}
            </div>
          </td>
          <td align="right" style="padding-left:24px;vertical-align:top;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:6px;">Over 12 Months</div>
            <div style="font-size:24px;font-weight:900;color:#86EFAC;">{nums['total_year']}</div>
            <div style="font-size:9px;color:rgba(255,255,255,0.3);margin-top:4px;">Conservative baseline estimate</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- INSIGHT BAR -->
    <tr><td style="background:#F8FAFF;border:1px solid #E2E8F0;padding:24px 40px;">
      <p style="margin:0;font-size:12px;color:#334155;line-height:1.75;">
        <strong style="color:#1E3A8A;">{owner}, here's the honest truth:</strong> every clinic on this list is leaking revenue across these same three gaps. The ones closing the gap aren't working harder — they've automated the parts where patients fall through. This audit exists to show you exactly where that's happening at {clinic}, with your actual numbers. What you do with it is entirely up to you.
      </p>
    </td></tr>

    <!-- CTA -->
    <tr><td style="background:#1E3A8A;padding:40px 40px;">
      <p style="margin:0 0 8px;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#93C5FD;">Free · No Pitch · 20 Minutes</p>
      <h2 style="margin:0 0 14px;font-size:22px;font-weight:900;color:#FFFFFF;line-height:1.2;">Want to Walk Through<br>These Numbers Together?</h2>
      <p style="margin:0 0 28px;font-size:12px;color:rgba(255,255,255,0.72);line-height:1.75;">
        This audit runs the numbers. The 20-minute call is where we figure out which gap is costing {clinic} the most right now — and what closing it would actually look like given your specific setup, staff count, and how your {emr} workflows run today. No pitch. No deck. Just a clear picture of where the money is going and what it would take to stop it.
      </p>
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#FFFFFF;padding:15px 32px;">
            <a href="{BOOKING_LINK}" style="font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#1E3A8A;text-decoration:none;">Schedule Your Free 20-Minute Call →</a>
          </td>
        </tr>
      </table>
      <p style="margin:20px 0 0;font-size:10px;color:rgba(255,255,255,0.4);line-height:1.6;">No obligation. If it's not a fit, I'll tell you that in the first five minutes and you'll still leave with a clearer picture of your clinic's numbers.</p>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background:#0F172A;padding:20px 40px;">
      <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);line-height:1.7;">
        SOURCE X · AI Operations for Ontario Healthcare Clinics<br>
        {SOURCEX_SITE} · info@getsourcex.com<br>
        Prepared exclusively for {prospect['owner_name']} · {clinic} · {city}
      </p>
    </td></tr>

  </table>
</td></tr>
</table>

</body>
</html>"""

    plain = f"""Hi {owner},

Your complimentary revenue audit for {clinic} is ready. I ran your clinic profile through the same model we use across Ontario multi-location practices. Here's what the numbers showed.

─────────────────────────────────
COMBINED MONTHLY REVENUE GAP: {nums['total_month']}
Over 12 months: {nums['total_year']}
─────────────────────────────────

GAP 1 — MISSED INBOUND CALLS: {nums['missed_month']}/month

Most owners assume their front desk gets to every call. At {nums['daily_calls']} daily inbound calls, roughly {nums['missed_day']} go unanswered every day. Those callers don't leave voicemails — they book elsewhere. At a 35% conversion rate, that's {nums['lost_bkgs_day']} lost appointments per day that never touch your {emr} system. First-visit revenue only — doesn't count follow-ups or lifetime value.

GAP 2 — NO-SHOW RECOVERY: {nums['noshows_month']}/month

A no-show isn't just a missed appointment — it's a slot you already paid staff to cover. Across {nums['appts_day']} daily appointments, {nums['noshows_day']} chairs go dark every day. 30% are recoverable the same day if you reach the patient within 15 minutes. Without automation, that window closes every time. {nums['recover_day']} appointments per day — written off permanently.

GAP 3 — DORMANT PATIENT REACTIVATION: {nums['reactiv_month']}/month

{nums['dormant']} patients in your database haven't returned in 90+ days. They didn't leave unhappy — life got busy, nobody followed up. A PHIPA-compliant quarterly outreach campaign converts ~15% back to active — {nums['reactivatable']} patients per campaign. Acquisition cost: zero. This is the highest-margin gap of the three.

YOUR EMR ({emr}): {emr_note}

─────────────────────────────────

{owner}, every clinic on this list leaks revenue across these same three gaps. The ones closing it aren't working harder — they've automated the parts where patients fall through. This audit shows you exactly where that's happening at {clinic}.

If you want to walk through which gap is costing you the most right now, I set aside 20 minutes for that conversation. No pitch. No deck. Just your numbers and a clear picture of what fixing them would actually look like.

Schedule your free 20-minute call:
{BOOKING_LINK}

If it's not a fit, I'll tell you that in the first five minutes — and you'll still leave with a clearer picture of your clinic's numbers.

—
Vatsal | SOURCE X
{SOURCEX_SITE} · info@getsourcex.com
"""

    message = Mail(
        from_email=(FROM_EMAIL, FROM_NAME),
        to_emails=To(prospect["email"]),
        subject=f"Your complimentary audit is ready, {owner} — {clinic}",
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

    body = f"""New audit request — {clinic} ({city})

Owner: {prospect['owner_name']}
Email: {email}
Phone: {phone}
Locations: {locs} · EMR: {emr}
Notes: {notes}

Monthly revenue at risk: {nums['total_month']}
Annual projection: {nums['total_year']}

Audit sent automatically to {email}. Follow up in 3 days.
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
  <div style="margin-bottom:18px;"><img src="/static/sourcex-logo.png" alt="SOURCE X" style="width:72px;height:72px;object-fit:contain;display:inline-block;"></div>
  <div class="hero-logo">SOURCE X · AI Operations for Ontario Healthcare</div>
  <div class="hero-badge">Complimentary · No Commitment · Delivered in 24–48 Hours</div>
  <h1 class="hero-h1">How Much Is Your Clinic<br><em>Actually</em> Losing?</h1>
  <p class="hero-sub">Submit your clinic info. Within 24 to 48 hours you get a personalized revenue leak estimate — specific to your location count, EMR, and call volume. No pitch. Just numbers.</p>
  <div class="hero-stats">
    <div class="hero-stat"><div class="hs-num">$8K–$25K</div><div class="hs-lbl">Monthly leak estimate</div></div>
    <div class="hero-stat"><div class="hs-num">24–48 hrs</div><div class="hs-lbl">Delivered to your inbox</div></div>
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
        <div><label for="avg_fee">Avg. Appointment Fee ($) <span class="req">*</span></label><input type="number" id="avg_fee" placeholder="e.g. 110" min="60" max="350" required></div>
        <div class="ff"><label for="hours">Clinic Hours</label><input type="text" id="hours" placeholder="e.g. Mon–Fri 8am–7pm, Sat 9am–3pm"></div>
        <div class="ff"><label for="notes">Anything specific to focus on? (optional)</label><input type="text" id="notes" placeholder="e.g. missed calls are our biggest issue"></div>
      </div>

      <p class="privacy">Your clinic information is used only to build your personalized audit. Never shared or sold. PHIPA-aware handling throughout.</p>

      <button type="submit" class="submit-btn" id="submitBtn">Get My Free Revenue Leak Audit →</button>
      <p class="submit-note">Sent to your inbox within 24 to 48 hours · No pitch · No obligation</p>
      <p class="error-msg" id="errorMsg">Something went wrong. Please try again or email info@getsourcex.com directly.</p>
    </form>

    <div class="success" id="successState">
      <div class="success-title">Done — your audit is on its way.</div>
      <div class="success-text">You'll receive your personalized Revenue Leak Audit at the email you provided within 24 to 48 hours. No pitch inside it — just your numbers. Check your inbox (and spam folder just in case).</div>
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
      avg_fee:      document.getElementById('avg_fee').value,
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

        # Parse avg_fee from form; clamp to realistic Ontario range
        try:
            avg_fee = float(str(data.get("avg_fee", "") or "110").replace("$", "").replace(",", ""))
            avg_fee = max(60.0, min(350.0, avg_fee))
        except (ValueError, TypeError):
            avg_fee = 110.0

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
