import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Downtime from "@/screens/parent/Downtime";

export const Route = createFileRoute("/parent/downtime")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Skärmfri tid — GameRun" },
      { name: "description", content: "Skärmfri tid i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Skärmfri tid — GameRun" },
      { property: "og:description", content: "Skärmfri tid i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="parent">
      <Downtime />
    </ProtectedRoute>
  ),
});
