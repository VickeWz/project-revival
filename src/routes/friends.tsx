import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Friends from "@/screens/Friends";

export const Route = createFileRoute("/friends")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Vänner — GameRun" },
      { name: "description", content: "Vänner i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Vänner — GameRun" },
      { property: "og:description", content: "Vänner i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <Friends />
    </ProtectedRoute>
  ),
});
