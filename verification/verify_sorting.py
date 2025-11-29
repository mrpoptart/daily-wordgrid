
import json
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()

    # Mock authentication
    context.add_init_script("""
        localStorage.setItem('supabase.auth.token', JSON.stringify({
            currentSession: {
                access_token: 'mock-token',
                refresh_token: 'mock-refresh',
                user: { id: 'test-user', email: 'test@example.com' }
            },
            expiresAt: Math.floor(Date.now() / 1000) + 3600
        }));
    """)

    page = context.new_page()

    # Route requests
    page.route("**/auth/v1/user", lambda route: route.fulfill(
        status=200,
        body=json.dumps({"id": "test-user", "email": "test@example.com", "aud": "authenticated"})
    ))

    # Mock words to be out of order initially
    words_data = [
        {"word": "ZEBRA", "score": 10, "created_at": "2024-01-01T10:00:00Z"},
        {"word": "APPLE", "score": 5, "created_at": "2024-01-01T10:01:00Z"},
        {"word": "BANANA", "score": 8, "created_at": "2024-01-01T10:02:00Z"}
    ]

    # Mock words fetching
    def handle_words(route):
        route.fulfill(
            status=200,
            body=json.dumps(words_data)
        )

    page.route("**/rest/v1/words*", handle_words)

    # Mock daily_boards
    page.route("**/rest/v1/daily_boards*", lambda route: route.fulfill(
        status=200,
        body=json.dumps({"board_started": "2024-01-01T09:00:00Z"})
    ))

    # Navigate to play page
    try:
        page.goto("http://localhost:3000/play")

        # Wait for the list to appear
        page.wait_for_selector("text=Found Words", timeout=10000)

        # Take screenshot
        page.screenshot(path="verification/sorted_words.png")
        print("Screenshot saved to verification/sorted_words.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
