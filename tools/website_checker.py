#!/usr/bin/env python3
"""
website_checker.py — ICP analysis for Ontario clinic websites.
Fetches a clinic's website and checks location count, AI signals, phone, and chain status.

Usage:
  python3 tools/website_checker.py --url https://example.com
  python3 tools/website_checker.py --batch          # processes all 'raw' clinics with a website
"""

import json
import os
import re
import sys
import time
import argparse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing packages. Run: pip3 install requests beautifulsoup4 lxml")
    sys.exit(1)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "tools"))
from clinic_tracker import (
    load_clinics, save_clinics, update_clinic, mark_rejected,
    get_by_status, estimate_revenue
)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)

AI_SIGNAL_PHRASES = [
    "artificial intelligence", "ai-powered", "ai powered", "ai booking",
    "chatbot", "chat bot", "smart booking", "automated booking",
    "predictive", "machine learning", "virtual assistant",
    "intelligent scheduling", "ai receptionist", "automated receptionist",
    "ai intake", "automated intake",
]

LOCATION_SIGNALS = [
    "our locations", "our clinics", "find a clinic", "find a location",
    "all locations", "clinic locations", "multiple locations",
    "branches", "find us", "visit us",
]

CHAIN_NAMES = [
    "lifemark", "physiocare", "hhs ", "sunnybrook", "unity health",
    "trillium health", "runnymede", "st. michael", "osler health",
    "rouge valley", "st. joseph", "baycrest", "lakeridge", "michael garron",
    "william osler", "headwaters", "halton healthcare",
]

LOCATION_COUNT_REGEX = re.compile(
    r'\b(\d+)\s+(?:convenient\s+)?(?:location|clinic|branch|office|site)s?\b',
    re.IGNORECASE
)

PHONE_REGEX = re.compile(
    r'(?:\+1[-.\s]?)?'
    r'(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})'
)


def fetch_page(url: str, timeout: int = 10):
    headers = {"User-Agent": USER_AGENT, "Accept-Language": "en-CA,en;q=0.9"}
    try:
        resp = requests.get(url, headers=headers, timeout=timeout,
                            allow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        return soup, None
    except requests.exceptions.SSLError:
        try:
            resp = requests.get(url, headers=headers, timeout=timeout,
                                allow_redirects=True, verify=False)
            soup = BeautifulSoup(resp.text, "lxml")
            return soup, "ssl_warning"
        except Exception as e:
            return None, f"ssl_error: {e}"
    except requests.exceptions.Timeout:
        return None, "timeout"
    except requests.exceptions.ConnectionError:
        return None, "connection_error"
    except Exception as e:
        return None, str(e)


def count_locations(soup: BeautifulSoup, base_url: str) -> tuple:
    # Strategy 1: regex match "X locations" / "X clinics" in page text
    text = soup.get_text(" ", strip=True)
    matches = LOCATION_COUNT_REGEX.findall(text)
    if matches:
        counts = [int(m) for m in matches if 1 <= int(m) <= 20]
        if counts:
            return max(counts), "text_regex"

    # Strategy 2: count nav/footer links that look like individual location pages
    nav_footer = soup.find("nav") or soup.find("footer") or soup
    links = nav_footer.find_all("a", href=True)
    location_links = []
    for link in links:
        href = link.get("href", "").lower()
        text_lower = link.get_text(strip=True).lower()
        # Links that are city names or "location" sub-pages
        if any(sig in text_lower for sig in LOCATION_SIGNALS):
            location_links.append(href)
        elif re.search(r'/location|/clinic-\d|/branch', href):
            location_links.append(href)

    if len(location_links) >= 2:
        return len(location_links), "nav_links"

    # Strategy 3: look for location-signal text anywhere on page
    for sig in LOCATION_SIGNALS:
        if sig in text.lower():
            # Couldn't count exactly but there are multiple locations
            return 0, "signal_found_no_count"

    return 0, "not_found"


def detect_ai_signals(soup: BeautifulSoup) -> tuple:
    # Scan: title, meta description, headers, nav, footer, full text
    check_zones = []
    if soup.title:
        check_zones.append(soup.title.get_text())
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if meta_desc:
        check_zones.append(meta_desc.get("content", ""))
    for tag in soup.find_all(["h1", "h2", "h3", "nav", "footer", "header"]):
        check_zones.append(tag.get_text(" ", strip=True))
    check_zones.append(soup.get_text(" ", strip=True))

    full_text = " ".join(check_zones).lower()
    found = []
    for phrase in AI_SIGNAL_PHRASES:
        if phrase in full_text:
            found.append(phrase)

    return bool(found), list(set(found))


def find_phone(soup: BeautifulSoup):
    # Priority order: schema.org JSON-LD, header, footer, body
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, dict):
                phone = data.get("telephone") or data.get("phone")
                if phone:
                    return phone
            if isinstance(data, list):
                for item in data:
                    phone = item.get("telephone") or item.get("phone")
                    if phone:
                        return phone
        except Exception:
            pass

    for zone in [soup.find("header"), soup.find("footer"), soup]:
        if zone is None:
            continue
        text = zone.get_text(" ", strip=True)
        match = PHONE_REGEX.search(text)
        if match:
            raw = match.group(0)
            digits = re.sub(r'\D', '', raw)
            if len(digits) == 10:
                return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
            elif len(digits) == 11 and digits[0] == "1":
                d = digits[1:]
                return f"{d[:3]}-{d[3:6]}-{d[6:]}"
    return None


