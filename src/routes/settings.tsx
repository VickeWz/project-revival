import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Settings from "@/screens/Settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Inställningar — GameRun" },
      { name: "description", content: "Inställningar i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Inställningar — GameRun" },
      { property: "og:description", content: "Inställningar i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  ),
});
