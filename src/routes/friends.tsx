import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Friends from "@/screens/Friends";

export const Route = createFileRoute("/friends")({
  head: () => ({
    meta: [
      { title: "Friends — GameRun" },
      { name: "description", content: "GameRun: friends — earn screen time by staying active." },
      { property: "og:title", content: "Friends — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <Friends />
    </ProtectedRoute>
  ),
});
