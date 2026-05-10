import { Injectable, Logger } from '@nestjs/common';

export interface DriverCandidate {
  id: string;
  lat: number;
  lng: number;
  rating: number;
  status: string;
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
  private readonly logger = new Logger(MatchingEngine.name);
  private readonly WEIGHTS = {
    DISTANCE: 0.6,
    RATING: 0.4,
  };

  rankDrivers(pickupLat: number, pickupLng: number, candidates: DriverCandidate[]): MatchResult[] {
    const scored = candidates.map((driver) => {
      const dLat = Number(driver.lat);
      const dLng = Number(driver.lng);
      const dRating = Number(driver.rating) || 5.0;

      let distance = 10000;
      if (!isNaN(dLat) && !isNaN(dLng)) {
        distance = this.calculateDistance(pickupLat, pickupLng, dLat, dLng);
      }

      const distanceScore = Number(Math.max(0, 1 - (distance / 5000)).toFixed(4));
      const ratingScore = Number((dRating / 5.0).toFixed(4));
      const statusPenalty = (driver.status === 'ON-TRIP' || driver.status === 'ON_TRIP') ? 0.2 : 0;

      let finalScore = (distanceScore * this.WEIGHTS.DISTANCE) + (ratingScore * this.WEIGHTS.RATING) - statusPenalty;
      
      if (isNaN(finalScore)) finalScore = 0;

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

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) * 
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
