import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000';

async function simulate() {
  const drivers = await prisma.driver.findMany();
  
  if (drivers.length === 0) {
    console.log('No drivers found. Run populate-drivers first.');
    return;
  }

  console.log(`Simulating ${drivers.length} drivers...`);

  const KIGALI_CENTER = { lat: -1.9441, lng: 30.0619 };

  setInterval(async () => {
    for (const driver of drivers) {
      try {
        const driftLat = (Math.random() - 0.5) * 0.02;
        const driftLng = (Math.random() - 0.5) * 0.02;
        
        await axios.post(`${API_URL}/drivers/${driver.id}/location`, {
          lat: KIGALI_CENTER.lat + driftLat,
          lng: KIGALI_CENTER.lng + driftLng,
          heading: Math.floor(Math.random() * 360),
          speedKmh: Math.floor(Math.random() * 60),
          status: 'AVAILABLE'
        });
      } catch (e) {
        // Silent catch
      }
    }
  }, 8000);
}

simulate();
