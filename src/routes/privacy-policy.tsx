import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import PrivacyPolicy from "@/screens/PrivacyPolicy";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Integritet — GameRun" },
      { name: "description", content: "Integritet i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Integritet — GameRun" },
      { property: "og:description", content: "Integritet i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <PrivacyPolicy />
    </ProtectedRoute>
  ),
});
