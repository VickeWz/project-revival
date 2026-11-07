import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/RouteGuards";
import PrivacyPolicy from "@/screens/PrivacyPolicy";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — GameRun" },
      { name: "description", content: "GameRun: privacy policy — earn screen time by staying active." },
      { property: "og:title", content: "Privacy policy — GameRun" },
      { property: "og:description", content: "Earn screen time by staying active with GameRun." },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <PrivacyPolicy />
    </ProtectedRoute>
  ),
});
