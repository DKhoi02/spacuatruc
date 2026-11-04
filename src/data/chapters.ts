/**
 * 8 chương — nguồn: docs/CHAPTER_1.md §5 (lịch 7 ngày) và docs/CHAPTERS.md (lịch học, ôn, kiểm tra mỗi chương).
 *
 * Quy ước:
 * - `customers` = số khách thường dự kiến (chưa tính anh Khôi ngày kiểm tra). Core có thể cộng/trừ theo uy tín, giá, quảng cáo.
 * - `unlocks` = mọi thứ chương này mở. Thời điểm mở cụ thể: dịch vụ theo `unlockChapterDay`, đồ theo `unlockChapterDay`
 *   của thiết bị, tính năng theo ngày có `introduce`. Riêng "free-mode" chỉ mở khi QUA kỳ thi Chương 8.
 * - Chương 8: tài liệu ghi "phản xạ bàn chân thêm vào sau khi chọn sơ đồ" — sơ đồ đã duyệt (mục H) nên Chương 8 thêm
 *   5 ngày học 15 vùng phản xạ (3 vùng/ngày) trước ngày ôn và kỳ thi tổng kết.
 */
import type { ChapterDayDef, ChapterDef, FeatureId } from "@/core/types";

type NewItem = ChapterDayDef["newItems"][number];
const p = (...ids: string[]): NewItem[] => ids.map((id) => ({ kind: "point", id }));
const m = (...ids: string[]): NewItem[] => ids.map((id) => ({ kind: "muscle", id }));
const z = (...ids: string[]): NewItem[] => ids.map((id) => ({ kind: "zone", id }));

function learn(chapterDay: number, newItems: NewItem[], customers: [number, number], introduce: FeatureId[], tips: string[]): ChapterDayDef {
  return { chapterDay, kind: "learn", newItems, customers, introduce, tips };
}
function review(chapterDay: number, customers: [number, number], introduce: FeatureId[], tips: string[]): ChapterDayDef {
  return { chapterDay, kind: "review", newItems: [], customers, introduce, tips };
}
function exam(chapterDay: number, customers: [number, number], introduce: FeatureId[], tips: string[]): ChapterDayDef {
  return { chapterDay, kind: "exam", newItems: [], customers, introduce, tips };
}

const EXAM_TIP = "Hôm nay anh Khôi (trưởng KTV) đến kiểm tra tay nghề. Gợi ý chỉ hiện tên, cần trung bình từ 80 điểm và không lỗi an toàn.";

