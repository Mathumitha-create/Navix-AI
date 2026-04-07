import { getGoogleMapsApiKey } from "@/lib/server/env";
import { withCache } from "@/lib/server/cache";
import { ApiError, parseJson } from "@/lib/server/http";

type AutocompleteApiResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: {
        text?: string;
      };
      structuredFormat?: {
        mainText?: {
          text?: string;
        };
        secondaryText?: {
          text?: string;
        };
      };
    };
  }>;
  error?: {
    message?: string;
  };
};

type PlaceDetailsApiResponse = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  error?: {
    message?: string;
  };
};

type GeocodeApiResponse = {
  results?: Array<{
    formatted_address?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
  error_message?: string;
  status?: string;
};

export type PlaceSuggestion = {
  placeId: string;
  placeName: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceLocation = {
  lat: number;
  lng: number;
  placeName: string;
};

const AUTOCOMPLETE_CACHE_MS = 30_000;
const PLACE_DETAILS_CACHE_MS = 5 * 60_000;
const REVERSE_GEOCODE_CACHE_MS = 5 * 60_000;

export async function getPlaceSuggestions(input: string): Promise<PlaceSuggestion[]> {
  const query = input.trim();

  if (!query) {
    return [];
  }

  return withCache(`places:autocomplete:${query.toLowerCase()}`, AUTOCOMPLETE_CACHE_MS, async () => {
    const googleMapsApiKey = getGoogleMapsApiKey();
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleMapsApiKey,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
      },
      body: JSON.stringify({
        input: query,
        languageCode: "en",
        regionCode: "IN",
      }),
      cache: "no-store",
    });

    const data = await parseJson<AutocompleteApiResponse>(response);

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || "Failed to fetch place suggestions.",
        response.status
      );
    }

    return (data.suggestions ?? [])
      .map((suggestion) => {
        const prediction = suggestion.placePrediction;
        const placeId = prediction?.placeId;
        const placeName = prediction?.text?.text ?? "";

        if (!placeId || !placeName) {
          return null;
        }

        return {
          placeId,
          placeName,
          mainText: prediction?.structuredFormat?.mainText?.text ?? placeName,
          secondaryText: prediction?.structuredFormat?.secondaryText?.text ?? "",
        };
      })
      .filter((item): item is PlaceSuggestion => Boolean(item));
  });
}

export async function getPlaceDetails(placeId: string): Promise<PlaceLocation> {
  const normalizedId = placeId.trim();

  if (!normalizedId) {
    throw new ApiError("placeId is required.");
  }

  return withCache(`places:details:${normalizedId}`, PLACE_DETAILS_CACHE_MS, async () => {
    const googleMapsApiKey = getGoogleMapsApiKey();
    const response = await fetch(`https://places.googleapis.com/v1/places/${normalizedId}`, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": googleMapsApiKey,
        "X-Goog-FieldMask": "id,displayName.text,formattedAddress,location",
      },
      cache: "no-store",
    });

    const data = await parseJson<PlaceDetailsApiResponse>(response);

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || "Failed to fetch place details.",
        response.status
      );
    }

    const lat = data.location?.latitude;
    const lng = data.location?.longitude;
    const placeName = data.displayName?.text || data.formattedAddress;

    if (typeof lat !== "number" || typeof lng !== "number" || !placeName) {
      throw new ApiError("Place details response was missing location data.", 502);
    }

    return {
      lat,
      lng,
      placeName,
    };
  });
}

export async function reverseGeocode(params: {
  latitude: number;
  longitude: number;
}): Promise<PlaceLocation> {
  const { latitude, longitude } = params;

  return withCache(
    `places:reverse:${latitude.toFixed(5)}:${longitude.toFixed(5)}`,
    REVERSE_GEOCODE_CACHE_MS,
    async () => {
      const googleMapsApiKey = getGoogleMapsApiKey();
      const query = new URLSearchParams({
        latlng: `${latitude},${longitude}`,
        key: googleMapsApiKey,
      });
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${query.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );
      const data = await parseJson<GeocodeApiResponse>(response);

      if (!response.ok || data.status === "REQUEST_DENIED") {
        throw new ApiError(
          data.error_message || "Failed to reverse geocode the current location.",
          response.status || 403
        );
      }

      const result = data.results?.[0];
      const lat = result?.geometry?.location?.lat;
      const lng = result?.geometry?.location?.lng;
      const placeName = result?.formatted_address;

      if (typeof lat !== "number" || typeof lng !== "number" || !placeName) {
        throw new ApiError("Reverse geocode response was missing address data.", 502);
      }

      return {
        lat,
        lng,
        placeName,
      };
    }
  );
}
