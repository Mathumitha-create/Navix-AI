import React from "react";
import {
  Activity,
  Cloud,
  Navigation,
  Clock3,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { SimulationState } from "../types";
import { cn } from "../lib/utils";

interface DashboardProps {
  state: SimulationState;
}

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">Status</span>
          {state.status === "ON TIME" || state.status === "DELIVERED" ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : state.status === "DELAY RISK" ? (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          ) : (
            <Navigation className="w-5 h-5 text-blue-500" />
          )}
        </div>
        <div
          className={cn(
            "text-xl font-bold",
            state.status === "ON TIME" || state.status === "DELIVERED"
              ? "text-green-600"
              : state.status === "DELAY RISK"
                ? "text-amber-600"
                : "text-blue-600",
          )}
        >
          {state.status}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">
            Traffic Level
          </span>
          <Activity className="w-5 h-5 text-red-500" />
        </div>
        <div className="text-xl font-bold text-gray-900">{state.traffic}%</div>
        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              state.traffic > 70
                ? "bg-red-500"
                : state.traffic > 40
                  ? "bg-amber-500"
                  : "bg-green-500",
            )}
            style={{ width: `${state.traffic}%` }}
          />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">Weather</span>
          <Cloud
            className={cn(
              "w-5 h-5",
              state.weather === "rain" ? "text-blue-400" : "text-amber-400",
            )}
          />
        </div>
        <div className="text-xl font-bold text-gray-900 capitalize">
          {state.weather}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {state.weather === "rain"
            ? "Reduced visibility, slippery roads"
            : "Optimal driving conditions"}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">ETA</span>
          <Clock3 className="w-5 h-5 text-purple-500" />
        </div>
        <div className="text-xl font-bold text-gray-900">
          {state.etaMinutes} min
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Remaining: {state.remainingDistance.toFixed(1)} km
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">
            Delay Probability
          </span>
          <Activity className="w-5 h-5 text-purple-500" />
        </div>
        <div className="text-xl font-bold text-gray-900">
          {(state.delayProbability * 100).toFixed(1)}%
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Delay reduced: {state.delayReducedMinutes} min
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
