import { render } from "preact";
import { App } from "./ui/App";
import "./styles/global.css";
import "./styles/app.css";
import { setUi, type Tab } from "./ui/ui";
import type { GameState } from "./core/types";

async function start() {
  const params = new URLSearchParams(location.search);
  let boot: (() => Promise<GameState | null>) | undefined;
  if (import.meta.env.DEV && params.has("mock")) {
    const { setupMock } = await import("./ui/dev/setupMock");
    boot = setupMock(params.get("mock") || "prep");
  }
  if (import.meta.env.DEV) {
    const tab = params.get("tab") as Tab | null;
    if (tab) setUi({ tab });
  }
  // iOS: block pinch-zoom gestures (the treatment view has its own zoom).
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  render(<App boot={boot} />, document.getElementById("app")!);
}
void start();
