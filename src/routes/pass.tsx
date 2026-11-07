import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Pass from "@/screens/Pass";

export const Route = createFileRoute("/pass")({
  head: () => ({
    meta: [
      { title: "Pass — GameRun" },
      { name: "description", content: "GameRun: pass — earn screen time by staying active." },
      { property: "og:title", content: "Pass — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <Pass />
    </ProtectedRoute>
  ),
});
