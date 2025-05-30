"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "../lib/firebase/firebase";

export function useUser() {
  const [user, setUser] = useState<User|null>();

  useEffect(() => {
    return onAuthStateChanged(auth, (authUser) => {
      console.log(authUser)
      localStorage.setItem("user", JSON.stringify(authUser));
      setUser(authUser);
    });
  }, []);

  return user;
}