
import { initializeApp, initializeServerApp } from "firebase/app";
import { cookies } from "next/headers";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "../../../lib/constants";

export async function getAuthenticatedAppForUser() {
  "use server";
  const authIdToken = (await cookies()).get("__session")?.value;

  // Firebase Server App is a new feature in the JS SDK that allows you to
  // instantiate the SDK with credentials retrieved from the client & has
  // other affordances for use in server environments.
  const firebaseServerApp = initializeServerApp(
    // https://github.com/firebase/firebase-js-sdk/issues/8863#issuecomment-2751401913
    initializeApp(firebaseConfig),
    {
      authIdToken,
    }
  );

  const auth = getAuth(firebaseServerApp);
  await auth.authStateReady();

  return { firebaseServerApp, currentUser: auth.currentUser };
}