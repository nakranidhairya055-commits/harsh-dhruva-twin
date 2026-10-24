import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useStationLinkContext } from "@/components/StationLinkProvider";
import { VEHICLE_CLASSES, FLEET } from "@/components/twin/VehicleFleet";
import { PRIORITY } from "@/lib/offline-queue";
import { formatUtc, stationFromParams } from "@/lib/station";
import {
  AlertOctagon,
  ClipboardCheck,
  CloudSun,
  LogOut,
  ShieldCheck,
  Snowflake,
  Truck,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";

/**
 * Antarctic Mode.
 *
 * A separate interface, not a theme: pure black background, pure white text,
 * 4 pixel white borders, 18 point body text, 28 point numerals, 64 pixel
 * minimum touch targets and a 200 pixel SOS control with a red pulsing glow.
 * It is designed for gloved hands, blowing snow and glare, and it is the only
 * screen set that stays legible when a field party is standing outside the
 * station in a whiteout.
 */

type Screen = "home" | "tasks" | "report" | "checkin" | "vehicle" | "weather" | "sos";

const SCREENS: Array<{ id: Screen; label: string; icon: typeof ClipboardCheck }> = [
  { id: "tasks", label: "Tasks", icon: ClipboardCheck },
  { id: "report", label: "Report Issue", icon: AlertOctagon },
  { id: "checkin", label: "Check-In", icon: UserCheck },
  { id: "vehicle", label: "Vehicle Log", icon: Truck },
];

const TASKS = [
  "Clear snow from the main entrance vestibule",
  "Inspect trace heating junction boxes on the water line",
  "Top up day tank from the bulk fuel farm",
  "Check generator bay smoke detector self-test",
  "Record AWS observation at the top of the hour",
  "Clear drift from the helipad perimeter lights",
  "Verify UHF radio battery state for field party",
];

const ISSUE_CATEGORIES = [
  "Power",
  "Water",
  "Thermal",
  "Comms",
  "Structure",
  "Vehicle",
  "Medical",
  "Other",
];

const INSPECTION_ITEMS = [
  "Track tension and cleat wear",
  "Engine oil and coolant level",
  "Cab heater output",
  "Beacon and work lights",
  "Fuel level and spill tray",
  "Winch and tow strop condition",
];

interface GpsFix {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export default function AntarcticMode() {
  const [params] = useSearchParams();
  const slug = stationFromParams(params);
  const link = useStationLinkContext();
  const stationName = slug === "maitri" ? "Maitri" : "Bharati";

  const [screen, setScreen] = useState<Screen>("home");
  const [tasksDone, setTasksDone] = useState<Record<number, boolean>>({});
  const [issueCategory, setIssueCategory] = useState<string | null>(null);
  const [issueNote, setIssueNote] = useState("");
  const [vehicleId, setVehicleId] = useState<string>(VEHICLE_CLASSES[0].id);
  const [inspection, setInspection] = useState<Record<string, boolean>>({});
  const [gps, setGps] = useState<GpsFix | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sosArmed, setSosArmed] = useState(false);

  const readings = useQuery(api.telemetry.getLiveReadings, { slug });
  const weather = useQuery(api.ops.weatherHistory, { slug, limit: 10 });

  const reason = params.get("reason");

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("This device does not expose a GPS receiver.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          latitude: Math.round(position.coords.latitude * 1e5) / 1e5,
          longitude: Math.round(position.coords.longitude * 1e5) / 1e5,
          accuracy: Math.round(position.coords.accuracy),
        });
        setGpsError(null);
      },
      (error) => setGpsError(error.message),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }, []);

  useEffect(() => {
    if (screen === "sos" || screen === "checkin") locate();
  }, [locate, screen]);

  const ambient = readings?.find((r) => r.sensorId === "env.temperature");
  const wind = readings?.find((r) => r.sensorId === "env.wind_speed");
  const currentWeather = weather && weather.length ? weather[weather.length - 1] : null;

  const forecast = useMemo(() => {
    const rows = weather ?? [];
    return rows.slice(-6).map((row) => ({
      time: new Date(row.timestamp).toISOString().slice(11, 16),
      temperature: row.temperature,
      windSpeed: row.windSpeed,
    }));
  }, [weather]);

  const criticalAlerts = useQuery(api.telemetry.listAlerts, { openOnly: true, limit: 5 });
  const critical = (criticalAlerts ?? []).filter((a) => a.severity === "critical");

  const send = async (
    priority: number,
    kind: string,
    label: string,
    payload: unknown,
    successMessage: string,
  ) => {
    await link.send(priority as 1 | 2 | 3 | 4, kind, label, payload);
    toast.success(successMessage);
  };

  const exit = (
    <Link
      to={`/dashboard?station=${slug}`}
      className="flex min-h-16 items-center gap-3 rounded border-4 border-white px-6 text-[18px] font-bold uppercase tracking-wider text-white hover:bg-white hover:text-black"
    >
      <LogOut className="size-7" />
      Exit to command centre
    </Link>
  );

  const header = (
    <header className="border-b-4 border-white bg-black px-6 py-5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Snowflake className="size-10 text-[#FFD700]" />
          <div>
            <div className="text-[24px] font-bold uppercase tracking-wider text-white">
              Antarctic Mode - {stationName}
            </div>
            <div className="font-mono text-[18px] text-white">
              {formatUtc(now)} - link {link.status} - queue {link.pending}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="border-4 border-white px-4 py-2 text-center">
            <div className="font-mono text-[28px] font-bold leading-none text-[#FFD700]">
              {ambient ? ambient.value.toFixed(1) : "--"}
            </div>
            <div className="text-[18px] uppercase text-white">deg C</div>
          </div>
          <div className="border-4 border-white px-4 py-2 text-center">
            <div className="font-mono text-[28px] font-bold leading-none text-[#FFD700]">
              {wind ? wind.value.toFixed(0) : "--"}
            </div>
            <div className="text-[18px] uppercase text-white">m/s wind</div>
          </div>
          {screen !== "home" ? (
            <button
              type="button"
              onClick={() => setScreen("home")}
              className="min-h-16 rounded border-4 border-white px-6 text-[18px] font-bold uppercase tracking-wider text-white hover:bg-white hover:text-black"
            >
              Home
            </button>
          ) : (
            exit
          )}
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {header}

      <main className="mx-auto max-w-6xl px-6 py-8">
        {reason && (
          <div className="mb-6 border-4 border-[#FFD700] px-5 py-4 text-[18px] text-[#FFD700]">
            Auto-activated: {reason}.
          </div>
        )}

        {critical.length > 0 && (
          <div className="antarctic-flash mb-6 border-4 border-[#FF0000] px-5 py-4">
            <div className="text-[24px] font-bold uppercase text-[#FF0000]">
              {critical.length} critical incident{critical.length > 1 ? "s" : ""} open
            </div>
            <div className="mt-2 space-y-1 text-[18px] text-white">
              {critical.slice(0, 3).map((alert) => (
                <div key={alert._id}>{alert.message}</div>
              ))}
            </div>
          </div>
        )}

        {screen === "home" && (
          <div className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-2">
              {SCREENS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setScreen(id)}
                  className="flex min-h-[180px] flex-col items-center justify-center gap-4 rounded border-4 border-white bg-black text-white transition-colors hover:bg-white hover:text-black"
                >
                  <Icon className="size-16" />
                  <span className="text-[24px] font-bold uppercase tracking-wider">{label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setScreen("weather")}
              className="flex min-h-16 w-full items-center justify-center gap-3 rounded border-4 border-white text-[20px] font-bold uppercase tracking-wider hover:bg-white hover:text-black"
            >
              <CloudSun className="size-8" />
              Weather and 6 hour outlook
            </button>

            <div className="flex flex-col items-center gap-4 pt-4">
              <span className="text-[18px] uppercase tracking-widest text-white">
                Emergency - hold to transmit
              </span>
              <button
                type="button"
                onClick={() => setScreen("sos")}
                className="antarctic-sos flex size-[200px] flex-col items-center justify-center rounded-full border-8 border-[#FF0000] bg-[#FF0000] text-white"
              >
                <AlertOctagon className="size-20" />
                <span className="mt-1 text-[28px] font-bold uppercase tracking-wider">SOS</span>
              </button>
            </div>
          </div>
        )}

        {screen === "tasks" && (
          <div className="space-y-4">
            <h2 className="text-[24px] font-bold uppercase tracking-wider">Today's tasks</h2>
            {TASKS.map((task, index) => (
              <button
                key={task}
                type="button"
                onClick={() => setTasksDone((prev) => ({ ...prev, [index]: !prev[index] }))}
                className="flex min-h-16 w-full items-center gap-5 rounded border-4 border-white px-5 text-left"
              >
                <span
                  className="flex size-12 shrink-0 items-center justify-center border-4"
                  style={{
                    borderColor: tasksDone[index] ? "#00FF00" : "#FFFFFF",
                    background: tasksDone[index] ? "#00FF00" : "transparent",
                  }}
                >
                  {tasksDone[index] && (
                    <ShieldCheck className="size-8 text-black" />
                  )}
                </span>
                <span
                  className="text-[18px]"
                  style={{ color: tasksDone[index] ? "#00FF00" : "#FFFFFF" }}
                >
                  {task}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                void send(
                  PRIORITY.ROUTINE,
                  "task-log",
                  "Routine task log",
                  { station: slug, completed: Object.keys(tasksDone).filter((k) => tasksDone[Number(k)]) },
                  "Task log queued for the next uplink window",
                )
              }
              className="min-h-16 w-full rounded border-4 border-[#FFD700] text-[20px] font-bold uppercase tracking-wider text-[#FFD700]"
            >
              Log completion
            </button>
          </div>
        )}

        {screen === "report" && (
          <div className="space-y-6">
            <h2 className="text-[24px] font-bold uppercase tracking-wider">Report an issue</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ISSUE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setIssueCategory(category)}
                  className="flex min-h-16 items-center justify-center rounded border-4 px-4 text-[18px] font-bold uppercase tracking-wider"
                  style={{
                    borderColor: issueCategory === category ? "#FFD700" : "#FFFFFF",
                    color: issueCategory === category ? "#FFD700" : "#FFFFFF",
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
            <textarea
              value={issueNote}
              onChange={(e) => setIssueNote(e.target.value)}
              rows={5}
              placeholder="Describe what you can see, hear or smell. Include the equipment tag if visible."
              className="w-full rounded border-4 border-white bg-black px-5 py-4 text-[18px] text-white outline-none placeholder:text-white/60"
            />
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                disabled={!issueCategory}
                onClick={() =>
                  void send(
                    PRIORITY.CRITICAL,
                    "field-issue",
                    `${issueCategory} issue reported`,
                    { station: slug, category: issueCategory, note: issueNote, gps },
                    "Issue transmitted on the priority 2 channel",
                  )
                }
                className="min-h-16 flex-1 rounded border-4 border-[#FF0000] text-[20px] font-bold uppercase tracking-wider text-[#FF0000] disabled:opacity-40"
              >
                Transmit issue
              </button>
              <button
                type="button"
                onClick={locate}
                className="min-h-16 rounded border-4 border-white px-6 text-[18px] font-bold uppercase tracking-wider"
              >
                {gps ? `GPS ${gps.latitude}, ${gps.longitude}` : "Attach GPS"}
              </button>
            </div>
            {gpsError && (
              <p className="text-[18px] text-[#FFD700]">GPS unavailable: {gpsError}</p>
            )}
          </div>
        )}

        {screen === "checkin" && (
          <div className="flex flex-col items-center gap-8 py-6">
            <h2 className="text-[24px] font-bold uppercase tracking-wider">Field party check-in</h2>
            <button
              type="button"
              onClick={() =>
                void send(
                  PRIORITY.CHECKIN,
                  "check-in",
                  "Field party check-in",
                  { station: slug, gps, at: Date.now() },
                  "Check-in queued on the priority 3 channel",
                )
              }
              className="flex min-h-[200px] w-full max-w-xl flex-col items-center justify-center gap-3 rounded border-8 border-[#00FF00] text-[#00FF00]"
            >
              <UserCheck className="size-20" />
              <span className="text-[28px] font-bold uppercase tracking-wider">I am safe</span>
            </button>
            <div className="border-4 border-white px-6 py-4 text-center">
              <div className="text-[18px] uppercase">Position</div>
              <div className="font-mono text-[28px] font-bold text-[#FFD700]">
                {gps ? `${gps.latitude}, ${gps.longitude}` : "acquiring"}
              </div>
              <div className="text-[18px]">
                {gps ? `accuracy ${gps.accuracy} m` : gpsError ?? "waiting for fix"}
              </div>
            </div>
          </div>
        )}

        {screen === "vehicle" && (
          <div className="space-y-6">
            <h2 className="text-[24px] font-bold uppercase tracking-wider">Vehicle log</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {VEHICLE_CLASSES.filter((cls) =>
                (FLEET[slug] ?? []).some((entry) => entry.id === cls.id),
              ).map((cls) => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setVehicleId(cls.id)}
                  className="flex min-h-16 items-center justify-center rounded border-4 px-4 text-[18px] font-bold uppercase tracking-wider"
                  style={{
                    borderColor: vehicleId === cls.id ? "#FFD700" : "#FFFFFF",
                    color: vehicleId === cls.id ? "#FFD700" : "#FFFFFF",
                  }}
                >
                  {cls.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {INSPECTION_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setInspection((prev) => ({ ...prev, [item]: !prev[item] }))}
                  className="flex min-h-16 w-full items-center gap-5 rounded border-4 border-white px-5 text-left"
                >
                  <span
                    className="flex size-12 shrink-0 items-center justify-center border-4"
                    style={{
                      borderColor: inspection[item] ? "#00FF00" : "#FFFFFF",
                      background: inspection[item] ? "#00FF00" : "transparent",
                    }}
                  >
                    {inspection[item] && <ShieldCheck className="size-8 text-black" />}
                  </span>
                  <span className="text-[18px]">{item}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                void send(
                  PRIORITY.CRITICAL,
                  "vehicle-log",
                  `${vehicleId} inspection log`,
                  { station: slug, vehicleId, inspection, gps },
                  "Vehicle inspection queued on the priority 2 channel",
                )
              }
              className="min-h-16 w-full rounded border-4 border-[#FFD700] text-[20px] font-bold uppercase tracking-wider text-[#FFD700]"
            >
              Submit inspection
            </button>
          </div>
        )}

        {screen === "weather" && (
          <div className="space-y-8">
            <h2 className="text-[24px] font-bold uppercase tracking-wider">Weather - 6 hour outlook</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="border-4 border-white px-5 py-5 text-center">
                <div className="text-[18px] uppercase">Temperature</div>
                <div className="font-mono text-[28px] font-bold text-[#FFD700]">
                  {currentWeather ? currentWeather.temperature.toFixed(1) : "--"}
                </div>
                <div className="text-[18px]">deg C</div>
              </div>
              <div className="border-4 border-white px-5 py-5 text-center">
                <div className="text-[18px] uppercase">Wind speed</div>
                <div className="font-mono text-[28px] font-bold text-[#FFD700]">
                  {currentWeather ? currentWeather.windSpeed.toFixed(1) : "--"}
                </div>
                <div className="text-[18px]">m/s</div>
              </div>
              <div className="border-4 border-white px-5 py-5 text-center">
                <div className="text-[18px] uppercase">Pressure</div>
                <div className="font-mono text-[28px] font-bold text-[#FFD700]">
                  {currentWeather ? currentWeather.pressure.toFixed(0) : "--"}
                </div>
                <div className="text-[18px]">hPa</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {forecast.length === 0 ? (
                <p className="text-[18px]">Station weather series not yet populated.</p>
              ) : (
                forecast.map((row) => (
                  <div key={row.time} className="border-4 border-white px-4 py-4 text-center">
                    <div className="font-mono text-[18px] text-white">{row.time}</div>
                    <div className="font-mono text-[28px] font-bold text-[#FFD700]">
                      {row.temperature.toFixed(0)}
                    </div>
                    <div className="text-[18px]">deg C</div>
                    <div className="font-mono text-[18px] text-white">
                      {row.windSpeed.toFixed(0)} m/s
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-[18px] leading-relaxed text-white">
              Outlook is derived from the station automatic weather station series. Katabatic
              episodes above 41 m/s close the satellite link and force the Iridium fallback.
            </p>
          </div>
        )}

        {screen === "sos" && (
          <div className="flex min-h-[70vh] flex-col items-center justify-center gap-10 bg-[#000000]">
            <div className="antarctic-flash border-8 border-[#FF0000] px-10 py-6 text-center">
              <div className="text-[28px] font-bold uppercase tracking-wider text-[#FF0000]">
                Emergency broadcast
              </div>
              <div className="mt-2 text-[18px] text-white">
                Transmits on priority 1, ahead of every other queued message.
              </div>
            </div>

            <div className="border-4 border-white px-8 py-6 text-center">
              <div className="text-[18px] uppercase tracking-widest">Position</div>
              <div className="font-mono text-[28px] font-bold text-[#FFD700]">
                {gps ? `${gps.latitude}` : "acquiring"}
              </div>
              <div className="font-mono text-[28px] font-bold text-[#FFD700]">
                {gps ? `${gps.longitude}` : "GPS fix"}
              </div>
              <div className="text-[18px]">
                {gps ? `accuracy ${gps.accuracy} m` : gpsError ?? "waiting for fix"}
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                setSosArmed(true);
                await send(
                  PRIORITY.SOS,
                  "sos",
                  `SOS from ${stationName}`,
                  {
                    station: slug,
                    gps,
                    at: Date.now(),
                    ambient: ambient?.value ?? null,
                    wind: wind?.value ?? null,
                  },
                  "SOS queued on priority 1 and transmitted immediately",
                );
              }}
              className="antarctic-sos flex size-[200px] flex-col items-center justify-center rounded-full border-8 border-[#FF0000] bg-[#FF0000] text-white"
            >
              <AlertOctagon className="size-20" />
              <span className="mt-1 text-[28px] font-bold uppercase tracking-wider">SOS</span>
            </button>

            {sosArmed && (
              <p className="text-[18px] text-[#00FF00]">
                SOS logged. Keep this screen open; the console retries every uplink window.
              </p>
            )}

            <button
              type="button"
              onClick={() => setScreen("home")}
              className="min-h-16 rounded border-4 border-white px-8 text-[18px] font-bold uppercase tracking-wider"
            >
              Cancel and return
            </button>
          </div>
        )}
      </main>

      <footer className="border-t-4 border-white px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-[18px] text-white">
          <span>DhruvaTwin - Antarctic Mode - Team HackFinity007 - PS 26060</span>
          <span className="font-mono">
            {link.broker} - {link.status} - {link.published} frames - {link.pending} queued
          </span>
        </div>
      </footer>
    </div>
  );
}
