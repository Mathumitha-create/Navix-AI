import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  SimulationState,
  Assignment,
  DriverProfile,
  AdminProfile,
  PreJourneyPrediction,
  FleetTruck,
  FleetAlert,
  AIDecisionLog,
} from "./types";
import { ORIGINAL_ROUTE, ALTERNATE_ROUTE } from "./constants/routes";
import { predictDelay, predictPreJourneyRisk } from "./services/aiService";
import Map from "./components/Map";
import Dashboard from "./components/Dashboard";
import AlertPanel from "./components/AlertPanel";
import AdminPanel from "./components/AdminPanel";
import PreJourneyPanel from "./components/PreJourneyPanel";
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
const FLEET_SIZE = 12;
const MAX_ALERTS = 12;
const MAX_DECISIONS = 10;

const FLEET_DRIVERS = [
  "Rahul Verma",
  "Ayesha Khan",
  "Karan Mehta",
  "Priya Nair",
  "Arjun Patel",
  "Sneha Iyer",
  "Vikram Singh",
  "Meera Das",
  "Rohan Bedi",
  "Nisha Rao",
  "Kabir Shah",
  "Divya Menon",
];

const formatTimestamp = () =>
  new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

const createInitialFleet = (): FleetTruck[] =>
  Array.from({ length: FLEET_SIZE }, (_, index) => {
    const routeType = index % 4 === 0 ? "alternate" : "original";
    const route = routeType === "alternate" ? ALTERNATE_ROUTE : ORIGINAL_ROUTE;
    const currentStep = Math.min(index % 5, route.length - 2);
    const traffic = 20 + ((index * 9) % 45);
    const confidence = 28 + ((index * 7) % 30);

    return {
      truckId: `DRV${String(index + 1).padStart(3, "0")}`,
      driverName: FLEET_DRIVERS[index],
      shipment: `SHP-2026-${String(41 + index).padStart(3, "0")}`,
      position: route[currentStep],
      routeType,
      currentStep,
      traffic,
      weather: index % 5 === 0 ? "rain" : "clear",
      status: traffic > 60 ? "AT RISK" : "ON TIME",
      etaMinutes: Math.max(8, (route.length - currentStep - 1) * 6),
      confidence,
      delaySavedMinutes: routeType === "alternate" ? 6 + (index % 4) * 2 : 0,
    };
  });

