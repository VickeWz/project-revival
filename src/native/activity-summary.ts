import { callNativeApi } from "./api";
import type { summarizeActivity as ServerSummarize } from "@/lib/activity-summary.functions";

type Result = Awaited<ReturnType<typeof ServerSummarize>>;

export const summarizeActivity = ({ data }: { data: { steps: number } }) =>
  callNativeApi<Result>("activity-summary", data);
