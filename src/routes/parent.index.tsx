import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import ParentDashboard from "@/screens/ParentDashboard";

export const Route = createFileRoute("/parent/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Parent dashboard — GameRun" },
      { name: "description", content: "GameRun: parent dashboard — earn screen time by staying active." },
      { property: "og:title", content: "Parent dashboard — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="parent">
      <ParentDashboard />
    </ProtectedRoute>
  ),
});
