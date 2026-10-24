import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Alerts = lazy(() => import("./pages/Alerts.tsx"));
const Twin = lazy(() => import("./pages/Twin.tsx"));
const Catalog = lazy(() => import("./pages/Catalog.tsx"));
const EquipmentDetail = lazy(() => import("./pages/EquipmentDetail.tsx"));
const Workspace = lazy(() => import("./pages/Workspace.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const StationOps = lazy(() => import("./pages/StationOps.tsx"));
const Microgrid = lazy(() => import("./pages/Microgrid.tsx"));
const EnvironmentPage = lazy(() => import("./pages/Environment.tsx"));
const Antarctica = lazy(() => import("./pages/Antarctica.tsx"));
const Weather = lazy(() => import("./pages/Weather.tsx"));
const Library = lazy(() => import("./pages/Library.tsx"));
const Compliance = lazy(() => import("./pages/Compliance.tsx"));
const Expeditions = lazy(() => import("./pages/Expeditions.tsx"));
const Audit = lazy(() => import("./pages/Audit.tsx"));
const AntarcticMode = lazy(() => import("./pages/AntarcticMode.tsx"));
const Cascade = lazy(() => import("./pages/Cascade.tsx"));
const Repair = lazy(() => import("./pages/Repair.tsx"));
const Resupply = lazy(() => import("./pages/Resupply.tsx"));
const Advisor = lazy(() => import("./pages/Advisor.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/dashboard" />}
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/alerts"
                element={
                  <RequireAuth
                    title="Sign in to open Alert Triage"
                    description="Incident queues and sensor alerts are available to signed-in NCPOR operators."
                  >
                    <Alerts />
                  </RequireAuth>
                }
              />
              <Route
                path="/twin"
                element={
                  <RequireAuth
                    title="Sign in to open the Digital Twin"
                    description="Interactive 3D station twins with live telemetry are available to signed-in operators."
                  >
                    <Twin />
                  </RequireAuth>
                }
              />
              <Route
                path="/catalog"
                element={
                  <RequireAuth
                    title="Sign in to browse the equipment catalog"
                    description="The instrumented-systems registry is available to signed-in operators."
                  >
                    <Catalog />
                  </RequireAuth>
                }
              />
              <Route
                path="/equipment/:equipmentId"
                element={
                  <RequireAuth
                    title="Sign in to open this equipment page"
                    description="Live equipment pages are available to signed-in operators."
                  >
                    <EquipmentDetail />
                  </RequireAuth>
                }
              />
              <Route
                path="/workspace"
                element={
                  <RequireAuth
                    title="Sign in to open your workspace"
                    description="Publishing observations and managing your contributions requires an account."
                  >
                    <Workspace />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireAuth
                    title="Sign in to open the admin console"
                    description="Platform administration is limited to administrator accounts."
                  >
                    <Admin />
                  </RequireAuth>
                }
              />
              <Route
                path="/station"
                element={
                  <RequireAuth
                    title="Sign in to open the station dashboard"
                    description="Personnel rosters, badge state and the duty board are available to signed-in operators."
                  >
                    <StationOps />
                  </RequireAuth>
                }
              />
              <Route
                path="/microgrid"
                element={
                  <RequireAuth
                    title="Sign in to open Microgrid Command"
                    description="Plant load, generation and thermal recovery are available to signed-in operators."
                  >
                    <Microgrid />
                  </RequireAuth>
                }
              />
              <Route
                path="/environment"
                element={
                  <RequireAuth
                    title="Sign in to open Local Environment"
                    description="Ice velocity, weather series and satellite passes are available to signed-in operators."
                  >
                    <EnvironmentPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/antarctica"
                element={
                  <RequireAuth
                    title="Sign in to open Antarctica Overview"
                    description="The station network picture is available to signed-in operators."
                  >
                    <Antarctica />
                  </RequireAuth>
                }
              />
              <Route
                path="/weather"
                element={
                  <RequireAuth
                    title="Sign in to open the weather extension"
                    description="Open-Meteo forecast and reanalysis for both stations require an account."
                  >
                    <Weather />
                  </RequireAuth>
                }
              />
              <Route
                path="/library"
                element={
                  <RequireAuth
                    title="Sign in to open the NCPOR Library"
                    description="Treaty, policy, standards and field manuals are available to signed-in operators."
                  >
                    <Library />
                  </RequireAuth>
                }
              />
              <Route
                path="/compliance"
                element={
                  <RequireAuth
                    title="Sign in to open the NPDC Compliance Centre"
                    description="Metadata validation and dataset publication require an account."
                  >
                    <Compliance />
                  </RequireAuth>
                }
              />
              <Route
                path="/expeditions"
                element={
                  <RequireAuth
                    title="Sign in to open the expedition logs"
                    description="The ISEA expedition series is available to signed-in operators."
                  >
                    <Expeditions />
                  </RequireAuth>
                }
              />
              <Route
                path="/audit"
                element={
                  <RequireAuth
                    title="Sign in to open the audit trail"
                    description="The hash-chained command log is available to signed-in operators."
                  >
                    <Audit />
                  </RequireAuth>
                }
              />
              <Route
                path="/antarctic"
                element={
                  <RequireAuth
                    title="Sign in to open Antarctic Mode"
                    description="The high-contrast field interface and SOS channel require a station account."
                  >
                    <AntarcticMode />
                  </RequireAuth>
                }
              />
              <Route
                path="/cascade"
                element={
                  <RequireAuth
                    title="Sign in to open the cascade drill"
                    description="Failure propagation drills over the station dependency graph are available to signed-in operators."
                  >
                    <Cascade />
                  </RequireAuth>
                }
              />
              <Route
                path="/repair"
                element={
                  <RequireAuth
                    title="Sign in to open the repair bay"
                    description="Telemetry repair procedures and the FPGA self-healing self-test require an account."
                  >
                    <Repair />
                  </RequireAuth>
                }
              />
              <Route
                path="/resupply"
                element={
                  <RequireAuth
                    title="Sign in to track the resupply voyage"
                    description="The sea lift from Cape Town and its cargo state are available to signed-in operators."
                  >
                    <Resupply />
                  </RequireAuth>
                }
              />
              <Route
                path="/advisor"
                element={
                  <RequireAuth
                    title="Sign in to open the AI advisor"
                    description="Station briefings are built from live telemetry, incidents and the dependency graph, which require a station account."
                  >
                    <Advisor />
                  </RequireAuth>
                }
              />
              {/* Public legal pages: no account required, reachable from every footer. */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