def detect_chain(soup: BeautifulSoup, clinic_name: str) -> bool:
    text = soup.get_text(" ", strip=True).lower()
    name_lower = clinic_name.lower()
    for chain in CHAIN_NAMES:
        if chain in name_lower or chain in text:
            return True
    return False


def check_website(url: str, clinic_name: str = "") -> dict:
    if not url:
        return {"url": url, "reachable": False, "error": "no_url", "pass_icp": False,
                "fail_reasons": ["no_url"]}

    # Normalize URL
    if not url.startswith("http"):
        url = "https://" + url

    soup, error = fetch_page(url)
    reachable = soup is not None

    if not reachable:
        return {
            "url": url, "reachable": False, "error": error,
            "location_count": 0, "location_method": "",
            "has_ai_signals": False, "ai_signal_matches": [],
            "phone": None, "is_chain": False,
            "pass_icp": False, "fail_reasons": ["website_unreachable"],
        }

    location_count, location_method = count_locations(soup, url)
    has_ai, ai_matches = detect_ai_signals(soup)
    phone = find_phone(soup)
    is_chain = detect_chain(soup, clinic_name)

    fail_reasons = []
    if has_ai:
        fail_reasons.append("ai_signals_detected")
    if is_chain:
        fail_reasons.append("chain_detected")
    if location_count == 1:
        fail_reasons.append("single_location")
    elif location_count > 6:
        fail_reasons.append("too_many_locations_for_icp")
    elif location_count == 0:
        fail_reasons.append("location_count_uncertain")  # not auto-fail

    # Pass if no hard failures (uncertain location count gets flagged but not failed)
    hard_fails = {"ai_signals_detected", "chain_detected", "single_location",
                  "too_many_locations_for_icp", "website_unreachable"}
    pass_icp = not any(r in hard_fails for r in fail_reasons)

    return {
        "url": url,
        "reachable": True,
        "error": error,
        "location_count": location_count,
        "location_method": location_method,
        "has_ai_signals": has_ai,
        "ai_signal_matches": ai_matches,
        "phone": phone,
        "is_chain": is_chain,
        "pass_icp": pass_icp,
        "fail_reasons": fail_reasons,
    }


def run_batch(verbose: bool = True):
    """Process all 'raw' clinics that have a website URL."""
    clinics_raw = get_by_status("raw")
    total = len(clinics_raw)
    passed, rejected, uncertain = 0, 0, 0

    print(f"\nProcessing {total} raw clinics...\n")

    for i, c in enumerate(clinics_raw, 1):
        cid = c["id"]
        name = c["clinic_name"]
        website = c.get("website", "")

        if not website:
            mark_rejected(cid, "no_website")
            if verbose:
                print(f"  [{i}/{total}] SKIP  {name} — no website")
            rejected += 1
            continue

        if verbose:
            print(f"  [{i}/{total}] CHECK {name} — {website}")

        result = check_website(website, name)

        # Apply revenue estimate
        rev_low, rev_high, rev_label = 0, 0, ""
        if result["location_count"] > 0:
            rev_low, rev_high, rev_label = estimate_revenue(result["location_count"])

        updates = {
            "location_count": result["location_count"],
            "location_method": result["location_method"],
            "has_ai_signals": result["has_ai_signals"],
            "ai_signal_matches": result["ai_signal_matches"],
            "phone_website": result["phone"] or "",
            "website_pass": result["pass_icp"],
            "revenue_estimate_low": rev_low,
            "revenue_estimate_high": rev_high,
            "revenue_estimate_label": rev_label,
            "status": "website_checked",
        }
        update_clinic(cid, updates)

        if not result["pass_icp"]:
            # Only hard-fail if not merely uncertain
            if "location_count_uncertain" not in result["fail_reasons"] or \
               len(result["fail_reasons"]) > 1:
                mark_rejected(cid, ", ".join(result["fail_reasons"]))
                rejected += 1
                if verbose:
                    print(f"          REJECT — {', '.join(result['fail_reasons'])}")
            else:
                # Uncertain location count — keep for manual review
                uncertain += 1
                if verbose:
                    print(f"          UNCERTAIN — location count unknown, flagged for manual review")
        else:
            passed += 1
            locs = result["location_count"]
            if verbose:
                print(f"          PASS   — {locs} locations, {rev_label}, phone: {result['phone']}")

        time.sleep(0.5)  # polite crawl delay

    print(f"\n── Batch complete ──")
    print(f"  Passed:    {passed}")
    print(f"  Uncertain: {uncertain}")
    print(f"  Rejected:  {rejected}")
    print(f"  Total:     {total}\n")


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Website ICP checker")
    parser.add_argument("--url", help="Single URL to check")
    parser.add_argument("--batch", action="store_true", help="Process all raw clinics")
    parser.add_argument("--quiet", action="store_true", help="Suppress verbose output")
    args = parser.parse_args()

    if args.url:
        result = check_website(args.url)
        print(json.dumps(result, indent=2))
    elif args.batch:
        run_batch(verbose=not args.quiet)
    else:
        parser.print_help()
