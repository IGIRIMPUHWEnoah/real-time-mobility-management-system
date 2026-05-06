import { Injectable } from '@nestjs/common';
import * as h3 from 'h3-js';

@Injectable()
export class H3Service {
  private readonly RESOLUTION = 9;

  getLatLngToCell(lat: number, lng: number): string {
    return h3.latLngToCell(lat, lng, this.RESOLUTION);
  }

  getNeighbors(cell: string, ring: number): string[] {
    return h3.gridDisk(cell, ring);
  }

  // Calculate if a diversion is minimal (for en-route matching)
  isMinimalDiversion(driverCell: string, pickupCell: string): boolean {
    const distance = h3.gridDistance(driverCell, pickupCell);
    return distance !== null && distance <= 2; // Arbitrary threshold for "minimal"
  }
}
