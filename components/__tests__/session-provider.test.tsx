import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SessionProvider,
  useAuthenticatedSession,
  setUnauthorizedHandler,
} from "../session-provider";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function Probe() {
  const { token } = useAuthenticatedSession();
  return <span data-testid="token">{token ?? "none"}</span>;
}

function renderProvider(initialToken?: string) {
  return render(
    <SessionProvider initialToken={initialToken}>
      <Probe />
    </SessionProvider>,
  );
}

describe("session-provider authentication", () => {
  beforeEach(() => {
    push.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when useAuthenticatedSession is used without a token in context", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow(
      /useAuthenticatedSession must be used within a SessionProvider/,
    );

    error.mockRestore();
  });

  it("registers the unauthorized handler on mount and clears it on unmount", () => {
    const register = vi.spyOn(window, "addEventListener");
    const unregister = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderProvider("token-123");

    expect(register).toHaveBeenCalledWith("unauthorized", expect.any(Function));

    unmount();

    expect(unregister).toHaveBeenCalledWith("unauthorized", expect.any(Function));
  });

  it("logs out and redirects to /login when a 401 response is received", async () => {
    renderProvider("token-123");

    await act(async () => {
      setUnauthorizedHandler(() => {
        window.localStorage.removeItem("token");
        push("/login");
      });
      window.dispatchEvent(new Event("unauthorized"));
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/login");
    });

    expect(window.localStorage.getItem("token")).toBeNull();
    expect(screen.getByTestId("token")).toHaveTextContent("none");
  });
});
