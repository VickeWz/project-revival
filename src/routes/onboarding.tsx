import { createFileRoute } from "@tanstack/react-router";
import { OnboardingRoute } from "@/components/RouteGuards";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Get started — GameRun" },
      { name: "description", content: "Set up your GameRun account." },
      { property: "og:title", content: "Get started — GameRun" },
      { property: "og:description", content: "Set up your GameRun account." },
    ],
  }),
  component: OnboardingRoute,
});
