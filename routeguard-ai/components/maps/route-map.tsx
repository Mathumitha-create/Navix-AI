"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";

import { bangalore, chennai, type SavedPlace } from "@/lib/map-config";

type RouteMapProps = {
  className?: string;
  heightClassName?: string;
  apiKey?: string;
  source?: SavedPlace;
  destination?: SavedPlace;
  aiDecision?: "reroute" | "continue" | null;
  onRouteStateChange?: (state: {
    detected: boolean;
    rerouting: boolean;
    rerouted: boolean;
    completed: boolean;
    status: string;
    trafficDelay: number;
    remainingDistance: number;
    currentLocation: string;
    totalDistance: number;
    etaSeconds: number;
    weatherCondition: string | null;
    weatherRiskLevel: "low" | "medium" | "high" | null;
  }) => void;
};

type LatLngPoint = {
  lat: number;
  lng: number;
};

type RouteOption = {
  encodedPolyline: string;
  polyline: string;
  distance: number;
  duration: string;
  trafficDuration: string;
};

type RouteApiResponse = RouteOption & {
  alternatives: RouteOption[];
};

type TrackingApiResponse = {
  trafficDelay: number;
  weatherCondition: "rain" | "clear" | "storm";
  weatherRiskLevel: "low" | "medium" | "high";
  updatedEta: string;
  updatedEtaSeconds: number;
  remainingDistance: number;
  temperature: number;
};

type FetchError = Error & {
  status?: number;
};

const containerStyle = {
  width: "100%",
  height: "100%",
};

const STEP_INTERVAL_MS = 4000;
const STEP_ANIMATION_MS = 3400;
const TRACKING_POLL_MS = 15_000;
const DISRUPTION_DELAY_JUMP_MINUTES = 5;
const REROUTE_ALERT_MS = 1800;
const MAX_ROUTE_POINTS = 42;
const NAVIGATION_ZOOM = 10.2;
const NAVIGATION_TILT = 42;

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
    <circle cx="36" cy="36" r="28" fill="#07131B" fill-opacity="0.92" stroke="#7BF1FF" stroke-opacity="0.35"/>
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

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function getHeading(from: LatLngPoint, to: LatLngPoint) {
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

function decodePolyline(encoded: string): LatLngPoint[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: LatLngPoint[] = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return coordinates;
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
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRemainingDistanceMeters(currentPosition: LatLngPoint, path: LatLngPoint[], nextIndex: number) {
  if (path.length === 0) {
    return 0;
  }

  const clampedIndex = Math.min(Math.max(nextIndex, 0), path.length - 1);
  let remainingDistance = getDistanceMeters(currentPosition, path[clampedIndex]);

  for (let index = clampedIndex; index < path.length - 1; index += 1) {
    remainingDistance += getDistanceMeters(path[index], path[index + 1]);
  }

  return remainingDistance;
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

function parseDurationSeconds(value: string) {
  const match = value.match(/([\d.]+)s/);
  return match ? Number(match[1]) : 0;
}

function formatCurrentLocation(point: LatLngPoint) {
  return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
}

function getRoutePriority(route: RouteOption) {
  return parseDurationSeconds(route.trafficDuration || route.duration);
}

async function fetchRouteData(params: {
  source: LatLngPoint;
  destination: LatLngPoint;
  alternatives?: boolean;
  signal?: AbortSignal;
}) {
  const response = await fetch("/api/route", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: params.source,
      destination: params.destination,
      alternatives: params.alternatives ?? false,
    }),
    signal: params.signal,
  });

  const data = (await response.json()) as RouteApiResponse | { error?: string };

  if (!response.ok || !("polyline" in data)) {
    throw new Error("error" in data && data.error ? data.error : "Unable to load route.");
  }

  return data;
}

