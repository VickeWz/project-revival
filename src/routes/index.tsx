import { createFileRoute } from "@tanstack/react-router";
import { AuthRedirect } from "@/components/RouteGuards";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GameRun - Run More, Play More" },
      { name: "description", content: "Motivate kids to stay active by earning screen time through physical activity" },
      { property: "og:title", content: "GameRun - Run More, Play More" },
      { property: "og:description", content: "Motivate kids to stay active by earning screen time through physical activity" },
    ],
  }),
  component: AuthRedirect,
});
