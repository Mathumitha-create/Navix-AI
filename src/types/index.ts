export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteData {
  id: string;
  name: string;
  path: Coordinate[];
  color: string;
}

export interface SimulationState {
  truckPosition: Coordinate;
  currentStep: number;
  traffic: number; // 0-100
  weather: "clear" | "rain";
  isRerouted: boolean;
  delayProbability: number;
  status: "ON TIME" | "DELAY RISK" | "REROUTED" | "DELIVERED";
  remainingDistance: number;
  etaMinutes: number;
  delayReducedMinutes: number;
  alerts: string[];
}

export interface DriverProfile {
  id: string;
  name: string;
}

export interface AdminProfile {
  username: string;
  name: string;
}

export interface Assignment {
  shipment: string;
  source: string;
  destination: string;
}

export interface PredictionInput {
  traffic: number;
  weather: number; // 0 for clear, 1 for rain
  distance: number;
}

export interface PredictionResult {
  delay: 0 | 1;
  confidence: number;
}

export type RiskLevel = "low" | "medium" | "high";

export interface RiskZone {
  route: "original" | "alternate";
  startIndex: number;
  endIndex: number;
  reason: string;
  etaLabel: string;
  riskLevel: RiskLevel;
  trafficForecast: number;
  weather: "clear" | "rain";
}

export interface RouteRiskSummary {
  routeId: "original" | "alternate";
  routeName: string;
  estimatedTimeMinutes: number;
  delayProbability: number;
  riskLevel: RiskLevel;
  recommendation: string;
}

export interface PreJourneyPrediction {
  overallRiskLevel: RiskLevel;
  delayProbability: number;
  headline: string;
  reasons: string[];
  recommendedRoute: "original" | "alternate";
  riskZones: RiskZone[];
  routes: RouteRiskSummary[];
  generatedAt: string;
}

export interface PreJourneyInput {
  departureHour: number;
}

export type FleetTruckStatus =
  | "ON TIME"
  | "AT RISK"
  | "REROUTED"
  | "DELAYED"
  | "DELIVERED";

export interface FleetTruck {
  truckId: string;
  driverName: string;
  shipment: string;
  position: Coordinate;
  routeType: "original" | "alternate";
  currentStep: number;
  traffic: number;
  weather: "clear" | "rain";
  status: FleetTruckStatus;
  etaMinutes: number;
  confidence: number;
  delaySavedMinutes: number;
}

export interface FleetAlert {
  id: string;
  truckId: string;
  level: "info" | "warning" | "critical";
  message: string;
  timestamp: string;
}

export interface AIDecisionLog {
  id: string;
  truckId: string;
  title: string;
  detail: string;
  confidence: number;
  timestamp: string;
}
