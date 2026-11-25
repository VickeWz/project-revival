import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Action {
  label: string;
  onClick: () => void;
}

/** The reward moment after a pass or a round of tasks: earned minutes, then the new balance. */
export function RewardScreen({ title, minutes, details, note, balance, primary, secondary }: {
  title: string;
  minutes: number;
  details: ReactNode;
  note?: ReactNode;
  balance: number;
  primary: Action;
  secondary: Action;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="header-safe mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-5 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mt-14 flex h-24 w-24 items-center justify-center rounded-full bg-reward text-reward-foreground shadow-[0_0_60px_-10px_var(--reward)]"
        >
          <PartyPopper className="h-11 w-11" aria-hidden="true" />
        </motion.div>
        <h1 className="mt-6 font-display text-3xl font-bold">{title}</h1>
        <p className="mt-2 font-display text-6xl font-bold tabular-nums text-reward">+{minutes} min</p>
        <p className="mt-3 text-muted-foreground">{details}</p>
        {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}

        <div className="mt-8 w-full rounded-3xl border border-primary/25 bg-card p-5">
          <p className="text-sm font-semibold text-muted-foreground">Din skärmtid</p>
          <p className="font-display text-4xl font-bold tabular-nums text-primary">{balance} min</p>
        </div>

        <div className="mt-auto w-full space-y-2 pt-8 bottom-bar-safe">
          <Button className="h-14 w-full text-base" onClick={primary.onClick}>
            {primary.label}
          </Button>
          <Button variant="ghost" className="h-12 w-full" onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        </div>
      </main>
    </div>
  );
}
