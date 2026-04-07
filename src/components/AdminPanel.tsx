import React from "react";
import { Activity, ShieldAlert, Truck, Timer } from "lucide-react";
import { Assignment, DriverProfile, SimulationState } from "../types";
import { cn } from "../lib/utils";

interface AdminPanelProps {
  state: SimulationState;
  driver: DriverProfile;
  assignment: Assignment;
}

const statusColor = (status: SimulationState["status"]) => {
  if (status === "DELIVERED")
    return "text-green-600 bg-green-50 border-green-100";
  if (status === "DELAY RISK")
    return "text-amber-600 bg-amber-50 border-amber-100";
  if (status === "REROUTED") return "text-blue-600 bg-blue-50 border-blue-100";
  return "text-emerald-600 bg-emerald-50 border-emerald-100";
};

const AdminPanel: React.FC<AdminPanelProps> = ({
  state,
  driver,
  assignment,
}) => {
  const confidence = Number((state.delayProbability * 100).toFixed(1));
  const delayRisk = Math.round(
    Math.min(100, state.traffic * 0.55 + confidence * 0.45),
  );

  const fleet = [
    {
      truckId: driver.id,
      driverName: driver.name,
      shipment: assignment.shipment,
      status: state.status,
      eta: state.etaMinutes,
      confidence,
    },
    {
      truckId: "DRV014",
      driverName: "Ayesha Khan",
      shipment: "SHP-2026-072",
      status: "ON TIME" as const,
      eta: 18,
      confidence: 22,
    },
    {
      truckId: "DRV031",
      driverName: "Karan Mehta",
      shipment: "SHP-2026-108",
      status: "REROUTED" as const,
      eta: 26,
      confidence: 63,
    },
  ];

  return (
    <section className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Admin Fleet Monitor
          </h3>
          <p className="text-sm text-gray-500">
            Live operational visibility across active delivery trucks.
          </p>
        </div>
        <div className="text-xs px-2.5 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-700 font-medium">
          Real-time telemetry stream active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Fleet AI Confidence</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{confidence}%</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Estimated Delay Risk</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{delayRisk}%</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Active Trucks</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{fleet.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-2 font-medium">Truck</th>
              <th className="pb-2 font-medium">Driver</th>
              <th className="pb-2 font-medium">Shipment</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">ETA</th>
              <th className="pb-2 font-medium">AI Confidence</th>
            </tr>
          </thead>
          <tbody>
            {fleet.map((item) => (
              <tr key={item.truckId} className="border-b border-gray-50">
                <td className="py-3 font-semibold text-gray-900">
                  {item.truckId}
                </td>
                <td className="py-3 text-gray-700">{item.driverName}</td>
                <td className="py-3 text-gray-700">{item.shipment}</td>
                <td className="py-3">
                  <span
                    className={cn(
                      "inline-flex px-2.5 py-1 rounded-full border text-xs font-semibold",
                      statusColor(item.status),
                    )}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="py-3 text-gray-700">
                  <span className="inline-flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    {item.eta} min
                  </span>
                </td>
                <td className="py-3 text-gray-700">{item.confidence}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminPanel;
