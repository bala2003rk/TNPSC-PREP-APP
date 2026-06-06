# TNPSC Exam Prep — React Frontend

Bilingual (English/Tamil) TNPSC exam preparation web app built with:
**React (Vite) · Tailwind CSS · Redux Toolkit · Axios · Recharts**

---

## File Structure

```
src/
├── App.jsx                                  # Router, protected routes, app init
├── i18n/
│   └── translations.js                     # Full EN + TA string map
├── hooks/
│   └── useTranslation.js                   # t(key) hook from Redux ui.lang
├── utils/
│   ├── cn.js                               # Conditional className helper
│   └── api.js                              # Axios instance + JWT auto-refresh
├── components/
│   ├── common/
│   │   ├── Navbar.jsx                      # Responsive nav, avatar dropdown
│   │   └── LanguageToggle.jsx              # EN/TA pill toggle
│   ├── quiz/
│   │   ├── DynamicQuizEngine.jsx           # Full quiz engine + OMR panel
│   │   └── ResultScreen.jsx                # Score card + solutions
│   └── analytics/
│       └── AnalyticsDashboard.jsx          # Charts + AI weakness detector
└── pages/
    ├── LoginPage.jsx
    ├── RegisterPage.jsx
    ├── TestListPage.jsx
    └── AdminPage.jsx

tailwind.config.js                          # Custom colors + fonts
```

---

## Prerequisites

Make sure the following Redux slices exist (already written per spec):

| Slice  | State shape |
|--------|-------------|
| `auth` | `{ user, loading, error, isAuthenticated }` |
| `exam` | `{ questions, answers, flagged, currentIndex, timeRemaining, status, result }` |
| `ui`   | `{ lang ('en'|'ta'), sidebarOpen, toasts }` |

Required action creators your slices must export:

- `authSlice`: `loginUser`, `registerUser`, `logoutUser`, `fetchMe`, `clearError`
- `examSlice`: `loadExam`, `answerQuestion`, `toggleFlag`, `setCurrentIndex`, `submitExam`, `tickTimer`
- `uiSlice`:   `setLang`, `toggleSidebar`

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Add Google Fonts to index.html <head>
# <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap" rel="stylesheet">

# 3. Create .env
echo "VITE_API_URL=http://localhost:5000" > .env

# 4. Start dev server
npm run dev
```

---

## Custom Tailwind Classes Used

| Class | Value |
|-------|-------|
| `bg-dark` | `#1A1A2E` |
| `text-primary` | `#FF6B35` |
| `text-secondary` | `#2D6A4F` |
| `text-accent` | `#FFB627` |
| `font-tamil` | Noto Sans Tamil |
| `font-sans` | Plus Jakarta Sans |

---

## Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/` | → `/dashboard` | Auth |
| `/login` | LoginPage | Public |
| `/register` | RegisterPage | Public |
| `/dashboard` | AnalyticsDashboard | Auth |
| `/tests` | TestListPage | Auth |
| `/exam/:id` | DynamicQuizEngine | Auth |
| `/results/:attemptId` | ResultScreen | Auth |
| `/admin` | AdminPage | Admin |
