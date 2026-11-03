// scripts/createTestFarmer.js
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABRjioyxafMXaXZVfQn5LlwPudQysB2xg",
  authDomain: "agriassistdashboard.firebaseapp.com",
  projectId: "agriassistdashboard",
  storageBucket: "agriassistdashboard.appspot.com",
  messagingSenderId: "1083756635791",
  appId: "1:1083756635791:web:5266c7ceb70724a505f2fa",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = "testfarmer@raitumitra.com";
const password = "password123";

async function createProfile() {
  console.log(`🤖 Attempting to create test farmer account: ${email}...`);
  
  let userUid = null;
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    userUid = credential.user.uid;
    console.log(`✅ Auth user created successfully with UID: ${userUid}`);
  } catch (err) {
    if (err.code === "auth/email-already-in-check" || err.code === "auth/email-already-in-use") {
      console.log("ℹ️ Email already exists, logging in instead to get UID...");
      const credential = await signInWithEmailAndPassword(auth, email, password);
      userUid = credential.user.uid;
      console.log(`✅ Logged in successfully with UID: ${userUid}`);
    } else {
      console.error("❌ Failed to create/sign in user:", err);
      process.exit(1);
    }
  }

  // Pre-defined field boundary in Sangareddy, Telangana (agricultural fields area)
  const farmBoundary = [
    { lat: 17.6510, lng: 78.1010 },
    { lat: 17.6530, lng: 78.1015 },
    { lat: 17.6525, lng: 78.1040 },
    { lat: 17.6505, lng: 78.1030 }
  ];

  console.log("🌾 Writing farmer profile, preferences, and farm boundary to Firestore...");

  try {
    const docRef = doc(db, "farmers", userUid);
    await setDoc(docRef, {
      uid: userUid,
      username: "testfarmer",
      role: "farmer",
      farmBoundary: farmBoundary,
      currentActivity: "Sowing",
      farmArea: 3.82,
      soilData: {
        pH: "6.8",
        SOC: "0.58%",
        clay: "28.5%"
      },
      profile: {
        name: "Ramesh Kumar",
        contact: "+91 98765 43210",
        age: "42",
        gender: "Male",
        state: "Telangana",
        district: "Sangareddy",
        village: "Malkapur",
        farmSize: 3.82,
        photoBase64: ""
      },
      preferences: {
        soilType: "Loamy",
        waterSources: ["Canal Irrigation", "Borewell/Tubewell"],
        favouriteCrops: ["Rice", "Cotton", "Maize"]
      },
      updatedAt: new Date()
    }, { merge: true });

    console.log("\n🎉 TEST FARMER PROFILE CREATED SUCCESSFULLY!");
    console.log("==========================================");
    console.log(`📧 Email:    ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log("==========================================");
    console.log("💡 You can now use these credentials to log in on the Raitumitra website.");
    console.log("🌾 A pre-defined farm boundary and soil health metrics have been initialized.");
  } catch (dbErr) {
    console.error("❌ Firestore database update failed:", dbErr);
  }
  process.exit(0);
}

createProfile();
