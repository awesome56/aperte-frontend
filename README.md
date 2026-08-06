# Aperte Frontend

Vue 3 + TypeScript + Vite frontend for the Aperte real estate platform. Designed to match the
"Rezilla" Figma template (homepage, listings, property detail, auth, dashboard).

## Features

- **Homepage** — hero with search, latest properties, services, testimonials (per Figma).
- **Listings** — browse and filter by category, purpose, city, state, price range.
- **Property detail** — gallery (images + videos), flexible attributes, amenities; bookable for
  hotels, shortlets, halls and event centers; room/slot pickers.
- **Auth** — register / login (JWT) with the backend.
- **Dashboard** — manage your listings, hotel rooms, hall/event-center slots, bookings
  (confirm / reject / complete / cancel), and profile.
- **Add Listing** — create listings across all categories (property, land, hotel, hall,
  event_center, shortlet) with flexible `attributes` and media uploads.

## Tech

- Vue 3, Vue Router, Pinia, Axios
- Vite, TypeScript
- Fonts: Poppins (@fontsource)

## Setup

```bash
npm install --legacy-peer-deps
cp .env.example .env
# set VITE_API_BASE_URL to your backend (e.g. http://localhost:5000/api/v1)
npm run dev
```

## Build

```bash
npm run build   # outputs to dist/
```

## Env

| Variable             | Description                        |
| -------------------- | ---------------------------------- |
| `VITE_API_BASE_URL`  | Backend API base URL (no trailing slash) |

## API

The frontend talks to the Aperte Flask backend (`/api/v1`): auth, properties, images, videos,
rooms, slots, bookings, reviews.
