# 🏛️ Betul 48 / IMC 48 Civic Engagement & Grievance Redressal Portal

A modern, component-based civic portal inspired by the Indore 311 platform for municipal corporations (IMC / Betul Municipal Council). Citizens can report civic issues with auto-detected GPS location and photos, track resolution status in real time, and verify fixes before complaints are officially closed.

---

## ✨ Key Features

- **🌿 Biodegradable / Green Waste Collection**: Dedicated module for reporting fallen leaves, tree branches, garden waste, and tree falls with urgency tags.
- **📸 Photo & Auto-GPS Location**: Citizen upload with browser geolocation & reverse geocoding via OpenStreetMap Nominatim.
- **🌐 Bilingual UI (English & Hindi)**: Full language toggle across the application with persistent user preference.
- **📊 Real-time Stats & Counter**: Live tally of total, pending, in-progress, resolved, and citizen-verified grievances.
- **🖼️ Auto-Rotating Civic Banners**: Highlights Swachh Survekshan, water conservation, monsoon drainage, green waste drive, and C&D waste management.
- **🏛️ Multi-Department Architecture**: Built with an extensible schema supporting 8+ departments (Green, Water Supply, Rain Water / Drainage, C&D Waste, Clean / Sanitation, Roads, Streetlight, Sewage).
- **🔄 Closed-Loop Citizen Verification**:
  $$\text{Pending} \longrightarrow \text{In Progress} \longrightarrow \text{Resolved} \longrightarrow \text{Citizen Verification} \longrightarrow \text{Verified \& Closed}$$
- **🛡️ Municipal Admin Dashboard**:
  - Filter by department and status
  - Review photos and GPS maps
  - Update complaint progress, upload resolution photos, and close tickets
- **📱 Mobile-First PWA Design**: Fixed bottom navigation, glassmorphism, responsive cards, and animated splash screen.
- **🤖 Betul Nagar Android app**: Full-screen Trusted Web Activity built manually from GitHub Actions and published as a signed APK release. See [`android/README.md`](./android/README.md) for signing setup and release instructions.

---

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Routing**: React Router v6
- **Database & Storage**: Supabase (PostgreSQL + Supabase Storage)
- **Icons**: Lucide React
- **Geocoding**: OpenStreetMap Nominatim API

---

## 🛠️ Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/printingtaskweb-dot/betul-311.git
cd betul-311
```

### 2. Install dependencies
```bash
npm install
```

### 3. Database & Storage Setup (Supabase)
Run the SQL setup scripts in your Supabase SQL Editor:
1. Run [`supabase_setup.sql`](./supabase_setup.sql)
2. Run [`supabase_v2.sql`](./supabase_v2.sql)

### 4. Start Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

---

## 🔐 Admin Access

- Access URL: `/admin`
- Default Passcode: `imc311admin`
