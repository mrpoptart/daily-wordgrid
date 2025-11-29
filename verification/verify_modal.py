
import json
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()

    # Mock authentication
    # This requires more complex mocking for Supabase, but for TimeUpModal UI we can try to inject state
    # However, since the modal depends on internal state, it's hard to trigger without full game flow.
    # Instead, we will mock the component rendering by modifying the page content or using React DevTools if available (not available here).

    # Actually, simpler approach:
    # We can try to simulate the time up condition by mocking the Date.

    page = context.new_page()

    # We need to mock Supabase auth session in localStorage
    with open('verification/mock_session.json', 'r') as f:
        session = f.read()

    # Inject session before navigation
    page.add_init_script(f"""
        window.localStorage.setItem('sb-reference-id-auth-token', '{session}');
    """)

    # Mock network requests to avoid errors
    page.route("**/auth/v1/user", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=session
    ))

    page.route("**/rest/v1/daily_boards*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({"board_started": "2023-01-01T00:00:00Z"}) # Old date so time is up
    ))

    page.route("**/rest/v1/words*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body="[]"
    ))

    # Go to play page
    page.goto("http://localhost:3000/play")

    # Wait for modal to appear (since we mocked start time as old)
    try:
        page.wait_for_selector("text=Time's Up!", timeout=10000)
        page.screenshot(path="verification/modal_visible.png")
        print("Modal visible")

        # Click Keep Playing
        page.get_by_role("button", name="Keep Playing").click()

        # Verify modal gone
        page.wait_for_selector("text=Time's Up!", state="hidden", timeout=5000)
        page.screenshot(path="verification/modal_gone.png")
        print("Modal gone")

        # Reload page
        page.reload()

        # Verify modal NOT visible (because localStorage should be set)
        # Wait a bit to ensure it would have appeared
        page.wait_for_timeout(3000)

        if page.is_visible("text=Time's Up!"):
             print("FAIL: Modal reappeared after reload")
             page.screenshot(path="verification/fail_reappeared.png")
        else:
             print("PASS: Modal did not reappear")
             page.screenshot(path="verification/success_no_modal.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
