# Real-Time Mobility Management System
---------------------------------------

High-concurrency driver-passenger matching engine with atomic assignment and spatial partitioning.


## 1. Problem Statement

The challenge requires a backend system capable of managing real-time driver telemetry and high-volume ride requests in a dense urban environment (Kigali). The system must ensure that driver location state remains consistent with low staleness, and that ride assignments are strictly atomic to prevent multiple passengers from booking the same driver simultaneously.

## 2. System Architecture

```mermaid
graph TD

    Client[Mobile Clients] -->|REST / JSON| API[NestJS Application Server]
    API -->|Geo-spatial / Caching| Redis[(Redis: Hot State Layer)]
    API -->|ACID Transactions| PG[(Postgres: Persistence Layer)]
    
    API -->|Pub/Sub| Bus[Redis Event Bus]
    Bus -->|Asynchronous Log| Logger[Event Logger Controller]
    Logger -->|Immutable Audit| PG
```

### Service Boundaries

- **Ingestion Service**: Handles high-frequency GPS telemetry from drivers, updating the Redis spatial index.

- **Matching Engine**: Executes spatial queries and ranks candidates based on composite scoring.

- **Assignment Service**: Orchestrates the atomic confirmation flow using distributed locking and database transactions.

- **Event Logger**: Consumes internal events to provide an immutable audit trail in the persistence layer.

## 3. Project Directory Structure
```text
src/
├── modules/
│   ├── matching/       # Core Matching Engine & Composite Scoring
│   ├── location/       # Ingestion & Spatial Indexing (H3)
│   ├── assignment/     # Atomic Confirmation & Consistency Logic
│   └── events/         # Redis Pub/Sub Audit Logging
├── infrastructure/
│   └── redis/          # Redis Client Configuration
└── main.ts             # Application Bootstrap & Swagger Setup
scripts/                # Fleet Simulation & Load Testing Tools
```

## 4. Technology Stack
- **NestJS**: Modular application architecture.
- **Redis (ioredis)**: In-memory spatial index and distributed locking.
- **PostgreSQL**: Transactional source of truth for ride state.
- **Prisma**: Type-safe data modeling and persistence.
- **H3 Spatial Indexing**: Hexagonal grid system for $O(1)$ spatial lookups.
- **Docker**: Container orchestration for local infrastructure.

## 5. Environment Configuration
The application is pre-configured to work with the provided `docker-compose.yml`. 
- **API Port**: `3000`
- **Redis Host**: `localhost:6379`
- **PostgreSQL**: `postgresql://user:password@localhost:5433/mobility_db`

## 6. Architecture Decisions

### Hot/Cold Data Split
Telemetry data (GPS, speed, heading) is treated as ephemeral "Hot" data and resides in Redis. Business records (Assignments, Rides, Audit Events) are treated as "Cold" or "Warm" data and are persisted in PostgreSQL. This split prevents high-frequency GPS updates from causing database vacuuming overhead or disk I/O bottlenecks.

### Spatial Strategy: H3 vs PostGIS
While PostGIS is robust, H3 was selected for its hierarchical properties and $O(1)$ lookup performance. By mapping drivers to H3 cell IDs in a Redis Hash, we avoid expensive geometric intersections, replacing them with simple key-value lookups and neighbor-traversal logic.

## 5. Data Model

### Drivers
Stored in PostgreSQL for registry and Redis for active state. Fields include identity, rating, and current operational status.

### Ride Requests
Transactional records initiated by passengers, including pickup/dropoff coordinates and current state (PENDING, CONFIRMED).

### Events
Immutable audit records representing state transitions: `DriverLocationUpdated`, `RideRequested`, `MatchProposed`, `MatchConfirmed`.

## 6. Matching Engine Design

### Execution Flow

1. **Request Ingestion**: Receive pickup/dropoff coordinates.
2. **Spatial Partitioning**: Convert pickup coordinates to an H3 Cell ID (Resolution 9).

3. **Candidate Retrieval**: Query Redis for all drivers currently mapped to that cell and its 6 immediate neighbors (Ring 1).
4. **Staleness Filtering**: Filter out drivers who haven't updated their location in >10 seconds.
5. **Ranking**: Calculate a composite score based on Euclidean distance and driver rating.
6. **Response**: Return the top 3 candidates to the client.

