// scripts/updateUserLocation.js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
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

async function updateProfile() {
  console.log(`🤖 Attempting to log in as test farmer...`);
  
  let userUid = null;
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    userUid = credential.user.uid;
    console.log(`✅ Logged in successfully with UID: ${userUid}`);
  } catch (err) {
    console.error("❌ Failed to login:", err);
    process.exit(1);
  }

  // Draw farm around the user's geolocated coordinates: (18.0, 79.5833)
  const farmBoundary = [
    { lat: 18.001, lng: 79.582 },
    { lat: 18.001, lng: 79.584 },
    { lat: 17.999, lng: 79.584 },
    { lat: 17.999, lng: 79.582 }
  ];

  console.log("🌾 Writing updated farmer profile with current location and farm boundary to Firestore...");

  try {
    const docRef = doc(db, "farmers", userUid);
    await setDoc(docRef, {
      uid: userUid,
      username: "testfarmer",
      role: "farmer",
      farmBoundary: farmBoundary,
      currentActivity: "Ploughing",
      farmArea: 11.6,
      ndviValue: 0.72,
      soilData: {
        pH: "6.5",
        SOC: "1.2%",
        clay: "28.0%"
      },
      profile: {
        name: "Ramesh Kumar",
        contact: "+91 98765 43210",
        age: "42",
        gender: "Male",
        state: "Telangana",
        district: "Warangal Urban",
        village: "Gandhi Nagar, Hanamkonda",
        farmSize: 11.6,
        photoBase64: "",
        soilData: {
          pH: "6.5",
          SOC: "1.2%",
          clay: "28.0%"
        },
        ndviValue: 0.72
      },
      preferences: {
        soilType: "Loamy",
        waterSources: ["Canal Irrigation", "Borewell/Tubewell"],
        favouriteCrops: ["Rice", "Cotton", "Maize"]
      },
      updatedAt: new Date()
    }, { merge: true });

    console.log("\n🎉 TEST FARMER PROFILE UPDATED SUCCESSFULLY!");
    console.log("==========================================");
    console.log(`📍 Location: Gandhi Nagar, Hanamkonda`);
    console.log(`📍 District: Warangal Urban, Telangana`);
    console.log(`📍 Coordinates: lat 18.0, lng 79.5833`);
    console.log("==========================================");
  } catch (dbErr) {
    console.error("❌ Firestore database update failed:", dbErr);
  }
  process.exit(0);
}

updateProfile();
