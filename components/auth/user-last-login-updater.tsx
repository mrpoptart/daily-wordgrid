"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export function UserLastLoginUpdater() {
  const updatedRef = useRef(false);

  useEffect(() => {
    if (updatedRef.current) return;

    const updateLastLogin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        updatedRef.current = true;
        // Fire and forget
        supabase
          .from("users")
          .upsert(
            {
              id: session.user.id,
              email: session.user.email,
              last_login: new Date().toISOString(),
            },
            { onConflict: "id" }
          )
          .select()
          .then(({ error }) => {
            if (error) {
              console.error("Failed to update last login:", error);
              updatedRef.current = false; // Allow retry if failed? Maybe not to avoid loops.
            }
          });
      }
    };

    updateLastLogin();
  }, []);

  return null;
}
