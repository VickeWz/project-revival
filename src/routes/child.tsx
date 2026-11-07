import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import ChildDashboard from "@/screens/ChildDashboard";

export const Route = createFileRoute("/child")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Hem — GameRun" },
      { name: "description", content: "Hem i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Hem — GameRun" },
      { property: "og:description", content: "Hem i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <ChildDashboard />
    </ProtectedRoute>
  ),
});
