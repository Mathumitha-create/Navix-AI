import { Coordinate } from "../types";

// Chennai Central -> Poonamallee -> Sriperumbudur -> Walajabad -> Kanchipuram
export const ORIGINAL_ROUTE: Coordinate[] = [
  { lat: 13.0827, lng: 80.2707 },
  { lat: 13.0674, lng: 80.2411 },
  { lat: 13.0483, lng: 80.2057 },
  { lat: 13.0381, lng: 80.1554 },
  { lat: 13.0475, lng: 80.0941 },
  { lat: 13.0422, lng: 80.0348 },
  { lat: 12.9675, lng: 79.9476 },
  { lat: 12.9229, lng: 79.8606 },
  { lat: 12.8387, lng: 79.7037 },
];

// Chennai Central -> Porur -> Kundrathur arc -> Sriperumbudur bypass -> Kanchipuram
export const ALTERNATE_ROUTE: Coordinate[] = [
  { lat: 13.0827, lng: 80.2707 },
  { lat: 13.0589, lng: 80.2258 },
  { lat: 13.0378, lng: 80.1776 },
  { lat: 13.0142, lng: 80.1269 },
  { lat: 12.9965, lng: 80.0694 },
  { lat: 12.9726, lng: 80.0035 },
  { lat: 12.9312, lng: 79.9254 },
  { lat: 12.8898, lng: 79.8152 },
  { lat: 12.8387, lng: 79.7037 },
];
