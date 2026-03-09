// Toll API Client
// Handles fetching toll information from TollGuru API

import { TollGuruApiResponse } from "@/types/tollguru.types";

// Local interfaces specific to this API client
export interface TollRouteRequest {
  from: {
    address: string;
  };
  to: {
    address: string;
  };
  vehicle: {
    type: string;
  };
  country: string;
  includeAnalysis: boolean;
  analysisOptions: {
    includeFuelCost: boolean;
    includeCashCosts: boolean;
    calculateAverageSpeeds: boolean;
    formatTimeDisplay: boolean;
  };
}

export interface TollSegment {
  name: string;
  amount: number;
  plazaName?: string;
  entryTime?: string;
  exitTime?: string;
  etaInfo?: {
    estimatedArrival?: string;
    formattedArrivalTime?: string;
    formattedtransactionDateTime?: string;
    processedDateTime?: string;
    processedTransactionDateTime?: string;
  };
}

export interface RouteInfo {
  routeName: string;
  distance: string;
  duration: string;
  fastagTotal: number;
  tollSegments: TollSegment[];
  fuelCost?: number;
  cashCost?: number;
  averageSpeed?: number;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${import.meta.env.VITE_MONGO_API_BASE_URL}/tollguru/get-toll-info`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(
      error.message || `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data;
}
// ── Toll API ────────────────────────────────────────────────────

// Parse "M/D/YYYY, h:mm:ss AM/PM" as LOCAL time, convert to UTC, and format "YYYY-MM-DDTHH:mm"
export function toUtcIsoShortFromFormatted(
  input /* e.g., "2/28/2026, 1:10:07 AM" */,
) {
  if (typeof input !== "string") throw new TypeError("input must be a string");

  // Split "2/28/2026, 1:10:07 AM"
  const [datePart, timePart] = input.split(", ").map((s) => s?.trim());
  if (!datePart || !timePart)
    throw new Error("Invalid input format: expected 'M/D/YYYY, h:mm:ss AM/PM'");

  // Date: M/D/YYYY
  const [M, D, Y] = datePart.split("/").map((n) => parseInt(n, 10));
  if (!Y || !M || !D) throw new Error("Invalid date part");

  // Time: "h:mm:ss AM/PM"
  const [time, apRaw] = timePart.split(" ");
  const [hStr, mStr, sStr] = time.split(":");
  if (!hStr || !mStr || !sStr || !apRaw) throw new Error("Invalid time part");

  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const s = parseInt(sStr, 10);
  const ap = apRaw.toUpperCase();

  if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s))
    throw new Error("Invalid time numbers");

  // Convert 12h → 24h
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;

  // Build local Date (timezone = user's environment)
  const local = new Date(Y, M - 1, D, h, m, s);

  // Validate: if date rolled, input was invalid (e.g., 2/30)
  if (
    local.getFullYear() !== Y ||
    local.getMonth() !== M - 1 ||
    local.getDate() !== D
  ) {
    throw new Error("Invalid calendar date");
  }

  // Extract UTC components
  const y = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mi = String(local.getUTCMinutes()).padStart(2, "0");

  // ISO short (no seconds)
  return `${y}-${mm}-${dd}T${hh}:${mi}`;
}

// Convert "M/D/YYYY, h:mm:ss AM/PM" to ISO-8601 format for datetime-local input
export function formatForDatetimeLocal(
  formattedDateTime: string | null | undefined,
): string | null {
  if (!formattedDateTime) return null;

  try {
    // Parse "3/6/2026, 2:47:26 AM"
    const [datePart, timePart] = formattedDateTime
      .split(", ")
      .map((s) => s?.trim());
    if (!datePart || !timePart) return null;

    const [M, D, Y] = datePart.split("/").map((n) => parseInt(n, 10));
    const [timeStr, meridiem] = timePart.split(" ");
    const [h, m, s] = timeStr.split(":").map((n) => parseInt(n, 10));

    // Convert to 24h
    let hour24 = h;
    if (meridiem.toUpperCase() === "PM" && h !== 12) hour24 += 12;
    if (meridiem.toUpperCase() === "AM" && h === 12) hour24 = 0;

    // Create Date object (treat as local time)
    const date = new Date(Y, M - 1, D, hour24, m, s || 0);

    // Format as YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return null;
  }
}

function extractTimeInIst(
  formattedDateTime: string | null | undefined,
): string | null {
  if (!formattedDateTime) return null;
  // Extract time part from "M/D/YYYY, h:mm:ss AM/PM" format
  const timePart = formattedDateTime.split(", ")[1];
  return timePart || null;
}

