import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Pass from "@/screens/Pass";

export const Route = createFileRoute("/pass")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Aktivitetspass — GameRun" },
      { name: "description", content: "Aktivitetspass i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Aktivitetspass — GameRun" },
      { property: "og:description", content: "Aktivitetspass i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <Pass />
    </ProtectedRoute>
  ),
});
