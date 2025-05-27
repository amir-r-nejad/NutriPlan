"use client";
import { User } from "firebase/auth";
import { onIdTokenChanged } from "../lib/firebase/auth";
import { useEffect } from "react";
import { setCookie, deleteCookie } from "cookies-next";


export function useUserSession(initialUser:User|null) {
  useEffect(() => {
    return onIdTokenChanged(async (user) => {
      if (user) {
        const idToken = await user.getIdToken();
        await setCookie("__session", idToken);
      } else {
        await deleteCookie("__session");
      }
      if (initialUser?.uid === user?.uid) {
        return;
      }
      window.location.reload();
    });
  }, [initialUser]);

  return initialUser;
}