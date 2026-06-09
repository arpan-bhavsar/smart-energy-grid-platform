# ⚡ IoT Enterprise Smart-Grid & Energy Analytics Platform

> A real-time, cloud-integrated smart energy monitoring and automated load management ecosystem. 

This system bridges physical hardware telemetry with an interactive web-based software dashboard to track energy utilization metrics, manage costs, and implement fail-safe cutoffs. It is designed to showcase full-stack integration, hardware-to-cloud communication, and real-time data visualization.

---

## 🚀 Key Features

* **Real-time Telemetry Processing:** Tracks instantaneous Current (A), Live Power Draw (W), Cumulative Energy Consumption (kWh), and Estimated Billing dynamically.
* **Low-Latency Cloud Sync:** Leverages an asynchronous pub/sub model with Firebase Realtime Database for instantaneous hardware-to-software updates.
* **Automated Budget Guardrails:** Implements user-defined financial limit thresholds with an automated hardware-level relay cutoff mechanism to prevent utility overages.
* **Interactive Live Analytics:** Visualizes shifting consumption trends on an animated timeline using optimized Chart.js graph hooks.
* **Decoupled Security Layer:** Utilizes environmental variable isolation (`.env` and `config.h`) to safeguard production cloud instances and hardware configurations.

---

## 🛠️ System Architecture & Tech Stack

This project utilizes a modern multi-tier enterprise architecture separating the hardware client, database, and front-end user interface.

**The Tech Stack:**
* **Hardware Layer (C++):** NodeMCU ESP8266 microcontroller, ACS712-20A Hall-effect current sensor, and an optocoupled dual-channel safety relay module.
* **Cloud Database Layer:** Firebase Realtime Database for seamless bi-directional data flow.
* **Frontend Web Application:** Semantic HTML5, Glassmorphism UI styling via custom CSS3, and modern asynchronous JavaScript (ES6+) modules (designed for React scalability).

### 🌐 Data Flow Architecture
`[ACS712 Sensor] ➔ [ESP8266 Firmware] ➔ (Secure MQTT/HTTP) ➔ [Firebase RTDB] ➔ (Real-time Pub/Sub) ➔ [Web Dashboard]`

---

## 📊 Hardware Circuit Topology

* **Microcontroller:** ESP8266 (NodeMCU)
* **Sensor Pin Interfacing:** ACS712 Analog Out $\rightarrow$ Pin A0
* **Control Output Interfacing:** Dual-Channel Relay Signal Input $\rightarrow$ Pin D1

---

## ⚡ Core Software Logic & Calculations

The firmware calculates root-mean-square current ($I_{rms}$) by sampling alternating current data blocks to balance noise offsets:

$$I_{rms} = \frac{V_{ADC\_RMS}}{\text{Sensitivity}}$$

Live real-time power ($P$) and cumulative energy utilization ($E$) are computed using standard power equations:

$$P = I_{rms} \times V_{\text{Mains}}$$
$$E = \sum (P \times \Delta t)$$

---

## 💻 How to Set Up and Run Locally

### 1. Hardware Firmware Setup
1. Open `hardware-firmware/smart_meter.ino` in the Arduino IDE.
2. Duplicate `config.h.example` and rename it to `config.h`.
3. Populate `config.h` with your local Wi-Fi SSID and Firebase secret credentials.
4. Flash the sketch to your NodeMCU ESP8266.

### 2. Web Dashboard Deployment
1. Navigate to the web directory in your terminal:
   ```bash
   cd web-dashboard
