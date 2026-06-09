import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// ----------------------------------------------------
// 🔹 Firebase Config
// ----------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBEXevAPjcsgvtXJMVNJMVq4SKnbajsON8",
  authDomain: "smartenergymeter-f3dd3.firebaseapp.com",
  databaseURL: "https://smartenergymeter-f3dd3-default-rtdb.firebaseio.com",
  projectId: "smartenergymeter-f3dd3",
  storageBucket: "smartenergymeter-f3dd3.appspot.com",
  messagingSenderId: "301203302431",
  appId: "1:301203302431:web:72932d0693c7d8a6944d2a",
  measurementId: "G-L2TVRJYGRP"
};

// ----------------------------------------------------
// 🔹 Initialize Firebase
// ----------------------------------------------------
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ Correct Firebase paths based on your current data structure
const currentRef = ref(db, "SmartEnergy/current");
const powerRef = ref(db, "SmartEnergy/power");
const energyRef = ref(db, "SmartEnergy/energy");
const totalBillRef = ref(db, "SmartEnergy/totalBill");
const billLimitRef = ref(db, "SmartEnergy/BillLimit");
const relayStatusRef = ref(db, "RelayStatus");


// ----------------------------------------------------
// 🔹 DOM Elements
// ----------------------------------------------------
const currentEl = document.getElementById("current");
const powerEl = document.getElementById("power");
const energyEl = document.getElementById("energy");
const totalBillEl = document.getElementById("totalBill");
const relayToggle = document.getElementById("relayToggle");
const statusEl = document.getElementById("status");
const limitStatusEl = document.getElementById("limitStatus");

// 🔸 Floating alert
let alertDiv = document.createElement("div");
alertDiv.style.position = "fixed";
alertDiv.style.top = "10px";
alertDiv.style.left = "50%";
alertDiv.style.transform = "translateX(-50%)";
alertDiv.style.background = "red";
alertDiv.style.color = "white";
alertDiv.style.padding = "10px 20px";
alertDiv.style.borderRadius = "8px";
alertDiv.style.fontWeight = "bold";
alertDiv.style.display = "none";
document.body.appendChild(alertDiv);

// ----------------------------------------------------
// 🔹 Display live readings
// ----------------------------------------------------
onValue(currentRef, s => { currentEl.textContent = (s.val() || 0).toFixed(3); });
onValue(powerRef, s => { powerEl.textContent = (s.val() || 0).toFixed(2); });
onValue(energyRef, s => { energyEl.textContent = (s.val() || 0).toFixed(3); });
onValue(totalBillRef, s => {
  const bill = s.val() || 0;
  totalBillEl.textContent = `₹${bill.toFixed(2)}`;
  checkBillLimit(bill);
});

// ----------------------------------------------------
// 🔹 Bill Limit Control
// ----------------------------------------------------
window.setBillLimit = function() {
  const limit = parseFloat(document.getElementById("billLimitInput").value);
  if (!isNaN(limit)) {
    set(billLimitRef, limit);
    limitStatusEl.textContent = `✅ Limit set to ₹${limit}`;
  } else {
    alert("Enter a valid number!");
  }
};

async function checkBillLimit(currentBill) {
  const snap = await get(billLimitRef);
  const limit = snap.val() || 0;

  if (limit > 0 && currentBill >= limit) {
    await set(relayStatusRef, "OFF");
    alertDiv.style.display = "block";
    alertDiv.textContent = `⚠️ Bill limit ₹${limit} reached! Power cutoff activated.`;
    relayToggle.checked = false;
    statusEl.textContent = "Status: OFF";
  } else {
    alertDiv.style.display = "none";
  }
}

// ----------------------------------------------------
// 🔹 Relay Control
// ----------------------------------------------------
relayToggle.addEventListener("change", async () => {
  const status = relayToggle.checked ? "ON" : "OFF";
  await set(relayStatusRef, status);
  statusEl.textContent = `Status: ${status}`;
});

// ----------------------------------------------------
// 🔹 Power Chart (Realtime)
// ----------------------------------------------------
const ctx = document.getElementById("powerChart").getContext("2d");

const powerChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Power (W)",
      data: [],
      borderColor: "#00ffc8",
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
      backgroundColor: "rgba(0, 255, 200, 0.08)",
      pointRadius: 0,
    }]
  },
  options: {
    responsive: true,
    animation: { duration: 500 },
    scales: {
      x: { display: false },
      y: {
        ticks: { color: "#fff" },
        grid: { color: "rgba(255,255,255,0.1)" }
      }
    },
    plugins: { legend: { display: false } }
  }
});

// Update chart live
onValue(powerRef, s => {
  const power = s.val() || 0;
  const labels = powerChart.data.labels;
  const data = powerChart.data.datasets[0].data;

  const time = new Date().toLocaleTimeString();
  labels.push(time);
  data.push(power);

  if (labels.length > 20) {
    labels.shift();
    data.shift();
  }

  powerChart.update();

  // Optional stats
  const min = Math.min(...data);
  const max = Math.max(...data);
  const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1);
 const minEl = document.getElementById("minPing");
if (minEl) minEl.textContent = min.toFixed(0);

const avgEl = document.getElementById("avgPing");
if (avgEl) avgEl.textContent = avg;

const maxEl = document.getElementById("maxPing");
if (maxEl) maxEl.textContent = max.toFixed(0);

});
