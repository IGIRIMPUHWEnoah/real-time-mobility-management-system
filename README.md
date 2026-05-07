# Real-Time Mobility Matching System (Kigali)

A high-performance backend for real-time ride coordination, built with NestJS, Redis, and PostgreSQL.

## Core Features
- **Real-Time Tracking**: High-throughput GPS ingestion with H3 spatial indexing.
- **Matching Engine**: Composite scoring ranking based on distance and driver rating.
- **Double-Booking Protection**: Two-layer locking mechanism (Redis + Postgres Transactions).
- **Immutable Event Log**: All state changes are logged for auditability and replay.

---

## Getting Started

### 1. Prerequisites
- Docker & Docker Compose
- Node.js (v20+)

### 2. Infrastructure Setup
Spin up the database and cache:
```bash
docker-compose up -d
```

### 3. Installation
```bash
npm install
npx prisma generate
npx prisma db push
```

### 4. Running the App
```bash
npm run start:dev
```

---

## API Usage Examples

### A. Update Driver Location
```bash
curl -X POST http://localhost:3000/drivers/550e8400-e29b-41d4-a716-446655440000/location \
     -H "Content-Type: application/json" \
     -d '{
       "lat": -1.9441,
       "lng": 30.0619,
       "heading": 90,
       "speedKmh": 45,
       "status": "AVAILABLE"
     }'
```

### B. Request a Ride Match
```bash
curl -X POST http://localhost:3000/rides/match \
     -H "Content-Type: application/json" \
     -H "x-idempotency-key: ride-req-001" \
     -d '{
       "passengerId": "550e8400-e29b-41d4-a716-446655440001",
       "pickupLat": -1.9441,
       "pickupLng": 30.0619,
       "dropoffLat": -1.9500,
       "dropoffLng": 30.0700
     }'
```

### C. Confirm Assignment
*Replace `{rideId}` with the ID returned from the matching endpoint.*
```bash
curl -X POST http://localhost:3000/rides/{rideId}/confirm \
     -H "Content-Type: application/json" \
     -d '{
       "driverId": "550e8400-e29b-41d4-a716-446655440000"
     }'
```

---

## Project Structure
- `src/modules/location`: Ingestion logic and H3 indexing.
- `src/modules/matching`: Pure scoring engine and spatial lookups.
- `src/modules/assignment`: Concurrency-safe confirmation flow.
- `src/modules/events`: Event listeners for immutable logging.
- `src/infrastructure`: Shared Redis and Prisma clients.
