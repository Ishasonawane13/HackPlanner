import sys
import io

# Fix Windows console encoding for emojis
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright
import json
import time
import os
import re
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from bson import ObjectId
from dotenv import load_dotenv
import html

# Custom JSON encoder for MongoDB ObjectId and datetime
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

# Load environment variables
load_dotenv()

# Target URL for hackathons
TARGET_URL = 'https://unstop.com/hackathons?oppstatus=open&domain=2&course=6&specialization=Information%20Technology&usertype=students&passingOutYear=2027'

def extract_date_from_text(text):
    """Extract date from text containing 'days left' or similar patterns"""
    try:
        # Look for patterns like "11 days left", "23 days left", etc.
        days_match = re.search(r'(\d+)\s*days?\s*left', text, re.IGNORECASE)
        if days_match:
            days_left = int(days_match.group(1))
            deadline_date = datetime.now() + timedelta(days=days_left)
            return deadline_date.strftime('%Y-%m-%d')
        return None
    except:
        return None

def extract_prize_from_text(text):
    """Extract prize amount from text"""
    try:
        # Look for ₹ symbol followed by numbers
        prize_match = re.search(r'₹([\d,]+)', text)
        if prize_match:
            return f"₹{prize_match.group(1)}"
        return None
    except:
        return None

def extract_location_from_text(text):
    """Extract location/organizer from text"""
    try:
        # Common patterns for Indian institutions
        location_patterns = [
            r'([A-Za-z\s]+(?:University|Institute|College|IIT|NIT|IIIT)[A-Za-z\s,]*)',
            r'([A-Za-z\s]+,\s*[A-Za-z\s]+)',  # City, State pattern
        ]

        for pattern in location_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                location = match.group(1).strip()
                # Clean up common artifacts
                location = re.sub(r'\s+', ' ', location)
                return location
        
        return None
    except:
        return None

