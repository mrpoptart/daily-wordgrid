
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Go to play page (we forced modal to show)
    page.goto("http://localhost:3000/play")

    # Wait for modal
    try:
        page.wait_for_selector("text=Time's Up!", timeout=10000)
        page.screenshot(path="verification/modal_forced.png")
        print("Modal visible")

        # Check button types
        share_btn = page.locator("button:has-text('Share Score')")
        keep_playing_btn = page.locator("button:has-text('Keep Playing')")

        type_share = share_btn.get_attribute("type")
        type_keep = keep_playing_btn.get_attribute("type")

        print(f"Share Score button type: {type_share}")
        print(f"Keep Playing button type: {type_keep}")

        if type_share == "button" and type_keep == "button":
            print("PASS: Buttons have correct type")
        else:
            print(f"FAIL: Buttons have wrong types: {type_share}, {type_keep}")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error_forced.png")

    browser.close()

with sync_playwright() as p:
    run(p)
