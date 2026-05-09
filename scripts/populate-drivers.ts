import { PrismaClient, VehicleType, DriverStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('🧹 Cleaning old data...');
  await prisma.assignment.deleteMany({});
  await prisma.ride.deleteMany({});
  await prisma.driverLocation.deleteMany({});
  await prisma.driver.deleteMany({});

  console.log('👤 Creating 100 test drivers...');
  const drivers: Array<{id: string, name: string, rating: number, vehicleType: VehicleType, status: DriverStatus}> = [];
  for (let i = 0; i < 100; i++) {
    const id = `550e8400-e29b-41d4-a716-44665544${i.toString().padStart(4, '0')}`;
    drivers.push({
      id,
      name: `Driver ${i}`,
      rating: 4.0 + Math.random(),
      vehicleType: VehicleType.CAR,
      status: DriverStatus.AVAILABLE,
    });
  }

  await prisma.driver.createMany({ data: drivers });
  console.log('✅ 100 Drivers created in Database.');

  console.log('📍 Sending 100 location updates to Redis...');
  const updates = drivers.map(d => 
    axios.post(`${BASE_URL}/drivers/${d.id}/location`, {
      lat: -1.9441 + (Math.random() - 0.5) * 0.01,
      lng: 30.0619 + (Math.random() - 0.5) * 0.01,
      heading: Math.floor(Math.random() * 360),
      speedKmh: 30 + Math.random() * 20,
      status: 'AVAILABLE'
    }).catch(e => console.error(`Failed to update ${d.id}`))
  );

  await Promise.all(updates);
  console.log('✅ Redis Spatial Index populated.');
  console.log('\n🚀 READY FOR TESTING! Go to Postman and request a match.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
