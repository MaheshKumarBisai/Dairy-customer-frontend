# 🥛 Dairy Customer Frontend (`Dairy-customer-frontend`)

Full-featured customer ordering and subscription mobile web application built with **Expo (React Native for Web)**, **Expo Router**, and **Leaflet / OpenStreetMap / ESRI Map Engine**.

- **GitHub Repository:** [https://github.com/MaheshKumarBisai/Dairy-customer-frontend.git](https://github.com/MaheshKumarBisai/Dairy-customer-frontend.git)
- **Port:** `5173`

---

## 🚀 Features
- **Product Catalog & Categories:** Browse farm-fresh dairy products, malai paneer, butter, milk variants, and curd.
- **Cart & Instant Checkout:** Apply coupons (e.g. `DAIRY20`), select payment modes, and confirm orders.
- **Recurring Dairy Plans:** Create, customize, and pause daily, weekly, or custom-day subscriptions.
- **Live Order Tracking:**
  - Full-screen interactive Leaflet & ESRI world street maps.
  - Multi-touch finger pinch-to-zoom (up to level 18) and double-tap zoom.
  - Dynamic ETA countdown in Green for on-time/early and Red for late delivery.
  - Pure icon stage progression with Lime passed stages and Red indicator on failure.
  - Automatic city & postal geocoding based on customer's actual address.
- **Address Book & Profile:** Manage saved home and work addresses with automatic coordinates.

---

## 📋 Prerequisites
- **Node.js:** `v20.x` or higher (`node -v`)
- **npm:** `v10.x` or higher (`npm -v`)
- **Main Backend:** Running on `http://localhost:4000`

---

## ⚡ Local Setup

### 1. Clone & Navigate
```bash
git clone https://github.com/MaheshKumarBisai/Dairy-customer-frontend.git
cd Dairy-customer-frontend
```

### 2. Configure Environment Variables
Create your local `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Default settings in `.env`:
```env
# Leave empty for local development to use the default http://localhost:4000/api/v1
EXPO_PUBLIC_API_URL=
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Development Server
```bash
npx expo start -c
```
- Press `w` to open web browser
- Press `s` to switch Expo Go
- Or scan the QR code with Expo Go on your mobile device (Android / iOS)

---

## 🔑 Demo Customer Login
| Field | Value |
| --- | --- |
| **Email** | `customer@example.com` |
| **Password** | `Password@123` |
| **Name** | Ananya Roy |

---

## 🛠 Available Scripts
- `npx expo start -c`: Start Expo server with cleared cache.
- `npm run typecheck`: Run TypeScript compiler check without emitting files.
- `npm test`: Run automated Vitest test suite.
- `npm run build`: Export production-ready static web bundle to `dist/`.
