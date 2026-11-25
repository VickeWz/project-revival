import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MinutePickerProps {
  value: number;
  onChange: (minutes: number) => void;
  min: number;
  max: number;
  step?: number;
  presets?: number[];
  disabled?: boolean;
  /** Accessible name for the whole control, e.g. "Minuter att låsa upp". */
  label: string;
}

/**
 * One way to choose minutes everywhere (unlocking time, asking a parent):
 * a large number with -/+ buttons and quick choices. All targets are at least 44 px.
 */
export function MinutePicker({
  value,
  onChange,
  min,
  max,
  step = 5,
  presets = [15, 30, 45, 60],
  disabled = false,
  label,
}: MinutePickerProps) {
  const clamp = (minutes: number) => Math.max(min, Math.min(max, minutes));
  const quickChoices = presets.filter((minutes) => minutes >= min && minutes <= max);
  const stepButton =
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition active:scale-95 disabled:opacity-40";

  return (
    <div role="group" aria-label={label} className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          aria-label={`${step} minuter mindre`}
          className={stepButton}
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - step))}
        >
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="text-center" aria-live="polite">
          <span className="font-display text-4xl font-bold tabular-nums text-foreground">{value}</span>
          <span className="ml-1.5 text-base font-semibold text-muted-foreground">min</span>
        </p>
        <button
          type="button"
          aria-label={`${step} minuter mer`}
          className={stepButton}
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + step))}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {quickChoices.length > 1 && (
        <div className="flex gap-2">
          {quickChoices.map((minutes) => (
            <button
              key={minutes}
              type="button"
              aria-pressed={value === minutes}
              disabled={disabled}
              onClick={() => onChange(minutes)}
              className={cn(
                "h-11 flex-1 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40",
                value === minutes ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {minutes} min
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
