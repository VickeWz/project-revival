import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import AddChild from "@/screens/AddChild";

export const Route = createFileRoute("/parent/add-child")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Add a child — GameRun" },
      { name: "description", content: "GameRun: add a child — earn screen time by staying active." },
      { property: "og:title", content: "Add a child — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="parent">
      <AddChild />
    </ProtectedRoute>
  ),
});