const ADMIN_DEMO_ASSIGNMENT: Assignment = {
  shipment: "SHP-2026-041",
  source: "Chennai Hub, India",
  destination: "Kanchipuram DC, India",
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
  const [preJourneyPrediction, setPreJourneyPrediction] =
    useState<PreJourneyPrediction | null>(null);
  const [isPreJourneyLoading, setIsPreJourneyLoading] = useState(false);
  const [preJourneyError, setPreJourneyError] = useState("");
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [completionSummary, setCompletionSummary] = useState<{
    totalMinutes: number;
    routeTaken: string;
    delayAvoidedMinutes: number;
  } | null>(null);
  const [fleetTrucks, setFleetTrucks] = useState<FleetTruck[]>(createInitialFleet);
  const [fleetAlerts, setFleetAlerts] = useState<FleetAlert[]>([
    {
      id: "boot-alert",
      truckId: "SYSTEM",
      level: "info",
      message:
        "AI control tower is online. Telemetry sync established across the fleet.",
      timestamp: formatTimestamp(),
    },
  ]);
  const [aiDecisions, setAiDecisions] = useState<AIDecisionLog[]>([
    {
      id: "boot-decision",
      truckId: "SYSTEM",
      title: "Fleet optimizer initialized",
      detail:
        "Baseline ETAs computed for all active trucks and watchlist thresholds are armed.",
      confidence: 93,
      timestamp: formatTimestamp(),
    },
  ]);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>("DRV001");

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
  const adminInterval = useRef<NodeJS.Timeout | null>(null);

  const loadPreJourneyPrediction = useCallback(async () => {
    setIsPreJourneyLoading(true);
    setPreJourneyError("");

    try {
      const forecast = await predictPreJourneyRisk({
        departureHour: new Date().getHours(),
      });
      setPreJourneyPrediction(forecast);
    } catch {
      setPreJourneyError("Unable to generate pre-journey forecast right now.");
    } finally {
      setIsPreJourneyLoading(false);
    }
  }, []);

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
    void loadPreJourneyPrediction();
  }, [loadPreJourneyPrediction]);

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
      setFleetTrucks(createInitialFleet());
      setFleetAlerts([
        {
          id: `login-alert-${Date.now()}`,
          truckId: "SYSTEM",
          level: "info",
          message: "Control tower opened. Streaming live logistics telemetry.",
          timestamp: formatTimestamp(),
        },
      ]);
      setAiDecisions([
        {
          id: `login-decision-${Date.now()}`,
          truckId: "SYSTEM",
          title: "Control tower activated",
          detail:
            "AI risk monitors are now evaluating route health, weather exposure, and ETA variance.",
          confidence: 96,
          timestamp: formatTimestamp(),
        },
      ]);
      setSelectedTruckId("DRV001");
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

    void checkAI();
  }, [
    state.currentStep,
    state.traffic,
    state.weather,
    isRunning,
    journeyStarted,
    state.isRerouted,
  ]);

  useEffect(() => {
    if (state.status !== "DELIVERED" || !startTimestamp || completionSummary) {
      return;
    }

    const routeLength = state.isRerouted ? ALTERNATE_ROUTE.length : ORIGINAL_ROUTE.length;
    const simulatedTravelMinutes = Math.round((routeLength - 1) * (STEP_DISTANCE_KM / AVG_SPEED_KMPM));
    const trafficPenaltyMinutes = state.isRerouted ? 4 : 12;
    const totalMinutes = Math.max(
      18,
      simulatedTravelMinutes + trafficPenaltyMinutes,
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
    } else if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }

    return () => {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  }, [isRunning, runStep, journeyStarted]);

  useEffect(() => {
    if (!driver || !assignment || journeyStarted) return;
    void loadPreJourneyPrediction();
  }, [driver, assignment, journeyStarted, loadPreJourneyPrediction]);

  useEffect(() => {
    if (!admin) {
      if (adminInterval.current) clearInterval(adminInterval.current);
      return;
    }

    adminInterval.current = setInterval(() => {
      setFleetTrucks((prev) => {
        const nextTimestamp = formatTimestamp();
        const nextAlerts: FleetAlert[] = [];
        const nextDecisions: AIDecisionLog[] = [];

        const nextFleet = prev.map((truck, index) => {
          const currentRoute =
            truck.routeType === "alternate" ? ALTERNATE_ROUTE : ORIGINAL_ROUTE;
          const nextStep = Math.min(truck.currentStep + 1, currentRoute.length - 1);
          const weather =
            nextStep >= 3 && nextStep <= 5 && (index + Date.now()) % 3 === 0
              ? "rain"
              : truck.weather;
          const trafficShift = ((index % 3) - 1) * 8 + 3;
          const traffic = Math.max(12, Math.min(96, truck.traffic + trafficShift));
          const confidence = Math.min(
            97,
            Math.max(
              22,
              Math.round(traffic * 0.72 + (weather === "rain" ? 12 : 0)),
            ),
          );
          let status: FleetTruck["status"] = "ON TIME";
          let routeType = truck.routeType;
          let delaySavedMinutes = truck.delaySavedMinutes;

          if (nextStep >= currentRoute.length - 1) {
            status = "DELIVERED";
          } else if (traffic >= 82) {
            status = "DELAYED";
          } else if (traffic >= 66 || weather === "rain") {
            status = "AT RISK";
          }

          if (
            status !== "DELIVERED" &&
            routeType === "original" &&
            traffic >= 74 &&
            index % 2 === 0
          ) {
            routeType = "alternate";
            status = "REROUTED";
            delaySavedMinutes = 10 + (index % 4) * 3;
            nextAlerts.push({
              id: `${truck.truckId}-reroute-${Date.now()}-${index}`,
              truckId: truck.truckId,
              level: "warning",
              message: `AI rerouted ${truck.truckId} to the bypass corridor to avoid severe congestion.`,
              timestamp: nextTimestamp,
            });
            nextDecisions.push({
              id: `${truck.truckId}-decision-${Date.now()}-${index}`,
              truckId: truck.truckId,
              title: `AI rerouted ${truck.truckId}`,
              detail: `Traffic spike detected on the original corridor. Estimated ${delaySavedMinutes} minutes saved by switching routes.`,
              confidence,
              timestamp: nextTimestamp,
            });
          } else if (status === "DELAYED" && index % 3 === 0) {
            nextAlerts.push({
              id: `${truck.truckId}-delay-${Date.now()}-${index}`,
              truckId: truck.truckId,
              level: "critical",
              message: `${truck.truckId} has entered a high-delay zone due to dense traffic and reduced speed.`,
              timestamp: nextTimestamp,
            });
            nextDecisions.push({
              id: `${truck.truckId}-delay-decision-${Date.now()}-${index}`,
              truckId: truck.truckId,
              title: `Delay predicted for ${truck.truckId}`,
              detail: `AI confidence reached ${confidence}% after detecting sustained congestion and ETA drift.`,
              confidence,
              timestamp: nextTimestamp,
            });
          } else if (status === "AT RISK" && index % 4 === 1) {
            nextAlerts.push({
              id: `${truck.truckId}-weather-${Date.now()}-${index}`,
              truckId: truck.truckId,
              level: "warning",
              message: `${truck.truckId} is approaching a weather risk pocket with reduced visibility.`,
              timestamp: nextTimestamp,
            });
          }

          const route = routeType === "alternate" ? ALTERNATE_ROUTE : ORIGINAL_ROUTE;
          const boundedStep = Math.min(nextStep, route.length - 1);

          return {
            ...truck,
            routeType,
            currentStep: boundedStep,
            position: route[boundedStep],
            traffic,
            weather,
            confidence,
            status,
            etaMinutes:
              status === "DELIVERED"
                ? 0
                : Math.max(6, (route.length - boundedStep - 1) * 6 + (traffic > 70 ? 8 : 0)),
            delaySavedMinutes,
          };
        });

        if (nextAlerts.length > 0) {
          setFleetAlerts((prevAlerts) =>
            [...nextAlerts, ...prevAlerts].slice(0, MAX_ALERTS),
          );
        }

        if (nextDecisions.length > 0) {
          setAiDecisions((prevDecisions) =>
            [...nextDecisions, ...prevDecisions].slice(0, MAX_DECISIONS),
          );
        }

        return nextFleet;
      });
    }, 3500);

    return () => {
      if (adminInterval.current) clearInterval(adminInterval.current);
    };
  }, [admin]);

  if (admin) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-cyan-500 rounded-lg shadow-lg shadow-cyan-500/20">
                  <Truck className="w-6 h-6 text-slate-950" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  SmartLogistics Control Tower
                </h1>
              </div>
              <p className="text-slate-400">
                Multi-truck AI supervision, alerts, and live routing decisions
              </p>
              <div className="mt-2 text-xs text-slate-500">
                Logged in as{" "}
                <span className="font-semibold text-slate-300">
                  {admin.name}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setAdmin(null);
                setAuthView("driver");
              }}
              className="px-5 py-2.5 rounded-xl font-bold bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700 shadow-sm"
            >
              Logout
            </button>
          </header>

          <AdminPanel
            trucks={fleetTrucks}
            alerts={fleetAlerts}
            decisions={aiDecisions}
            selectedTruckId={selectedTruckId}
            onSelectTruck={setSelectedTruckId}
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
                {assignment.source} to {assignment.destination}
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

        <Dashboard state={state} />

        {!journeyStarted && (
          <>
            <div className="mb-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-2">Driver Dashboard</h2>
              <p className="text-gray-600 mb-4">
                Ready to dispatch. Review the AI forecast below, then click{" "}
                <span className="font-semibold">Start Journey</span> to begin
                live tracking and AI monitoring.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-gray-500">Driver</div>
                  <div className="font-semibold text-gray-900">
                    {driver.name}
                  </div>
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
                    {assignment.source} to {assignment.destination}
                  </div>
                </div>
              </div>
            </div>

            <PreJourneyPanel
              prediction={preJourneyPrediction}
              loading={isPreJourneyLoading}
              error={preJourneyError}
              onRefresh={() => void loadPreJourneyPrediction()}
            />
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-2 h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50 mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                <span className="text-sm font-bold">
                  {journeyStarted ? "Live Tracking" : "Risk-Aware Route Preview"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 bg-red-500 rounded-full" />
                  Risk Segment
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 bg-green-500 rounded-full" />
                  Recommended Route
                </div>
              </div>
            </div>
            <div className="h-[calc(100%-48px)]">
              <Map
                truckPosition={state.truckPosition}
                isRerouted={state.isRerouted}
                journeyStarted={journeyStarted}
                riskZones={preJourneyPrediction?.riskZones}
                recommendedRoute={preJourneyPrediction?.recommendedRoute}
              />
            </div>
          </div>

          <div className="h-full">
            <AlertPanel alerts={state.alerts} />
          </div>
        </div>

        {completionSummary && (
          <div className="mt-6 max-w-4xl bg-green-50 border border-green-100 rounded-2xl p-5">
            <h3 className="font-bold text-green-700 mb-4">
              Delivery Completed
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-xl bg-white/70 border border-green-100 p-4">
                <p className="text-green-600 text-xs uppercase tracking-wide">
                  Total Time
                </p>
                <p className="font-semibold text-green-900 text-xl mt-1">
                  {completionSummary.totalMinutes} min
                </p>
              </div>
              <div className="rounded-xl bg-white/70 border border-green-100 p-4">
                <p className="text-green-600 text-xs uppercase tracking-wide">
                  Delay Avoided
                </p>
                <p className="font-semibold text-green-900 text-xl mt-1">
                  {completionSummary.delayAvoidedMinutes} min
                </p>
              </div>
              <div className="rounded-xl bg-white/70 border border-green-100 p-4">
                <p className="text-green-600 text-xs uppercase tracking-wide">
                  Route Taken
                </p>
                <p className="font-semibold text-green-900 text-base mt-1">
                  {completionSummary.routeTaken}
                </p>
              </div>
            </div>
          </div>
        )}

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
