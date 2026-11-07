import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import HelpSupport from "@/screens/HelpSupport";

export const Route = createFileRoute("/help-support")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Hjälp och support — GameRun" },
      { name: "description", content: "Hjälp och support i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Hjälp och support — GameRun" },
      { property: "og:description", content: "Hjälp och support i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <HelpSupport />
    </ProtectedRoute>
  ),
});
