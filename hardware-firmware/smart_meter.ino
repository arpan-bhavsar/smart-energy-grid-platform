#include <ESP8266WiFi.h>     // [cite: 556]
#include <FirebaseESP8266.h> // [cite: 557]
#include <math.h>            // [cite: 558]

// ----------------------------------------------------
// 🔒 SECURITY PLACEHOLDERS FOR GITHUB
// ----------------------------------------------------
#define WIFI_SSID "YOUR_WIFI_SSID_PLACEHOLDER"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD_PLACEHOLDER"

#define FIREBASE_HOST "YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "YOUR_FIREBASE_SECRET_AUTH_TOKEN"
// ----------------------------------------------------
// Pin Definitions
// ----------------------------------------------------
#define ANALOG_PIN A0
#define RELAY_PIN D1
// ----------------------------------------------------
// ACS712 Sensor Configuration
// ----------------------------------------------------
const float ADC_REF_V = 3.3;
const int ADC_MAX = 1023;
const float ACS_SENSITIVITY = 0.100; // for ACS712-20A module
const float dividerFactor = 1.0;
const float voltageMains = 230.0;
const float RATE_PER_KWH = 8.0; // ₹8 per kWh
// ----------------------------------------------------
// Sampling Configuration
// ----------------------------------------------------
const int SAMPLE_COUNT = 400;
const int SAMPLE_DELAY_US = 250;
// ----------------------------------------------------
// Firebase Objects 5G
// ----------------------------------------------------
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
// ----------------------------------------------------
// Global Variables
// ----------------------------------------------------
float zero_adc = 0.0;
float calibrationFactor = 1.0;
float totalEnergy_kWh = 0.0;
float totalBill = 0.0;
unsigned long lastEnergyUpdate = 0;
// ====================================================
// Helper Functions
// ====================================================
float calibrateZero(unsigned long ms) {
unsigned long endTime = millis() + ms;
double sum = 0;
unsigned long cnt = 0;
while (millis() < endTime) {
sum += analogRead(ANALOG_PIN);
cnt++;
delay(2);
}
return (float)(sum / cnt);
}
float measureIrms(int samples, int delay_us) {
long sumSq = 0;
long sum = 0;
for (int i = 0; i < samples; i++) {
int val = analogRead(ANALOG_PIN);
sum += val;
sumSq += (long)val * (long)val;
if (delay_us > 0) delayMicroseconds(delay_us);
}
double mean = (double)sum / samples;
double meanSq = (double)sumSq / samples;
double acMeanSq = meanSq - (mean * mean);
if (acMeanSq < 0) acMeanSq = 0;
double acRmsCounts = sqrt(acMeanSq);
double vadc_rms = (acRmsCounts * ADC_REF_V) / ADC_MAX;
double vsensor_rms = vadc_rms * dividerFactor;
double Irms = vsensor_rms / ACS_SENSITIVITY;
Irms *= calibrationFactor;
if (Irms < 0.02) Irms = 0.0;
return (float)Irms;
}
// ====================================================
// Setup
// ====================================================
void setup() {
Serial.begin(115200);
delay(200);
Serial.println(" Smart Energy Meter (Real-Time Billing)");
WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
Serial.print("Connecting WiFi");
while (WiFi.status() != WL_CONNECTED) {
Serial.print(".");
delay(400);
}
Serial.println("\n WiFi Connected!");
config.database_url = FIREBASE_HOST;
config.signer.tokens.legacy_token = FIREBASE_AUTH;
Firebase.begin(&config, &auth);
Firebase.reconnectWiFi(true);
Serial.println(" Firebase Connected!");
pinMode(RELAY_PIN, OUTPUT);
digitalWrite(RELAY_PIN, LOW);
Serial.println("⚙ Calibrating zero offset...");
zero_adc = calibrateZero(2000);
Serial.printf("Zero ADC offset: %.2f\n", zero_adc);
if (Firebase.getFloat(fbdo, "/CalibrationFactor")) {
calibrationFactor = fbdo.floatData();
Serial.printf(" Loaded calibration factor: %.3f\n", calibrationFactor);
}
// Restore last known energy and bill
if (Firebase.getFloat(fbdo, "/SmartEnergy/energy"))
totalEnergy_kWh = fbdo.floatData();
if (Firebase.getFloat(fbdo, "/SmartEnergy/totalBill"))
totalBill = fbdo.floatData();
lastEnergyUpdate = millis();
}
// ====================================================
// Main Loop
// ====================================================
void loop() {
float Irms = measureIrms(SAMPLE_COUNT, SAMPLE_DELAY_US);
if (Irms > 0.005 && Irms < 0.25) Irms *= 2.0;
static float filteredIrms = 0;
filteredIrms = (filteredIrms * 0.8) + (Irms * 0.2);
Irms = filteredIrms;
if (Irms < 0.008) {
float newZero = calibrateZero(200);
zero_adc = (zero_adc * 0.9) + (newZero * 0.1);
}
float Power = Irms * voltageMains;
if (Irms < 0.01) Irms = 0.0;
if (Power < 2) Power = 0.0;
unsigned long currentTime = millis();
float elapsedHours = (currentTime - lastEnergyUpdate) / 3600000.0;
totalEnergy_kWh += (Power * elapsedHours) / 1000.0;
totalBill = totalEnergy_kWh * RATE_PER_KWH;
lastEnergyUpdate = currentTime;
Serial.println("=========================");
Serial.printf("Irms: %.3f A\n", Irms);
Serial.printf("Power: %.2f W\n", Power);
Serial.printf("Energy: %.4f kWh\n", totalEnergy_kWh);
Serial.printf("Total Bill: ₹%.2f\n", totalBill);
if (Firebase.ready()) {
Firebase.setFloat(fbdo, "/SmartEnergy/current", Irms);
Firebase.setFloat(fbdo, "/SmartEnergy/power", Power);
Firebase.setFloat(fbdo, "/SmartEnergy/voltage", voltageMains);
Firebase.setFloat(fbdo, "/SmartEnergy/energy", totalEnergy_kWh);
Firebase.setFloat(fbdo, "/SmartEnergy/totalBill", totalBill);
}
// -----------------------------------------------
// Bill Limit Cutoff (One-time + Lock Control)
// -----------------------------------------------
static bool cutoffDone = false;
static float lastLimit = 0;
float limit = 0;
if (Firebase.getFloat(fbdo, "/SmartEnergy/BillLimit")) {
limit = fbdo.floatData();
}
// Reset cutoff lock if limit changed or bill reset
if (limit != lastLimit || totalBill < limit * 0.1) {
cutoffDone = false;
lastLimit = limit;
}
if (!cutoffDone && limit > 0 && totalBill >= limit) {
Serial.printf("⚠ Bill limit ₹%.2f reached! Power cutoff applied.\n", limit);
digitalWrite(RELAY_PIN, HIGH); // turn OFF relay
Firebase.setString(fbdo, "/RelayStatus", "OFF");
cutoffDone = true; // Lock control until reset
}
// -----------------------------------------------
// Manual Relay Control (Dashboard) — only if allowed
// -----------------------------------------------
if (!cutoffDone) {
if (Firebase.getString(fbdo, "/RelayStatus")) {
String relayState = fbdo.stringData();
relayState.trim();
Serial.printf("Relay command (Load Control): %s\n", relayState.c_str());
// Inverted logic (active LOW)
if (relayState == "ON") {
digitalWrite(RELAY_PIN, HIGH); // Turn relay OFF (dashboard ON)
} else {
digitalWrite(RELAY_PIN, LOW); // Turn relay ON (dashboard OFF)
}
} else {
Serial.println("⚠ Failed to read RelayStatus!");
}
} else {
Serial.println(" Dashboard control locked — limit reached!");
}
delay(500);
}