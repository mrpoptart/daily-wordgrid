from playwright.sync_api import sync_playwright

def verify_time_up_modal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(permissions=["clipboard-write", "clipboard-read"])
        page = context.new_page()

        # Console logging
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        # Mock auth and data
        page.add_init_script("""
            const token = {
                access_token: 'fake-token',
                refresh_token: 'fake-refresh-token',
                expires_in: 3600,
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                token_type: 'bearer',
                user: { id: 'test-user-id', email: 'test@example.com', aud: 'authenticated' }
            };
            // Try potential keys
            localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(token));
            localStorage.setItem('supabase.auth.token', JSON.stringify(token));
        """)

        # Mock Supabase requests
        page.route("**/auth/v1/user", lambda route: route.fulfill(
            status=200,
            body='{"id": "test-user-id", "email": "test@example.com", "aud": "authenticated", "role": "authenticated"}',
            headers={'content-type': 'application/json'}
        ))

        import datetime
        ten_mins_ago = (datetime.datetime.utcnow() - datetime.timedelta(minutes=10)).isoformat() + "Z"

        def handle_daily_boards(route):
            print("Intercepted daily_boards request")
            route.fulfill(
                status=200,
                body=f'{{ "board_started": "{ten_mins_ago}" }}',
                headers={'content-type': 'application/json'}
            )

        page.route("**/rest/v1/daily_boards*", handle_daily_boards)

        page.route("**/rest/v1/words*", lambda route: route.fulfill(
            status=200,
            body='[]',
            headers={'content-type': 'application/json'}
        ))

        page.goto("http://localhost:3000/play")

        try:
            print("Waiting for modal...")
            page.wait_for_selector("text=Time's Up!", timeout=5000)
            print("Modal appeared")
            page.screenshot(path="verification/time_up_modal.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_debug.png")

        browser.close()

if __name__ == "__main__":
    verify_time_up_modal()
