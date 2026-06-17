export interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  answer: string;
  slots: string[];
  slotSuffix: string;
  bannerImage: string;
  logoImage: string;
  couponImage: string;
  productUrl: string;
  couponNotice: string;
  productPrompt: string;
  productHighlight: string;
  correctNotice?: string;
  alreadyShowFullPrompt?: boolean;
}
const campaigns: Record<string, Campaign> = {
  "qanda-tutoring": {
    id: "qanda-tutoring",
    title: "콴다 과외 지금 신청하면",
    subtitle: "명문대 출신 선생님의",
    answer: "무료수업",
    slots: ["ㅁ", "ㄹ", "ㅅ", "ㅇ"],
    slotSuffix: "2회 추가!",
    bannerImage: "/qanda-tutoring.png",
    logoImage: "/QANDA_logo_symbol.png",
    couponImage: "/gs25_coupon.png",
    productUrl: "https://class.qanda.ai/",
    couponNotice: "퀴즈 맞히면 편의점 상품권 자동 응모!",
    productPrompt: "페이지를 방문하면 당첨 확률 UP! 🔥",
    productHighlight: "콴다 과외",
  },
  "hwanta": {
    id: "hwanta",
    title: "환타와 역대급 콜라보를",
    subtitle: "선보인 캐릭터 브랜드는?",
    answer: "조앤프렌즈",
    slots: ["ㅈ", "ㅇ", "ㅍ", "ㄹ", "ㅈ"],
    slotSuffix: "!",
    bannerImage: "/hwanta-banner.jpg",
    logoImage: "/hwanta-logo.jpg",
    couponImage: "/hwanta-coupon.png",
    productUrl: "https://shop.coupang.com/A00170647/325339?locale=ko_KR&platform",
    couponNotice: "퀴즈 맞히면 환타 편의점 교환권 자동 응모!",
    productPrompt: "이벤트 페이지를 방문하면 당첨 확률 UP! 🔥",
    productHighlight: "환타x조앤프렌즈",
  },
  "dookki": {
    id: "dookki",
    title: "떡볶이, 마라탕, 볶음밥, 튀김, 디저트까지",
    subtitle: "시험 끝나고 친구들과 가야 할 필수코스는?",
    answer: "두끼",
    slots: ["ㄷ", "ㄲ"],
    slotSuffix: "",
    bannerImage: "/dookki-banner.png",
    logoImage: "/dookki-logo.png",
    couponImage: "/dookki-coupon.png",
    productUrl: "https://www.instagram.com/topokki_dookki/",
    couponNotice: "정답 맞히면 ㄷㄲ 5천원 쿠폰에 자동 응모!",
    correctNotice: "두끼 5천원 쿠폰 응모 완료",
    productPrompt: "인스타그램 팔로우하면 당첨 확률 UP! 🔥",
    productHighlight: "두끼",
    alreadyShowFullPrompt: true,
  },
};
export function getCampaign(id: string): Campaign | null {
  return campaigns[id] ?? null;
}
export function getAllCampaignIds(): string[] {
  return Object.keys(campaigns);
}
