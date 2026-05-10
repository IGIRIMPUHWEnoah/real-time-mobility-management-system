import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { latLngToCell } from 'h3-js';

const prisma = new PrismaClient();
const redis = new Redis();

async function main() {
  await prisma.ride.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.driver.deleteMany();

  const driversData: any[] = [];
  for (let i = 0; i < 100; i++) {
    driversData.push({
      id: `550e8400-e29b-41d4-a716-44665544${i.toString().padStart(4, '0')}`,
      name: `Driver ${i}`,
      rating: 4.0 + Math.random(),
      vehicleType: 'CAR',
      status: 'AVAILABLE'
    });
  }

  await prisma.driver.createMany({ data: driversData });
  console.log('Database drivers created.');

  const updates = driversData.map(d => {
    const lat = -1.9441 + (Math.random() - 0.5) * 0.05;
    const lng = 30.0619 + (Math.random() - 0.5) * 0.05;
    const cellId = latLngToCell(lat, lng, 9);
    return redis.hset(`driver:${d.id}:meta`, {
      lat,
      lng,
      h3_cell: cellId,
      status: 'AVAILABLE',
      updated_at: Date.now()
    });
  });

  await Promise.all(updates);
  console.log('Redis spatial index populated.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
