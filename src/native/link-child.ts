import { callNativeApi } from "./api";
import type { linkChild as ServerLinkChild } from "@/lib/link-child.functions";

type Result = Awaited<ReturnType<typeof ServerLinkChild>>;

export const linkChild = ({ data }: { data: { childEmail: string; childPassword: string } }) =>
  callNativeApi<Result>("link-child", data);
