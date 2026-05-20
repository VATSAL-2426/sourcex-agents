# MORNING BRIEFING — SOURCE X
**Completed overnight · May 20, 2026**
*Everything done, what you need to do today, exact commands to run*

---

## WHAT WAS BUILT TONIGHT

### 1. Lead Magnet Generator — `tools/generate_audit.py`
The most important thing I built. Takes a clinic's info → generates a personalized 4-page
HTML document with their real revenue leak numbers → you open in Chrome → Print → PDF → send.

**Run it right now as a test:**
```bash
cd "/Users/vatsa/Desktop/SOURCE X Agents "
python3 tools/generate_audit.py \
  --name "Propel Physiotherapy" \
  --owner "Kyle Whaley" \
  --city "Etobicoke" \
  --locations 3 \
  --emr "Jane" \
  --daily-calls 90 \
  --avg-fee 115
```
Output lands in `.tmp/` — open in Chrome and hit Cmd+P.

**Interactive mode (asks you questions):**
```bash
python3 tools/generate_audit.py
```

---

### 2. Cold Call + LinkedIn Scripts — `workflows/outreach_scripts.md`
Word-for-word. Open this file before every call session. It has:
- Opening line (the 90-second pitch using your clinic operator credibility)
- What to say when they say "send me an email"
- What to say when they ask price
- The objection that matters: "We need to think about it" — handled
- Voicemail script (15 seconds)
- LinkedIn sequence: connection request + Message 1 + 2 + 3
- Post-call email template
- Objection cheat sheet (8 objections, 8 responses)
- Daily call routine

---

### 3. Outreach Call Tracker — `tools/call_tracker.py`
Your personal CRM for cold outreach. Already loaded with all 42 qualified prospects.

**Start your day with:**
```bash
cd "/Users/vatsa/Desktop/SOURCE X Agents "
python3 tools/call_tracker.py today
```

**After every call:**
```bash
python3 tools/call_tracker.py log
```

**Pipeline overview:**
```bash
python3 tools/call_tracker.py pipeline
```

**Who needs a follow-up today:**
```bash
python3 tools/call_tracker.py followups
```

---

### 4. HTML Deliverables — Sharpened

**`clinic-one-pager.html`** — Fixed:
- Removed "Internal Use Only" badge (was killing trust with prospects)
- CTA now links directly to your booking calendar (zeeg.me)
- Added "Why SOURCE X" section with operator credibility, live case study, PHIPA fluency
- Fixed "45-minute" → actual "20-minute" audit call

**`clinic-pitch-deck.html`** — Fixed:
- CTA now links to booking calendar (was pointing to getsourcex.com only)

