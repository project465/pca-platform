import type { Mail } from "@/lib/mail";

/**
 * 메일 본문.
 *
 * 소개 사이트는 나라마다 있고 플랫폼은 하나다(설계 원칙 5). 그래서 어느
 * 사이트에서 들어온 신청인지로 언어를 고른다. 원고를 파일로 나누지 않은
 * 것은 지금 두 통뿐이기 때문이고, 늘어나면 소개 사이트처럼 나누면 된다.
 *
 * 본문에 링크 말고 다른 것을 담지 않는다. 받는 사람이 무엇을 해야 하는지만
 * 적혀 있어야 한다.
 */

export type Lang = "ko" | "en";

/** 신청이 들어온 소개 사이트로 언어를 정한다. 모르는 곳이면 영어다 */
export function langOfSite(site: string): Lang {
  return site === "kr" ? "ko" : "en";
}

/** 접수 확인 — 신청자에게. 접수번호를 손에 쥐여 주는 것이 목적이다 */
export function receivedMail(
  lang: Lang,
  v: { to: string; orgName: string; refCode: string },
): Mail {
  if (lang === "ko") {
    return {
      to: v.to,
      subject: `[PCA] 도입 신청이 접수되었습니다 (${v.refCode})`,
      text: [
        `${v.orgName} 담당자님,`,
        ``,
        `PCA 도입 신청이 접수되었습니다.`,
        ``,
        `접수번호: ${v.refCode}`,
        ``,
        `담당자가 내용을 확인한 뒤 전용 링크와 계정 안내를 다시 보내드립니다.`,
        `문의하실 때 위 접수번호를 알려주시면 빠릅니다.`,
        ``,
        `— PCA`,
      ].join("\n"),
    };
  }
  return {
    to: v.to,
    subject: `[PCA] We have your request (${v.refCode})`,
    text: [
      `Hello,`,
      ``,
      `We have received the PCA request for ${v.orgName}.`,
      ``,
      `Reference: ${v.refCode}`,
      ``,
      `We will review it and send your organisation link and account details.`,
      `Quoting the reference above will help us find you quickly.`,
      ``,
      `— PCA`,
    ].join("\n"),
  };
}

/**
 * 승인 통지 — 담당자에게.
 *
 * 임시 비밀번호를 적어 보내지 않는다. 메일은 남고 전달되므로 비밀번호가
 * 오래 떠돌게 된다. 대신 한 번 쓰면 닫히는 설정 링크를 보낸다.
 */
export function approvedMail(
  lang: Lang,
  v: {
    to: string;
    orgName: string;
    joinUrl: string;
    setupUrl: string;
    setupHours: number;
    seatCount: number;
    billing: "prepaid" | "per_use";
    /** 링크가 받는 인원 상한. null 이면 열려 있다 */
    linkMax: number | null;
  },
): Mail {
  if (lang === "ko") {
    return {
      to: v.to,
      subject: `[PCA] ${v.orgName} 전용 링크가 발급되었습니다`,
      text: [
        `${v.orgName} 담당자님,`,
        ``,
        `PCA 도입이 준비되었습니다. 두 가지를 보내드립니다.`,
        ``,
        `1) 학생 안내용 전용 링크`,
        `   ${v.joinUrl}`,
        `   학생이 이 링크로 들어와 응시자로 등록합니다.`,
        v.linkMax === null
          ? `   등록 인원 제한은 없습니다.`
          : `   등록 가능 인원은 ${v.linkMax.toLocaleString("ko-KR")}명입니다.`,
        ``,
        `2) 담당자 비밀번호 설정`,
        `   ${v.setupUrl}`,
        `   이 링크로 비밀번호를 정하시면 로그인하실 수 있습니다.`,
        `   ${v.setupHours}시간 안에 열어주세요. 지나면 다시 발급받으셔야 합니다.`,
        ``,
        `전용 링크는 학생에게 그대로 전달하셔도 됩니다.`,
        `비밀번호 설정 링크는 담당자님만 쓰십시오.`,
        ``,
        `— PCA`,
      ].join("\n"),
    };
  }
  return {
    to: v.to,
    subject: `[PCA] Your organisation link for ${v.orgName}`,
    text: [
      `Hello,`,
      ``,
      `PCA is ready for ${v.orgName}. Two things below.`,
      ``,
      `1) Student link`,
      `   ${v.joinUrl}`,
      `   Students open this link to register as test takers.`,
      v.linkMax === null
        ? `   There is no cap on the number of students.`
        : `   It admits up to ${v.linkMax.toLocaleString("en-US")} students.`,
      ``,
      `2) Set your password`,
      `   ${v.setupUrl}`,
      `   Use this to choose a password and sign in.`,
      `   It expires in ${v.setupHours} hours; after that you will need a new one.`,
      ``,
      `The student link is meant to be shared. The password link is not — it is yours alone.`,
      ``,
      `— PCA`,
    ].join("\n"),
  };
}

/** 비밀번호 재설정 — 본인이 요청한 경우 */
export function resetMail(
  lang: Lang,
  v: { to: string; setupUrl: string; hours: number },
): Mail {
  if (lang === "ko") {
    return {
      to: v.to,
      subject: "[PCA] 비밀번호 재설정 링크",
      text: [
        `비밀번호를 다시 정하실 수 있는 링크입니다.`,
        ``,
        v.setupUrl,
        ``,
        `${v.hours}시간 안에 열어주세요. 지나면 다시 요청하셔야 합니다.`,
        `본인이 요청하지 않으셨다면 이 메일은 그냥 두시면 됩니다 —`,
        `링크를 열지 않는 한 비밀번호는 바뀌지 않습니다.`,
        ``,
        `— PCA`,
      ].join("\n"),
    };
  }
  return {
    to: v.to,
    subject: "[PCA] Password reset link",
    text: [
      `Here is a link to choose a new password.`,
      ``,
      v.setupUrl,
      ``,
      `It expires in ${v.hours} hours.`,
      `If you did not ask for this, you can ignore this message —`,
      `nothing changes unless the link is opened.`,
      ``,
      `— PCA`,
    ].join("\n"),
  };
}