export function addMinutesKeepFormat(input, minutesToAdd = 1) {
  // Input format: M/D/YYYY, h:mm:ss AM/PM
  const [datePart, timePart] = input.split(", ").map((s) => s.trim());

  const [m, d, y] = datePart.split("/").map(Number);
  // timePart like "1:10:07 AM"
  const [time, meridiem] = timePart.split(" ");
  const [h, min, sec] = time.split(":").map(Number); // ✅ Fixed: include hour

  // Convert to 24h
  let hour24 = h;
  if (meridiem.toUpperCase() === "PM" && h !== 12) hour24 += 12;
  if (meridiem.toUpperCase() === "AM" && h === 12) hour24 = 0;

  // Build a Date in local time
  const dt = new Date(y, m - 1, d, hour24, min, sec);

  // Add minutes
  dt.setMinutes(dt.getMinutes() + minutesToAdd);

  // Format back to M/D/YYYY, h:mm:ss AM/PM
  const outY = dt.getFullYear();
  const outM = dt.getMonth() + 1;
  const outD = dt.getDate();

  let outH = dt.getHours();
  const outMin = dt.getMinutes().toString().padStart(2, "0");
  const outSec = dt.getSeconds().toString().padStart(2, "0");

  const outMeridiem = outH >= 12 ? "PM" : "AM";
  outH = outH % 12;
  if (outH === 0) outH = 12;

  return `${outM}/${outD}/${outY}, ${outH}:${outMin}:${outSec} ${outMeridiem}`;
}

export const tollApi = {
  getTollInfo: async (
    sourceCity: string,
    sourceStateCode: string,
    destCity: string,
    destStateCode: string,
    vehicleType: string,
  ): Promise<RouteInfo> => {
    try {
      const request: TollRouteRequest = {
        from: {
          address: `${sourceCity}, ${sourceStateCode}`,
        },
        to: {
          address: `${destCity}, ${destStateCode}`,
        },
        vehicle: {
          type: vehicleType,
        },
        country: "IND",
        includeAnalysis: true,
        analysisOptions: {
          includeFuelCost: true,
          includeCashCosts: true,
          calculateAverageSpeeds: true,
          formatTimeDisplay: true,
        },
      };

      const response = await apiRequest<TollGuruApiResponse>(
        "/tollguru/get-toll-info",
        {
          method: "POST",
          body: JSON.stringify(request),
        },
      );

      console.log("API Response:", response);

      // Check if we have route info in analysis
      if (!response.analysis?.recommendedRoute?.routeInfo) {
        console.error("Response structure:", response);
        throw new Error("No route info found in response");
      }

      const routeInfo = response.analysis.recommendedRoute.routeInfo;
      const tollsData = response.analysis.recommendedRoute.tolls || [];
      const recommendedRoute = response.analysis.recommendedRoute;
      // Convert toll segments to our format using the tolls array with etaInfo
      const tollSegments: TollSegment[] = tollsData.map((toll, index) => ({
        name: toll.name,
        amount: toll.tagCost,
        plazaName: toll.name, // Use name as plazaName since it's not provided separately
        etaInfo: {
          estimatedArrival: toll.etaInfo?.formattedArrivalTime || null,
          formattedArrivalTime: toll.etaInfo?.formattedArrivalTime || null, // Keep original format
          formattedtransactionDateTime: addMinutesKeepFormat(
            toll.etaInfo?.formattedArrivalTime,
          ),
          processedDateTime: formatForDatetimeLocal(
            toll.etaInfo?.formattedArrivalTime,
          ), // ISO-8601 format
          processedTransactionDateTime: formatForDatetimeLocal(
            addMinutesKeepFormat(toll.etaInfo?.formattedArrivalTime),
          ), // ISO-8601 format with added minutes
        },
      }));

      return {
        routeName: routeInfo.routeName || `${sourceCity} to ${destCity}`,
        distance: routeInfo.distance || "0 km",
        duration: routeInfo.duration || "0 min",
        fastagTotal: routeInfo.fastagTotal || 0,
        tollSegments,
        fuelCost: recommendedRoute?.totalFuelCost || 0,
        cashCost: recommendedRoute?.totalCost || 0,
        averageSpeed: 0, // Not provided in the current response
      };
    } catch (error) {
      console.error("Failed to fetch toll info:", error);
      throw error;
    }
  },
};
