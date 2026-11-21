# QuickEntry - Cross-Platform Data Entry App

A clean, minimalist, installable application designed for frictionless data entry across PC, laptops, and mobile devices (Android & iOS).

---

## 🚀 How to Run as an App

### 1. Launch as a Dedicated Desktop Window (Windows / Mac)
Run this command in your terminal:
```bash
npm run app
```
This automatically boots a **native Electron desktop window** on your PC. It runs as a standalone desktop app with its own taskbar icon and window controls, without needing a browser tab.

---

### 2. 1-Click Install on PC/Laptop (Chrome / Edge)
1. Run `npm run dev` and open the app in Chrome or Edge.
2. In the browser address bar on the right, click the **Install** button (or click **"Install QuickEntry App"** at the bottom).
3. A Windows Desktop shortcut will be created on your desktop and Start Menu.

---

### 3. Install on Mobile Phones & Tablets

#### Android (Google Chrome):
1. Open the app link on your phone (e.g. `http://<your-pc-ip>:5173` or your deployed free URL).
2. Tap the `⋮` menu in Chrome > **Install app** (or **Add to Home screen**).
3. The QuickEntry icon will appear on your phone's home screen and open in full-screen mode like a native Android app.

#### iPhone / iPad (Safari):
1. Open the app link in Safari.
2. Tap the **Share** button (box with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then tap **Add**.
4. The app will launch full-screen without any Safari browser bars.

---

## 🔒 Email & OTP Authentication
* Powered by real Gmail SMTP (`parthsinhgohil01@gmail.com`).
* 6-digit OTP codes are delivered straight to your email inbox for password recovery.
* Never displays OTP codes on screen.

---

## 📊 Features
* **Dynamic Column Setup**: Text, Email (@), Number, Date, Dropdown/Select, Long Notes, Checkbox.
* **Strict Email Validation**: Prevents typo/name entries in email columns.
* **One-by-One Data Entry**: Keyboard-friendly (`Enter`), record counters, instant local auto-save.
* **Excel (.xlsx) Export**: Downloads clean Excel spreadsheets starting directly with your custom columns (no artificial `Row #` column).