def extract_team_size(text):
    """Extract team size from text"""
    try:
        # Look for patterns like "Team size: 2-5", "Team of 3-4", etc.
        patterns = [
            r'team\s*size:?\s*(\d+)\s*-?\s*(\d+)?',
            r'(\d+)\s*-?\s*(\d+)?\s*members?',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                min_size = match.group(1)
                max_size = match.group(2) or match.group(1)
                return {"min": int(min_size), "max": int(max_size)}
        
        return {"min": 1, "max": 5}  # Default team size
    except:
        return {"min": 1, "max": 5}

def determine_hackathon_status(deadline_date, text):
    """Determine hackathon status from deadline and text"""
    try:
        if deadline_date:
            deadline = datetime.strptime(deadline_date, '%Y-%m-%d')
            if deadline < datetime.utcnow():
                return "closed"
            elif (deadline - datetime.utcnow()).days <= 7:
                return "closing_soon"
        
        if any(word in text.lower() for word in ['closed', 'ended', 'finished']):
            return "closed"
        
        return "upcoming"
    except (ValueError, TypeError) as e:
        return "upcoming"

def save_to_mongodb(hackathon_data):
    """Save scraped hackathon data to MongoDB with duplicate prevention"""
    client = None
    try:
        from bson import ObjectId
        mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
        
        # Validate URI
        if not mongodb_uri or not mongodb_uri.startswith('mongodb'):
            print("Invalid MongoDB URI")
            return 0
            
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        
        # Test connection
        client.admin.command('ping')
        
        db = client['hackplanner']
        collection = db['hackathons']
        
        inserted_count = 0
        updated_count = 0
        skipped_count = 0
        
        for hackathon in hackathon_data:
            try:
                # Sanitize title
                title = hackathon.get('title', '')
                if not title or len(title) > 500:
                    skipped_count += 1
                    continue

                # Build dedupe query: title + website when available
                query = {'title': title}
                website = hackathon.get('links', {}).get('website')
                if website:
                    # Validate URL
                    if website.startswith(('http://', 'https://')):
                        query['links.website'] = website

                now = datetime.utcnow()

                result = collection.update_one(
                    query,
                    {
                        '$set': {
                            **hackathon,
                            'updatedAt': now
                        },
                        '$setOnInsert': {
                            'createdAt': now
                        }
                    },
                    upsert=True
                )

                if result.upserted_id is not None:
                    inserted_count += 1
                    print(f" Inserted: {hackathon['title'][:50]}...")
                else:
                    updated_count += 1
                    print(f"Updated: {hackathon['title'][:50]}...")

            except Exception as e:
                print(f" Error: {str(e)[:80]}")
                skipped_count += 1
                continue
        
        print(f"\n Summary:")
        print(f"  Inserted: {inserted_count} new hackathons")
        print(f" Updated: {updated_count} existing hackathons")
        print(f"  Skipped: {skipped_count} due to errors")
        
        return inserted_count + updated_count
        
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        print("MongoDB connection error: Could not connect to database")
        return 0
    except ValueError as e:
        print(f"Configuration error: {str(e)}")
        return 0
    except Exception as e:
        print(f"Error saving to MongoDB: {type(e).__name__}")
        return 0
    finally:
        if client:
            try:
                client.close()
            except Exception:
                pass

def scrape_hackathons():
    """
    Scrape hackathon data from Unstop with improved card detection.
    """
    hackathon_data = []
    
    print("[INFO] Starting hackathon scraper...")
    
    try:
        with sync_playwright() as p:
            # Launch browser with improved stealth settings
            print("[INFO] Launching browser...")
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-gpu',
                    '--ignore-certificate-errors'
                ]
            )
            
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                locale='en-US',
                timezone_id='Asia/Kolkata',
                ignore_https_errors=True
            )
            
            # Set longer default timeout
            context.set_default_timeout(120000)
            
            page = context.new_page()
            
            # Navigate with retries
            print("[INFO] Navigating to Unstop...")
            max_nav_retries = 3
            nav_success = False
            
            for attempt in range(max_nav_retries):
                try:
                    print(f"[INFO] Connection attempt {attempt + 1}/{max_nav_retries}...")
                    page.goto('https://unstop.com/hackathons', wait_until="domcontentloaded", timeout=120000)
                    print("[OK] Page loaded, waiting for content to render...")
                    nav_success = True
                    time.sleep(5)
                    break
                except Exception as nav_error:
                    print(f"[WARN] Attempt {attempt + 1} failed: {str(nav_error)[:80]}")
                    if attempt < max_nav_retries - 1:
                        print("[INFO] Retrying in 5 seconds...")
                        time.sleep(5)
                    else:
                        print("[ERROR] All navigation attempts failed")
            
            if not nav_success:
                print("[ERROR] Could not connect to Unstop. Check your internet connection.")
                browser.close()
                return []
            
            # Take screenshot for debugging
            os.makedirs('data', exist_ok=True)
            try:
                page.screenshot(path='data/page_screenshot.png')
                print("[OK] Screenshot saved to data/page_screenshot.png")
            except:
                print("[WARN] Could not save screenshot")
            
            # Try multiple selectors for hackathon cards
            card_selectors = [
                # Unstop specific (confirmed working)
                '.trending_card',
                'div.trending_card',
                '[class*="trending_card"]',
                # Try these common Unstop selectors
                '[data-testid="competition-card"]',
                '.competition-tile',
                '.styles_competitionCard__aBcDe',
                '.styles_interactableCard__xYzAb',
                'a[href^="/competition/"]',
                'a[href*="competition"]',
                'a[href*="hackathon"]',
                'div[class*="card"]',
                'div[class*="competition"]',
                'div[class*="hackathon"]',
                '.search-result-item',
                '.listing-card',
            ]
            
            cards = None
            selected_selector = None
            
            # Try to find cards with multiple attempts
            max_retries = 3
            for retry in range(max_retries):
                if cards:
                    break
                    
                if retry > 0:
                    print(f"   Retry {retry}/{max_retries}...")
                    page.reload(wait_until="domcontentloaded", timeout=60000)
                    time.sleep(3)
                
                for selector in card_selectors:
                    try:
                        # Wait briefly for the selector
                        page.wait_for_selector(selector, timeout=3000)
                        found_cards = page.locator(selector)
                        count = found_cards.count()
                        
                        if count > 1:  # We want multiple cards, not just one
                            print(f"Found {count} cards with selector: '{selector}'")
                            cards = found_cards
                            selected_selector = selector
                            break
                    except Exception as e:
                        continue
            
            # If no selector found multiple cards, take the one with most cards
            if not cards:
                print("Trying fallback: Finding all potential containers...")
                
                # Get all divs and articles that might contain hackathons
                all_containers = page.locator('div, article, section')
                container_count = all_containers.count()
                print(f"   Found {container_count} total containers")
                
                # Evaluate each container to find those likely to be hackathon cards
                potential_cards = []
                for i in range(min(100, container_count)):
                    try:
                        container = all_containers.nth(i)
                        text = container.text_content().strip() if container.text_content() else ""
                        
                        # Check if this looks like a hackathon card
                        if len(text) > 50 and len(text) < 500:  # Reasonable length
                            if any(word in text.lower() for word in ['hackathon', 'competition', 'prize', 'deadline', 'register']):
                                potential_cards.append(container)
                    except:
                        continue
                
                if potential_cards:
                    print(f"   Found {len(potential_cards)} potential hackathon cards")
                    # Create a custom collection
                    cards = page.locator('[custom-hackathon-card]')
            else:
                print(f"Using selector: {selected_selector}")
            
            # Process cards
            if cards:
                count = cards.count()
                print(f" Processing {count} hackathon cards...")
                
                for i in range(count):
                    try:
                        card = cards.nth(i)
                        
                        # Scroll into view
                        card.scroll_into_view_if_needed()
                        time.sleep(0.1)
                        
                        # Get card content
                        card_text = card.text_content().strip() if card.text_content() else ""
                        
                        if not card_text or len(card_text) < 30:
                            continue
                        
                        # Extract title
                        title = "Unknown Hackathon"
                        title_selectors = [
                            'h3', 'h4', '.title', '.card-title', 
                            '[class*="title"]', '[class*="heading"]',
                            'strong', 'b'
                        ]
                        
                        for title_sel in title_selectors:
                            try:
                                title_elem = card.locator(title_sel).first
                                if title_elem.count() > 0:
                                    title_text = title_elem.text_content().strip()
                                    if title_text and len(title_text) > 3:
                                        title = title_text[:150]
                                        break
                            except:
                                continue
                        
                        # If no title found, use first line
                        if title == "Unknown Hackathon":
                            lines = [line.strip() for line in card_text.split('\n') if line.strip()]
                            if lines:
                                for line in lines:
                                    if len(line) > 10 and len(line) < 100:
                                        title = line[:100]
                                        break
                        
                        # Extract link
                        link = "https://unstop.com/hackathons"
                        try:
                            # Try to find a link in the card
                            if card.evaluate('el => el.tagName.toLowerCase()') == 'a':
                                href = card.get_attribute('href')
                                if href:
                                    link = f'https://unstop.com{href}' if href.startswith('/') else href
                            else:
                                # Look for any link inside
                                link_elem = card.locator('a').first
                                if link_elem.count() > 0:
                                    href = link_elem.get_attribute('href')
                                    if href:
                                        link = f'https://unstop.com{href}' if href.startswith('/') else href
                        except:
                            pass
                        
                        # Extract other information
                        prize = extract_prize_from_text(card_text)
                        deadline_date = extract_date_from_text(card_text)
                        location_text = extract_location_from_text(card_text)
                        team_size = extract_team_size(card_text)
                        status = determine_hackathon_status(deadline_date, card_text)
                        
                        # Calculate dates with proper fallbacks
                        if deadline_date:
                            reg_deadline = deadline_date
                            # Set start date 1 day after deadline
                            start = datetime.strptime(deadline_date, '%Y-%m-%d') + timedelta(days=1)
                            start_date = start.strftime('%Y-%m-%d')
                            # Set end date 3 days after start
                            end = start + timedelta(days=3)
                            end_date = end.strftime('%Y-%m-%d')
                        else:
                            # Default dates
                            reg_deadline = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
                            start_date = (datetime.now() + timedelta(days=31)).strftime('%Y-%m-%d')
                            end_date = (datetime.now() + timedelta(days=34)).strftime('%Y-%m-%d')
                        
                        # Determine category from card text
                        category = "Other"
                        categories_map = {
                            'ai': 'AI/ML', 'ml': 'AI/ML', 'machine learning': 'AI/ML',
                            'web': 'Web Development', 'frontend': 'Web Development', 'backend': 'Web Development',
                            'mobile': 'Mobile Development', 'app': 'Mobile Development', 'android': 'Mobile Development', 'ios': 'Mobile Development',
                            'blockchain': 'Blockchain', 'crypto': 'Blockchain',
                            'iot': 'IoT', 'hardware': 'IoT',
                            'game': 'Game Development', 'gaming': 'Game Development',
                            'data': 'Data Science', 'analytics': 'Data Science',
                            'cyber': 'Cybersecurity', 'security': 'Cybersecurity',
                            'design': 'Design', 'ui': 'Design', 'ux': 'Design'
                        }
                        
                        card_lower = card_text.lower()
                        for keyword, cat in categories_map.items():
                            if keyword in card_lower:
                                category = cat
                                break
                        
                        # Determine location type
                        location_type = "online"
                        if location_text:
                            loc_lower = location_text.lower()
                            if any(word in loc_lower for word in ['online', 'virtual', 'remote']):
                                location_type = "online"
                            else:
                                location_type = "offline"
                        
                        # Skip duplicates based on title similarity
                        is_duplicate = False
                        for existing in hackathon_data:
                            if existing['title'].lower() == title.lower():
                                is_duplicate = True
                                break
                        
                        if not is_duplicate:
                            hackathon_info = {
                                "title": title,
                                "description": f"Hackathon found on Unstop: {title}",
                                "organizer": "Unstop",
                                "category": category,
                                "difficulty": "Intermediate",  # Default difficulty
                                "startDate": start_date,
                                "endDate": end_date,
                                "registrationDeadline": reg_deadline,
                                "location": {
                                    "type": location_type,
                                    "venue": location_text or "Online Platform",
                                    "address": {
                                        "city": location_text or "Online",
                                        "state": "",
                                        "country": "India"
                                    }
                                },
                                "teamSize": team_size,
                                "status": status,
                                "links": {
                                    "website": link
                                },
                                "prizes": [{
                                    "position": "Winner",
                                    "amount": 0,
                                    "currency": "INR",
                                    "description": prize or "To be announced"
                                }] if prize else [],
                                "tags": [category, "Unstop"],
                                "featured": False,
                                "views": 0,
                                "source": "unstop",
                                "scraped_at": datetime.now().isoformat()
                            }
                            
                            hackathon_data.append(hackathon_info)
                            print(f" {len(hackathon_data)}. {title[:40]}...")
                        
                    except Exception as e:
                        print(f" Error with card {i+1}: {str(e)[:30]}")
                        continue
            
            browser.close()
            
            print(f"\n Scraped {len(hackathon_data)} unique hackathons!")
            return hackathon_data
            
    except Exception as e:
        print(f" Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

if __name__ == "__main__":
    print("=" * 60)
    print(" Unstop Hackathon Scraper - Enhanced Version")
    print("=" * 60)
    
    # Scrape hackathons
    hackathons = scrape_hackathons()
    
    # Save to MongoDB
    if hackathons:
        print("\n Saving to MongoDB...")
        inserted_count = save_to_mongodb(hackathons)
        print(f" Process complete! {inserted_count} hackathons saved.")
        
        # Also save to JSON file for backup
        os.makedirs('data', exist_ok=True)
        with open('data/scraped_hackathons.json', 'w', encoding='utf-8') as f:
            json.dump(hackathons, f, indent=2, ensure_ascii=False, cls=MongoJSONEncoder)
        print("Data also saved to data/scraped_hackathons.json")
    else:
        print("No hackathons were scraped.")
