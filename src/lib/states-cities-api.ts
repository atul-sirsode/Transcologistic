// States and Cities API Client
// Handles fetching states and cities data

import { httpClient } from "./http-client";

export interface StateOption {
  name: string;
  state_code: string;
  iso_code: string;
}

interface StateApiResponse {
  state_name?: string;
  state_code?: string;
  iso_code?: string;
  isoCode?: string;
  code?: string;
  iso2?: string;
}

function mapStateFromApi(
  apiState: StateApiResponse | string,
  index: number,
): StateOption {
  if (typeof apiState === "string") {
    return {
      name: apiState,
      state_code: `state-${index}`,
      iso_code: `state-${index}`,
    };
  }

  return {
    name: apiState.state_name || "",
    state_code: apiState.state_code || "",
    iso_code:
      apiState.iso_code ||
      apiState.isoCode ||
      apiState.iso2 ||
      apiState.code ||
      `state-${index}`,
  };
}

function mapCityFromApi(
  apiCity: string | { name?: string; city_name?: string },
): string {
  if (typeof apiCity === "string") {
    return apiCity;
  }
  return apiCity.name || apiCity.city_name || "";
}

// ── States and Cities API ────────────────────────────────────────────────────

export const statesCitiesApi = {
  getStates: async (): Promise<StateOption[]> => {
    try {
      const response = await httpClient.get<(StateApiResponse | string)[]>(
        "/api/states-cities/get-states",
      );

      if (!Array.isArray(response)) {
        console.error("States API returned non-array:", response);
        return [];
      }

      return response.map((state, index) => mapStateFromApi(state, index));
    } catch (error) {
      console.error("Failed to fetch states:", error);
      throw error;
    }
  },

  getCitiesByState: async (isoCode: string): Promise<string[]> => {
    try {
      if (!isoCode) {
        return [];
      }

      const response = await httpClient.get<
        (string | { name?: string; city?: string })[]
      >(`/api/states-cities/get-city-by-state?iso_code=${isoCode}`);

      if (!Array.isArray(response)) {
        console.error("Cities API returned non-array:", response);
        return [];
      }

      return response.map(mapCityFromApi).filter((city) => city.length > 0);
    } catch (error) {
      console.error("Failed to fetch cities:", error);
      return [];
    }
  },
};
