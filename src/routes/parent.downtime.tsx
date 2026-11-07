import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Downtime from "@/screens/parent/Downtime";

export const Route = createFileRoute("/parent/downtime")({
  head: () => ({
    meta: [
      { title: "Downtime — GameRun" },
      { name: "description", content: "GameRun: downtime — earn screen time by staying active." },
      { property: "og:title", content: "Downtime — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="parent">
      <Downtime />
    </ProtectedRoute>
  ),
});
