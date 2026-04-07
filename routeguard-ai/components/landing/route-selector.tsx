"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { bangalore, chennai, type SavedPlace } from "@/lib/map-config";
import { cn } from "@/lib/utils";

type PlaceSuggestion = {
  placeId: string;
  placeName: string;
  mainText: string;
  secondaryText: string;
};

type RouteSelectorProps = {
  source: SavedPlace;
  destination: SavedPlace;
  onPredictRoute: (route: { source: SavedPlace; destination: SavedPlace }) => void;
};

type FieldKey = "source" | "destination";

const fieldConfig: Record<FieldKey, { label: string; placeholder: string }> = {
  source: {
    label: "Source",
    placeholder: "Choose starting point",
  },
  destination: {
    label: "Destination",
    placeholder: "Choose destination",
  },
};

async function fetchJson<T extends object>(url: string, body: object) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    throw new Error("error" in data && data.error ? data.error : "Request failed.");
  }

  return data as T;
}

export function RouteSelector({
  source,
  destination,
  onPredictRoute,
}: RouteSelectorProps) {
  const [sourceInput, setSourceInput] = useState(source.name);
  const [destinationInput, setDestinationInput] = useState(destination.name);
  const [selectedSource, setSelectedSource] = useState<SavedPlace | null>(source);
  const [selectedDestination, setSelectedDestination] = useState<SavedPlace | null>(destination);
  const [sourceSuggestions, setSourceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeField, setActiveField] = useState<FieldKey | null>(null);
  const [loadingField, setLoadingField] = useState<FieldKey | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, PlaceSuggestion[]>());

  useEffect(() => {
    setSourceInput(source.name);
    setDestinationInput(destination.name);
    setSelectedSource(source);
    setSelectedDestination(destination);
  }, [destination, source]);

  useEffect(() => {
    const controllers: AbortController[] = [];

    const runAutocomplete = (field: FieldKey, value: string, setter: (items: PlaceSuggestion[]) => void) => {
      const query = value.trim();

      if (query.length < 2) {
        setter([]);
        return;
      }

      const cacheKey = `${field}:${query.toLowerCase()}`;
      const cached = cacheRef.current.get(cacheKey);

      if (cached) {
        setter(cached);
        return;
      }

      const controller = new AbortController();
      controllers.push(controller);
      const timeout = window.setTimeout(async () => {
        try {
          setLoadingField(field);
          const result = await fetchJson<{ suggestions: PlaceSuggestion[] }>(
            "/api/places/autocomplete",
            { input: query }
          );
          cacheRef.current.set(cacheKey, result.suggestions);
          setter(result.suggestions);
        } catch (error) {
          setErrorMessage((error as Error).message || "Unable to load suggestions.");
        } finally {
          setLoadingField((current) => (current === field ? null : current));
        }
      }, 250);

      controller.signal.addEventListener("abort", () => {
        window.clearTimeout(timeout);
      });
    };

    runAutocomplete("source", sourceInput, setSourceSuggestions);
    runAutocomplete("destination", destinationInput, setDestinationSuggestions);

    return () => {
      controllers.forEach((controller) => controller.abort());
    };
  }, [destinationInput, sourceInput]);

  const suggestions = activeField === "source" ? sourceSuggestions : destinationSuggestions;

  async function selectSuggestion(field: FieldKey, suggestion: PlaceSuggestion) {
    try {
      setErrorMessage(null);
      setLoadingField(field);
      const place = await fetchJson<{ lat: number; lng: number; placeName: string }>(
        "/api/places/details",
        {
        placeId: suggestion.placeId,
        }
      );

      if (field === "source") {
        setSelectedSource({ name: place.placeName, lat: place.lat, lng: place.lng });
        setSourceInput(place.placeName);
        setSourceSuggestions([]);
      } else {
        setSelectedDestination({
          name: place.placeName,
          lat: place.lat,
          lng: place.lng,
        });
        setDestinationInput(place.placeName);
        setDestinationSuggestions([]);
      }
      setActiveField(null);
    } catch (error) {
      setErrorMessage((error as Error).message || "Unable to resolve the selected place.");
    } finally {
      setLoadingField((current) => (current === field ? null : current));
    }
  }

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported in this browser.");
      return;
    }

    setErrorMessage(null);
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const place = await fetchJson<{ lat: number; lng: number; placeName: string }>(
            "/api/places/reverse-geocode",
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }
          );

          setSelectedSource({
            name: place.placeName,
            lat: place.lat,
            lng: place.lng,
          });
          setSourceInput(place.placeName);
          setSourceSuggestions([]);
          setActiveField(null);
        } catch (error) {
          setErrorMessage((error as Error).message || "Unable to resolve your location.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setErrorMessage(error.message || "Location access was denied.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60_000,
      }
    );
  }

  const canPredict = Boolean(selectedSource && selectedDestination);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel mt-12 rounded-[2rem] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-white/42">
            Real-Time Planner
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Plan a route like a live command center
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
            Search both points, pull your current location into the source field,
            and send the route into the live prediction view with a single action.
          </p>
        </div>

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="glass-card inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLocating ? "Locating..." : "Use My Location"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
        {(["source", "destination"] as FieldKey[]).map((field) => {
          const value = field === "source" ? sourceInput : destinationInput;
          const setValue = field === "source" ? setSourceInput : setDestinationInput;
          const selected = field === "source" ? selectedSource : selectedDestination;

          return (
            <div key={field} className="relative">
              <label className="block text-[11px] uppercase tracking-[0.28em] text-white/40">
                {fieldConfig[field].label}
              </label>
              <div
                className={cn(
                  "glass-card mt-3 rounded-[1.6rem] border px-4 py-4 transition-all duration-300",
                  activeField === field
                    ? "border-cyan-300/30 shadow-[0_0_0_1px_rgba(123,241,255,0.12)]"
                    : "border-white/10"
                )}
              >
                <input
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                    if (field === "source") {
                      setSelectedSource(null);
                    } else {
                      setSelectedDestination(null);
                    }
                  }}
                  onFocus={() => setActiveField(field)}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setActiveField((current) => (current === field ? null : current));
                    }, 150);
                  }}
                  placeholder={fieldConfig[field].placeholder}
                  className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/28"
                />
                <div className="mt-3 flex items-center justify-between text-xs text-white/42">
                  <span>
                    {loadingField === field ? "Searching..." : "Google Places suggestions"}
                  </span>
                  {selected ? (
                    <span className="truncate text-right text-white/56">
                      {selected.lat.toFixed(3)}, {selected.lng.toFixed(3)}
                    </span>
                  ) : (
                    <span className="text-amber-200/75">Awaiting selection</span>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {activeField === field && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                    className="absolute inset-x-0 top-[calc(100%+0.75rem)] z-20 glass-panel rounded-[1.5rem] p-2"
                  >
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.placeId}
                        type="button"
                        onClick={() => void selectSuggestion(field, suggestion)}
                        className="flex w-full items-start justify-between rounded-[1.15rem] px-4 py-3 text-left transition hover:bg-white/6"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{suggestion.mainText}</p>
                          <p className="mt-1 text-xs text-white/48">{suggestion.secondaryText}</p>
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/62">
                          Select
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              if (!selectedSource || !selectedDestination) {
                return;
              }

              onPredictRoute({
                source: selectedSource,
                destination: selectedDestination,
              });
              document.getElementById("simulate")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            disabled={!canPredict}
            className="inline-flex h-[4.6rem] w-full min-w-[15rem] items-center justify-center rounded-[1.6rem] border border-cyan-200/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(191,245,255,0.94))] px-6 text-sm font-semibold tracking-[0.01em] text-slate-950 shadow-[0_18px_60px_rgba(90,224,255,0.18)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_70px_rgba(90,224,255,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Predict Route (Real-Time)
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {[
          { label: "Source", place: selectedSource, accent: "text-cyan-200" },
          { label: "Destination", place: selectedDestination, accent: "text-emerald-200" },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-[1.5rem] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/40">{item.label}</p>
            {item.place ? (
              <>
                <p className={cn("mt-3 text-base font-medium", item.accent)}>{item.place.name}</p>
                <p className="mt-2 text-sm text-white/58">
                  lat {item.place.lat.toFixed(4)} · lng {item.place.lng.toFixed(4)}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-white/46">Choose a suggestion to lock coordinates.</p>
            )}
          </div>
        ))}
      </div>

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-[1.4rem] border border-rose-400/18 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {errorMessage}
        </motion.div>
      )}
    </motion.section>
  );
}

export function getDefaultRouteSelection() {
  return {
    source: chennai,
    destination: bangalore,
  };
}
