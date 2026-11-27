import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ topics: [] as string[] }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ profile: { id: "child-1" } }) }));
vi.mock("@/integrations/supabase/client", () => {
  const channels = new Map<string, { subscribed: boolean }>();
  const query = {
    select: () => query,
    eq: () => query,
    order: () => Promise.resolve({ data: [], error: null }),
  };
  return {
    supabase: {
      from: () => query,
      // Like realtime-js: the same name returns the same channel, and listeners cannot be added after subscribe().
      channel: (topic: string) => {
        mocks.topics.push(topic);
        const channel = channels.get(topic) ?? { subscribed: false };
        channels.set(topic, channel);
        const api = {
          on: () => {
            if (channel.subscribed) throw new Error(`cannot add \`postgres_changes\` callbacks for ${topic} after \`subscribe()\`.`);
            return api;
          },
          subscribe: () => { channel.subscribed = true; return api; },
        };
        return api;
      },
      removeChannel: () => Promise.resolve("ok"),
    },
  };
});

import { useParentLink } from "@/hooks/useParentLink";

function ParentName() {
  const { loading } = useParentLink();
  return <p>{loading ? "laddar" : "klar"}</p>;
}

describe("useParentLink", () => {
  it("lets two parts of a screen read the parent link at the same time", async () => {
    render(<><ParentName /><ParentName /></>);
    await waitFor(() => expect(screen.getAllByText("klar")).toHaveLength(2));
    expect(new Set(mocks.topics).size).toBe(mocks.topics.length);
  });
});