export function RouteMap({
  className,
  heightClassName = "h-[30rem]",
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  source = chennai,
  destination = bangalore,
  aiDecision = null,
  onRouteStateChange,
}: RouteMapProps) {
  const [routeData, setRouteData] = useState<RouteApiResponse | null>(null);
  const [rerouteData, setRerouteData] = useState<RouteOption | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingApiResponse | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  const [truckPosition, setTruckPosition] = useState<LatLngPoint>({ lat: source.lat, lng: source.lng });
  const [activePointIndex, setActivePointIndex] = useState(0);
  const [detected, setDetected] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [rerouted, setRerouted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [animationStartOverride, setAnimationStartOverride] = useState<LatLngPoint | null>(null);

  const animationFrameRef = useRef<number>();
  const cameraFrameRef = useRef<number>();
  const rerouteTimeoutRef = useRef<number>();
  const mapRef = useRef<google.maps.Map | null>(null);
  const truckPositionRef = useRef<LatLngPoint>(truckPosition);
  const trackingRequestInFlightRef = useRef(false);
  const disruptionTriggeredRef = useRef(false);
  const previousTrackingRef = useRef<TrackingApiResponse | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "routeguard-google-maps",
    googleMapsApiKey: apiKey,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadRoute() {
      try {
        setIsRouteLoading(true);
        setRouteError(null);
        const data = await fetchRouteData({
          source: { lat: source.lat, lng: source.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          signal: controller.signal,
        });

        setRouteData(data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setRouteError((error as Error).message || "Unable to load route.");
      } finally {
        setIsRouteLoading(false);
      }
    }

    loadRoute();

    return () => {
      controller.abort();
    };
  }, [destination.lat, destination.lng, source.lat, source.lng]);

  const basePath = useMemo(() => {
    const encodedPath = routeData?.encodedPolyline || routeData?.polyline;
    return encodedPath ? sampleRoute(decodePolyline(encodedPath)) : [];
  }, [routeData]);

  const reroutePath = useMemo(() => {
    const encodedPath = rerouteData?.encodedPolyline || rerouteData?.polyline;
    return encodedPath ? sampleRoute(decodePolyline(encodedPath)) : [];
  }, [rerouteData]);

  const activePath = rerouted && reroutePath.length > 0 ? reroutePath : basePath;
  const displayRouteData = rerouted && rerouteData ? rerouteData : routeData;
  const previousPoint =
    activePointIndex === 0 ? activePath[0] ?? truckPosition : activePath[activePointIndex - 1];
  const nextPoint = activePath[activePointIndex] ?? truckPosition;
  const remainingDistanceMeters =
    trackingData?.remainingDistance ??
    getRemainingDistanceMeters(truckPosition, activePath, activePointIndex);
  const etaSeconds =
    trackingData?.updatedEtaSeconds ??
    (displayRouteData ? parseDurationSeconds(displayRouteData.trafficDuration || displayRouteData.duration) : 0);
  const trafficDelay = trackingData?.trafficDelay ?? 0;

  const status = completed
    ? "Delivery complete"
    : rerouting
      ? "AI rerouting the vehicle"
      : rerouted
        ? "Truck on optimized route"
        : detected
          ? "Risk detected - AI reviewing"
          : "Truck en route";

  const weatherSegmentColor =
    trackingData?.weatherRiskLevel === "high"
      ? "#fb7185"
      : trackingData?.weatherRiskLevel === "medium"
        ? "#facc15"
        : null;

  useEffect(() => {
    truckPositionRef.current = truckPosition;
  }, [truckPosition]);

  useEffect(() => {
    if (basePath.length === 0) {
      return;
    }

    disruptionTriggeredRef.current = false;
    previousTrackingRef.current = null;
    setDetected(false);
    setRerouting(false);
    setRerouted(false);
    setCompleted(false);
    setRerouteData(null);
    setTrackingData(null);
    setTrackingError(null);
    setAnimationStartOverride(null);
    setActivePointIndex(0);
    setTruckPosition(basePath[0]);
  }, [basePath]);

  useEffect(() => {
    if (!trackingData) {
      return;
    }

    const previousTracking = previousTrackingRef.current;
    const suddenTrafficIncrease =
      previousTracking &&
      trackingData.trafficDelay - previousTracking.trafficDelay >= DISRUPTION_DELAY_JUMP_MINUTES;
    const severeWeather =
      trackingData.weatherCondition === "rain" || trackingData.weatherCondition === "storm";
    const weatherWorsened =
      severeWeather &&
      (!previousTracking ||
        previousTracking.weatherCondition === "clear" ||
        (previousTracking.weatherCondition === "rain" &&
          trackingData.weatherCondition === "storm"));

    if (!disruptionTriggeredRef.current && (suddenTrafficIncrease || weatherWorsened)) {
      disruptionTriggeredRef.current = true;
      setDetected(true);
    }

    previousTrackingRef.current = trackingData;
  }, [trackingData]);

  useEffect(() => {
    if (activePath.length === 0 || completed) {
      return;
    }

    let cancelled = false;

    async function loadTracking() {
      if (trackingRequestInFlightRef.current) {
        return;
      }

      trackingRequestInFlightRef.current = true;

      try {
        setTrackingError(null);
        const currentPosition = truckPositionRef.current;
        const response = await fetch("/api/tracking", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentLocation: currentPosition,
            destination: { lat: destination.lat, lng: destination.lng },
          }),
        });

        const data = (await response.json()) as TrackingApiResponse | { error?: string };

        if (!response.ok || !("weatherCondition" in data)) {
          const error = new Error(
            "error" in data && data.error ? data.error : "Unable to load tracking."
          ) as FetchError;
          error.status = response.status;
          throw error;
        }

        if (!cancelled) {
          setTrackingData(data);
        }
      } catch (error) {
        if (!cancelled) {
          setTrackingError((error as Error).message || "Unable to load tracking.");
        }
      } finally {
        trackingRequestInFlightRef.current = false;
      }
    }

    void loadTracking();
    const interval = window.setInterval(() => {
      void loadTracking();
    }, TRACKING_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activePath.length, completed, destination.lat, destination.lng, rerouted]);

  useEffect(() => {
    if (
      aiDecision !== "reroute" ||
      !detected ||
      rerouted ||
      rerouting ||
      completed
    ) {
      return;
    }

    let cancelled = false;
    setRerouting(true);

    async function rerouteFromDecision() {
      try {
        const response = await fetchRouteData({
          source: truckPositionRef.current,
          destination: { lat: destination.lat, lng: destination.lng },
          alternatives: true,
        });

        const candidates = [response, ...response.alternatives]
          .filter((candidate) => candidate.encodedPolyline !== displayRouteData?.encodedPolyline)
          .sort((left, right) => getRoutePriority(left) - getRoutePriority(right));

        const selectedRoute = candidates[0];

        if (!selectedRoute || cancelled) {
          setRerouting(false);
          return;
        }

        const sampledPath = sampleRoute(decodePolyline(selectedRoute.encodedPolyline || selectedRoute.polyline));
        const currentPosition = truckPositionRef.current;
        const rerouteIndex = Math.min(
          findClosestPointIndex(sampledPath, currentPosition) + 1,
          Math.max(sampledPath.length - 1, 0)
        );

        setRerouteData(selectedRoute);
        setRerouted(true);
        setAnimationStartOverride(currentPosition);
        setTruckPosition(currentPosition);
        setActivePointIndex(rerouteIndex);

        rerouteTimeoutRef.current = window.setTimeout(() => {
          if (!cancelled) {
            setRerouting(false);
          }
        }, REROUTE_ALERT_MS);
      } catch {
        if (!cancelled) {
          setRerouting(false);
        }
      }
    }

    void rerouteFromDecision();

    return () => {
      cancelled = true;
    };
  }, [aiDecision, completed, destination.lat, destination.lng, detected, displayRouteData?.encodedPolyline, rerouted, rerouting]);

  useEffect(() => {
    if (activePath.length < 2 || completed) {
      return;
    }

    const interval = window.setInterval(() => {
      setActivePointIndex((currentIndex) => {
        if (currentIndex >= activePath.length - 1) {
          return currentIndex;
        }

        return currentIndex + 1;
      });
    }, STEP_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [activePath, completed]);

  useEffect(() => {
    if (activePath.length === 0 || completed) {
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

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
        return;
      }

      if (activePointIndex >= activePath.length - 1) {
        setTruckPosition(end);
        setCompleted(true);
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activePath, activePointIndex, animationStartOverride, completed]);

  useEffect(() => {
    if (!onRouteStateChange || !displayRouteData) {
      return;
    }

    onRouteStateChange({
      detected,
      rerouting,
      rerouted,
      completed,
      status,
      trafficDelay,
      remainingDistance: remainingDistanceMeters / 1000,
      currentLocation: formatCurrentLocation(truckPosition),
      totalDistance: displayRouteData.distance / 1000,
      etaSeconds,
      weatherCondition: trackingData?.weatherCondition ?? null,
      weatherRiskLevel: trackingData?.weatherRiskLevel ?? null,
    });
  }, [
    completed,
    detected,
    displayRouteData,
    etaSeconds,
    onRouteStateChange,
    remainingDistanceMeters,
    rerouted,
    rerouting,
    status,
    trackingData?.weatherCondition,
    trackingData?.weatherRiskLevel,
    trafficDelay,
    truckPosition,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isLoaded || !map || activePath.length === 0) {
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    activePath.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 64);
  }, [activePath, isLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isLoaded || !map || activePath.length === 0 || activePointIndex < 2 || completed) {
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
  }, [activePath.length, activePointIndex, completed, isLoaded, nextPoint, previousPoint, truckPosition]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      if (cameraFrameRef.current) {
        window.cancelAnimationFrame(cameraFrameRef.current);
      }

      if (rerouteTimeoutRef.current) {
        window.clearTimeout(rerouteTimeoutRef.current);
      }
    };
  }, []);

  if (!apiKey) {
    return (
      <div className={`rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 text-white/70 backdrop-blur-sm ${className ?? ""}`}>
        <p className="text-sm uppercase tracking-[0.28em] text-white/45">Map Preview</p>
        <p className="mt-4 text-lg text-white">
          Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to enable the live route map.
        </p>
      </div>
    );
  }

  if (loadError || routeError) {
    return (
      <div className={`rounded-[2rem] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100 ${className ?? ""}`}>
        <p className="text-sm uppercase tracking-[0.28em] text-rose-200/80">Map Error</p>
        <p className="mt-3 text-sm leading-7">
          {routeError || "Google Maps failed to load. Check that the Maps JavaScript API and backend route API are configured correctly."}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-[0_32px_90px_rgba(0,0,0,0.45)] ${heightClassName} ${className ?? ""}`}>
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[18rem] flex-col gap-2">
        <div className="rounded-full border border-white/10 bg-black/55 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-white/82 backdrop-blur-md">
          {status}
        </div>
        {trackingError ? (
          <div className="rounded-2xl border border-rose-400/18 bg-rose-500/12 px-4 py-3 text-xs leading-6 text-rose-100 backdrop-blur-md">
            {trackingError}
          </div>
        ) : null}
      </div>

      {isRouteLoading || !isLoaded ? (
        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(123,241,255,0.08),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.03),_rgba(255,255,255,0.02))] text-sm uppercase tracking-[0.22em] text-white/45">
          Loading live route
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={truckPosition}
          zoom={9.2}
          onLoad={(map) => {
            mapRef.current = map;
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
            minZoom: 5,
            maxZoom: 18,
            streetViewControl: false,
            fullscreenControl: false,
            rotateControl: true,
          }}
        >
          {rerouted && basePath.length > 0 ? (
            <PolylineF
              path={basePath}
              options={{
                strokeColor: "#fb7185",
                strokeOpacity: 0.4,
                strokeWeight: 4,
              }}
            />
          ) : null}

          {activePath.length > 0 ? (
            <PolylineF
              path={activePath}
              options={{
                strokeColor: rerouted ? "#6ee7b7" : "#7bf1ff",
                strokeOpacity: 0.95,
                strokeWeight: rerouted ? 6 : 5,
              }}
            />
          ) : null}

          {weatherSegmentColor && activePath.length > 0 ? (
            <PolylineF
              path={[truckPosition, nextPoint]}
              options={{
                strokeColor: weatherSegmentColor,
                strokeOpacity: 0.95,
                strokeWeight: 8,
                zIndex: 20,
              }}
            />
          ) : null}

          <MarkerF position={{ lat: source.lat, lng: source.lng }} title={source.name} />
          <MarkerF position={{ lat: destination.lat, lng: destination.lng }} title={destination.name} />
          {activePath.length > 0 ? (
            <MarkerF position={truckPosition} title={status} icon={truckIcon} />
          ) : null}
        </GoogleMap>
      )}
    </div>
  );
}
