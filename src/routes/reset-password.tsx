import { createFileRoute } from "@tanstack/react-router";
import ResetPassword from "@/screens/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Återställ lösenord — GameRun" },
      { name: "description", content: "Återställ lösenord i GameRun. Följ verklig aktivitet och skärmtid från steg." },
      { property: "og:title", content: "Återställ lösenord — GameRun" },
      { property: "og:description", content: "Återställ lösenord i GameRun. Följ verklig aktivitet och skärmtid från steg." },
    ],
  }),
  component: ResetPassword,
});
