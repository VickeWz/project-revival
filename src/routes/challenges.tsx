import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Challenges from "@/screens/Challenges";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
