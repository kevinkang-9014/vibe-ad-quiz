import type { Metadata, Viewport } from "next";
import { headers, cookies } from "next/headers";
import * as jose from "jose";
import { QandaUserProvider } from "@/components/QandaUserProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "콴다 초성 퀴즈",
  description: "초성을 맞혀보세요!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await (async () => {
    try {
      const authorization = (await headers()).get("Authorization");
      if (authorization) {
        const decoded = jose.decodeJwt(authorization);
        return (decoded.sub as string) ?? null;
      }
      const cookieStore = await cookies();
      const accessToken = cookieStore.get("access_token");
      if (accessToken?.value) {
        const decoded = jose.decodeJwt(accessToken.value);
        return (decoded.sub as string) ?? null;
      }
      const qandaUserId = cookieStore.get("qanda_user_id");
      if (qandaUserId?.value) return qandaUserId.value;
      return null;
    } catch {
      return null;
    }
  })();

  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://assets.qanda.ai/common-assets/fonts/pretendard/pretendard-kr.css"
        />
      </head>
      <body>
        <QandaUserProvider userId={userId}>{children}</QandaUserProvider>
      </body>
    </html>
  );
}
