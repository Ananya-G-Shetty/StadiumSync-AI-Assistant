# 🏟️ StadiumSync AI – FIFA World Cup 2026

> An AI-powered, accessibility-first smart stadium platform built for the Google Build with AI – PromptWars Challenge.

StadiumSync AI is a modern Progressive Web Application (PWA) designed to improve the FIFA World Cup 2026 stadium experience for fans, organizers, elderly visitors, and people with disabilities. Powered by Google Gemini AI, the platform provides intelligent assistance, accessibility-focused navigation, real-time crowd insights, and venue information in a simple, mobile-friendly interface.

---

## 🌍 Problem Statement

The FIFA World Cup 2026 will host millions of spectators across multiple countries and large stadiums.

Visitors often face challenges such as:

- Finding food courts and restrooms
- Navigating large stadiums
- Language barriers
- Long entrance queues
- Accessibility support
- Emergency assistance
- Real-time crowd congestion

StadiumSync AI solves these challenges through an AI-powered smart stadium assistant.

---

# ✨ Features

## 🤖 AI Stadium Assistant

- Google Gemini powered chatbot
- Natural language conversations
- Stadium guidance
- Match information
- Food & amenities recommendations
- Accessibility assistance
- Emergency help

---

## 🗺️ Interactive Stadium Map

- Multi-level stadium navigation
- Circular stadium layout
- Crowd density visualization
- Green → Low Crowd
- Yellow → Medium Crowd
- Red → Heavy Crowd

Includes:

- Gates
- Restrooms
- Food Courts
- Elevators
- Ramps
- Medical Centers
- Emergency Exits

---

## ♿ Accessibility First

Designed according to WCAG 2.1 principles.

Features include:

- High Contrast Mode
- Large Text Mode
- Keyboard Navigation
- Screen Reader Friendly UI
- Wheelchair Accessible Routes
- Elevator Guidance
- Sensory Quiet Rooms
- ADA Support

---

## 📊 Live Stadium Information

- Stadium Capacity
- Weather
- Entrance Wait Times
- Match Schedule
- Venue Information
- Live Status

---

## 🚦 Smart Crowd Monitoring

Visual crowd monitoring helps users choose less crowded entrances and routes.

Supports:

- Level 1
- Level 2
- Level 3

Color Indicators:

🟢 Low Crowd

🟡 Moderate Crowd

🔴 Heavy Crowd

---

## 🚨 Report Facility Issues

Users can instantly report:

- Broken Elevators
- Blocked Wheelchair Ramps
- Medical Emergencies
- Damaged Facilities
- Accessibility Issues

Reports are designed to notify stadium staff quickly.

---

## 🌐 Multilingual Support

Supports:

- English
- Spanish
- French

Designed for international FIFA visitors.

---

## 📱 Mobile First Design

Responsive interface optimized for:

- Mobile
- Tablet
- Desktop

---

# 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | Frontend Framework |
| TypeScript | Type Safety |
| Tailwind CSS | UI Styling |
| Google Gemini AI | Intelligent Chat Assistant |
| PostgreSQL | Database |
| Drizzle ORM | Database ORM |
| Progressive Web App | Mobile Experience |

---

# 📂 Project Structure

```
src/
│
├── app/
│   ├── api/
│   ├── chat/
│   ├── map/
│   ├── amenities/
│   ├── schedule/
│   └── page.tsx
│
├── components/
│
├── context/
│
├── db/
│
├── public/
│
└── globals.css
```

---

# 🚀 Installation

Clone the repository

```bash
git clone https://github.com/your-username/stadiumsync-ai.git
```

Move into the project

```bash
cd stadiumsync-ai
```

Install dependencies

```bash
npm install
```

Run development server

```bash
npm run dev
```

Open

```
http://localhost:3000
```

---

# 🎯 Target Users

- FIFA Fans
- International Visitors
- Elderly Spectators
- Wheelchair Users
- Families
- Stadium Staff
- Volunteers

---

# 🌟 Key Highlights

- AI-powered assistance
- Accessibility-first design
- Interactive crowd visualization
- Real-time stadium information
- Modern responsive interface
- Production-ready architecture


---

# 🔒 Security

- Secure API integration
- No exposed API keys
- Server-side processing
- Clean error handling

---

# ⚡ Performance

- Optimized Next.js routing
- Responsive UI
- Fast loading pages
- Mobile optimized
- Efficient component structure

---

# 🔮 Future Enhancements

- Indoor GPS Navigation
- Voice Assistant
- Smart Parking Guidance
- Ticket Integration
- Push Notifications
- Live Crowd Prediction
- AR Navigation
- Smart Emergency Alerts

---

# 🧠 Submission Details

## 🎯 Chosen Vertical
**Smart Stadiums & Tournament Operations** (FIFA World Cup 2026 Accessibility Focus)
- Designed to empower elderly fans, fans with physical or sensory disabilities, and international travelers navigating large-scale tournament venues.

## 🛠️ Approach & Logic
1. **Accessibility-First Design**: Fully integrated WCAG 2.1 guidelines (High Contrast Mode, dynamic Text Scaling, Screen Reader descriptive announcements, and Keyboard-friendly navigation).
2. **Context-Aware AI Assistant**: Uses the **Vercel AI SDK** with **Google Gemini 1.5 Flash** for dynamic, natural language guidance. It extracts the live database status of stadium amenities, warning users of any maintenance issues (e.g., closed escalators/elevators) and routing them to operational alternatives.
3. **Database & Persistence**: Mocked PostgreSQL relational tables mapped via **Drizzle ORM** with simulated in-memory and local JSON persistence (`db-store.json`) for seamless stateless deployment.
4. **Resilient Offline/Fallback Logic**: If the Gemini API key is missing or invalid, the app switches to an intelligent fallback rules-engine that mimics natural speech, parses multilingual keywords, and queries the database dynamically to generate complete responses.

## ⚙️ How the Solution Works
1. **Stadium Selection**: Users select their stadium (e.g., MetLife Stadium, SoFi Stadium, Estadio Azteca) which loads stadium-specific matches, wait times, weather, and amenities.
2. **Interactive Map Navigation**: The map visualizes seating levels and lets users filter gates, elevators, quiet sensory rooms, first aid, and accessible restrooms.
3. **Multilingual AI Support**: Chat bot auto-detects Spanish, French, and English and replies in the user's language.
4. **Live Incident Reporting**: Fans can submit access-related incidents (e.g., wet floor, broken ramp). These issues are dispatched to operations staff and display in the live feed.

## 📌 Assumptions Made
1. **API Keys**: A `GEMINI_API_KEY` (or `GOOGLE_GENERATIVE_AI_API_KEY`) is supplied in the environment. If not present, the system defaults to the mock AI rules-engine to maintain usability.
2. **Stateless Operations**: Local file modifications in Next.js Server Actions are transient on serverless environments (like Vercel). The app is architected to fallback gracefully to memory arrays if file writes fail.
3. **Telemetry data**: Gate queue wait times, weather details, and crowd flow indices are simulated in real-time.

---

# 🏆 Google Build with AI – PromptWars

This project was developed as part of the **Google Build with AI – PromptWars Challenge 4**.

Theme:

**Smart Stadiums & Tournament Operations**

The solution demonstrates how Generative AI can improve accessibility, navigation, and fan experience during the FIFA World Cup 2026.

---

# 👩‍💻 Developer

**Ananya G Shetty**

Information Science & Engineering

Jawaharlal Nehru New College of Engineering (JNNCE)

---

# 📄 License

This project is licensed under the MIT License.

---

## ⭐ If you found this project interesting, consider giving it a Star!

