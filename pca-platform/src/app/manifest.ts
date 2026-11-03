import type { MetadataRoute } from "next";

/**
 * 홈 화면에 설치하는 CareerMatri (PWA 1단계, `docs/metri/APP_OPTIONS.md` 4절).
 *
 * **여는 자리는 `/me` 다.** 설치하는 사람은 이미 결과를 받고 다시 들어올
 * 사람이라 소개 쪽이 아니라 작업공간으로 연다. 로그인하지 않았으면 `/me` 가
 * 로그인으로 보내고 끝나면 돌아온다.
 *
 * 아이콘은 상표 한 벌에서 뽑았다(`npm run pwa:icons`). 색은 상표의 파랑이다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/me",
    name: "CareerMatri",
    short_name: "CareerMatri",
    description: "전공에서 해 본 일이 어떤 일로 이어지는지 보고, 다음에 할 일을 이어 갑니다.",
    lang: "ko",
    start_url: "/me",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#2F6BFF",
    icons: [
      { src: "/brand/careermatri/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/careermatri/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/careermatri/app-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
