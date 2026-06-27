const WINDY_URL = "https://api.windy.com/api/point-forecast/v2";
const LAT = 3.946;
const LON = 73.494;
const ZIPLINE_DISTANCE_M = 428;

export interface WindData {
  windSpeedMs: number | null;
  windSpeedKmh: number | null;
  windDirectionDegrees: number | null;
  windDirectionCompass: string | null;
  windModel: string | null;
  windApiTimestamp: Date | null;
  windFetchedAt: Date;
  windApiStatus: "ok" | "failed" | "skipped";
  windRawResponse: unknown;
}

function degreesToCompass(deg: number): string {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function vectorToSpeedDirection(u: number, v: number): { speed: number; dir: number } {
  const speed = Math.sqrt(u * u + v * v);
  const dir   = (270 - Math.atan2(v, u) * (180 / Math.PI)) % 360;
  return { speed, dir: Math.round(dir) };
}

export async function fetchWindData(): Promise<WindData> {
  const fetchedAt = new Date();
  const key = process.env.WINDY_POINT_FORECAST_API_KEY;

  if (!key) {
    return {
      windSpeedMs: null, windSpeedKmh: null, windDirectionDegrees: null,
      windDirectionCompass: null, windModel: null, windApiTimestamp: null,
      windFetchedAt: fetchedAt, windApiStatus: "skipped",
      windRawResponse: { error: "WINDY_POINT_FORECAST_API_KEY not set" },
    };
  }

  try {
    const res = await fetch(WINDY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: LAT, lon: LON, model: "gfs",
        parameters: ["wind"], levels: ["surface"], key,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const raw = await res.json();

    if (!res.ok) {
      return {
        windSpeedMs: null, windSpeedKmh: null, windDirectionDegrees: null,
        windDirectionCompass: null, windModel: "gfs",
        windApiTimestamp: null, windFetchedAt: fetchedAt,
        windApiStatus: "failed", windRawResponse: raw,
      };
    }

    // Windy returns wind-u-surface and wind-v-surface arrays; take the first forecast entry
    const uArr = raw["wind_u-surface"] as number[] | undefined;
    const vArr = raw["wind_v-surface"] as number[] | undefined;
    const tsArr = raw.ts as number[] | undefined;

    if (!uArr?.length || !vArr?.length) {
      return {
        windSpeedMs: null, windSpeedKmh: null, windDirectionDegrees: null,
        windDirectionCompass: null, windModel: raw.model ?? "gfs",
        windApiTimestamp: null, windFetchedAt: fetchedAt,
        windApiStatus: "failed", windRawResponse: raw,
      };
    }

    const { speed, dir } = vectorToSpeedDirection(uArr[0], vArr[0]);
    const speedKmh = speed * 3.6;

    return {
      windSpeedMs: Math.round(speed * 100) / 100,
      windSpeedKmh: Math.round(speedKmh * 100) / 100,
      windDirectionDegrees: dir,
      windDirectionCompass: degreesToCompass(dir),
      windModel: raw.model ?? "gfs",
      windApiTimestamp: tsArr?.[0] ? new Date(tsArr[0]) : null,
      windFetchedAt: fetchedAt,
      windApiStatus: "ok",
      windRawResponse: raw,
    };
  } catch (err: unknown) {
    return {
      windSpeedMs: null, windSpeedKmh: null, windDirectionDegrees: null,
      windDirectionCompass: null, windModel: null, windApiTimestamp: null,
      windFetchedAt: fetchedAt, windApiStatus: "failed",
      windRawResponse: { error: String(err) },
    };
  }
}

export function calculateRideMetrics(launchTime: Date, landingTime: Date) {
  const durationSeconds = Math.round((landingTime.getTime() - launchTime.getTime()) / 1000);
  if (durationSeconds <= 0) return null;
  const speedMps  = ZIPLINE_DISTANCE_M / durationSeconds;
  const speedKmph = speedMps * 3.6;
  return {
    rideDurationSeconds: durationSeconds,
    rideSpeedMps:  Math.round(speedMps  * 10000) / 10000,
    rideSpeedKmph: Math.round(speedKmph * 10000) / 10000,
  };
}
