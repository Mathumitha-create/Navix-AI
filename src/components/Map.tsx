import React, { useEffect } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  Marker,
  Polyline,
  useMap,
} from "@vis.gl/react-google-maps";
import { Coordinate, RiskZone } from "../types";
import { ORIGINAL_ROUTE, ALTERNATE_ROUTE } from "../constants/routes";
import { Truck } from "lucide-react";

interface MapProps {
  truckPosition: Coordinate;
  isRerouted: boolean;
  journeyStarted?: boolean;
  riskZones?: RiskZone[];
  recommendedRoute?: "original" | "alternate";
}

const segmentPath = (
  route: Coordinate[],
  startIndex: number,
  endIndex: number,
) => route.slice(startIndex, Math.min(route.length, endIndex + 1));

const zoneColor = (riskLevel: RiskZone["riskLevel"]) => {
  if (riskLevel === "high") return "#ef4444";
  if (riskLevel === "medium") return "#f59e0b";
  return "#22c55e";
};

const MapContent: React.FC<MapProps> = ({
  truckPosition,
  isRerouted,
  journeyStarted = false,
  riskZones = [],
  recommendedRoute = "original",
}) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      map.panTo(truckPosition);
    }
  }, [map, truckPosition]);

  const originalOpacity =
    !journeyStarted && recommendedRoute === "original" ? 0.98 : 0.9;
  const alternateOpacity =
    !journeyStarted && recommendedRoute === "alternate" ? 0.92 : 0.55;

  return (
    <>
      <Polyline
        path={ORIGINAL_ROUTE}
        strokeColor="#ef4444"
        strokeOpacity={isRerouted ? 0.3 : originalOpacity}
        strokeWeight={
          !journeyStarted ? 5 : 4
        }
      />

      {(isRerouted || !journeyStarted) && (
        <Polyline
          path={ALTERNATE_ROUTE}
          strokeColor="#22c55e"
          strokeOpacity={journeyStarted ? 0.8 : alternateOpacity}
          strokeWeight={
            !journeyStarted && recommendedRoute === "alternate" ? 5 : 4
          }
        />
      )}

      {!journeyStarted &&
        riskZones.map((zone, index) => {
          const route =
            zone.route === "alternate" ? ALTERNATE_ROUTE : ORIGINAL_ROUTE;

          return (
            <Polyline
              key={`${zone.route}-${zone.startIndex}-${zone.endIndex}-${index}`}
              path={segmentPath(route, zone.startIndex, zone.endIndex)}
              strokeColor={zoneColor(zone.riskLevel)}
              strokeOpacity={0.95}
              strokeWeight={7}
            />
          );
        })}

      <Marker
        position={truckPosition}
        title={journeyStarted ? "Delivery Truck" : "Dispatch Point"}
      />
    </>
  );
};

const Map: React.FC<MapProps> = (props) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500 p-8 text-center">
        <div>
          <Truck className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Google Maps API Key Required</p>
          <p className="text-sm">
            Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.
          </p>
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm text-left max-w-md mx-auto">
            <p className="text-xs font-mono text-gray-400 mb-2">SIMULATED VIEW</p>
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded w-3/4"></div>
              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              <div className="h-2 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-inner bg-gray-200">
      <APIProvider apiKey={apiKey}>
        <GoogleMap
          defaultCenter={ORIGINAL_ROUTE[0]}
          defaultZoom={12}
          mapId="bf51a910020fa857"
          disableDefaultUI={true}
        >
          <MapContent {...props} />
        </GoogleMap>
      </APIProvider>
    </div>
  );
};

export default Map;
