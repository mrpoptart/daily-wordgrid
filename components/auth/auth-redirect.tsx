"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase";

export function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const user = await getCurrentUser();
      if (user) {
        router.replace("/play");
      }
    };

    checkSession();
  }, [router]);

  return null;
}
