import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Profile from "@/screens/Profile";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Profile — GameRun" },
      { name: "description", content: "GameRun: profile — earn screen time by staying active." },
      { property: "og:title", content: "Profile — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <Profile />
    </ProtectedRoute>
  ),
});
