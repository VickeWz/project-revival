import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import HelpSupport from "@/screens/HelpSupport";

export const Route = createFileRoute("/help-support")({
  head: () => ({
    meta: [
      { title: "Help & support — GameRun" },
      { name: "description", content: "GameRun: help & support — earn screen time by staying active." },
      { property: "og:title", content: "Help & support — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <HelpSupport />
    </ProtectedRoute>
  ),
});
