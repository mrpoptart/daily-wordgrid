
import os
from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # Inject mock auth token to bypass login
        # We need to set this before navigating
        context.add_init_script("""
            localStorage.setItem('sb-access-token', 'mock-token');
            localStorage.setItem('sb-refresh-token', 'mock-refresh-token');
        """)

        page = context.new_page()

        # Mock Supabase Auth User endpoint
        page.route("**/auth/v1/user", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"id": "test-user-id", "email": "test@example.com", "app_metadata": {}, "user_metadata": {}, "aud": "authenticated", "created_at": "2023-01-01T00:00:00.000000Z"}'
        ))

        # Mock Daily Board endpoint
        page.route("**/rest/v1/daily_boards*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"board_started": null}'
        ))

        # Mock Words endpoint
        page.route("**/rest/v1/words*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='[]'
        ))

        print("Navigating to /play...")
        page.goto("http://localhost:3000/play")

        # Wait for board to load
        try:
            page.wait_for_selector("[data-board-cell='true']", timeout=10000)
            print("Board loaded.")
        except:
            print("Board did not load in time. Taking screenshot anyway.")

        # Check for "Word" label (should NOT exist)
        try:
            label = page.get_by_text("Word", exact=True)
            if label.is_visible():
                print("FAILURE: 'Word' label is still visible!")
            else:
                print("SUCCESS: 'Word' label is not visible.")
        except:
            print("SUCCESS: 'Word' label not found.")

        # Take screenshot
        screenshot_path = "verification/play_page_layout.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_changes()
