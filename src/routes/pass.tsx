import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import Pass from "@/screens/Pass";

export const Route = createFileRoute("/pass")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Tjäna tid — GameRun" },
      { name: "description", content: "Tjäna skärmtid i GameRun genom rörelse eller uppgifter." },
      { property: "og:title", content: "Tjäna tid — GameRun" },
      { property: "og:description", content: "Tjäna skärmtid i GameRun genom rörelse eller uppgifter." },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRole="child">
      <Pass />
    </ProtectedRoute>
  ),
});
