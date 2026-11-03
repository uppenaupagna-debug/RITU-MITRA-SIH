// scripts/createAdmin.js
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyABRjioyxafMXaXZVfQn5LlwPudQysB2xg",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "agriassistdashboard.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "agriassistdashboard",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "agriassistdashboard.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1083756635791",
  appId: process.env.FIREBASE_APP_ID || "1:1083756635791:web:5266c7ceb70724a505f2fa",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = process.env.ADMIN_EMAIL || "admin@raitumitra.com";
const password = process.env.ADMIN_PASSWORD || "password123";

async function createProfile() {
  console.log(`🤖 Attempting to create admin account: ${email}...`);
  
  let userUid = null;
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    userUid = credential.user.uid;
    console.log(`✅ Auth user created successfully with UID: ${userUid}`);
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      console.log("ℹ️ Email already exists, logging in instead to get UID...");
      const credential = await signInWithEmailAndPassword(auth, email, password);
      userUid = credential.user.uid;
      console.log(`✅ Logged in successfully with UID: ${userUid}`);
    } else {
      console.error("❌ Failed to create/sign in user:", err);
      process.exit(1);
    }
  }

  console.log("🌾 Writing admin profile and role to Firestore...");

  try {
    const docRef = doc(db, "admins", userUid);
    await setDoc(docRef, {
      uid: userUid,
      email: email,
      role: "admin",
      updatedAt: new Date()
    }, { merge: true });

    console.log("\n🎉 ADMIN PROFILE CREATED SUCCESSFULLY!");
    console.log("==========================================");
    console.log(`📧 Email:    ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log("==========================================");
    console.log("💡 You can now use these credentials to log in to the admin panel.");
  } catch (dbErr) {
    console.error("❌ Firestore database update failed:", dbErr);
  }
  process.exit(0);
}

createProfile();
