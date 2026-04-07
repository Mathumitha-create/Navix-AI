import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  SimulationState,
  Assignment,
  DriverProfile,
  AdminProfile,
} from "./types";
import { ORIGINAL_ROUTE, ALTERNATE_ROUTE } from "./constants/routes";
import { predictDelay } from "./services/aiService";
import Map from "./components/Map";
import Dashboard from "./components/Dashboard";
import AlertPanel from "./components/AlertPanel";
import AdminPanel from "./components/AdminPanel";
import {
  Play,
  RotateCcw,
  Truck,
  MapPin,
  Navigation,
  Activity,
  UserCircle2,
  ShieldCheck,
  Route,
  LogIn,
} from "lucide-react";
import { cn } from "./lib/utils";

const STEP_DISTANCE_KM = 4.2;
const AVG_SPEED_KMPM = 0.8;

const ADMIN_DEMO_DRIVER: DriverProfile = {
  id: "DRV001",
  name: "Rahul Verma",
};

const ADMIN_DEMO_ASSIGNMENT: Assignment = {
  shipment: "SHP-2026-041",
  source: "San Francisco Hub",
  destination: "San Jose DC",
};

const App: React.FC = () => {
  const [authView, setAuthView] = useState<"driver" | "admin">("driver");
  const [driverId, setDriverId] = useState("DRV001");
  const [password, setPassword] = useState("demo123");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("admin2026");
  const [isAdminAuthenticating, setIsAdminAuthenticating] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [completionSummary, setCompletionSummary] = useState<{
    totalMinutes: number;
    routeTaken: string;
    delayAvoidedMinutes: number;
  } | null>(null);

  const initialDistance = (ORIGINAL_ROUTE.length - 1) * STEP_DISTANCE_KM;

  const [state, setState] = useState<SimulationState>({
    truckPosition: ORIGINAL_ROUTE[0],
    currentStep: 0,
    traffic: 15,
    weather: "clear",
    isRerouted: false,
    delayProbability: 0.05,
    remainingDistance: initialDistance,
    etaMinutes: Math.ceil(initialDistance / AVG_SPEED_KMPM),
    delayReducedMinutes: 0,
    status: "ON TIME",
    alerts: [],
  });

  const [isRunning, setIsRunning] = useState(false);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  const resetSimulation = useCallback(() => {
    setIsRunning(false);
    if (simulationInterval.current) clearInterval(simulationInterval.current);
    const resetDistance = (ORIGINAL_ROUTE.length - 1) * STEP_DISTANCE_KM;
    setState({
      truckPosition: ORIGINAL_ROUTE[0],
      currentStep: 0,
      traffic: 15,
      weather: "clear",
      isRerouted: false,
      delayProbability: 0.05,
      remainingDistance: resetDistance,
      etaMinutes: Math.ceil(resetDistance / AVG_SPEED_KMPM),
      delayReducedMinutes: 0,
      status: "ON TIME",
      alerts: [],
    });
    setJourneyStarted(false);
    setStartTimestamp(null);
    setCompletionSummary(null);
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setIsAuthenticating(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, password }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setLoginError(payload.message || "Login failed. Please try again.");
        return;
      }

      setDriver(payload.driver);
      setAssignment(payload.assignment);
    } catch {
      setLoginError("Unable to reach server. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAdminLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdminError("");
    setIsAdminAuthenticating(true);

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setAdminError(
          payload.message || "Admin login failed. Please try again.",
        );
        return;
      }

      setAdmin(payload.admin);
    } catch {
      setAdminError("Unable to reach server. Please try again.");
    } finally {
      setIsAdminAuthenticating(false);
    }
  };

  const startJourney = () => {
    const now = Date.now();
    setJourneyStarted(true);
    setStartTimestamp(now);
    setCompletionSummary(null);
    setState((prev) => ({
      ...prev,
      alerts: ["Journey started. Live tracking enabled.", ...prev.alerts],
    }));
    setIsRunning(true);
  };

  const runStep = useCallback(async () => {
    setState((prev) => {
      const nextStep = prev.currentStep + 1;
      const currentRoute = prev.isRerouted ? ALTERNATE_ROUTE : ORIGINAL_ROUTE;

      if (nextStep >= currentRoute.length) {
        setIsRunning(false);
        return {
          ...prev,
          status: "DELIVERED",
          remainingDistance: 0,
          etaMinutes: 0,
          alerts: ["Delivery Completed!", ...prev.alerts],
        };
      }

      const nextPosition = currentRoute[nextStep];
      let nextTraffic = prev.traffic + (Math.random() * 10 - 5);
      let nextWeather = prev.weather;
      let nextAlerts = [...prev.alerts];

      // Simulate disruption at step 3
      if (nextStep === 3 && !prev.isRerouted) {
        nextTraffic = 85;
        nextWeather = "rain";
        nextAlerts = [
          "High traffic ahead",
          "Rain detected in the area",
          ...nextAlerts,
        ];
      }

      const routeStepsRemaining = Math.max(
        0,
        currentRoute.length - 1 - nextStep,
      );
      const remainingDistance = routeStepsRemaining * STEP_DISTANCE_KM;
      const etaMinutes = Math.max(
        0,
        Math.ceil(remainingDistance / AVG_SPEED_KMPM),
      );

      return {
        ...prev,
        truckPosition: nextPosition,
        currentStep: nextStep,
        traffic: Math.max(0, Math.min(100, nextTraffic)),
        weather: nextWeather,
        remainingDistance,
        etaMinutes,
        alerts: nextAlerts,
      };
    });
  }, []);

  // AI Prediction Effect
  useEffect(() => {
    if (!isRunning || !journeyStarted) return;

    const checkAI = async () => {
      const distance =
        (state.isRerouted ? ALTERNATE_ROUTE : ORIGINAL_ROUTE).length -
        state.currentStep;
      const prediction = await predictDelay({
        traffic: state.traffic,
        weather: state.weather === "rain" ? 1 : 0,
        distance,
      });

      setState((prev) => {
        let nextStatus = prev.status;
        let nextIsRerouted = prev.isRerouted;
        let nextAlerts = [...prev.alerts];

        if (prediction.delay === 1 && !prev.isRerouted) {
          nextStatus = "DELAY RISK";
          // Trigger rerouting if risk is high
          if (prediction.confidence > 0.6) {
            nextIsRerouted = true;
            nextStatus = "REROUTED";
            nextAlerts = [
              "AI rerouted your path",
              "New route assigned",
              ...nextAlerts,
            ];
          }
        } else if (prev.isRerouted) {
          nextStatus = "REROUTED";
        } else if (prev.status === "DELIVERED") {
          nextStatus = "DELIVERED";
        } else {
          nextStatus = "ON TIME";
        }

        const delayReducedMinutes = nextIsRerouted ? 8 : 0;

        return {
          ...prev,
          delayProbability: prediction.confidence,
          status: nextStatus,
          isRerouted: nextIsRerouted,
          delayReducedMinutes,
          alerts: nextAlerts,
        };
      });
    };

    checkAI();
  }, [
    state.currentStep,
    state.traffic,
    state.weather,
    isRunning,
    journeyStarted,
  ]);

  useEffect(() => {
    if (state.status !== "DELIVERED" || !startTimestamp || completionSummary)
      return;
    const totalMinutes = Math.max(
      1,
      Math.round((Date.now() - startTimestamp) / 60000),
    );
    setCompletionSummary({
      totalMinutes,
      routeTaken: state.isRerouted
        ? "Alternate Route (AI Optimized)"
        : "Original Route",
      delayAvoidedMinutes: state.delayReducedMinutes,
    });
  }, [
    state.status,
    state.isRerouted,
    state.delayReducedMinutes,
    startTimestamp,
    completionSummary,
  ]);

  useEffect(() => {
    if (isRunning && journeyStarted) {
      simulationInterval.current = setInterval(runStep, 5000);
    } else {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    }
    return () => {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  }, [isRunning, runStep, journeyStarted]);

  if (admin) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  SmartLogistics Admin
                </h1>
              </div>
              <p className="text-gray-500">
                Fleet visibility and AI monitoring
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Logged in as{" "}
                <span className="font-semibold text-gray-700">
                  {admin.name}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setAdmin(null);
                setAuthView("driver");
              }}
              className="px-5 py-2.5 rounded-xl font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Logout
            </button>
          </header>

          <AdminPanel
            state={state}
            driver={ADMIN_DEMO_DRIVER}
            assignment={ADMIN_DEMO_ASSIGNMENT}
          />
        </div>
      </div>
    );
  }

  if (!driver || !assignment) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">
              {authView === "driver" ? "Driver Login" : "Admin Login"}
            </h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            {authView === "driver"
              ? "Enter Driver ID and Password to start your journey."
              : "Enter admin username and password to open the fleet monitor."}
          </p>

          {authView === "driver" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Driver ID
                </label>
                <input
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Enter driver ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Enter password"
                  required
                />
              </div>

              {loginError && (
                <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 px-3 py-2 text-sm">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                {isAuthenticating ? "Verifying..." : "Login"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Username
                </label>
                <input
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Enter admin username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Enter admin password"
                  required
                />
              </div>

              {adminError && (
                <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 px-3 py-2 text-sm">
                  {adminError}
                </div>
              )}

              <button
                type="submit"
                disabled={isAdminAuthenticating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                {isAdminAuthenticating ? "Verifying..." : "Open Admin Page"}
              </button>

              <button
                type="button"
                onClick={() => setAuthView("driver")}
                className="w-full px-4 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Back to Driver Login
              </button>
            </form>
          )}

          <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500">
            Driver demo: <span className="font-mono">DRV001 / demo123</span>
            <br />
            Admin demo: <span className="font-mono">admin / admin2026</span>
          </div>

          {authView === "driver" && (
            <button
              type="button"
              onClick={() => setAuthView("admin")}
              className="w-full mt-3 px-4 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Admin Access
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                SmartLogistics AI
              </h1>
            </div>
            <p className="text-gray-500">
              Real-time predictive routing & fleet management
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <UserCircle2 className="w-4 h-4" />
                Driver:{" "}
                <span className="font-semibold text-gray-700">
                  {driver.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Shipment:{" "}
                <span className="font-semibold text-gray-700">
                  {assignment.shipment}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Route className="w-4 h-4" />
                {assignment.source} → {assignment.destination}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!journeyStarted ? (
              <button
                onClick={startJourney}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Journey
              </button>
            ) : (
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm",
                  isRunning
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md",
                )}
              >
                {isRunning ? (
                  <>
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    Pause Journey
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Resume Journey
                  </>
                )}
              </button>
            )}
            <button
              onClick={resetSimulation}
              className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all shadow-sm"
              title="Reset Simulation"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dashboard Stats */}
        <Dashboard state={state} />

        {!journeyStarted && (
          <div className="mb-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-2">Driver Dashboard</h2>
            <p className="text-gray-600 mb-4">
              Ready to dispatch. Click{" "}
              <span className="font-semibold">Start Journey</span> to begin live
              tracking and AI monitoring.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-gray-500">Driver</div>
                <div className="font-semibold text-gray-900">{driver.name}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-gray-500">Assigned Shipment</div>
                <div className="font-semibold text-gray-900">
                  {assignment.shipment}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-gray-500">Route</div>
                <div className="font-semibold text-gray-900">
                  {assignment.source} → {assignment.destination}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Map View */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-2 h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50 mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                <span className="text-sm font-bold">Live Tracking</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 bg-red-500 rounded-full" />
                  Original Route
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 bg-green-500 rounded-full" />
                  Alternate Route
                </div>
              </div>
            </div>
            <div className="h-[calc(100%-48px)]">
              <Map
                truckPosition={state.truckPosition}
                isRerouted={state.isRerouted}
              />
            </div>
          </div>

          {/* Alert Panel */}
          <div className="h-full">
            <AlertPanel alerts={state.alerts} />
          </div>
        </div>

        {completionSummary && (
          <div className="mt-6 bg-green-50 border border-green-100 rounded-2xl p-5">
            <h3 className="font-bold text-green-700 mb-3">
              Delivery Completed ✅
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-green-600">Total Time</p>
                <p className="font-semibold text-green-900">
                  {completionSummary.totalMinutes} min
                </p>
              </div>
              <div>
                <p className="text-green-600">Delay Avoided</p>
                <p className="font-semibold text-green-900">
                  {completionSummary.delayAvoidedMinutes} min
                </p>
              </div>
              <div>
                <p className="text-green-600">Route Taken</p>
                <p className="font-semibold text-green-900">
                  {completionSummary.routeTaken}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <footer className="mt-8 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              <span>Route Optimization: Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>
                AI Confidence: {(state.delayProbability * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <p>© 2026 SmartLogistics AI Systems</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
