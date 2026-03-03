import { FirebaseError } from "firebase/app";
import { getAuth, signInAnonymously, type User } from "firebase/auth";

import { getFirebaseApp } from "@/lib/firebase";

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export async function ensureAnonymousAuth(): Promise<User> {
  const auth = getFirebaseAuth();

  if (auth.currentUser) {
    return auth.currentUser;
  }

  try {
    const credential = await signInAnonymously(auth);
    return credential.user;
  } catch (caughtError) {
    if (
      caughtError instanceof FirebaseError &&
      (caughtError.code === "auth/operation-not-allowed" ||
        caughtError.code === "auth/admin-restricted-operation" ||
        caughtError.code === "auth/configuration-not-found")
    ) {
      throw new Error("Firebase Anonymous Auth is disabled. Enable it in Firebase Console > Authentication > Sign-in method.");
    }

    throw caughtError;
  }
}
