import React from "react";
import { APIProvider, Map as GoogleMap, Marker, Polyline } from "@vis.gl/react-google-maps";
import { ALTERNATE_ROUTE, ORIGINAL_ROUTE } from "../constants/routes";
import { FleetTruck } from "../types";

declare const google: any;

interface ControlTowerMapProps {
  trucks: FleetTruck[];
  selectedTruckId: string | null;
}

const markerIcon = (status: FleetTruck["status"]) => {
  const fillColor =
    status === "DELAYED"
      ? "#ef4444"
      : status === "AT RISK"
        ? "#f59e0b"
        : status === "REROUTED"
          ? "#38bdf8"
          : "#22c55e";

  return {
    path: 0, // Maps to google.maps.SymbolPath.CIRCLE
    fillColor,
    fillOpacity: 1,
    strokeColor: "#0f172a",
    strokeWeight: 2,
    scale: 7,
  };
};

const selectedIcon = {
  path: 0, // Maps to google.maps.SymbolPath.CIRCLE
  fillColor: "#f8fafc",
  fillOpacity: 1,
  strokeColor: "#22c55e",
  strokeWeight: 3,
  scale: 10,
};

const ControlTowerMap: React.FC<ControlTowerMapProps> = ({
  trucks,
  selectedTruckId,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  if (!apiKey) {
    return (
      <div className="w-full h-full rounded-2xl border border-slate-800 bg-slate-950/80 text-slate-400 flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-lg font-semibold text-slate-200 mb-2">
            Control tower map requires Google Maps
          </div>
          <p className="text-sm">
            Add <span className="font-mono">VITE_GOOGLE_MAPS_API_KEY</span> to
            view the live fleet map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <APIProvider apiKey={apiKey}>
        <GoogleMap
          defaultCenter={ORIGINAL_ROUTE[2]}
          defaultZoom={10}
          mapId="bf51a910020fa857"
          disableDefaultUI={true}
        >
          <Polyline
            path={ORIGINAL_ROUTE}
            strokeColor="#f97316"
            strokeOpacity={0.9}
            strokeWeight={4}
          />
          <Polyline
            path={ALTERNATE_ROUTE}
            strokeColor="#22c55e"
            strokeOpacity={0.75}
            strokeWeight={4}
          />

          {trucks.map((truck) => (
            <React.Fragment key={truck.truckId}>
              {selectedTruckId === truck.truckId && (
                <Marker
                  position={truck.position}
                  title={`${truck.truckId} selected`}
                  icon={selectedIcon}
                />
              )}
              <Marker
                position={truck.position}
                title={`${truck.truckId} • ${truck.status}`}
                icon={markerIcon(truck.status)}
              />
            </React.Fragment>
          ))}
        </GoogleMap>
      </APIProvider>
    </div>
  );
};

export default ControlTowerMap;
