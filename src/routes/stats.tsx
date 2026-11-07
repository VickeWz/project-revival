import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Stats from "@/screens/Stats";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Statistik — GameRun" },
      { name: "description", content: "Statistik i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Statistik — GameRun" },
      { property: "og:description", content: "Statistik i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <Stats />
    </ProtectedRoute>
  ),
});
