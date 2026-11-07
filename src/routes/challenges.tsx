import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Challenges from "@/screens/Challenges";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Challenges — GameRun" },
      { name: "description", content: "GameRun: challenges — earn screen time by staying active." },
      { property: "og:title", content: "Challenges — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <Challenges />
    </ProtectedRoute>
  ),
});
