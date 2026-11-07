import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import AlwaysAllowed from "@/screens/parent/AlwaysAllowed";

export const Route = createFileRoute("/parent/always-allowed")({
  head: () => ({
    meta: [
      { title: "Always allowed apps — GameRun" },
      { name: "description", content: "GameRun: always allowed apps — earn screen time by staying active." },
      { property: "og:title", content: "Always allowed apps — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="parent">
      <AlwaysAllowed />
    </ProtectedRoute>
  ),
});
