import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Profile from "@/screens/Profile";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Profil — GameRun" },
      { name: "description", content: "Profil i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Profil — GameRun" },
      { property: "og:description", content: "Profil i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <Profile />
    </ProtectedRoute>
  ),
});
