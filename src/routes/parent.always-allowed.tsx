import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import AlwaysAllowed from "@/screens/parent/AlwaysAllowed";

export const Route = createFileRoute("/parent/always-allowed")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Alltid tillåtna appar — GameRun" },
      { name: "description", content: "Alltid tillåtna appar i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Alltid tillåtna appar — GameRun" },
      { property: "og:description", content: "Alltid tillåtna appar i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="parent">
      <AlwaysAllowed />
    </ProtectedRoute>
  ),
});
