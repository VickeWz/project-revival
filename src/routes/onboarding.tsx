import { createFileRoute } from "@tanstack/react-router";
import { OnboardingRoute } from "@/components/RouteGuards";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Kom igång — GameRun" },
      { name: "description", content: "Kom igång i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Kom igång — GameRun" },
      { property: "og:description", content: "Kom igång i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: OnboardingRoute,
});
