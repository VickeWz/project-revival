import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import AppLimits from "@/screens/parent/AppLimits";

export const Route = createFileRoute("/parent/app-limits")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "App limits — GameRun" },
      { name: "description", content: "GameRun: app limits — earn screen time by staying active." },
      { property: "og:title", content: "App limits — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="parent">
      <AppLimits />
    </ProtectedRoute>
  ),
});