export const CHAPTERS_DATA: ChapterDef[] = [
  // ───────────── Chương 1 ─────────────
  {
    no: 1, title: "Vùng mắt và trán", region: "eye-forehead",
    days: [
      learn(1, p("GV29", "EX-HN5"), [2, 2], ["billing", "clock", "checkin", "cleaning"], [
        "Chào mừng đến tiệm! Đón khách → mời vào giường → ấn huyệt theo phiếu → tính tiền → dọn giường.",
        "Tiệm mở 9:00–19:00. Đồng hồ chỉ chạy khi bạn làm việc: đón khách 5 phút, dọn giường 10 phút, mỗi ca bằng thời lượng dịch vụ. Hết việc thì bấm “Chờ”.",
        "Chạm đúng huyệt rồi giữ đủ số giây. Chương này chưa có thanh lực.",
        "Cuối ngày xem bảng tổng kết: doanh thu, vật tư đã dùng, tiền điện.",
      ]),
      learn(2, p("BL2", "TE23"), [3, 3], ["supplies", "queue"], [
        "Dầu massage sắp hết rồi: vào Cửa hàng để nhập vật tư theo gói.",
        "Khách đến gần nhau sẽ ngồi ghế chờ. Mỗi khách chờ được khoảng 1 tiếng rưỡi, chưa được đón thì sốt ruột nhanh gấp rưỡi.",
      ]),
      learn(3, p("EX-HN4", "GB14"), [3, 4], ["buy-equipment", "electricity", "depreciation"], [
        "Mở dịch vụ Chăm sóc da mặt: cần mua máy xông mặt trước.",
        "Máy xông tốn điện mỗi lần dùng. Đồ dùng hao mòn dần, bảng tổng kết có thêm dòng khấu hao.",
        "Ngư Yêu và Dương Bạch đều nằm thẳng trên đồng tử khi khách nhìn thẳng.",
      ]),
      learn(4, p("GB1", "ST2"), [4, 4], ["walkout", "complaint", "reputation"], [
        "Hàng chờ chỉ có 2 ghế: khách đến lúc hết ghế sẽ bỏ về.",
        "Khách phàn nàn thì chọn xin lỗi, hoặc xin lỗi và giảm 30%. Uy tín cao thì đông khách, nhiều tip.",
        "Huyệt gần mắt: ấn nhẹ, không chạm vào nhãn cầu. Tiền thuê đến hạn sau 3 ngày.",
      ]),
      learn(5, p("BL1", "ST1"), [4, 5], ["hire-ktv", "hire-receptionist", "hire-cleaner", "durability"], [
        "Tình Minh và Thừa Khấp sát nhãn cầu: ấn lên bờ xương hốc mắt, chạm vào mắt là lỗi an toàn.",
        "Mở Ấn huyệt mắt chuyên sâu và bảng tuyển dụng: KTV (cần giường riêng để làm song song), Lễ tân (tự đón khách), Tạp vụ (tự dọn giường).",
        "Giường đã mòn còn khoảng 80%. Độ bền dưới 20% khách dễ phàn nàn, 0% là hỏng.",
      ]),
      review(6, [5, 5], ["upgrades"], [
        "Ngày ôn tập: khách quen quay lại nhờ làm những huyệt bạn hay sai.",
        "Cửa hàng mở nâng cấp: nâng giường lên cấp Tốt (khách trả thêm 8%, tip +5%), đèn & tinh dầu (tip +5%).",
        "Nhớ để dành tiền: ngày mai trả tiền thuê 700.000đ.",
      ]),
      exam(7, [4, 4], ["rent"], [
        EXAM_TIP,
        "Phiếu kiểm tra có đủ 10 huyệt, huyệt 2 bên phải làm cả 2 bên.",
        "Cuối ngày trả tiền thuê mặt bằng tuần đầu.",
      ]),
    ],
    exam: { reviewCount: 0, passScore: 80, sessions: 1, requirePregnantCase: false },
    reward: { money: 500_000, reputation: 0.2, badge: "badge-ch1" },
    unlocks: {
      services: ["an-huyet-co-ban", "cham-soc-da-mat", "an-huyet-mat-chuyen-sau"],
      features: ["billing", "clock", "checkin", "cleaning", "supplies", "queue", "buy-equipment", "electricity", "depreciation", "walkout", "complaint", "reputation", "hire-ktv", "hire-receptionist", "hire-cleaner", "durability", "upgrades", "rent"],
      supplies: ["I01", "I02", "I04", "I05", "I06"],
      equipment: ["E01", "E02", "E03", "E05"],
    },
  },

  // ───────────── Chương 2 ─────────────
  {
    no: 2, title: "Má, mũi, miệng, hàm, tai", region: "face-lower",
    days: [
      learn(1, p("ST3", "SI18"), [4, 5], ["force-bar", "patience"], [
        "Mới: thanh lực. Giữ thì lực tăng, thả thì lực giảm. Giữ kim trong vùng đúng đủ số giây.",
        "Huyệt sát mắt (Tình Minh, Thừa Khấp...) từ nay phải ấn nhẹ, quá lực là lỗi an toàn.",
        "Khách trong ca có thanh kiên nhẫn: làm chậm chỉ bớt tip, khách không bỏ về. Mở Gội đầu thường (cần ghế gội).",
      ]),
      learn(2, p("EX-HN8", "LI20"), [4, 5], ["pricing"], [
        "Được chỉnh giá dịch vụ ±20%: giá cao ít khách, giá thấp đông khách nhưng lãi mỏng.",
        "Thượng Nghinh Hương và Nghinh Hương cùng nằm trên rãnh mũi má: một trên, một dưới.",
      ]),
      learn(3, p("GV26", "CV24"), [4, 5], [], [
        "Đông khách thì cân nhắc thuê Lễ tân (tự đón khách, khách chờ thêm 20 phút) và Tạp vụ (tự dọn giường, bớt tiền khăn).",
        "Thủy Câu và Thừa Tương là 2 huyệt giữa, ở trên và dưới môi.",
      ]),
      learn(4, p("ST4", "ST5"), [4, 6], [], [
        "Đại Nghinh sát động mạch mặt: chỉ ấn nhẹ.",
        "Mở Ấn huyệt mặt toàn diện: 6–10 huyệt khắp mặt.",
      ]),
      learn(5, p("ST6", "ST7"), [4, 6], [], [
        "Giáp Xa: khách cắn chặt răng thì cơ cắn nổi lên, thả ra thành chỗ lõm.",
        "Hạ Quan: khách ngậm miệng mới thấy lõm.",
      ]),
      learn(6, p("SI19", "TE17"), [5, 6], [], [
        "Thính Cung: khách há miệng mới thấy lõm, ngược với Hạ Quan.",
        "Ế Phong sau dái tai: ấn nhẹ.",
      ]),
      review(7, [5, 6], [], ["Ngày ôn tập: khách quen nhờ làm những huyệt bạn hay sai."]),
      exam(8, [4, 5], [], [EXAM_TIP, "Phiếu kiểm tra có 12 huyệt của chương và khoảng 5 huyệt chương trước."]),
    ],
    exam: { reviewCount: 5, passScore: 80, sessions: 1, requirePregnantCase: false },
    reward: { money: 700_000, reputation: 0.2, badge: "badge-ch2" },
    unlocks: {
      services: ["goi-dau-thuong", "an-huyet-mat-toan-dien"],
      features: ["force-bar", "patience", "pricing"],
      supplies: ["I07", "I08"],
      equipment: ["E06"],
    },
  },

  // ───────────── Chương 3 ─────────────
  {
    no: 3, title: "Cơ mặt", region: "face-muscles",
    days: [
      learn(1, m("frontalis", "corrugator-supercilii"), [4, 5], [], [
        "Mới: vuốt theo thớ cơ. Vuốt trong vùng cơ, đúng hướng, đủ dài, đủ số lần.",
        "Vùng mặt vuốt từ trong ra ngoài, từ dưới lên trên. Mở dịch vụ Xả cơ mặt.",
      ]),
      learn(2, m("orbicularis-oculi", "temporalis"), [4, 5], ["supply-tiers"], [
        "Có dầu massage cao cấp: đắt hơn nhưng khách vui, tip cao hơn.",
        "Cơ vòng mắt: vuốt theo bờ xương hốc mắt, lực rất nhẹ, không vuốt lên mi mắt.",
      ]),
      learn(3, m("masseter", "buccinator"), [4, 5], ["vip-room"], [
        "Có thể nâng cấp 1 giường thành Phòng VIP: khách VIP chỉ vào phòng VIP và trả cao hơn.",
        "Cơ cắn hay căng khi nghiến răng: vuốt từ cung gò má xuống góc hàm.",
      ]),
      learn(4, m("zygomaticus-major", "zygomaticus-minor"), [4, 6], [], [
        "Mở Gua sha mặt: cần mua bộ đá gua sha.",
        "Cơ gò má lớn và nhỏ đều chéo, dễ nhầm: cơ nhỏ nằm phía trong, đến môi trên.",
      ]),
      learn(5, m("levator-labii-superioris", "orbicularis-oris"), [4, 6], ["members"], [
        "Khách quen có thẻ thành viên: quay lại thường hơn nhưng đòi hỏi chất lượng cao hơn.",
      ]),
      learn(6, m("depressor-anguli-oris", "mentalis"), [4, 6], [], [
        "Cơ hạ góc miệng: vuốt từ bờ hàm lên khóe miệng để nâng khóe miệng.",
      ]),
      review(7, [5, 6], [], ["Ngày ôn tập: khách quen nhờ xả những cơ bạn hay vuốt sai."]),
      exam(8, [4, 5], [], [EXAM_TIP, "Phiếu kiểm tra có 12 cơ mặt và khoảng 5 mục chương trước."]),
    ],
    exam: { reviewCount: 5, passScore: 80, sessions: 1, requirePregnantCase: false },
    reward: { money: 800_000, reputation: 0.2, badge: "badge-ch3" },
    unlocks: {
      services: ["xa-co-mat", "gua-sha-mat"],
      features: ["supply-tiers", "vip-room", "members"],
      supplies: ["I03"],
      equipment: ["E07", "vip-room"],
    },
  },

  // ───────────── Chương 4 ─────────────
  {
    no: 4, title: "Đầu, da đầu, gáy trên", region: "head",
    days: [
      learn(1, p("GV24", "ST8"), [4, 5], ["events"], [
        "Thần Đình và Đầu Duy nằm ngay sau chân tóc trán: đo thốn từ chân tóc.",
        "Từ nay thỉnh thoảng có sự kiện bất ngờ: mất điện, hàng giao trễ, khách đoàn, nhân viên ốm.",
      ]),
      learn(2, p("GV20", "EX-HN1"), [4, 5], [], [
        "Mở Gội đầu dưỡng sinh: cần bình nước nóng (tốn điện).",
        "Tứ Thần Thông là 4 điểm cách Bách Hội 1 thốn: trước, sau, trái, phải.",
      ]),
      learn(3, p("GV16", "GB20"), [4, 6], [], ["Phong Phủ và Phong Trì ở sau gáy, dưới xương chẩm. Ấn lực vừa."]),
      learn(4, p("BL10"), [4, 6], [], ["Thiên Trụ ngang C2, ở bờ ngoài cơ thang: đừng nhầm với Phong Trì ở phía trên."]),
      review(5, [5, 6], [], ["Ngày ôn tập: khách quen nhờ làm những huyệt bạn hay sai."]),
      exam(6, [4, 5], [], [EXAM_TIP]),
    ],
    exam: { reviewCount: 5, passScore: 80, sessions: 1, requirePregnantCase: false },
    reward: { money: 900_000, reputation: 0.2, badge: "badge-ch4" },
    unlocks: { services: ["goi-dau-duong-sinh"], features: ["events"], supplies: [], equipment: ["E08"] },
  },

  // ───────────── Chương 5 ─────────────
  {
    no: 5, title: "Cổ, vai", region: "neck-shoulder",
    days: [
      learn(1, p("GV14", "GB21"), [5, 6], ["health-profile"], [
        "Mốc C7: đốt nhô cao nhất khi khách cúi đầu. Đại Chùy ở ngay dưới.",
        "Mới: hồ sơ khách. Xem hồ sơ trước khi làm. Kiên Tỉnh cần thận trọng với thai phụ: lực nhẹ hơn 1 bậc hoặc bỏ qua.",
        "Mở Massage cổ vai gáy: có cả ấn huyệt và vuốt cơ, làm theo thứ tự tùy ý.",
      ]),
      learn(2, m("trapezius", "levator-scapulae"), [5, 6], ["expansion"], [
        "Có thể mở rộng mặt bằng: thêm 2 giường nhưng tiền thuê lên 1.200.000đ/tuần.",
        "Vùng gáy vai vuốt từ trên xuống, ra phía đỉnh vai.",
      ]),
      learn(3, m("sternocleidomastoid", "platysma"), [5, 6], ["ads"], [
        "Không ấn vào bờ trước cơ ức đòn chũm: đó là động mạch cảnh, chạm vào là lỗi an toàn.",
        "Có thể chạy quảng cáo để có thêm khách trong vài ngày.",
      ]),
      review(4, [5, 7], ["group-booking"], [
        "Ngày ôn tập và luyện hồ sơ khách.",
        "Khách đoàn văn phòng có thể đặt trước dịch vụ cổ vai gáy.",
      ]),
      exam(5, [4, 5], [], [EXAM_TIP, "Bài kiểm tra có 1 khách đang mang thai: nhớ xem hồ sơ."]),
    ],
    exam: { reviewCount: 5, passScore: 80, sessions: 1, requirePregnantCase: true },
    reward: { money: 1_000_000, reputation: 0.2, badge: "badge-ch5" },
    unlocks: { services: ["massage-co-vai-gay"], features: ["health-profile", "expansion", "ads", "group-booking"], supplies: [], equipment: [] },
  },

  // ───────────── Chương 6 ─────────────
  {
    no: 6, title: "Tay", region: "hand",
    days: [
      learn(1, p("LI4", "PC8"), [5, 6], ["combo"], [
        "Hợp Cốc CHỐNG CHỈ ĐỊNH với thai phụ: phải bấm \"Không làm huyệt này\".",
        "Mở Massage tay. Có thể ghép 2–3 dịch vụ thành gói combo và tự đặt giá.",
      ]),
      learn(2, p("PC6", "HT7"), [5, 6], [], ["Nội Quan: trên nếp gấp cổ tay 2 thốn, giữa hai gân."]),
      review(3, [5, 7], [], ["Ngày ôn tập: nhiều khách có hồ sơ sức khỏe, xem kỹ trước khi làm."]),
      exam(4, [4, 5], [], [EXAM_TIP, "Bài kiểm tra có 1 khách đang mang thai: nhớ xem hồ sơ."]),
    ],
    exam: { reviewCount: 5, passScore: 80, sessions: 1, requirePregnantCase: true },
    reward: { money: 1_000_000, reputation: 0.2, badge: "badge-ch6" },
    unlocks: { services: ["massage-tay"], features: ["combo"], supplies: [], equipment: [] },
  },

  // ───────────── Chương 7 ─────────────
  {
    no: 7, title: "Lưng", region: "back",
    days: [
      learn(1, p("BL11", "BL12"), [5, 6], ["spine-count"], [
        "Mới: đếm đốt sống. Bắt đầu từ C7 rồi đếm xuống T1, T2. Huyệt Du cách đường giữa 1,5 thốn.",
        "Mở Massage body.",
      ]),
      learn(2, p("BL13", "BL17"), [5, 6], ["shifts"], [
        "Góc dưới xương bả vai ngang khoảng T7.",
        "Xếp ca: cho nhân viên nghỉ luân phiên để giữ hài lòng.",
      ]),
      learn(3, p("BL18", "BL20"), [5, 7], ["hygiene"], [
        "Mở Chườm đá nóng: cần đá nóng + máy hâm đá. Kéo đá đặt đúng huyệt trên lưng.",
        "Có thể bị kiểm tra vệ sinh: có Tạp vụ và đồ dùng bền tốt thì được thưởng uy tín.",
      ]),
      learn(4, p("BL23", "GV4"), [5, 7], [], ["L2: Mệnh Môn nằm giữa, Thận Du 2 bên cách 1,5 thốn."]),
      review(5, [6, 7], [], ["Ngày ôn tập: khách quen nhờ làm những huyệt bạn hay sai."]),
      exam(6, [5, 6], [], [EXAM_TIP, "Bài kiểm tra có 1 khách đang mang thai: nhớ xem hồ sơ."]),
    ],
    exam: { reviewCount: 5, passScore: 80, sessions: 1, requirePregnantCase: true },
    reward: { money: 1_200_000, reputation: 0.2, badge: "badge-ch7" },
    unlocks: { services: ["massage-body", "chuom-da-nong"], features: ["spine-count", "shifts", "hygiene"], supplies: [], equipment: ["E09"] },
  },

  // ───────────── Chương 8 ─────────────
  {
    no: 8, title: "Cẳng chân, bàn chân", region: "leg-foot",
    days: [
      learn(1, p("ST36", "SP6"), [5, 7], [], [
        "Tam Âm Giao CHỐNG CHỈ ĐỊNH với thai phụ: phải bỏ qua.",
        "Mở Bấm huyệt chân: cần ghế ngâm chân.",
      ]),
      learn(2, p("KI3", "LR3"), [5, 7], [], ["Thái Khê ở chỗ lõm giữa mắt cá trong và gân gót."]),
      learn(3, p("KI1"), [5, 7], [], ["Dũng Tuyền: chỗ lõm sâu nhất khi khách co các ngón chân."]),
      learn(4, z("head-brain", "sinuses", "eyes"), [5, 7], [], [
        "Mới: phản xạ bàn chân (tham khảo đào tạo). Chân phải ứng với nửa phải cơ thể, chân trái ứng với nửa trái.",
        "Mở Massage phản xạ bàn chân. Hôm nay học vùng các ngón chân.",
      ]),
      learn(5, z("ears", "neck-thyroid", "chest-lungs"), [5, 7], [], ["Ụ bàn chân ứng với ngực, phổi."]),
      learn(6, z("stomach-pancreas", "liver-gallbladder", "spleen"), [5, 7], [], [
        "Gan, túi mật chỉ có ở chân phải. Lách, dạ dày chủ yếu ở chân trái.",
      ]),
      learn(7, z("intestines", "kidneys", "pelvis-sciatic"), [5, 7], [], ["Gót chân ứng với vùng chậu và thần kinh tọa."]),
      learn(8, z("spine", "shoulder", "knee-hip"), [5, 7], [], ["Mép trong bàn chân là cột sống, mép ngoài là vai, đầu gối, hông."]),
      review(9, [6, 7], [], ["Ngày ôn tập trước kỳ thi tổng kết."]),
      exam(10, [5, 6], ["free-mode"], [
        "Kỳ thi tổng kết: 3 ca liên tiếp, mục lấy từ mọi chương, có 1 khách có hồ sơ chống chỉ định.",
        "Cần trung bình từ 85 điểm và không lỗi an toàn. Đạt sẽ nhận danh hiệu Kỹ thuật viên trị liệu và mở chế độ Khách tự do.",
      ]),
    ],
    exam: { reviewCount: 10, passScore: 85, sessions: 3, requirePregnantCase: true },
    reward: { money: 2_000_000, reputation: 0.2, badge: "badge-ch8" },
    unlocks: { services: ["bam-huyet-chan", "phan-xa-ban-chan"], features: ["free-mode"], supplies: [], equipment: ["E10"] },
  },
];
