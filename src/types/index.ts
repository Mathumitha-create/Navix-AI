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
