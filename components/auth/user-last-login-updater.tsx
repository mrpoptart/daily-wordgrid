"use client";

import { useEffect, useRef } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db, getCurrentUser } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/db-schema";

export function UserLastLoginUpdater() {
  const updatedRef = useRef(false);

  useEffect(() => {
    if (updatedRef.current) return;

    const updateLastLogin = async () => {
      const user = await getCurrentUser();
      if (user) {
        updatedRef.current = true;
        // Fire and forget (upsert on id)
        const ref = doc(db, COLLECTIONS.users, user.uid);
        getDoc(ref)
          .then((existing) =>
            setDoc(
              ref,
              existing.exists()
                ? { email: user.email, last_login: serverTimestamp() }
                : {
                    id: user.uid,
                    email: user.email,
                    full_name: user.displayName,
                    created_at: serverTimestamp(),
                    last_login: serverTimestamp(),
                  },
              { merge: true }
            )
          )
          .catch((error) => {
            console.error("Failed to update last login:", error);
            updatedRef.current = false; // Allow retry if failed? Maybe not to avoid loops.
          });
      }
    };

    updateLastLogin();
  }, []);

  return null;
}
