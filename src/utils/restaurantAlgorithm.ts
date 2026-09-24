import { RestaurantItem, BudgetPreference, RestaurantSortOption, RestaurantScoreBreakdown } from '../types';
import { calculateDistanceKm } from './geolocation';

/**
 * Global parameters for Bayesian ranking across verified Vietnamese restaurants.
 * - GLOBAL_AVG_RATING: Global average rating among top-tier spots (4.65)
 * - BAYESIAN_THRESHOLD_WEIGHT (m): Dampening constant (25).
 *   Prevents a 5.0 with only 12 reviews from outranking a 4.8 with 4,000 reviews.
 */
export const GLOBAL_AVG_RATING = 4.65;
export const BAYESIAN_THRESHOLD_WEIGHT = 25;

/**
 * Filter criteria strictly requested:
 * 1. Descartar restaurantes con menos de 10 reviews (reviewsCount >= 10)
 * 2. Mostrar restaurantes con más de 4.5 de puntuación (rating > 4.5)
 */
export function filterStrictRestaurants(rawList: RestaurantItem[]): {
  filtered: RestaurantItem[];
  stats: {
    totalRaw: number;
    approvedCount: number;
    discardedCount: number;
    discardedLowReviews: number;
    discardedLowRating: number;
  };
} {
  let discardedLowReviews = 0;
  let discardedLowRating = 0;

  const filtered = rawList.filter((restaurant) => {
    // Rule 1: Descartar restaurantes con menos de 10 reviews
    if (restaurant.reviewsCount < 10) {
      discardedLowReviews++;
      return false;
    }

    // Rule 2: Mostrar restaurantes con más de 4.5 de puntuación
    if (restaurant.rating <= 4.5) {
      discardedLowRating++;
      return false;
    }

    return true;
  });

  return {
    filtered,
    stats: {
      totalRaw: rawList.length,
      approvedCount: filtered.length,
      discardedCount: discardedLowReviews + discardedLowRating,
      discardedLowReviews,
      discardedLowRating,
    },
  };
}

/**
 * Bayesian Weighted Rating formula (Wilson/IMDb inspired):
 * WR = (v / (v + m)) * R + (m / (v + m)) * C
 * where:
 *   v = reviewsCount
 *   m = BAYESIAN_THRESHOLD_WEIGHT (25)
 *   R = restaurant rating
 *   C = GLOBAL_AVG_RATING (4.65)
 */
export function calculateBayesianRating(
  rating: number,
  reviewsCount: number,
  globalAvg = GLOBAL_AVG_RATING,
  minWeight = BAYESIAN_THRESHOLD_WEIGHT
): number {
  const v = reviewsCount;
  const m = minWeight;
  const weighted = (v / (v + m)) * rating + (m / (v + m)) * globalAvg;
  return Number(weighted.toFixed(3));
}

/**
 * Volume Confidence Bonus:
 * Reward venues that consistently satisfy thousands of customers over time.
 * Scaled sub-linearly with logarithm base 10:
 * - 10 reviews: 1.00x
 * - 100 reviews: 1.05x
 * - 1,000 reviews: 1.10x
 * - 5,000+ reviews: 1.135x
 */
export function calculateVolumeConfidenceBonus(reviewsCount: number): number {
  if (reviewsCount <= 10) return 1.0;
  const logFactor = Math.log10(reviewsCount / 10);
  return Number((1 + 0.05 * logFactor).toFixed(3));
}

/**
 * Budget Fit Multiplier according to traveler's preference:
 * - 'all': All budgets welcome (multiplier 1.0)
 * - 'budget': Prioritize street food / backpacker spots (tier 1: <65k VND / <2.50€)
 * - 'moderate': Mid-range sit-down with AC & comfort (tier 2: 60k-180k VND / 2.50€-7€)
 * - 'fine': Gourmet, Michelin & experiential dining (tier 3/4: >180k VND / >7€)
 */
export function calculateBudgetAffinity(
  restaurant: RestaurantItem,
  budgetPref: BudgetPreference
): number {
  const tier = restaurant.priceTier;

  switch (budgetPref) {
    case 'budget':
      if (tier === 1) return 1.30; // Max bonus for street food authenticity
      if (tier === 2) return 0.85;
      if (tier === 3) return 0.55;
      return 0.35; // tier 4 heavily penalized for tight backpacker budget

    case 'moderate':
      if (tier === 2) return 1.30; // Perfect match
      if (tier === 1) return 1.12; // Inexpensive food is always appreciated
      if (tier === 3) return 0.85;
      return 0.55;

    case 'fine':
      if (tier >= 3) return 1.35; // Michelin, tasting menus & fine dining
      if (tier === 2) return 0.90;
      return 0.65; // tier 1 penalized when explicitly seeking fine dining

    case 'all':
    default:
      return 1.0;
  }
}

/**
 * Value For Money Score ("Calidad por Đồng invertido"):
 * Evaluates how much gastronomic excellence the traveler receives per VND spent.
 */
export function calculateValueForMoneyScore(
  bayesianRating: number,
  avgPriceVnd: number
): number {
  const priceInThousands = Math.max(15, avgPriceVnd / 1000);
  // Diminishing sensitivity to price: price^0.35
  const valueRatio = (bayesianRating * 100) / Math.pow(priceInThousands, 0.35);
  return Number(valueRatio.toFixed(1));
}

