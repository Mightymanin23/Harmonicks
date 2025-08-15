// script.js

// Import Firebase modules for version 9.x
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Firebase config (taken from your previous input)
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
const db = getDatabase(app);

// --- Helper function to safely get an element by ID ---
function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Element with ID "${id}" not found.`);
  }
  return element;
}

// --- Sensor Status Logic ---
// These functions now explicitly expect the native type (number, boolean, or string) from Firebase
const getTempStatus = (temp) => {
  if (temp === null || typeof temp !== 'number') return { text: 'Unknown', isAlert: false };
  return temp >= 25 ? { text: 'Warm', isAlert: true } : { text: 'Normal', isAlert: false };
};

const getHumStatus = (hum) => {
  if (hum === null || typeof hum !== 'number') return { text: 'Unknown', isAlert: false };
  return (hum >= 30 && hum <= 70) ? { text: 'Dry', isAlert: false } : { text: 'Humid', isAlert: true };
};

// MODIFIED: Motion sensor status based on string values "detected" / "undetected"
const getMotionStatus = (motion) => {
  if (motion === null) return { text: 'Unknown', isAlert: false };
  if (motion === 'detected') {
    return { text: 'Motion Detected', isAlert: true }; // Status line: "Motion Detected"
  } else if (motion === 'undetected') {
    return { text: 'No Motion', isAlert: false }; // Status line: "No Motion"
  }
  return { text: 'Unknown', isAlert: false };
};

const getGasStatus = (gasDetected) => {
  if (gasDetected === null || typeof gasDetected !== 'boolean') return { text: 'Unknown', isAlert: false };
  return gasDetected ? { text: 'Detected (Danger)', isAlert: true } : { text: 'Clear (Safe)', isAlert: false };
};

// MODIFIED: Flame sensor status text: "Danger" or "No Fire Hazard"
const getFlameStatus = (flameDetected) => {
  if (flameDetected === null || typeof flameDetected !== 'boolean') return { text: 'Unknown', isAlert: false };
  return flameDetected ? { text: 'Danger', isAlert: true } : { text: 'No Fire Hazard', isAlert: false };
};

const getLockStatus = (isLocked) => {
    if (isLocked === null || typeof isLocked !== 'boolean') return { text: 'Unknown', isAlert: false };
    // Assuming 'true' means locked (secure) and 'false' means unlocked (unsecure/alert)
    return isLocked ? { text: 'Secure', isAlert: false } : { text: 'UNSECURE', isAlert: true };
};

const getBatteryStatus = (battery) => {
  if (battery === null || typeof battery !== 'number') return { text: 'Unknown', isAlert: false };
  return battery <= 25 ? { text: 'Low Battery', isAlert: true } : { text: 'Safe', isAlert: false };
};

// MODIFIED: Power status for the STATUS LINE (e.g., "ON" if value > 0, "OFF" if value is 0)
// This is for the status line, the main value will be the integer itself.
const getPowerStatus = (powerValue) => {
    if (powerValue === null || typeof powerValue !== 'number') return { text: 'Unknown', isAlert: false };
    return powerValue > 0 ? { text: 'ON', isAlert: false } : { text: 'OFF', isAlert: false };
}


// --- Global Sensor Data Storage ---
const sensorData = {
  temperature_sensor: null,
  humidity_sensor: null,
  motion_sensor0: null,
  gas_sensor0: null,
  lock_value: null,
  flame_sensor0: null,
  power1: null,
  power2: null,
  power3: null,
  battery_percent: null,
};

// Define the order of sensors to display in the carousel
// 'id' corresponds to the key in sensorData object
// 'dbPath' is the actual Firebase Realtime Database path if it differs from the 'id'
const sensorDisplayOrder = [
  { id: 'temperature_sensor', name: 'Temperature', unit: '°C', statusFn: getTempStatus, dbPath: 'sensor/temperature_sensor' },
  { id: 'humidity_sensor', name: 'Humidity', unit: '%', statusFn: getHumStatus, dbPath: 'sensor/humidity_sensor' },
  { id: 'motion_sensor0', name: 'Motion', unit: '', statusFn: getMotionStatus, dbPath: 'sensor/motion_sensor0' }, // Unit is empty as the value will be custom text
  { id: 'gas_sensor0', name: 'Gas', unit: '', statusFn: getGasStatus, dbPath: 'sensor/gas_sensor0' },
  { id: 'lock_value', name: 'Lock', unit: '', statusFn: getLockStatus, dbPath: 'control/lock_value' },
  { id: 'flame_sensor0', name: 'Flame', unit: '', statusFn: getFlameStatus, dbPath: 'sensor/flame_sensor0' }, // Unit is empty as the value will be custom text
  // MODIFIED: Changed dbPath to 'sensor/powerX' and added unit ' W'
  { id: 'power1', name: 'Power 1', unit: ' W', statusFn: getPowerStatus, dbPath: 'sensor/power1' },
  { id: 'power2', name: 'Power 2', unit: ' W', statusFn: getPowerStatus, dbPath: 'sensor/power2' },
  { id: 'power3', name: 'Power 3', unit: ' W', statusFn: getPowerStatus, dbPath: 'sensor/power3' },
  { id: 'battery_percent', name: 'Battery', unit: '%', statusFn: getBatteryStatus, dbPath: 'sensor/battery_percent' },
];

let currentSensorIndex = 0;
const transitionInterval = 3000; // 3 seconds per sensor

// --- Function to update the single carousel sensor display ---
function updateCarouselSensorDisplay() {
  const sensorConfig = sensorDisplayOrder[currentSensorIndex];
  const sensorId = sensorConfig.id;
  const sensorNameElement = getElement("carouselSensorName");
  const sensorValueElement = getElement("carouselSensorValue");
  const sensorStatusElement = getElement("carouselSensorStatus");

  if (!sensorNameElement || !sensorValueElement || !sensorStatusElement) {
    console.error("Carousel sensor elements not found. Check index.html IDs.");
    return;
  }

  const value = sensorData[sensorId];
  console.log(`DEBUG: Updating carousel with: ${sensorConfig.name}, Value: ${value}`);

  // Update sensor name
  sensorNameElement.textContent = sensorConfig.name;

  // Determine display value for the main reading
  let displayValue = value; // Default: show raw value from Firebase

  // Custom display logic for specific sensors based on their 'id'
  if (sensorId === 'lock_value') {
    // Lock value is a boolean, display as 'Closed' or 'Open'
    displayValue = value ? 'Closed' : 'Open';
  } else if (sensorId === 'motion_sensor0') {
    // Motion sensor expects string "detected" or "undetected"
    // Display "Motion" or "No Motion" as the main value
    displayValue = (value === 'detected') ? 'Motion' : 'No Motion';
  } else if (sensorId === 'flame_sensor0') {
    // Flame sensor expects boolean true/false
    // Display "Danger" or "No Fire Hazard" as the main value
    displayValue = value ? 'Danger' : 'No Fire Hazard';
  }
  // IMPORTANT: For power sensors (power1, power2, power3),
  // we *don't* have a specific 'if' here for `displayValue`. This means `displayValue` will remain
  // the raw numeric `value` from the database, which is exactly what you requested!


  // Set the text content for the value display, including unit
  sensorValueElement.textContent = (value !== null && value !== undefined) ? `${displayValue}${sensorConfig.unit}` : '--';

  // Update status (this uses the statusFn, which we updated above to provide status text)
  if (sensorConfig.statusFn) {
    const status = sensorConfig.statusFn(value);
    sensorStatusElement.textContent = status.text;
    sensorStatusElement.classList.toggle('alert', status.isAlert);
  } else {
    sensorStatusElement.textContent = (value !== null && value !== undefined) ? 'Normal' : 'Unknown';
    sensorStatusElement.classList.remove('alert'); // Remove alert if no specific statusFn
  }
}

// --- Autoplay Carousel Logic ---
function startSensorCarousel() {
  setInterval(() => {
    currentSensorIndex = (currentSensorIndex + 1) % sensorDisplayOrder.length;
    updateCarouselSensorDisplay();
  }, transitionInterval);
}

// ====== SENSOR READINGS LISTENERS (Modified for Carousel) ======
// All listeners now update the global sensorData object
// and then trigger a UI update ONLY IF that sensor is currently displayed.

sensorDisplayOrder.forEach(sensorConfig => {
    onValue(ref(db, sensorConfig.dbPath), (snapshot) => {
        const value = snapshot.val();
        sensorData[sensorConfig.id] = value;
        console.log(`DEBUG: Received data for ${sensorConfig.name} (${sensorConfig.dbPath}):`, value);

        // If the currently displayed sensor's data changes, update the UI immediately
        if (sensorDisplayOrder[currentSensorIndex].id === sensorConfig.id) {
            updateCarouselSensorDisplay();
        }
    }, (error) => {
        console.error(`Failed to read data for ${sensorConfig.name} (${sensorConfig.dbPath}):`, error.message);
        sensorData[sensorConfig.id] = null; // Set to null on error
        if (sensorDisplayOrder[currentSensorIndex].id === sensorConfig.id) {
            updateCarouselSensorDisplay();
        }
    });
});


// ====== DEVICE CONTROL FUNCTIONS ====== (These remain unchanged)
// NOTE: The HTML buttons for Smart TV, Fan, Lamp 3 still use data-relay-control="relay/relay_stateX"
// This is correct as they control the relays, which is separate from the power readings.

/**
 * Updates the UI of a toggle button based on a given boolean state.
 * @param {HTMLElement} btn The button element containing the image.
 * @param {boolean} isOnState The state (true for ON, false for OFF) to apply.
 */
function updateToggleButtonUI(btn, isOnState) {
  const img = btn.querySelector('img');
  if (!img) {
    console.error("Toggle button image not found for UI update for button:", btn);
    return;
  }

  // Convert boolean state to image file name
  const targetSrc = isOnState ? 'toggle-on.svg' : 'toggle-off.svg';
  const targetAlt = isOnState ? 'Toggle On' : 'Toggle Off';

  // Only animate if the state is actually changing
  const currentSrc = img.getAttribute('src');
  if (!currentSrc.includes(targetSrc.split('.')[0])) {
    img.style.transition = 'transform 0.3s cubic-bezier(.68,-0.55,.27,1.55)';
    img.style.transform = 'scale(1.2)';

    setTimeout(() => {
      img.src = targetSrc;
      img.alt = targetAlt;
      img.style.transform = 'scale(1)';
      img.style.transition = '';
    }, 150);
  }
}

/**
 * Toggles a device state in Firebase and updates the UI.
 * @param {HTMLElement} btn The button element that was clicked.
 * @param {string} firebasePath The full Firebase path to the control value.
 */
async function toggleDevice(btn, firebasePath) {
  const img = btn.querySelector('img');
  if (!img) {
    console.error("Toggle button image not found for device toggle action for button:", btn);
    return;
  }

  const currentUIStateIsOn = img.getAttribute('src').includes('toggle-on.svg');
  const newStateForFirebase = !currentUIStateIsOn;

  updateToggleButtonUI(btn, newStateForFirebase);

  try {
    await set(ref(db, firebasePath), newStateForFirebase);
    console.log(`Successfully requested ${firebasePath} to be set to ${newStateForFirebase}`);
  } catch (error) {
    console.error(`Failed to set ${firebasePath} to ${newStateForFirebase}:`, error);
    updateToggleButtonUI(btn, currentUIStateIsOn);
    alert(`Failed to control device. Please check console for details.`);
  }
}

// Attach toggle listeners for all device buttons and INITIALIZE their states from Firebase
document.querySelectorAll('.card-toggle').forEach(btn => {
  const deviceName = btn.dataset.device;
  const sensorControlName = btn.dataset.sensorControl;
  const relayControlName = btn.dataset.relayControl;

  let firebasePath;
  if (deviceName) {
    firebasePath = `control/${deviceName}`;
  } else if (sensorControlName) {
    firebasePath = `sensor/${sensorControlName}`;
  } else if (relayControlName) {
    firebasePath = relayControlName;
  } else {
    // This 'card-toggle' button might be the RGB Light's button which doesn't
    // have a data-device/sensor-control/relay-control, so we skip it from this loop.
    return;
  }

  // Set up real-time listener for each device's control state from Firebase
  onValue(ref(db, firebasePath), (snapshot) => {
    const currentState = snapshot.val();
    console.log(`DEBUG: RECEIVED ${firebasePath} control state from DB:`, currentState);
    
    const isDeviceOn = typeof currentState === 'boolean' ? currentState : false;
    updateToggleButtonUI(btn, isDeviceOn);
    console.log(`${firebasePath} state updated to: ${isDeviceOn}`);
  }, (error) => {
      console.error(`Error reading initial state for ${firebasePath}:`, error);
      updateToggleButtonUI(btn, false);
  });

  // Attach click listener for user interaction
  btn.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent any parent card click handlers from firing
    toggleDevice(btn, firebasePath)
  });
});
// ====== END OF DEVICE CONTROL FUNCTIONS ======


// ====== NEW: RGB LIGHT CONTROL LOGIC ======

// Get references to HTML elements for RGB control
const rgbLightControlCard = getElement('rgbLightControlCard');
const rgbControlModal = getElement('rgbControlModal');
const closeButton = rgbControlModal ? rgbControlModal.querySelector('.close-button') : null;
const redSlider = getElement('redSlider');
const greenSlider = getElement('greenSlider');
const blueSlider = getElement('blueSlider');
const redValueSpan = getElement('redValue');
const greenValueSpan = getElement('greenValue');
const blueValueSpan = getElement('blueValue');
const rgbColorPreview = getElement('rgbColorPreview');

// Firebase Realtime Database reference for RGB light color
const rgbLightRef = ref(db, 'light'); // Pointing to the 'light' node

let currentRed = 0;
let currentGreen = 0;
let currentBlue = 0;

/**
 * Updates the color preview div and the displayed slider values.
 */
function updateRGBUI() {
    if (!rgbColorPreview || !redSlider || !greenSlider || !blueSlider || !redValueSpan || !greenValueSpan || !blueValueSpan) {
        console.error("One or more RGB UI elements not found. Cannot update RGB UI.");
        return;
    }
    rgbColorPreview.style.backgroundColor = `rgb(${currentRed}, ${currentGreen}, ${currentBlue})`;
    redValueSpan.textContent = currentRed;
    greenValueSpan.textContent = currentGreen;
    blueValueSpan.textContent = currentBlue;

    // Set slider positions (useful when Firebase data updates them)
    redSlider.value = currentRed;
    greenSlider.value = currentGreen;
    blueSlider.value = currentBlue;
}

/**
 * Reads slider values, updates local variables, updates UI, and sends to Firebase.
 */
async function updateRGBFromSliders() {
    if (!redSlider || !greenSlider || !blueSlider) {
        console.error("One or more RGB sliders not found. Cannot update from sliders.");
        return;
    }
    currentRed = parseInt(redSlider.value, 10);
    currentGreen = parseInt(greenSlider.value, 10);
    currentBlue = parseInt(blueSlider.value, 10);

    updateRGBUI(); // Update UI immediately based on slider movement

    try {
        // Update individual color components in Firebase
        await set(ref(db, 'light/Red'), currentRed);
        await set(ref(db, 'light/Green'), currentGreen);
        await set(ref(db, 'light/Blue'), currentBlue);
        console.log(`RGB light set to R:${currentRed}, G:${currentGreen}, B:${currentBlue}`);
    } catch (error) {
        console.error("Error setting RGB light color in Firebase:", error);
    }
}


// Event listener to open the RGB light modal
if (rgbLightControlCard) {
    rgbLightControlCard.addEventListener('click', (event) => {
        // Check if the click originated from the .card-toggle button inside this card
        // If so, and it's the RGB card, we specifically open the modal.
        // Otherwise, if it was just the card itself, still open the modal.
        if (event.target.closest('.card-toggle')) {
            // Optional: If you had other logic for the button vs card click, you'd put it here
            console.log("RGB card toggle button clicked. Opening modal.");
        } else {
            console.log("RGB card area clicked. Opening modal.");
        }
        
        if (rgbControlModal) {
            rgbControlModal.classList.add('show');
        }
    });
}


// Event listener to close the modal
if (closeButton) {
    closeButton.addEventListener('click', () => {
        if (rgbControlModal) {
            rgbControlModal.classList.remove('show');
        }
    });
}

// Close modal if user clicks outside the modal content
if (rgbControlModal) {
    rgbControlModal.addEventListener('click', (event) => {
        if (event.target === rgbControlModal) { // Check if the click was directly on the modal background
            rgbControlModal.classList.remove('show');
        }
    });
}


// Listen for changes on each slider and update Firebase
if (redSlider) redSlider.addEventListener('input', updateRGBFromSliders);
if (greenSlider) greenSlider.addEventListener('input', updateRGBFromSliders);
if (blueSlider) blueSlider.addEventListener('input', updateRGBFromSliders);

// Real-time listener for RGB light color from Firebase
if (rgbLightRef) {
    onValue(rgbLightRef, (snapshot) => {
        const lightData = snapshot.val();
        if (lightData) {
            // Ensure values are numbers and within range (0-255)
            currentRed = typeof lightData.Red === 'number' ? Math.max(0, Math.min(255, lightData.Red)) : 0;
            currentGreen = typeof lightData.Green === 'number' ? Math.max(0, Math.min(255, lightData.Green)) : 0;
            currentBlue = typeof lightData.Blue === 'number' ? Math.max(0, Math.min(255, lightData.Blue)) : 0;
            console.log(`Received RGB from Firebase: R:${currentRed}, G:${currentGreen}, B:${currentBlue}`);
            updateRGBUI(); // Update the UI based on Firebase data
        } else {
            // If light node is empty or null, reset to black
            currentRed = 0;
            currentGreen = 0;
            currentBlue = 0;
            updateRGBUI();
            console.log("RGB light data is empty or null in Firebase, resetting UI to black.");
        }
    }, (error) => {
        console.error("Error reading RGB light data from Firebase:", error);
    });
}

// ====== END NEW: RGB LIGHT CONTROL LOGIC ======


// Start the sensor carousel once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    updateCarouselSensorDisplay(); // Display the first sensor immediately
    startSensorCarousel(); // Start the automatic rotation
    updateRGBUI(); // Initialize RGB UI with default/last known values (from Firebase listener)
});

document.getElementById('hoverCardClose').addEventListener('click', function(e) {
  e.stopPropagation(); // Prevent click from triggering other events
  document.getElementById('hoverCard').style.display = 'none';
});
