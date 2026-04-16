import React from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  BrainCircuit,
  ShieldAlert,
  Timer,
  Truck,
} from "lucide-react";
import ControlTowerMap from "./ControlTowerMap";
import { AIDecisionLog, FleetAlert, FleetTruck } from "../types";
import { cn } from "../lib/utils";

interface AdminPanelProps {
  trucks: FleetTruck[];
  alerts: FleetAlert[];
  decisions: AIDecisionLog[];
  selectedTruckId: string | null;
  onSelectTruck: (truckId: string) => void;
}

const statusTone = (status: FleetTruck["status"]) => {
  if (status === "DELAYED") return "bg-red-500/15 text-red-300 border-red-500/30";
  if (status === "AT RISK") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (status === "REROUTED") return "bg-sky-500/15 text-sky-300 border-sky-500/30";
  if (status === "DELIVERED") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  return "bg-emerald-500/10 text-emerald-200 border-emerald-500/20";
};

const alertTone = (level: FleetAlert["level"]) => {
  if (level === "critical") return "border-red-500/20 bg-red-500/10 text-red-100";
  if (level === "warning") return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  return "border-sky-500/20 bg-sky-500/10 text-sky-100";
};

const AdminPanel: React.FC<AdminPanelProps> = ({
  trucks,
  alerts,
  decisions,
  selectedTruckId,
  onSelectTruck,
}) => {
  const activeTrucks = trucks.filter((truck) => truck.status !== "DELIVERED").length;
  const atRisk = trucks.filter((truck) => truck.status === "AT RISK" || truck.status === "DELAYED").length;
  const rerouted = trucks.filter((truck) => truck.status === "REROUTED").length;
  const avgConfidence =
    trucks.length > 0
      ? Math.round(
          trucks.reduce((sum, truck) => sum + truck.confidence, 0) / trucks.length,
        )
      : 0;

  const selectedTruck =
    trucks.find((truck) => truck.truckId === selectedTruckId) ?? trucks[0] ?? null;

  return (
    <section className="mt-6 rounded-[28px] border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/40">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 px-6 py-5 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 text-xs font-semibold mb-3">
            <BrainCircuit className="w-3.5 h-3.5" />
            Central AI Control Tower
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Live logistics command center
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Monitor the fleet, watch AI decisions in real time, and intervene
            before disruptions cascade.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[320px]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Total trucks</span>
              <Truck className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="text-2xl font-bold">{trucks.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Active</span>
              <Activity className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-2xl font-bold">{activeTrucks}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>At risk</span>
              <ShieldAlert className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-2xl font-bold">{atRisk}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Rerouted</span>
              <ArrowRightLeft className="w-4 h-4 text-sky-300" />
            </div>
            <div className="text-2xl font-bold">{rerouted}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_320px] gap-0 min-h-[760px]">
        <aside className="border-r border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-1">Fleet intelligence</div>
            <div className="text-3xl font-bold">{avgConfidence}%</div>
            <div className="text-xs text-slate-500 mt-1">
              Average AI confidence across active vehicles
            </div>
          </div>

          <div className="space-y-3">
            {trucks.map((truck) => (
              <button
                key={truck.truckId}
                type="button"
                onClick={() => onSelectTruck(truck.truckId)}
                className={cn(
                  "w-full text-left rounded-2xl border p-4 transition-all",
                  selectedTruckId === truck.truckId
                    ? "border-cyan-400/30 bg-cyan-400/10"
                    : "border-slate-800 bg-slate-900/80 hover:border-slate-700",
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-semibold">{truck.truckId}</div>
                    <div className="text-xs text-slate-400">{truck.driverName}</div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex px-2 py-1 rounded-full border text-[10px] font-semibold",
                      statusTone(truck.status),
                    )}
                  >
                    {truck.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500">{truck.shipment}</div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>ETA {truck.etaMinutes} min</span>
                  <span>AI {truck.confidence}%</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="p-5 flex flex-col gap-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 h-[430px]">
            <div className="flex items-center justify-between mb-3 px-2">
              <div>
                <div className="text-sm font-semibold">Live fleet map</div>
                <div className="text-xs text-slate-500">
                  Green normal, amber at risk, red delayed, blue rerouted
                </div>
              </div>
              <div className="text-xs px-2.5 py-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
                Telemetry stream active
              </div>
            </div>
            <ControlTowerMap
              trucks={trucks}
              selectedTruckId={selectedTruckId}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BrainCircuit className="w-4 h-4 text-cyan-300" />
                <h3 className="font-semibold">AI decisions log</h3>
              </div>
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {decisions.map((decision) => (
                  <div
                    key={decision.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="font-medium text-slate-100">
                        {decision.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {decision.timestamp}
                      </div>
                    </div>
                    <div className="text-sm text-slate-400">{decision.detail}</div>
                    <div className="mt-2 text-xs text-cyan-200">
                      {decision.truckId} • Confidence {decision.confidence}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-4 h-4 text-cyan-300" />
                <h3 className="font-semibold">Selected truck</h3>
              </div>
              {selectedTruck ? (
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-slate-400 text-xs mb-1">Truck</div>
                    <div className="text-lg font-semibold">{selectedTruck.truckId}</div>
                    <div className="text-slate-500">{selectedTruck.driverName}</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-slate-400 text-xs mb-1">Shipment</div>
                    <div>{selectedTruck.shipment}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="text-slate-400 text-xs mb-1">ETA</div>
                      <div className="inline-flex items-center gap-2 font-semibold">
                        <Timer className="w-4 h-4 text-cyan-300" />
                        {selectedTruck.etaMinutes} min
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="text-slate-400 text-xs mb-1">AI</div>
                      <div className="font-semibold">{selectedTruck.confidence}%</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-slate-400 text-xs mb-1">Live status</div>
                    <span
                      className={cn(
                        "inline-flex px-2.5 py-1 rounded-full border text-xs font-semibold",
                        statusTone(selectedTruck.status),
                      )}
                    >
                      {selectedTruck.status}
                    </span>
                    <div className="mt-3 text-slate-400">
                      Traffic {selectedTruck.traffic}% • Weather {selectedTruck.weather}
                    </div>
                    <div className="text-slate-500 mt-1">
                      Delay saved {selectedTruck.delaySavedMinutes} min
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">No truck selected.</div>
              )}
            </div>
          </div>
        </div>

        <aside className="border-l border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <h3 className="font-semibold">Live alerts feed</h3>
          </div>
          <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "rounded-2xl border p-4",
                  alertTone(alert.level),
                )}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="font-medium">{alert.truckId}</div>
                  <div className="text-xs opacity-70">{alert.timestamp}</div>
                </div>
                <div className="text-sm opacity-90">{alert.message}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default AdminPanel;