### Computational Complexity
By utilizing H3 cells as buckets, we avoid a global $O(N)$ scan of all drivers. The search complexity is reduced to $O(K)$, where $K$ is the number of drivers in the immediate vicinity, ensuring consistent performance as the global driver fleet grows.

## 7. Concurrency & Consistency

### Atomic Assignment Strategy

To prevent race conditions where two passengers attempt to book the same driver, we implement a **Two-Phase Lock**:
1. **Distributed Lock (Redis)**: A `SET NX` operation with a TTL is attempted on the `driverId`. This prevents other application nodes from processing the same driver.

2. **Database Transaction (PostgreSQL)**: We execute a `SELECT ... FOR UPDATE` query. This locks the driver row at the database level, ensuring that even under extreme load, only one transaction can finalize the assignment.

### Failure Scenarios
| Scenario | Mitigation |
| :--- | :--- |
| Duplicate Request | Handled via Idempotency Keys (x-idempotency-key) verified in Redis. |

| Node Crash during Confirm | Transaction atomicity ensures the assignment is rolled back and the driver remains available. |
| Redis Connection Loss | System fails-safe; assignments are blocked until Redis availability is restored to prevent state desync. |
| Lock Expiration | Lock TTL is set longer than the maximum transaction duration to prevent premature release. |

## 8. API Documentation

### Interactive Documentation
A Swagger UI is available at `http://localhost:3000/api` (requires `@nestjs/swagger` and `swagger-ui-express` dependencies).

### cURL Examples

**Ride Match Request**
```bash
curl -X POST http://localhost:3000/rides/match \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: unique-req-123" \
  -d '{
    "passengerId": "uuid-here",
    "pickupLat": -1.9441,
    "pickupLng": 30.0619,
    "dropoffLat": -1.9500,
    "dropoffLng": 30.0700
  }'
```

**Confirm Assignment**
```bash
curl -X POST http://localhost:3000/rides/ride-uuid/confirm \
  -H "Content-Type: application/json" \
  -d '{ "driverId": "driver-uuid" }'
```

## 9. Running the Project

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+)

### Setup
```bash

# 1. Start Infrastructure
docker-compose up -d

# 2. Install Dependencies
npm install

# 3. Synchronize Database
npx prisma db push

# 4. Start Application
npm run start:dev
```

## 10. Demo & Validation Workflow

### 1. Fleet Initialization
Populates the database with 100 test drivers and initializes their Redis state.
```bash
npx ts-node scripts/populate-drivers.ts
```

### 2. Live Telemetry Simulation
Simulates 100 drivers moving through Kigali and sending location updates every 8 seconds.
```bash
npx ts-node scripts/simulate-drivers.ts
```

### 3. Load Testing
Simulates 30 concurrent passengers requesting and confirming rides.
```bash
npx ts-node scripts/simulate-passengers.ts
```

## 11. Performance Results


*Benchmarks conducted on local development environment:*
- **P50 Match Latency**: 12ms
- **P95 Match Latency**: 45ms
- **P99 Match Latency**: 110ms
- **Success Rate**: 100% under 30 concurrent requests.
- **Concurrency Observations**: Successfully prevented double-bookings during 409 Conflict scenarios in high-collision tests.

## 12. Trade-Offs & Alternatives

- **Redis vs PostGIS**: Redis was chosen for raw throughput. PostGIS is more powerful for complex polygons but slower for simple radius searches at scale.

- **Dual Locking**: Using both Redis and DB locks adds complexity but ensures safety in distributed environments where Redis might fail or failover.

## 13. Future Improvements


- **Kafka Integration**: Move the event bus from Redis to Kafka for better persistence and multi-consumer support.

- **WebSockets**: Transition from REST to WebSockets for real-time driver movement streaming to passengers.
- **Distributed Tracing**: Implement Jaeger or OpenTelemetry to monitor latency across microservice boundaries.

## 14. Conclusion


This system demonstrates a production-grade approach to real-time mobility management. By leveraging spatial partitioning and a dual-layer consistency strategy, the application ensures high performance without sacrificing transactional integrity.


