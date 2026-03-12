import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveBoardDate } from "@/lib/board/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Authenticate user from their access token
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ streak: 0 }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ streak: 0 }, { status: 401 });
  }

  // Get today's date in Eastern Time (the game's canonical timezone)
  const today = resolveBoardDate(null);

  // Fetch all completed days (elapsed_seconds >= 300) ordered by date descending
  const { data: completedDays, error } = await supabase
    .from("daily_boards")
    .select("board_date")
    .eq("user_id", user.id)
    .gte("elapsed_seconds", 300)
    .order("board_date", { ascending: false });

  if (error || !completedDays) {
    return NextResponse.json({ streak: 0 });
  }

  // Build a set for fast lookup
  const completedSet = new Set(completedDays.map((d: { board_date: string }) => d.board_date));

  // Count consecutive days backwards from today (or yesterday if today isn't done yet)
  let streak = 0;
  const current = new Date(today + "T12:00:00Z"); // noon UTC to avoid DST issues

  // If today is completed, start counting from today; otherwise from yesterday
  if (completedSet.has(today)) {
    streak = 1;
  } else {
    current.setDate(current.getDate() - 1);
    const yesterday = current.toISOString().slice(0, 10);
    if (completedSet.has(yesterday)) {
      streak = 1;
    } else {
      return NextResponse.json({ streak: 0 });
    }
  }

  // Count backwards from the day before the starting point
  while (true) {
    current.setDate(current.getDate() - 1);
    const dateStr = current.toISOString().slice(0, 10);
    if (completedSet.has(dateStr)) {
      streak++;
    } else {
      break;
    }
  }

  return NextResponse.json({ streak });
}
