import { createFileRoute } from "@tanstack/react-router";
import { AuthRedirect } from "@/components/RouteGuards";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "GameRun – Rörelse blir skärmtid" },
      { name: "description", content: "GameRun – Rörelse blir skärmtid i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "GameRun – Rörelse blir skärmtid" },
      { property: "og:description", content: "GameRun – Rörelse blir skärmtid i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: AuthRedirect,
});
