// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbU_I1AhFy95vL6T6bHRCBVsj-__YAcG0",
  authDomain: "harmonicks-8ab52.firebaseapp.com",
  databaseURL: "https://harmonicks-8ab52-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "harmonicks-8ab52",
  storageBucket: "harmonicks-8ab52.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Get temperature from Firebase
db.ref("sensors/temperature").on("value", (snapshot) => {
  const temp = snapshot.val();
  document.getElementById("tempValue").textContent = temp + "°C";
});

// Get humidity from Firebase
db.ref("sensors/humidity").on("value", (snapshot) => {
  const hum = snapshot.val();
  document.getElementById("humValue").textContent = hum + "%";
});

<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyAbU_I1AhFy95vL6T6bHRCBVsj-__YAcG0",
    authDomain: "harmonicks-8ab52.firebaseapp.com",
    databaseURL: "https://harmonicks-8ab52-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "harmonicks-8ab52",
    storageBucket: "harmonicks-8ab52.firebasestorage.app",
    messagingSenderId: "700499572267",
    appId: "1:700499572267:web:e746bda186f965d2301c6e",
    measurementId: "G-FRRPBJ796H"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

  // Initialize Firebase Realtime Database
  const db = firebase.database();

  document.addEventListener("DOMContentLoaded", () => {
  const addDeviceBtn = document.querySelector("button");
  if (addDeviceBtn && addDeviceBtn.innerText.includes("Add Device")) {
    addDeviceBtn.addEventListener("click", () => {
      alert("Add Device button clicked!");
    });
  }
});
    // Get temperature from Firebase
    db.ref("sensors/temperature").on("value", (snapshot) => {
        const temp = snapshot.val();
        document.getElementById("tempValue").textContent = temp + "°C";
    });
    
    // Get humidity from Firebase
    db.ref("sensors/humidity").on("value", (snapshot) => {
        const hum = snapshot.val();
        document.getElementById("humValue").textContent = hum + "%";
    });
</script>