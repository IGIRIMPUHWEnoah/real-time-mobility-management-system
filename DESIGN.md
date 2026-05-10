# Technical Design Document: Real-Time Mobility System


## 1. Overview
This system is designed to handle high-concurrency ride-matching in a real-time environment. It prioritizes **Consistency** (no double-booking) and **Performance** (< 200ms matching).


## 2. Architectural Decisions

### A. Spatial Indexing (Uber H3)
Instead of expensive geometric calculations in the database, we use **H3 Hexagonal Hierarchical Indexing**.

- **Reasoning**: It partitions the map into fixed cells. Searching for drivers is reduced from an $O(N)$ global search to an $O(1)$ local bucket lookup.
- **Implementation**: Drivers are mapped to H3 cells in Redis. Matches are found by checking the passenger's cell and its immediate neighbors.

### B. Dual-Layer Storage (Redis + PostgreSQL)
- **Redis (Hot Layer)**: Handles high-frequency data (GPS updates every few seconds). This prevents write-bloat in the primary database.
- **PostgreSQL (Source of Truth)**: Handles immutable records like Assignments and Ride History.

## 3. Concurrency & Atomicity

### The "Double-Booking" Problem
In a high-traffic system, two passengers might try to book the same driver at the same millisecond. 


### Our Solution: Two-Phase Locking
1. **Redis Distributed Lock**: Before an assignment begins, we attempt to acquire a lock in Redis for that specific `driverId`. This acts as a first line of defense.
2. **Database Row-Level Locking**: Inside a PostgreSQL transaction, we use `SELECT ... FOR UPDATE`. This ensures that even if a request bypasses the Redis lock, the database will strictly enforce that only one transaction can modify that driver's status to `ON_TRIP`.


## 4. Scalability
- **Stateless API**: The NestJS application stores no local state, allowing it to be scaled horizontally across multiple containers.
- **Event-Driven Audit**: Location updates and assignments are emitted as events via Redis Pub/Sub, allowing for background processing (Logging, Analytics) without blocking the main request path.


## 5. Non-Functional Requirements
- **Latency**: P95 matching latency is kept under 200ms by avoiding database joins during the matching phase.
- **Staleness**: A 10-second heartbeat check ensures only active drivers are returned to passengers.
