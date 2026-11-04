/**
 * 48 huyệt — nguồn: docs/CONTENT_ACUPOINTS.md mục A–E (vị trí, đối xứng, an toàn) + mục G (lực, giây, kỹ thuật, tác dụng).
 * views / sides / variant khớp art/views/*.json (kiểm tra trong data.test.ts).
 */
import type { AcupointDef, ChapterNo, Force, RegionId, Side, ViewId } from "@/core/types";

const LR: Side[] = ["left", "right"];
const C: Side[] = ["center"];

type Row = [
  id: string, name: string, chapter: ChapterNo, region: RegionId, sides: Side[],
  location: string, force: Force, seconds: number, technique: string, effects: string,
  views: ViewId[], extra?: Partial<AcupointDef>,
];

function build(rows: Row[]): AcupointDef[] {
  return rows.map(([id, name, chapter, region, sides, location, force, seconds, technique, effects, views, extra]) => ({
    id, name, chapter, region, sides, location, force, seconds, technique, effects, views,
    sensitive: false,
    ...extra,
  }));
}

export const ACUPOINTS_DATA: AcupointDef[] = build([
  // ── Chương 1: mắt, trán (10) ──
  ["GV29", "Ấn Đường", 1, "eye-forehead", C, "Chỗ lõm ở điểm giữa hai đầu trong lông mày (mã cũ EX-HN3)",
    "medium", 4, "Ấn giữ", "Đau đầu vùng trán, căng thẳng, mất ngủ, nghẹt mũi", ["V01"]],
  ["EX-HN5", "Thái Dương", 1, "eye-forehead", LR, "Chỗ lõm khoảng 1 thốn phía sau điểm giữa của đầu ngoài lông mày và khóe mắt ngoài",
    "medium", 4, "Day tròn nhẹ", "Đau nửa đầu, đau đầu vùng thái dương, mỏi mắt", ["V01", "V02"],
    { safetyNote: "Ấn lực vừa" }],
  ["BL2", "Toản Trúc", 1, "eye-forehead", LR, "Chỗ lõm ở đầu trong lông mày",
    "medium", 4, "Ấn giữ", "Đau đầu vùng trán, mỏi mắt, chảy nước mắt", ["V01"]],
  ["TE23", "Ty Trúc Không", 1, "eye-forehead", LR, "Chỗ lõm ở đầu ngoài lông mày",
    "light", 3, "Ấn giữ", "Đau đầu, đau mắt, giật mí mắt", ["V01"]],
  ["EX-HN4", "Ngư Yêu", 1, "eye-forehead", LR, "Giữa lông mày, thẳng trên đồng tử (mắt nhìn thẳng)",
    "light", 3, "Ấn giữ", "Mỏi mắt, đau vùng trên ổ mắt, giật mí mắt", ["V01"]],
  ["GB14", "Dương Bạch", 1, "eye-forehead", LR, "Trên lông mày 1 thốn, thẳng trên đồng tử",
    "medium", 4, "Ấn giữ", "Đau đầu vùng trán, mỏi mắt", ["V01"]],
  ["GB1", "Đồng Tử Liêu", 1, "eye-forehead", LR, "Chỗ lõm cách khóe mắt ngoài 0,5 thốn về phía ngoài",
    "light", 3, "Ấn giữ", "Mỏi mắt, đau mắt, đau đầu", ["V01", "V02"],
    { safetyNote: "Gần mắt, ấn nhẹ", sensitive: true }],
  ["ST2", "Tứ Bạch", 1, "eye-forehead", LR, "Thẳng dưới đồng tử, tại lỗ dưới hốc mắt (chỗ lõm nhỏ trên xương)",
    "light", 3, "Ấn giữ", "Mỏi mắt, đau vùng mặt, giật cơ mặt", ["V01"],
    { safetyNote: "Gần mắt, ấn nhẹ", sensitive: true }],
  ["BL1", "Tình Minh", 1, "eye-forehead", LR, "Chỗ lõm hơi phía trên khóe mắt trong, sát thành trong hốc mắt",
    "light", 3, "Ấn nhẹ lên thành xương, hướng ra sau", "Mỏi mắt, khô mắt, chảy nước mắt", ["V01"],
    { safetyNote: "Sát nhãn cầu: ấn rất nhẹ, không đè vào mắt", sensitive: true }],
  ["ST1", "Thừa Khấp", 1, "eye-forehead", LR, "Thẳng dưới đồng tử, giữa nhãn cầu và bờ dưới hốc mắt",
    "light", 3, "Ấn nhẹ lên bờ xương hốc mắt", "Mỏi mắt, chảy nước mắt, giật mí mắt", ["V01"],
    { safetyNote: "Sát nhãn cầu: ấn rất nhẹ lên bờ xương, không đè vào mắt", sensitive: true }],

  // ── Chương 2: má, mũi, miệng, hàm, tai (12) ──
  ["ST3", "Cự Liêu", 2, "face-lower", LR, "Thẳng dưới đồng tử, ngang bờ dưới cánh mũi",
    "medium", 4, "Ấn giữ", "Nghẹt mũi, đau răng hàm trên, đau vùng má", ["V01"]],
  ["SI18", "Quyền Liêu", 2, "face-lower", LR, "Thẳng dưới khóe mắt ngoài, chỗ lõm bờ dưới xương gò má",
    "medium", 4, "Ấn hướng lên bờ dưới xương gò má", "Đau răng, giật cơ mặt, đau vùng má", ["V01", "V02"]],
  ["EX-HN8", "Thượng Nghinh Hương", 2, "face-lower", LR, "Đầu trên rãnh mũi má, chỗ nối sụn cánh mũi và xương mũi",
    "light", 3, "Ấn giữ", "Nghẹt mũi, viêm mũi", ["V01"], { altName: "Tỵ Thông" }],
  ["LI20", "Nghinh Hương", 2, "face-lower", LR, "Trong rãnh mũi má, ngang điểm giữa bờ ngoài cánh mũi",
    "light", 3, "Ấn giữ hoặc day nhẹ", "Nghẹt mũi, sổ mũi, giảm khứu giác", ["V01"]],
  ["GV26", "Thủy Câu", 2, "face-lower", C, "Trên rãnh nhân trung, chỗ nối 1/3 trên và 1/3 giữa",
    "medium", 3, "Ấn giữ", "Huyệt cấp cứu khi choáng, ngất (trong spa ít dùng)", ["V01"],
    { altName: "Nhân Trung", safetyNote: "Huyệt cấp cứu, trong spa ít dùng" }],
  ["CV24", "Thừa Tương", 2, "face-lower", C, "Chỗ lõm ở giữa rãnh môi cằm",
    "light", 3, "Ấn giữ", "Đau răng, chảy nước dãi, căng cơ quanh miệng", ["V01"]],
  ["ST4", "Địa Thương", 2, "face-lower", LR, "Cách khóe miệng 0,4 thốn về phía ngoài",
    "light", 3, "Ấn giữ", "Méo miệng, chảy nước dãi, căng cơ quanh miệng", ["V01"]],
  ["ST5", "Đại Nghinh", 2, "face-lower", LR, "Phía trước góc hàm, chỗ lõm ở bờ trước cơ cắn, nơi bắt được mạch động mạch mặt",
    "light", 3, "Ấn nhẹ, tránh đè động mạch", "Đau răng, sưng má, căng cơ hàm", ["V01", "V02"],
    { safetyNote: "Tránh ấn mạnh vào động mạch", sensitive: true }],
  ["ST6", "Giáp Xa", 2, "face-lower", LR, "Khoảng 1 khoát ngón tay phía trước-trên góc hàm. Cắn chặt răng thì cơ cắn nổi lên, thả ra thì thành chỗ lõm",
    "medium", 4, "Ấn giữ", "Đau răng, cứng hàm, nghiến răng", ["V01", "V02"]],
  ["ST7", "Hạ Quan", 2, "face-lower", LR, "Trước tai, chỗ lõm giữa bờ dưới cung gò má và khuyết xương hàm dưới. Ngậm miệng mới thấy lõm (há miệng thì mất)",
    "medium", 4, "Ấn giữ (khách ngậm miệng)", "Đau khớp thái dương hàm, đau răng, ù tai", ["V01", "V02"],
    { variant: "mouth-closed" }],
  ["SI19", "Thính Cung", 2, "face-lower", LR, "Chỗ lõm giữa bình tai và khớp thái dương hàm, há miệng mới thấy",
    "light", 3, "Ấn giữ (khách há miệng)", "Ù tai, đau tai", ["V02"],
    { variant: "mouth-open" }],
  ["TE17", "Ế Phong", 2, "face-lower", LR, "Sau dái tai, chỗ lõm giữa mỏm chũm và góc hàm dưới",
    "light", 3, "Ấn giữ", "Ù tai, đau hàm, căng cơ mặt", ["V02"],
    { safetyNote: "Ấn nhẹ" }],

  // ── Chương 4: đầu, da đầu, gáy trên (7) ──
  ["GV24", "Thần Đình", 4, "head", C, "Trên đường giữa, vào trong chân tóc trán 0,5 thốn",
    "medium", 4, "Ấn giữ", "Đau đầu, chóng mặt, mất ngủ", ["V01", "V03"]],
  ["ST8", "Đầu Duy", 4, "head", LR, "Vào trong chân tóc ở góc trán 0,5 thốn, cách đường giữa 4,5 thốn",
    "medium", 4, "Ấn giữ hoặc day tròn", "Đau đầu vùng trán bên, chóng mặt", ["V01", "V03", "V02"]],
  ["GV20", "Bách Hội", 4, "head", C, "Trên đường giữa, vào trong chân tóc trán 5 thốn. Gần đúng: điểm giữa đường nối hai đỉnh vành tai",
    "medium", 5, "Ấn giữ", "Đau đầu, chóng mặt, mất ngủ, căng thẳng", ["V03"]],
  ["EX-HN1", "Tứ Thần Thông", 4, "head", ["front", "back", "left", "right"], "4 huyệt cách Bách Hội 1 thốn về phía trước, sau, trái, phải",
    "medium", 3, "Ấn lần lượt 4 điểm (3 giây mỗi điểm)", "Đau đầu, chóng mặt, mất ngủ", ["V03"]],
  ["GV16", "Phong Phủ", 4, "head", C, "Thẳng dưới ụ chẩm ngoài, chỗ lõm giữa hai cơ thang",
    "medium", 4, "Ấn hướng lên, nhẹ nhàng", "Đau đầu vùng gáy, cứng gáy, cảm lạnh", ["V04"],
    { safetyNote: "Ấn lực vừa" }],
  ["GB20", "Phong Trì", 4, "head", LR, "Dưới xương chẩm, chỗ lõm giữa đầu trên cơ ức đòn chũm và cơ thang",
    "medium", 5, "Ấn hướng lên và vào trong", "Đau đầu, cứng gáy, chóng mặt, mỏi mắt, cảm lạnh", ["V04"],
    { safetyNote: "Ấn lực vừa" }],
  ["BL10", "Thiên Trụ", 4, "head", LR, "Ngang bờ trên mỏm gai đốt sống cổ C2, chỗ lõm ở bờ ngoài cơ thang",
    "medium", 4, "Ấn giữ", "Đau gáy, cứng cổ, đau đầu", ["V04"]],

  // ── Chương 5: cổ, vai (2) ──
  ["GV14", "Đại Chùy", 5, "neck-shoulder", C, "Chỗ lõm dưới mỏm gai đốt sống cổ C7 (đốt nhô cao nhất khi cúi đầu)",
    "medium", 4, "Ấn giữ", "Cảm sốt, cứng cổ gáy", ["V04", "V06"]],
  ["GB21", "Kiên Tỉnh", 5, "neck-shoulder", LR, "Điểm giữa đường nối mỏm gai C7 và đầu ngoài mỏm cùng vai",
    "medium", 5, "Ấn hướng xuống, không ấn sâu", "Đau mỏi vai gáy, cứng cổ", ["V06"],
    { safetyNote: "Thận trọng với phụ nữ mang thai (lực nhẹ hơn 1 bậc hoặc bỏ qua), ấn hướng xuống, không ấn sâu", pregnancy: "caution" }],

  // ── Chương 6: tay (4) ──
  ["LI4", "Hợp Cốc", 6, "hand", LR, "Mu bàn tay, điểm giữa xương bàn tay thứ 2, sát phía ngón cái",
    "strong", 5, "Ấn hướng về xương bàn tay thứ 2", "Đau đầu, đau răng, đau vùng mặt, cảm lạnh", ["V07"],
    { safetyNote: "Chống chỉ định với phụ nữ mang thai: bỏ qua", pregnancy: "contraindicated" }],
  ["PC8", "Lao Cung", 6, "hand", LR, "Lòng bàn tay, giữa xương bàn tay 2 và 3, ngay phía trên khớp bàn-ngón. Nắm tay thì đầu ngón giữa chạm vào",
    "medium", 4, "Ấn giữ", "Căng thẳng, hồi hộp, mệt mỏi", ["V08"]],
  ["PC6", "Nội Quan", 6, "hand", LR, "Mặt trong cẳng tay, trên nếp gấp cổ tay 2 thốn, giữa gân cơ gan tay dài và gân cơ gấp cổ tay quay",
    "medium", 4, "Ấn giữ", "Buồn nôn, say tàu xe, hồi hộp, mất ngủ", ["V08"]],
  ["HT7", "Thần Môn", 6, "hand", LR, "Trên nếp gấp cổ tay phía ngón út, chỗ lõm bờ ngoài gân cơ gấp cổ tay trụ",
    "light", 3, "Ấn giữ", "Mất ngủ, hồi hộp, lo âu", ["V08"]],

  // ── Chương 7: lưng (8) ──
  ["BL11", "Đại Trữ", 7, "back", LR, "Ngang bờ dưới mỏm gai đốt ngực T1, cách đường giữa 1,5 thốn",
    "strong", 5, "Ấn giữ bằng ngón cái", "Đau lưng trên, đau vai, ho", ["V06"]],
  ["BL12", "Phong Môn", 7, "back", LR, "Ngang bờ dưới mỏm gai T2, cách đường giữa 1,5 thốn",
    "strong", 5, "Ấn giữ bằng ngón cái", "Cảm lạnh, ho, đau lưng trên", ["V06"]],
  ["BL13", "Phế Du", 7, "back", LR, "Ngang bờ dưới mỏm gai T3, cách đường giữa 1,5 thốn",
    "strong", 5, "Ấn giữ bằng ngón cái", "Ho, khó thở, bệnh đường hô hấp", ["V06"]],
  ["BL17", "Cách Du", 7, "back", LR, "Ngang bờ dưới mỏm gai T7 (khoảng ngang góc dưới xương bả vai), cách đường giữa 1,5 thốn",
    "strong", 5, "Ấn giữ bằng ngón cái", "Nấc, buồn nôn, đau lưng giữa", ["V06"]],
  ["BL18", "Can Du", 7, "back", LR, "Ngang bờ dưới mỏm gai T9, cách đường giữa 1,5 thốn",
    "strong", 5, "Ấn giữ bằng ngón cái", "Đau vùng sườn, mỏi mắt, căng thẳng", ["V06"]],
  ["BL20", "Tỳ Du", 7, "back", LR, "Ngang bờ dưới mỏm gai T11, cách đường giữa 1,5 thốn",
    "strong", 5, "Ấn giữ bằng ngón cái", "Đầy bụng, ăn kém, mệt mỏi", ["V06"]],
  ["BL23", "Thận Du", 7, "back", LR, "Ngang bờ dưới mỏm gai thắt lưng L2, cách đường giữa 1,5 thốn",
    "strong", 5, "Ấn giữ bằng ngón cái", "Đau lưng dưới, mỏi gối, ù tai", ["V06"]],
  ["GV4", "Mệnh Môn", 7, "back", C, "Chỗ lõm dưới mỏm gai L2",
    "medium", 4, "Ấn giữ", "Đau lưng dưới, mệt mỏi, sợ lạnh", ["V06"]],

  // ── Chương 8: cẳng chân, bàn chân (5) ──
  ["ST36", "Túc Tam Lý", 8, "leg-foot", LR, "Mặt trước cẳng chân, dưới huyệt Độc Tỵ (ST35, hõm ngoài dưới xương bánh chè) 3 thốn, cách mào xương chày khoảng 1 khoát ngón tay",
    "strong", 5, "Ấn giữ bằng ngón cái", "Tiêu hóa kém, mệt mỏi, nâng cao thể lực", ["V09"]],
  ["SP6", "Tam Âm Giao", 8, "leg-foot", LR, "Mặt trong cẳng chân, trên đỉnh mắt cá trong 3 thốn, sát bờ sau xương chày",
    "medium", 4, "Ấn giữ", "Kinh nguyệt không đều, mất ngủ, tiêu hóa kém", ["V10"],
    { safetyNote: "Chống chỉ định với phụ nữ mang thai: bỏ qua", pregnancy: "contraindicated" }],
  ["KI3", "Thái Khê", 8, "leg-foot", LR, "Chỗ lõm giữa đỉnh mắt cá trong và gân gót",
    "medium", 4, "Ấn giữ", "Đau lưng dưới, ù tai, mất ngủ", ["V10"]],
  ["LR3", "Thái Xung", 8, "leg-foot", LR, "Mu bàn chân, giữa xương bàn chân 1 và 2, chỗ lõm phía trước chỗ hai nền xương gặp nhau",
    "medium", 4, "Ấn giữ", "Đau đầu, căng thẳng, chóng mặt, dễ cáu", ["V11"]],
  ["KI1", "Dũng Tuyền", 8, "leg-foot", LR, "Lòng bàn chân, chỗ lõm sâu nhất khi co các ngón chân. Khoảng chỗ nối 1/3 trước và 2/3 sau của đường nối khe ngón 2–3 với gót",
    "strong", 5, "Ấn hoặc day mạnh bằng ngón cái", "Mất ngủ, đau đỉnh đầu, chóng mặt, mệt mỏi", ["V12"]],
]);

export const pointIdsOfChapter = (ch: ChapterNo): string[] =>
  ACUPOINTS_DATA.filter((p) => p.chapter === ch).map((p) => p.id);
