from playwright.sync_api import sync_playwright

def verify_time_up_once():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(permissions=["clipboard-write", "clipboard-read"])
        page = context.new_page()

        # Console logging
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))

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
            localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(token));
            localStorage.setItem('supabase.auth.token', JSON.stringify(token));
        """)

        page.route("**/auth/v1/user", lambda route: route.fulfill(
            status=200,
            body='{"id": "test-user-id", "email": "test@example.com", "aud": "authenticated", "role": "authenticated"}',
            headers={'content-type': 'application/json'}
        ))

        # Mock time up
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
        page.route("**/rest/v1/words*", lambda route: route.fulfill(status=200, body='[]'))

        print("Navigating to /play")
        page.goto("http://localhost:3000/play")

        try:
            print("Waiting for modal...")
            page.wait_for_selector("text=Time's Up!", timeout=5000)
            print("Modal appeared (1st time)")

            # Click Keep Playing button (use role to avoid text ambiguity)
            page.click("button:has-text('Keep Playing')")
            print("Clicked Keep Playing button")

            # Wait to ensure modal disappears
            page.wait_for_selector("text=Time's Up!", state="hidden", timeout=2000)
            print("Modal disappeared")

            # Interact with the board/input to trigger re-renders
            print("Typing in input...")
            page.fill("input[placeholder='enter word']", "TEST")

            # Check if modal reappears (should not)
            try:
                page.wait_for_selector("text=Time's Up!", timeout=2000)
                # If found, check if it's visible (the title in modal) vs text in panel
                # The text "Time's Up!" is in H2 of modal.
                # It is also in "Time’s Up! You can keep playing." in panel?
                # The H2 is "Time's Up!" exactly.
                # Let's check for the H2 specifically or the modal container.
                if page.is_visible("h2:has-text('Time\\'s Up!')"):
                    print("Error: Modal reappeared!")
                    page.screenshot(path="verification/error_reappeared.png")
                else:
                    print("Success: Modal did not reappear (text found but likely hidden or in panel).")
            except:
                print("Success: Modal text not found at all (or timeout).")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_debug.png")

        browser.close()

if __name__ == "__main__":
    verify_time_up_once()
