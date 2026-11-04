/** DEV ONLY: installs mock api/content and returns a boot function for the requested fixture variant. */
import type { GameState } from "@/core/types";
import { installMock, api } from "@/ui/api";
import { installMockContent } from "@/ui/content";
import { useMockKeys } from "@/save/storage";
import { mockApi } from "./mockApi";
import * as mc from "./mockContent";
import { mockGameState } from "./mockState";
import { setUi } from "@/ui/ui";

export function setupMock(variant: string): () => Promise<GameState | null> {
  useMockKeys();
  installMock(mockApi);
  installMockContent({
    ACUPOINTS: mc.ACUPOINTS, SERVICES: mc.SERVICES, SUPPLIES: mc.SUPPLIES, EQUIPMENT: mc.EQUIPMENT,
    STAFF_TIERS: mc.STAFF_TIERS, CHAPTERS: mc.CHAPTERS, CARE_STEPS: mc.CARE_STEPS, CONFIG: mc.MOCK_CONFIG,
  });
  return async () => {
    if (variant === "fresh") return null;
    let s = mockGameState();
    const open = (g: GameState) => api.processArrivals(api.openShop(g));
    switch (variant) {
      case "open": s = open(s); break;
      case "summary": {
        s = open(s);
        const r = api.closeDay({ ...s, today: { ...s.today, queue: [], arrivals: [] } });
        s = r.state;
        setUi({ summary: r.summary });
        break;
      }
      case "exam": s = { ...s, day: 7, chapterDay: 7, mastery: { ...s.mastery } }; break;
      case "free": s = { ...s, freeMode: true, chapter: 8 }; break;
      case "intro": s = { ...s, seenTips: s.seenTips.filter((t) => t !== "hire-ktv") }; break;
      case "complaint": {
        s = open(s);
        s = { ...s, today: { ...s.today, complaints: [{ id: "cp1", customerId: s.today.queue[0].id, customerName: s.today.queue[0].name, reason: "Ui, chị ấn vào mắt em!", refundIfApologize: 30000 }] } };
        break;
      }
      case "promo": s = { ...s, staff: s.staff.map((x) => ({ ...x, promotionRequested: true, quitNoticeDaysLeft: 2, satisfaction: 18 })) }; break;
    }
    return s;
  };
}
