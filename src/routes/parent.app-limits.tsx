import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import AppLimits from "@/screens/parent/AppLimits";

export const Route = createFileRoute("/parent/app-limits")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Appgränser — GameRun" },
      { name: "description", content: "Appgränser i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Appgränser — GameRun" },
      { property: "og:description", content: "Appgränser i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="parent">
      <AppLimits />
    </ProtectedRoute>
  ),
});
