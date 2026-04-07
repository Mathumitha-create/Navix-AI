import { Coordinate } from '../types';

// Sample route from San Francisco to San Jose
export const ORIGINAL_ROUTE: Coordinate[] = [
  { lat: 37.7749, lng: -122.4194 },
  { lat: 37.75, lng: -122.4 },
  { lat: 37.7, lng: -122.35 },
  { lat: 37.65, lng: -122.3 },
  { lat: 37.6, lng: -122.25 },
  { lat: 37.55, lng: -122.2 },
  { lat: 37.5, lng: -122.15 },
  { lat: 37.45, lng: -122.1 },
  { lat: 37.4, lng: -122.05 },
  { lat: 37.3382, lng: -121.8863 }
];

// Alternate route (more inland)
export const ALTERNATE_ROUTE: Coordinate[] = [
  { lat: 37.7749, lng: -122.4194 },
  { lat: 37.78, lng: -122.3 },
  { lat: 37.75, lng: -122.2 },
  { lat: 37.7, lng: -122.15 },
  { lat: 37.65, lng: -122.1 },
  { lat: 37.6, lng: -122.05 },
  { lat: 37.55, lng: -122.0 },
  { lat: 37.5, lng: -121.95 },
  { lat: 37.45, lng: -121.9 },
  { lat: 37.3382, lng: -121.8863 }
];
