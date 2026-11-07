import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import AddChild from "@/screens/AddChild";

export const Route = createFileRoute("/parent/add-child")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Koppla barn — GameRun" },
      { name: "description", content: "Koppla barn i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Koppla barn — GameRun" },
      { property: "og:description", content: "Koppla barn i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="parent">
      <AddChild />
    </ProtectedRoute>
  ),
});
