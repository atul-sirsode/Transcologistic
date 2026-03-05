// TollGuru API Request Interfaces
export interface TollGuruLocation {
  address: string;
}

export interface TollGuruVehicle {
  type: string;
}

export interface TollGuruRequest {
  from: TollGuruLocation;
  to: TollGuruLocation;
  vehicle: TollGuruVehicle;
  country: string;
}

// TollGuru API Response Interfaces
export interface TollGuruCoordinates {
  lat: number;
  lng: number;
}

export interface TollGuruRouteLocation {
  location: TollGuruCoordinates;
  address: string;
}

export interface TollGuruFuelPrice {
  value: number;
  currency: string;
  units: string;
  fuelUnit: string;
}

export interface TollGuruFuelEfficiency {
  city: number;
  hwy: number;
  units: string;
  fuelUnit: string;
}

export interface TollGuruUnits {
  currencyUnit: string;
  fuelEfficiencyUnit: string;
  fuelUnit: string;
}

export interface TollGuruShare {
  name: string;
  prefix: string;
  uuid: string;
  issuedAt: string;
  timestamp: string;
  client: string;
}

export interface TollGuruSummary {
  route: TollGuruRouteLocation[];
  countries: string[];
  currency: string;
  vehicleType: string;
  vehicleDescription: string;
  fuelPrice: TollGuruFuelPrice;
  fuelEfficiency: TollGuruFuelEfficiency;
  units: TollGuruUnits;
  departure_time: string;
  departureTime: string;
  share: TollGuruShare;
  source: string;
}

export interface TollGuruRouteSummary {
  hasTolls: boolean;
  tollTypes: string[];
  hasExpressTolls: boolean;
  diffs: {
    cheapest: number;
    fastest: number;
  };
  labels: string[];
  url: string;
  distance: {
    text: string;
    metric: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  name: string;
}

export interface TollGuruCosts {
  licensePlate: null;
  prepaidCard: null;
  currency: string;
  fuel: number;
  tag: number;
  cash: number;
  tagAndCash: number;
  maximumTollCost: number;
  minimumTollCost: number;
}

export interface TollGuruRoute {
  summary: TollGuruRouteSummary;
  costs: TollGuruCosts;
  // Additional route properties may exist
  [key: string]: unknown;
}

export interface TollGuruMeta {
  userId: string;
  accountId: string;
  customerId: string;
  tx: number;
  type: string;
  client: string;
  source: string;
}

export interface TollGuruResponse {
  status: string;
  summary: TollGuruSummary;
  routes: TollGuruRoute[];
  meta: TollGuruMeta;
}

// Route Info
export interface RouteInfoData {
  routeName: string;
  distance: string;
  duration: string;
  fastagTotal: number;
  tollSegments: {
    name: string;
    amount: number;
    estimatedArrival?: string;
    formattedArrivalTime?: string;
  }[];
}

// Toll item with ETA info
export interface TollItem {
  name: string;
  amount: number;
  etaInfo?: {
    formattedArrivalTime?: string;
    estimatedArrival?: string;
  };
  tagCost: number;
  cashCost: number;
}

// API Response Wrapper
export interface TollGuruApiResponse {
  status: string;
  summary: TollGuruSummary;
  routes: TollGuruRoute[];
  meta: TollGuruMeta;
  analysis?: {
    recommendedRoute?: {
      routeInfo?: RouteInfoData;
      tolls?: TollItem[];
      totalCost?: number;
      totalFuelCost?: number;
      totalTollCost?: number;
    };
    alternativeRoutes?: unknown[];
    routeComparison?: unknown;
    tollStatistics?: unknown;
  };
}
