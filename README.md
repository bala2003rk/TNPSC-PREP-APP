# Employee Status & Performance Tracker

An enterprise-grade, full-stack **Admin-Employee Dashboard** application designed to manage internal team workflows, monitor real-time employee work statuses, track training batches, attendance, test performance, and expense billing.

Built with an **"ink & brass ledger"** aesthetic (deep ink-navy sidebars, brass/amber accents, and paper-toned canvases), the application delivers a unified, reconciled digital ledger for real operations.

---

## Architecture & Tech Stack

The project is structured as a monorepo separated into a Node.js API backend and a modern React frontend:

* **Backend (`/backend`):** Node.js, Express, MongoDB (Mongoose), JWT Authentication.
* **Frontend (`/frontend`):** React, Vite, Tailwind CSS v4, React Router, Recharts.

---

## Project Structure

```text
Employee_Status_Tracker/
├── backend/            # Express REST API & Mongoose models
│   ├── src/
│   │   ├── config/     # Database configuration
│   │   ├── models/     # Mongoose schemas (Employee, Project, Section, Bill, etc.)
│   │   ├── middleware/ # Auth verification & role guards
│   │   ├── controllers/# Resource route controllers
│   │   ├── routes/     # API endpoint mappings
│   │   └── server.js   # App entry point
│   └── package.json
└── frontend/           # React + Vite client application
    ├── src/
    │   ├── components/ # Reusable UI components
    │   ├── mock/       # Frontend mock dataset & services
    │   └── services/   # API communication layer (Axios)
    └── package.json
