"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleF,
  DirectionsService,
  GoogleMap,
  MarkerF,
  PolylineF,
  useJsApiLoader,
} from "@react-google-maps/api";

import { bangalore, chennai } from "@/lib/map-config";

type SimulationMode = "normal" | "problem" | "solution";

type RouteMapProps = {
  className?: string;
  heightClassName?: string;
  apiKey?: string;
  simulationMode?: SimulationMode;
  onSimulationStateChange?: (state: {
    detected: boolean;
    paused: boolean;
    rerouting: boolean;
    rerouted: boolean;
    alert: string;
  }) => void;
};

type LatLngPoint = {
  lat: number;
  lng: number;
};

const containerStyle = {
  width: "100%",
  height: "100%",
};

const STEP_INTERVAL_MS = 2000;
const STEP_ANIMATION_MS = 1600;
const DELAY_PAUSE_MS = 4000;
const REROUTE_ALERT_MS = 1200;
const MAX_ROUTE_POINTS = 30;
const RISK_RADIUS_METERS = 32000;
const APPROACH_RADIUS_METERS = 76000;
const NAVIGATION_ZOOM = 10.8;
const NAVIGATION_TILT = 45;

const truckIcon = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="36" cy="36" r="28" fill="#07131B" fill-opacity="0.9" stroke="#7BF1FF" stroke-opacity="0.35"/>
    <g filter="url(#glow)">
      <path d="M23 31.5C23 29.567 24.567 28 26.5 28H42C43.1046 28 44 28.8954 44 30V31H49.5C50.3422 31 51.1238 31.4211 51.5883 32.122L55.0883 37.372C55.3716 37.797 55.523 38.2965 55.523 38.8072V45C55.523 46.1046 54.6276 47 53.523 47H51.5C51.2239 44.7498 49.3062 43 47 43C44.6938 43 42.7761 44.7498 42.5 47H33.5C33.2239 44.7498 31.3062 43 29 43C26.6938 43 24.7761 44.7498 24.5 47H24C23.4477 47 23 46.5523 23 46V31.5Z" fill="#7BF1FF"/>
      <circle cx="29" cy="47" r="4" fill="#EAFBFF"/>
      <circle cx="47" cy="47" r="4" fill="#EAFBFF"/>
      <path d="M44 33H49.1679C49.8361 33 50.4571 33.334 50.8284 33.8906L53.1054 37.3061C53.5474 37.9691 53.0721 38.8571 52.2753 38.8571H44V33Z" fill="#B3F7FF"/>
    </g>
  </svg>
