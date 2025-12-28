# 🚚 FleetFlow - AI Logistics Route Optimizer

A full-stack platform leveraging generative AI to optimize logistics routes for transportation companies. Built with React, Node.js, MongoDB, and integrates with TomTom Traffic API, Open-Meteo Weather API, and Euron AI for intelligent route optimization.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Folder Structure](#folder-structure)

---

## ✨ Features

- **AI-Powered Route Optimization** - Uses Euron AI (GPT-4.1-nano) for intelligent route sequencing
- **Real-Time Traffic Data** - TomTom Traffic API integration for live traffic conditions
- **Weather Integration** - Open-Meteo API for weather-aware routing
- **Interactive Dashboard** - Analytics and KPIs at a glance
- **Delivery Management** - Full CRUD for deliveries with time windows, priorities, and tracking
- **Route Planning** - Create, optimize, and manage delivery routes
- **Export Options** - PDF, CSV, and iCal export for route schedules
- **Role-Based Access** - Admin, Dispatcher, and Driver roles
- **Real-Time Updates** - Automatic route re-optimization based on conditions

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│                  React + React Router                        │
│                  Leaflet Maps (future)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API                               │
│                  Node.js + Express                           │
│                    JWT Auth                                  │
└───────┬─────────────┬─────────────┬─────────────┬───────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│  Euron    │  │  TomTom   │  │ Open-Meteo│  │  MongoDB  │
│    AI     │  │  Traffic  │  │  Weather  │  │   Local   │
│   API     │  │   API     │  │    API    │  │           │
└───────────┘  └───────────┘  └───────────┘  └───────────┘
```

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **MongoDB** v6+ ([Download](https://www.mongodb.com/try/download/community))
- **npm** or **yarn**
- **VS Code** (recommended)

---

## 🛠️ Installation

### Step 1: Clone/Navigate to the Project

```bash
cd fleetflow
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## ⚙️ Configuration

### Backend Configuration

The backend `.env` file is located at `/backend/.env`. Update the following:

```env
# ===========================================
# FleetFlow Backend Environment Configuration
# ===========================================

# Server Configuration
PORT=5001
NODE_ENV=development

# MongoDB Configuration (Local)
MONGODB_URI=mongodb://localhost:27017/fleetflow

# JWT Configuration
JWT_SECRET=fleetflow_jwt_secret_key_change_in_production_2024
JWT_EXPIRE=7d

```

## 🚀 Running the Application

### Start MongoDB
```bash
# Windows
mongod

# macOS (with Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Step 2: Start the Backend Server

Open a terminal in VS Code (`Ctrl+`` or `Cmd+``):

```bash
cd backend
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   FleetFlow - AI Logistics Route Optimizer                ║
║   Server running on port 5000                             ║
║   Environment: development                                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

### Step 3: Start the Frontend

Open a **new terminal** in VS Code:

```bash
cd frontend
npm start
```

The frontend will open at: **http://localhost:3000**

---

## 📖 API Documentation

### Base URL
```
http://localhost:5001/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login user |
| GET | `/auth/me` | Get current user |
| PUT | `/auth/updatedetails` | Update profile |
| PUT | `/auth/updatepassword` | Update password |

### Deliveries Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/deliveries` | Get all deliveries |
| POST | `/deliveries` | Create delivery |
| GET | `/deliveries/:id` | Get delivery by ID |
| PUT | `/deliveries/:id` | Update delivery |
| DELETE | `/deliveries/:id` | Delete delivery |
| GET | `/deliveries/track/:trackingNumber` | Track delivery (public) |
| POST | `/deliveries/:id/deliver` | Mark as delivered |
| POST | `/deliveries/:id/fail` | Mark as failed |

### Routes Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/routes` | Get all routes |
| POST | `/routes` | Create route |
| POST | `/routes/optimize` | **AI Route Optimization** |
| GET | `/routes/:id` | Get route by ID |
| PUT | `/routes/:id` | Update route |
| DELETE | `/routes/:id` | Delete route |
| POST | `/routes/:id/start` | Start route |
| POST | `/routes/:id/complete` | Complete route |

### Export Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/export/routes/:id/pdf` | Export route as PDF |
| GET | `/export/routes/:id/csv` | Export route as CSV |
| GET | `/export/routes/:id/ical` | Export route as iCal |

---

## 🧪 Testing

### Run Backend Tests

```bash
cd backend
npm test
```


## 📁 Folder Structure

```
fleetflow/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── delivery.controller.js
│   │   │   ├── route.controller.js
│   │   │   ├── user.controller.js
│   │   │   ├── analytics.controller.js
│   │   │   └── export.controller.js
│   │   ├── models/           # MongoDB schemas
│   │   │   ├── User.model.js
│   │   │   ├── RoutePlan.model.js
│   │   │   ├── Delivery.model.js
│   │   │   └── RealTimeUpdate.model.js
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   │   ├── aiRoute.service.js      
│   │   │   ├── tomtom.service.js       # Traffic data
│   │   │   ├── weather.service.js      # Weather data
│   │   │   ├── realTimeUpdate.service.js
│   │   │   └── export.service.js       # PDF/CSV/iCal
│   │   ├── middleware/       # Auth, validation, errors
│   │   ├── utils/            # Logger, helpers
│   │   └── server.js         # Entry point
│   ├── tests/                # Jest tests
│   ├── logs/                 # Application logs
│   ├── .env                  # Environment variables
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   │   └── Layout.js
│   │   ├── pages/            # Page components
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Deliveries.js
│   │   │   ├── RoutesList.js
│   │   │   ├── RouteOptimizer.js
│   │   │   └── RouteDetails.js
│   │   ├── context/          # React context
│   │   │   └── AuthContext.js
│   │   ├── services/         # API service
│   │   │   └── api.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
└── README.md
```

---


## 📝 License

MIT License - See LICENSE file for details.

---

## 🤝 Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ by Sai Ganesh Kolan**
