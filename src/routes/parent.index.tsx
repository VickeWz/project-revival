import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import ParentDashboard from "@/screens/ParentDashboard";

export const Route = createFileRoute("/parent/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Föräldraöversikt — GameRun" },
      { name: "description", content: "Föräldraöversikt i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Föräldraöversikt — GameRun" },
      { property: "og:description", content: "Föräldraöversikt i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="parent">
      <ParentDashboard />
    </ProtectedRoute>
  ),
});
