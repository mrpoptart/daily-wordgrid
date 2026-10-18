"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await getCurrentUser();

        if (!user) {
          router.replace("/");
        } else {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        router.replace("/");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
