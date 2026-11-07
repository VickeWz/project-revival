import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Stats from "@/screens/Stats";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Stats — GameRun" },
      { name: "description", content: "GameRun: stats — earn screen time by staying active." },
      { property: "og:title", content: "Stats — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <Stats />
    </ProtectedRoute>
  ),
});
