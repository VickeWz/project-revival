import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import ChildDashboard from "@/screens/ChildDashboard";

export const Route = createFileRoute("/child")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Home — GameRun" },
      { name: "description", content: "GameRun: home — earn screen time by staying active." },
      { property: "og:title", content: "Home — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <ChildDashboard />
    </ProtectedRoute>
  ),
});
