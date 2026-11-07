import { createFileRoute } from "@tanstack/react-router";
import ResetPassword from "@/screens/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Reset password — GameRun" },
      { name: "description", content: "Choose a new password for your GameRun account." },
      { property: "og:title", content: "Reset password — GameRun" },
      { property: "og:description", content: "Choose a new password for your GameRun account." },
    ],
  }),
  component: ResetPassword,
});