/**
 * Master Restaurant Scoring Function:
 * Integrates Bayesian quality, volume trust, budget affinity, and proximity.
 */
export function evaluateRestaurant(
  restaurant: RestaurantItem,
  budgetPref: BudgetPreference,
  userCoords?: { lat: number; lng: number } | null
): RestaurantScoreBreakdown {
  const bayesianRating = calculateBayesianRating(restaurant.rating, restaurant.reviewsCount);
  const volumeBonus = calculateVolumeConfidenceBonus(restaurant.reviewsCount);
  const budgetMatchMultiplier = calculateBudgetAffinity(restaurant, budgetPref);
  const valueScore = calculateValueForMoneyScore(bayesianRating, restaurant.avgPriceVnd);

  let distanceKm: number | undefined;
  let proximityMultiplier = 1.0;

  if (userCoords) {
    distanceKm = calculateDistanceKm(
      userCoords.lat,
      userCoords.lng,
      restaurant.lat,
      restaurant.lng
    );
    // Walking distance boost (< 1.5 km gets up to +3% convenience bonus)
    if (distanceKm <= 1.5) {
      proximityMultiplier = 1.03;
    }
  }

  // Final Composite Score formula:
  // Base Score = BayesianRating * VolumeBonus
  // Adjusted Score = Base Score * BudgetMatchMultiplier * ProximityMultiplier
  const baseScore = bayesianRating * volumeBonus;
  const finalScore = Number((baseScore * budgetMatchMultiplier * proximityMultiplier).toFixed(3));

  return {
    bayesianRating,
    volumeBonus,
    budgetMatchMultiplier,
    valueScore,
    distanceKm: distanceKm !== undefined ? Number(distanceKm.toFixed(2)) : undefined,
    finalScore,
  };
}

/**
 * Sorts restaurants according to user choice
 */
export function sortRestaurants(
  restaurants: RestaurantItem[],
  sortOption: RestaurantSortOption,
  budgetPref: BudgetPreference,
  userCoords?: { lat: number; lng: number } | null
): Array<{
  restaurant: RestaurantItem;
  breakdown: RestaurantScoreBreakdown;
}> {
  // Pre-calculate breakdown for all
  const scoredList = restaurants.map((r) => ({
    restaurant: r,
    breakdown: evaluateRestaurant(r, budgetPref, userCoords),
  }));

  scoredList.sort((a, b) => {
    switch (sortOption) {
      case 'algorithm':
        // Primary: Algorithm composite score
        return b.breakdown.finalScore - a.breakdown.finalScore;

      case 'rating':
        // Prioritize Bayesian rating, tiebreaker review count
        if (b.breakdown.bayesianRating !== a.breakdown.bayesianRating) {
          return b.breakdown.bayesianRating - a.breakdown.bayesianRating;
        }
        return b.restaurant.reviewsCount - a.restaurant.reviewsCount;

      case 'reviews':
        // Total verified reviews volume
        if (b.restaurant.reviewsCount !== a.restaurant.reviewsCount) {
          return b.restaurant.reviewsCount - a.restaurant.reviewsCount;
        }
        return b.restaurant.rating - a.restaurant.rating;

      case 'distance':
        // Distance ascending
        if (a.breakdown.distanceKm !== undefined && b.breakdown.distanceKm !== undefined) {
          return a.breakdown.distanceKm - b.breakdown.distanceKm;
        }
        if (a.breakdown.distanceKm !== undefined) return -1;
        if (b.breakdown.distanceKm !== undefined) return 1;
        return b.breakdown.finalScore - a.breakdown.finalScore;

      case 'value':
        // Value for money score
        return b.breakdown.valueScore - a.breakdown.valueScore;

      case 'price_asc':
        // Lowest average price in VND first
        if (a.restaurant.avgPriceVnd !== b.restaurant.avgPriceVnd) {
          return a.restaurant.avgPriceVnd - b.restaurant.avgPriceVnd;
        }
        return b.breakdown.finalScore - a.breakdown.finalScore;

      default:
        return b.breakdown.finalScore - a.breakdown.finalScore;
    }
  });

  return scoredList;
}

/**
 * Budget preset labels and price boundaries
 */
export const BUDGET_TIER_CONFIG = {
  all: {
    label: 'Todos los presupuestos',
    shortLabel: 'Cualquier precio',
    description: 'Mejor restaurante global sin restricción de gasto',
    icon: '🌏',
  },
  budget: {
    label: 'Económico / Mochilero / Street Food',
    shortLabel: 'Económico (10k - 60k ₫)',
    description: 'Puestos callejeros legendarios, comida auténtica por menos de 2,50 €',
    icon: '🍜',
    maxVnd: 65000,
  },
  moderate: {
    label: 'Medio / Confort & Bistró',
    shortLabel: 'Medio (60k - 180k ₫)',
    description: 'Restaurantes con aire acondicionado, higiene y platos entre 2,50 € y 7 €',
    icon: '🥢',
    minVnd: 60000,
    maxVnd: 180000,
  },
  fine: {
    label: 'Gourmet / Experiencia & Michelin',
    shortLabel: 'Gourmet (> 180k ₫)',
    description: 'Estrellas Michelin, mansiones coloniales y degustación desde 7 €',
    icon: '⭐',
    minVnd: 180000,
  },
} as const;
