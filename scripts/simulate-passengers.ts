import axios from 'axios';

const API_URL = 'http://localhost:3000';
const NUM_PASSENGERS = 30;

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

async function runTest() {
  console.log(`Starting load test with ${NUM_PASSENGERS} passengers...`);
  const startTime = Date.now();
  let completed = 0;
  let conflicts = 0;

  const requests = Array.from({ length: NUM_PASSENGERS }).map(async () => {
    const passengerId = '550e8400-e29b-41d4-a716-446655440000'; // Using a static valid UUID for test
    const idempotencyKey = generateId();

    try {
      const matchRes = await axios.post(`${API_URL}/rides/match`, {
        passengerId,
        pickupLat: -1.9441,
        pickupLng: 30.0619,
        dropoffLat: -1.9500,
        dropoffLng: 30.0700
      }, {
        headers: { 'x-idempotency-key': idempotencyKey }
      });

      const matches = matchRes.data.matches;
      if (matches && matches.length > 0) {
        const rideId = matchRes.data.rideId;
        const driverId = matches[0].driverId;

        await axios.post(`${API_URL}/rides/${rideId}/confirm`, {
          driverId
        });
        completed++;
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        conflicts++;
      }
    }
  });

  await Promise.all(requests);
  
  const duration = (Date.now() - startTime) / 1000;
  console.log('--- Test Results ---');
  console.log(`Duration: ${duration}s`);
  console.log(`Successful Assignments: ${completed}`);
  console.log(`Atomic Conflicts (409): ${conflicts}`);
  console.log(`Average Latency: ${(duration / NUM_PASSENGERS).toFixed(3)}s`);
}

runTest();
