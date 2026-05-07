import { Injectable } from '@nestjs/common';

export interface DriverCandidate {
  id: string;
  lat: number;
  lng: number;
  rating: number;
  status: string;
  distance?: number;
}

export interface MatchResult {
  driverId: string;
  score: number;
  breakdown: {
    distanceScore: number;
    ratingScore: number;
    statusPenalty: number;
  };
}

@Injectable()
export class MatchingEngine {
  private readonly WEIGHTS = {
    DISTANCE: 0.6,
    RATING: 0.4,
  };

  /**
   * Pure function to rank candidates
   */
  rankDrivers(pickupLat: number, pickupLng: number, candidates: DriverCandidate[]): MatchResult[] {
    const scored = candidates.map((driver) => {
      // 1. Distance Calculation (Simple Haversine or Euclidean for take-home)
      const distance = this.calculateDistance(pickupLat, pickupLng, driver.lat, driver.lng);
      
      // 2. Normalize Scores (0-1 range)
      // distanceScore: closer (smaller distance) = higher score
      const distanceScore = Math.max(0, 1 - distance / 5000); // Max 5km radius
      
      // ratingScore: higher rating = higher score
      const ratingScore = driver.rating / 5.0;

      // 3. Status Penalty (En-route drivers get a 20% penalty)
      const statusPenalty = driver.status === 'BUSY' ? 0.2 : 0;

      const finalScore = 
        (distanceScore * this.WEIGHTS.DISTANCE) + 
        (ratingScore * this.WEIGHTS.RATING) - 
        statusPenalty;

      return {
        driverId: driver.id,
        score: Number(finalScore.toFixed(4)),
        breakdown: {
          distanceScore,
          ratingScore,
          statusPenalty,
        },
      };
    });

    // Sort by score descending and return top 3
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
