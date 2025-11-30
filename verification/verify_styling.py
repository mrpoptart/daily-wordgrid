
import os
import json
from playwright.sync_api import sync_playwright

def verify_play_page_styling():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Grant permissions for clipboard access
        context = browser.new_context(permissions=["clipboard-read", "clipboard-write"])
        page = context.new_page()

        # Mock Supabase Auth
        page.route("**/auth/v1/user", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "id": "test-user-id",
                "aud": "authenticated",
                "role": "authenticated",
                "email": "test@example.com",
                "app_metadata": {
                    "provider": "email",
                    "providers": ["email"]
                },
                "user_metadata": {},
                "created_at": "2023-01-01T00:00:00.000000Z",
                "updated_at": "2023-01-01T00:00:00.000000Z"
            })
        ))

        # Mock Supabase Session in LocalStorage
        session_data = {
            "access_token": "fake-access-token",
            "token_type": "bearer",
            "expires_in": 3600,
            "refresh_token": "fake-refresh-token",
            "user": {
                "id": "test-user-id",
                "aud": "authenticated",
                "role": "authenticated",
                "email": "test@example.com"
            }
        }

        # We need to set localStorage before navigation, but localStorage is domain-specific.
        # So we go to the domain first (it might redirect to login, but we'll inject and go back)
        page.goto("http://localhost:3000/login")

        page.evaluate(f"""() => {{
            localStorage.setItem('sb-reference-id-auth-token', '{json.dumps(session_data)}');
        }}""")

        # Mock Board Data/API if necessary.
        # The play page fetches board data server-side or via API.
        # Since we are running `npm start`, the real server logic runs.
        # However, it might fail to connect to real Supabase if env vars aren't set.
        # The memory says "Unit tests... mock next/navigation...".
        # But here we are running the built app.

        # Let's try navigating to /play. If it fails due to server error, we might see it in screenshot.
        page.goto("http://localhost:3000/play")

        # Wait for board to load
        try:
            page.wait_for_selector('[data-board-cell="true"]', timeout=10000)
        except:
            print("Board cells did not appear. Taking screenshot anyway to debug.")

        # Type a word to see highlights
        page.keyboard.type("TEAS")

        # Take screenshot
        screenshot_path = "/home/jules/verification/play_page_dark_mode.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_play_page_styling()
