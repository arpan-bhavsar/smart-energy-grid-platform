import { db, ref, onValue } from "./firebase-config.js";

// Chart setup function
function createChart(ctx, label, borderColor) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: label,
        data: [],
        borderColor: borderColor,
        borderWidth: 2,
        fill: false,
        tension: 0.3,
        pointRadius: 0,
      }]
    },
    options: {
      animation: {
        duration: 800,
        easing: 'easeInOutQuart'
      },
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: "Time (s)" },
          ticks: { color: "#fff" },
          grid: { color: "rgba(255,255,255,0.1)" }
        },
        y: {
          title: { display: true, text: label },
          ticks: { color: "#fff" },
          grid: { color: "rgba(255,255,255,0.1)" }
        }
      },
      plugins: {
        legend: { labels: { color: "#fff" } }
      }
    }
  });
}


// Initialize charts
const currentChart = createChart(document.getElementById("currentChart"), "Current (A)", "#00e676");
const powerChart = createChart(document.getElementById("powerChart"), "Power (W)", "#40c4ff");
const energyChart = createChart(document.getElementById("energyChart"), "Energy (kWh)", "#ffd600");

// Firebase reference
const dbRef = ref(db, "SmartEnergyMeter");

// Update charts with Firebase data
let lastUpdate = 0;

onValue(dbRef, (snapshot) => {
  const now = Date.now();
  if (now - lastUpdate < 10000) return; // only update every 10 seconds
  lastUpdate = now;

  const data = snapshot.val();
  if (!data) return;

  const time = new Date().toLocaleTimeString();

  const charts = [
    { chart: currentChart, value: data.current },
    { chart: powerChart, value: data.power },
    { chart: energyChart, value: data.energy }
  ];

  charts.forEach(({ chart, value }) => {
    if (chart.data.labels.length > 15) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
    chart.data.labels.push(time);
    chart.data.datasets[0].data.push(value);
    chart.update();
  });
});

