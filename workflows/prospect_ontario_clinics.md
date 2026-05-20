# Workflow: Prospect Ontario Clinics (GTA)

**Objective:** Build a list of 50 verified physiotherapy/chiropractic clinic contacts in Ontario (GTA priority) for SOURCE X cold outreach. Each row must have a named decision maker.

**Resumption check (run this first every session):**
```bash
python3 tools/clinic_tracker.py summary
```

---

## Ideal Client Profile (ICP)

- Physio or chiro clinic in Ontario (GTA: Toronto, Etobicoke, Mississauga, Brampton, Scarborough, North York, Vaughan, Markham)
- 2–6 locations
- Revenue $500K–$3M/year (estimated: $350K–$600K per location)
- Single main phone number on website — NO chatbot, NO AI booking widget
- Named owner/director/ops manager findable on LinkedIn
- NOT: single-location sole practitioners, hospital-affiliated chains (Lifemark, Physiocare, etc.)

---

## Phase Checklist

### Phase 0 — Setup
- [x] Create `tools/`, `workflows/`, `.tmp/`
- [x] `requirements.txt` created
- [x] `tools/clinic_tracker.py` created
- [x] `tools/website_checker.py` created
- [ ] Python packages installed: `pip3 install -r requirements.txt`
- [x] `.tmp/clinics.json` initialized

### Phase 1 — Google Maps Scraping (Browser)
Search each term on maps.google.com. For each listing: collect name, address, phone, website URL.

**Search terms:**
1. `physiotherapy clinic Etobicoke`
2. `physio clinic Mississauga`
3. `physiotherapy Brampton`
4. `chiropractic clinic North York`
5. `physio clinic Scarborough`
6. `physiotherapy Vaughan`
7. `chiropractic Markham`
8. `multi-location physiotherapy Toronto`

**Fallback (if total raw < 60 after above 8):**
- `physiotherapy Richmond Hill`
- `chiropractic Thornhill`
- `physio clinic Ajax`
- `physiotherapy Pickering`

**Per term procedure:**
1. Navigate Chrome to `https://www.google.com/maps/search/[TERM]`
2. Wait for results to load, take screenshot
3. Read page accessibility tree (`read_page`)
4. Extract from each card: name, address, phone, website URL
5. Scroll down 3x to load more results
6. Add batch: `echo '[{...}]' | python3 tools/clinic_tracker.py add_batch`

**Immediate rejections:** Lifemark, Physiocare, HHS, Sunnybrook, Unity Health, Trillium, Osler → skip

### Phase 2 — Website ICP Check (Python)
```bash
python3 tools/website_checker.py --batch
```
Processes all `status=raw` clinics. Checks:
- Location count (2–6 = pass)
- AI signals (any = reject)
- Chain detection (any = reject)

For `location_count_uncertain` flagged clinics: manually visit website in Chrome and update:
```bash
python3 tools/clinic_tracker.py list website_checked
```

### Phase 3 — LinkedIn Decision Maker Lookup (Browser)
For each clinic with `website_pass=True`, search Google:
```
"[Clinic Name]" [City] owner site:linkedin.com/in
"[Clinic Name]" "clinic director" site:linkedin.com
"[Clinic Name]" "operations manager" site:linkedin.com/in
```
Extract name + title from Google result snippet (do NOT click through to LinkedIn).
Update record:
```bash
python3 tools/clinic_tracker.py list website_checked
# Then update via Python:
# from clinic_tracker import update_clinic, mark_verified
# update_clinic("ID", {"owner_name": "...", "owner_title": "...", "linkedin_url": "...", "linkedin_found": True, "status": "linkedin_checked"})
```

### Phase 4 — Google Sheet Export
```bash
python3 tools/clinic_tracker.py export verified
# Output: .tmp/clinics_verified.csv
```
Then: import CSV to Google Sheets via Chrome at sheets.new

**Sheet name:** `Ontario Clinic Prospects — SOURCE X — [DATE]`
**Share to:** workwithsourcex@gmail.com

### Phase 5 — Quality Check
Before declaring done, review every row. Ask: "Would I confidently call this person and say 'I help clinic owners like you recover $10K–$30K/month'?"

Remove rows where:
- `owner_name` is empty / "Not found"
- `location_count` uncertain AND revenue below ICP
- Any AI signals detected (should already be rejected)

**Done when:** `summary` shows ≥ 50 `verified` records.

---

## Edge Cases

| Situation | Action |
|-----------|--------|
| Website times out | Flag `website_unreachable`, manual visit in Phase 2B |
| Location count = 0 (uncertain) | Manual visit, check nav menu visually |
| No LinkedIn result after 3 queries | Set `linkedin_found=False`, note "manual review", deprioritize |
| Google Maps rate-limits | Pause 60s, resume |
| Google search rate-limits LinkedIn phase | `time.sleep(2)` between each search |
| Duplicate clinic across search terms | Deduped by `md5(name+city)[:12]`, search_terms field becomes a list |

---

## Column Schema (Google Sheet)

A: Clinic Name | B: City | C: Website | D: Phone | E: Location Count
F: Revenue Estimate | G: Has AI Signals | H: AI Signal Matches
I: Owner Name | J: Title | K: LinkedIn URL | L: ICP Pass
M: Rejection Reason | N: Search Terms | O: Notes