**`clinic-proposal-template.html`** — Good as-is (it's a close-stage document, links appropriately)

**`clinic-revenue-audit.html`** — Good as-is (already has the zeeg link)

---

### 5. LinkedIn Content — `workflows/linkedin_content_bank.md`
4 weeks of posts ready to copy-paste. 8 posts total + 4 engagement hooks.

**Post order:**
- Week 1, Post 1: Monday morning operator story (do this FIRST — establishes who you are)
- Week 1, Post 2: GTA clinic benchmark data
- Week 2, Post 1: PHIPA compliance breakdown (authority builder)
- Week 2, Post 2: No-show math story
- Week 3, Post 1: Etobicoke case study ← **FILL IN YOUR REAL NUMBERS before posting**
- Week 3, Post 2: The cost of waiting (fence-sitter reframe)
- Week 4, Post 1: PHIPA objection destroyer
- Week 4, Post 2: Newsletter audience builder

**Post Tuesday–Thursday, 8–10am ET.**

---

### 6. Newsletter Issue #1 — `workflows/newsletter_issue_01.md`
Ready to paste into Beehiiv. Subject line options included, preview text included.
Fill in your real Etobicoke numbers before sending (`[X]` placeholders).

---

### 7. Post-Audit Email Sequence — `workflows/email_follow_up_sequence.md`
4 emails for after you send the audit PDF:
- Email 1 (Day 0): Send with the PDF. Framing, no pitch.
- Email 2 (Day 3): Lifetime value angle.
- Email 3 (Day 7): Case study / dashboard numbers.
- Email 4 (Day 14): Last follow-up, scarcity, move to nurture.

---

### 8. Lead Capture Form — `clinic-audit-request.html`
The missing piece of the funnel. A prospect fills this out → you run `generate_audit.py`
with their info → send them a personalized PDF within 48 hours.

**To deploy this:** Upload to getsourcex.com (or share the file link in your LinkedIn bio
as a Google Drive link while the website isn't set up yet).

**To add a real form backend:** Sign up at formspree.io (free), create a form, replace
the `action="mailto:..."` with your Formspree URL. Takes 10 minutes.

---

## YOUR CURRENT PROSPECT STATUS

- **42 qualified prospects** in call_tracker (`verified` + `linkedin_checked`)
- 33 have a named decision maker and phone number
- 9 have clinic info but no owner name — need manual LinkedIn lookup (15 minutes)

**Top 10 to call first (highest confidence — named owner + phone):**
1. Propel Physiotherapy · Etobicoke · Kyle Whaley · 416-621-2506
2. Alpha Physio · Brampton · Parmeet Risum · 905-789-0123
3. Kick Physiotherapy · Vaughan · Carlo Di Nardo · 905-597-1667
4. 101 Physio · Vaughan · Diana Cardona · 905-597-1667
5. Alleviate Physiotherapy · Etobicoke · Bhavesh Dhoka · 416-613-8591
6. Proremedy Physiotherapy · Mississauga · Arpan Hundal · 905-796-4647
7. Simply Align Rehab · Scarborough · Nima Pardisnia · 416-438-3230
8. Stay Active Rehabilitation · North York · Alejandra Rodriguez · 416-634-0005
9. Curezone Physiotherapy · Mississauga · Immanuel Israel · 905-997-4333
10. KIROMEDICA Health Centre · North York · Edward Shin · 416-445-1564

---

## WHAT YOU NEED TO DO TODAY

### Priority 1 — Fill in your real Etobicoke numbers (30 minutes)
Before you post Week 3 on LinkedIn or send the case study email, you need the real numbers.
At minimum:
- How many calls per week were you missing before the AI agent? (rough is fine)
- How many are you missing now?
- How many first-visit bookings has the system recovered in the last 30 days?
- What's the approximate revenue from those recovered bookings?

Even rough estimates work. "We were missing ~20 calls/week, now it's under 5, recovered
about 12 bookings worth ~$1,380 in the first month" is a completely usable number.

### Priority 2 — Post the first LinkedIn post (20 minutes)
Open `workflows/linkedin_content_bank.md`, copy Week 1 Post 1 (the Monday morning story),
customize the call count to match your actual experience, post.

### Priority 3 — Do your first call session (90 minutes)
```bash
python3 tools/call_tracker.py today
```
Work through the list. Log every call. Aim for 25 dials.

### Priority 4 — Generate audit PDFs for anyone who books
After every audit request, run:
```bash
python3 tools/generate_audit.py --name "..." --owner "..." --city "..." --locations X --emr "..." --daily-calls X
```

### Priority 5 — Find owners for the 9 linkedin_checked clinics (15 minutes)
Search Google: `"[Clinic Name]" owner site:linkedin.com/in`
Update the tracker: `python3 tools/call_tracker.py add`

---

## THREE THINGS I NEED FROM YOU

**1. Your real Etobicoke numbers.** The case study is your strongest sales asset.
Even rough numbers are better than `[X]` placeholders.

**2. Confirm the booking link.** The zeeg.me link is baked into all the deliverables:
`https://zeeg.me/vatsalsourcex/15-minute-dollar10k-clinic-fix-roi-snapshot-call`
Test it right now. Make sure it still works and leads to the right calendar.

**3. Your LinkedIn handle** so I can check your profile and make sure the content
matches your existing tone (optional but useful before posting Week 1).

---

## FILES CREATED TONIGHT

```
tools/
  generate_audit.py      ← Lead magnet PDF generator ✓ NEW
  call_tracker.py        ← Outreach call tracker ✓ NEW

workflows/
  outreach_scripts.md    ← Cold call + LinkedIn scripts ✓ NEW
  linkedin_content_bank.md ← 4 weeks of posts ✓ NEW
  newsletter_issue_01.md ← Beehiiv-ready issue #1 ✓ NEW
  email_follow_up_sequence.md ← Post-audit 4-email sequence ✓ NEW
  prospect_ontario_clinics.md ← Existing (no changes needed)

clinic-one-pager.html    ← Sharpened (CTA, badge, credibility section) ✓
clinic-pitch-deck.html   ← Sharpened (CTA link fixed) ✓
clinic-audit-request.html ← Lead capture form ✓ NEW

.tmp/
  outreach.json          ← 42 prospects loaded from clinic tracker
  audit_peak_physio_20260520.html ← Test audit (delete if you want)
```

---

## THE SHORTEST PATH TO CLIENT #1

1. Call Kyle Whaley at Propel Physiotherapy (416-621-2506) today
2. Use the opening script in `workflows/outreach_scripts.md`
3. When he asks "what does it do?" — tell him you're missing calls, you built a system, it recovered X bookings in the first month
4. When he's interested — generate his audit: `python3 tools/generate_audit.py --name "Propel Physiotherapy" --owner "Kyle Whaley" --city "Etobicoke" --locations 3 --emr "Jane" --daily-calls 90`
5. Send him the PDF within 48 hours using Email 1 from `workflows/email_follow_up_sequence.md`
6. Follow up on Day 3, 7, 14
7. If he books a call — run through the CLOSER framework in the business plan, show the Etobicoke case study, present the offer

That's the shortest path. Everything else tonight was to make that path faster and more repeatable when you do it 42 more times.

---

*Built by Claude overnight. Questions or things to fix → just ask.*
