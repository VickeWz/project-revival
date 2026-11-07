import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Challenges from "@/screens/Challenges";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Utmaningar — GameRun" },
      { name: "description", content: "Utmaningar i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Utmaningar — GameRun" },
      { property: "og:description", content: "Utmaningar i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <Challenges />
    </ProtectedRoute>
  ),
});