`)}`;

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function getHeading(from: LatLngPoint, to: LatLngPoint) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const toDegrees = (value: number) => (value * 180) / Math.PI;
  const fromLat = toRadians(from.lat);
  const fromLng = toRadians(from.lng);
  const toLat = toRadians(to.lat);
  const toLng = toRadians(to.lng);
  const y = Math.sin(toLng - fromLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(toLng - fromLng);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function sampleRoute(points: LatLngPoint[]) {
  if (points.length <= MAX_ROUTE_POINTS) {
    return points;
  }

  const lastIndex = points.length - 1;

  return Array.from({ length: MAX_ROUTE_POINTS }, (_, index) => {
    const sampledIndex = Math.round((index / (MAX_ROUTE_POINTS - 1)) * lastIndex);
    return points[sampledIndex];
  });
}

function getDistanceMeters(from: LatLngPoint, to: LatLngPoint) {
  const earthRadius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildDetourPoint(
  beforePoint: LatLngPoint,
  afterPoint: LatLngPoint,
  center: LatLngPoint
) {
  const vectorX = afterPoint.lng - beforePoint.lng;
  const vectorY = afterPoint.lat - beforePoint.lat;
  const magnitude = Math.hypot(vectorX, vectorY) || 1;
  const perpendicularX = -vectorY / magnitude;
  const perpendicularY = vectorX / magnitude;
  const detourDistanceMeters = RISK_RADIUS_METERS + 18000;
  const latOffset = (detourDistanceMeters / 111320) * perpendicularY;
  const lngOffset =
    (detourDistanceMeters /
      (111320 * Math.cos((center.lat * Math.PI) / 180))) *
    perpendicularX;

  return {
    lat: center.lat + latOffset,
    lng: center.lng + lngOffset,
  };
}

function findClosestPointIndex(points: LatLngPoint[], target: LatLngPoint) {
  return points.reduce(
    (closest, point, index) => {
      const distance = getDistanceMeters(point, target);
      return distance < closest.distance ? { index, distance } : closest;
    },
    { index: 0, distance: Number.POSITIVE_INFINITY }
  ).index;
}

export function RouteMap({
  className,
  heightClassName = "h-[26rem]",
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  simulationMode = "normal",
  onSimulationStateChange,
}: RouteMapProps) {
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [truckPosition, setTruckPosition] = useState<LatLngPoint>({
    lat: chennai.lat,
    lng: chennai.lng,
  });
  const [activePointIndex, setActivePointIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [detected, setDetected] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [rerouted, setRerouted] = useState(false);
  const [animationStartOverride, setAnimationStartOverride] =
    useState<LatLngPoint | null>(null);

  const animationFrameRef = useRef<number>();
  const pauseTimeoutRef = useRef<number>();
  const rerouteTimeoutRef = useRef<number>();
  const cameraFrameRef = useRef<number>();
  const problemTriggeredRef = useRef(false);
  const solutionTriggeredRef = useRef(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "routeguard-google-maps",
    googleMapsApiKey: apiKey,
  });

  const directionsOptions = useMemo<google.maps.DirectionsRequest>(
    () => ({
      origin: chennai.name,
      destination: bangalore.name,
      travelMode: "DRIVING" as google.maps.TravelMode,
      provideRouteAlternatives: false,
    }),
    []
  );

  const basePath = useMemo(() => {
    if (!directions) {
      return [];
    }

    const overviewPath = directions.routes[0]?.overview_path ?? [];

    return sampleRoute(
      overviewPath.map((point) => ({
        lat: point.lat(),
        lng: point.lng(),
      }))
    );
  }, [directions]);

  const riskZoneCenter = useMemo<LatLngPoint | null>(() => {
    if (simulationMode === "normal" || basePath.length === 0) {
      return null;
    }

    return basePath[Math.floor(basePath.length * 0.58)] ?? null;
  }, [basePath, simulationMode]);

  const reroutePath = useMemo(() => {
    if (simulationMode !== "solution" || !riskZoneCenter || basePath.length < 8) {
      return basePath;
    }

    const riskIndex = Math.floor(basePath.length * 0.58);
    const beforeIndex = Math.max(riskIndex - 3, 1);
    const afterIndex = Math.min(riskIndex + 3, basePath.length - 2);
    const detourPoint = buildDetourPoint(
      basePath[beforeIndex],
      basePath[afterIndex],
      riskZoneCenter
    );

    return sampleRoute([
      ...basePath.slice(0, beforeIndex + 1),
      detourPoint,
      ...basePath.slice(afterIndex),
    ]);
  }, [basePath, riskZoneCenter, simulationMode]);

  const activePath =
    simulationMode === "solution" && rerouted ? reroutePath : basePath;
  const previousPoint =
    activePointIndex === 0 ? activePath[0] ?? truckPosition : activePath[activePointIndex - 1];
  const nextPoint = activePath[activePointIndex] ?? truckPosition;

  const overlayText =
    simulationMode === "problem"
      ? isPaused
        ? "Unexpected delay detected!"
        : "Truck en route..."
      : simulationMode === "solution"
        ? rerouting || rerouted
          ? "High risk ahead - rerouting..."
          : "Truck en route..."
        : "Truck en route...";

  useEffect(() => {
    if (!onSimulationStateChange) {
      return;
    }

    onSimulationStateChange({
      detected,
      paused: isPaused,
      rerouting,
      rerouted,
      alert: overlayText,
    });
  }, [detected, isPaused, onSimulationStateChange, overlayText, rerouted, rerouting]);

  useEffect(() => {
    if (basePath.length === 0) {
      return;
    }

    problemTriggeredRef.current = false;
    solutionTriggeredRef.current = false;
    setDetected(false);
    setIsPaused(false);
    setRerouting(false);
    setRerouted(false);
    setAnimationStartOverride(null);
    setActivePointIndex(0);
    setTruckPosition(basePath[0]);
  }, [basePath, simulationMode]);

  useEffect(() => {
    if (activePath.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      if (isPaused) {
        return;
      }

      setActivePointIndex((currentIndex) =>
        currentIndex >= activePath.length - 1 ? 0 : currentIndex + 1
      );
    }, STEP_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [activePath, isPaused]);

  useEffect(() => {
    if (activePath.length === 0 || isPaused) {
      return;
    }

    const start =
      animationStartOverride ??
      (activePointIndex === 0 ? activePath[0] : activePath[activePointIndex - 1]);
    const end = activePath[activePointIndex];
    const startedAt = performance.now();

    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    const animate = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / STEP_ANIMATION_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextPosition = {
        lat: lerp(start.lat, end.lat, eased),
        lng: lerp(start.lng, end.lng, eased),
      };

      if (animationStartOverride) {
        setAnimationStartOverride(null);
      }

      setTruckPosition(nextPosition);

      if (
        simulationMode === "problem" &&
        riskZoneCenter &&
        !problemTriggeredRef.current &&
        getDistanceMeters(nextPosition, riskZoneCenter) <= RISK_RADIUS_METERS
      ) {
        problemTriggeredRef.current = true;
        setDetected(true);
        setIsPaused(true);

        if (animationFrameRef.current) {
          window.cancelAnimationFrame(animationFrameRef.current);
        }

        pauseTimeoutRef.current = window.setTimeout(() => {
          setIsPaused(false);
        }, DELAY_PAUSE_MS);

        return;
      }

      if (
        simulationMode === "solution" &&
        riskZoneCenter &&
        !solutionTriggeredRef.current &&
        !rerouted &&
        getDistanceMeters(nextPosition, riskZoneCenter) <= APPROACH_RADIUS_METERS
      ) {
        solutionTriggeredRef.current = true;
        setDetected(true);
        setRerouting(true);
        setRerouted(true);

        const rerouteIndex = Math.min(
          findClosestPointIndex(reroutePath, nextPosition) + 1,
          Math.max(reroutePath.length - 1, 0)
        );

        setAnimationStartOverride(nextPosition);
        setTruckPosition(nextPosition);
        setActivePointIndex(rerouteIndex);

        if (animationFrameRef.current) {
          window.cancelAnimationFrame(animationFrameRef.current);
        }

        rerouteTimeoutRef.current = window.setTimeout(() => {
          setRerouting(false);
        }, REROUTE_ALERT_MS);

        return;
      }

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    activePath,
    activePointIndex,
    animationStartOverride,
    isPaused,
    rerouted,
    reroutePath,
    riskZoneCenter,
    simulationMode,
  ]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      if (pauseTimeoutRef.current) {
        window.clearTimeout(pauseTimeoutRef.current);
      }

      if (rerouteTimeoutRef.current) {
        window.clearTimeout(rerouteTimeoutRef.current);
      }

      if (cameraFrameRef.current) {
        window.cancelAnimationFrame(cameraFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!isLoaded || !map) {
      return;
    }

    const heading = getHeading(previousPoint, nextPoint);

    if (cameraFrameRef.current) {
      window.cancelAnimationFrame(cameraFrameRef.current);
    }

    cameraFrameRef.current = window.requestAnimationFrame(() => {
      map.panTo(truckPosition);
      map.setZoom(NAVIGATION_ZOOM);
      map.setTilt(NAVIGATION_TILT);
      map.setHeading(heading);
    });

    return () => {
      if (cameraFrameRef.current) {
        window.cancelAnimationFrame(cameraFrameRef.current);
      }
    };
  }, [isLoaded, nextPoint, previousPoint, truckPosition]);

  if (!apiKey) {
    return (
      <div
        className={`rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 text-white/70 backdrop-blur-sm ${className ?? ""}`}
      >
        <p className="text-sm uppercase tracking-[0.28em] text-white/45">Map Preview</p>
        <p className="mt-4 text-lg text-white">
          Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to enable the live route map.
        </p>
        <p className="mt-2 text-sm leading-7 text-white/55">
          The component is ready and will render the Chennai-to-Bangalore route
          as soon as the browser API key is available.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className={`rounded-[2rem] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100 ${className ?? ""}`}
      >
        <p className="text-sm uppercase tracking-[0.28em] text-rose-200/80">Map Error</p>
        <p className="mt-3 text-sm leading-7">
          Google Maps failed to load. Check that the Maps JavaScript API and
          Directions API are enabled for your key.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-[0_32px_90px_rgba(0,0,0,0.45)] ${heightClassName} ${className ?? ""}`}
    >
      <div
        className={`pointer-events-none absolute left-4 top-4 z-10 rounded-full px-4 py-2 backdrop-blur-md transition ${
          simulationMode === "problem" && detected
            ? "border border-rose-300/30 bg-rose-950/70"
            : simulationMode === "solution" && (rerouting || rerouted)
              ? "border border-emerald-300/30 bg-emerald-950/65"
              : "border border-cyan-300/20 bg-black/55"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                simulationMode === "problem" && detected
                  ? "bg-rose-400/60"
                  : simulationMode === "solution" && (rerouting || rerouted)
                    ? "bg-emerald-400/60"
                    : "bg-cyan-300/55"
              }`}
            />
            <span
              className={`relative inline-flex h-3 w-3 rounded-full ${
                simulationMode === "problem" && detected
                  ? "bg-rose-300 shadow-[0_0_24px_rgba(251,113,133,0.85)]"
                  : simulationMode === "solution" && (rerouting || rerouted)
                    ? "bg-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.85)]"
                    : "bg-cyan-200 shadow-[0_0_24px_rgba(123,241,255,0.85)]"
              }`}
            />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/82">
            {overlayText}
          </span>
        </div>
      </div>

      {!isLoaded ? (
        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(123,241,255,0.08),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.03),_rgba(255,255,255,0.02))] text-sm uppercase tracking-[0.22em] text-white/45">
          Loading map
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={truckPosition}
          zoom={NAVIGATION_ZOOM}
          onLoad={(map) => {
            mapRef.current = map;
            map.setTilt(NAVIGATION_TILT);
            map.setHeading(getHeading(chennai, bangalore));
          }}
          onUnmount={() => {
            mapRef.current = null;
          }}
          options={{
            mapTypeId: "satellite",
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "greedy",
            clickableIcons: false,
            keyboardShortcuts: false,
            tilt: NAVIGATION_TILT,
            minZoom: 7,
            maxZoom: 18,
            heading: getHeading(chennai, bangalore),
            rotateControl: true,
            fullscreenControl: false,
            streetViewControl: false,
          }}
        >
          {!directions && (
            <DirectionsService
              options={directionsOptions}
              callback={(result, status) => {
                if (
                  status === google.maps.DirectionsStatus.OK &&
                  result &&
                  !directions
                ) {
                  setDirections(result);
                }
              }}
            />
          )}

          {simulationMode === "solution" && rerouted && basePath.length > 0 && (
            <PolylineF
              path={basePath}
              options={{
                strokeColor: "#fb7185",
                strokeOpacity: 0.32,
                strokeWeight: 4,
              }}
            />
          )}

          {activePath.length > 0 && (
            <PolylineF
              path={activePath}
              options={{
                strokeColor:
                  simulationMode === "problem"
                    ? "#ff9c9c"
                    : simulationMode === "solution"
                      ? "#6ee7b7"
                      : "#7bf1ff",
                strokeOpacity: 0.96,
                strokeWeight: simulationMode === "solution" ? 6 : 5,
              }}
            />
          )}

          {riskZoneCenter && (
            <CircleF
              center={riskZoneCenter}
              radius={RISK_RADIUS_METERS}
              options={{
                fillColor:
                  simulationMode === "solution" ? "#10b981" : "#ef4444",
                fillOpacity: simulationMode === "solution" ? 0.12 : 0.18,
                strokeColor:
                  simulationMode === "solution" ? "#6ee7b7" : "#fb7185",
                strokeOpacity: 0.95,
                strokeWeight: 2,
              }}
            />
          )}

          <MarkerF
            position={{ lat: chennai.lat, lng: chennai.lng }}
            title={chennai.name}
          />
          <MarkerF
            position={{ lat: bangalore.lat, lng: bangalore.lng }}
            title={bangalore.name}
          />
          {activePath.length > 0 && (
            <MarkerF
              position={truckPosition}
              title={overlayText}
              icon={truckIcon}
            />
          )}
        </GoogleMap>
      )}
    </div>
  );
}
