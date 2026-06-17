"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useQandaUser } from "@/components/QandaUserProvider";
import { useNativeBack } from "@/hooks/useNativeBack";
import { getBridge } from "@/lib/bridge";
import { checkParticipation, recordParticipation, logEvent } from "@/lib/supabase";
import { getCampaign, type Campaign } from "@/lib/campaigns";
import styles from "./quiz.module.css";
type Screen = "loading" | "play" | "answer" | "correct" | "wrong" | "already" | "notfound";
export default function CampaignQuizPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;
  const campaign = getCampaign(campaignId);
  const { userId } = useQandaUser();
  const [screen, setScreen] = useState<Screen>("loading");
  const [inputValue, setInputValue] = useState("");
  const [showHint, setShowHint] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useNativeBack();
  useEffect(() => {
    if (!campaign) { setScreen("notfound"); return; }
    if (!userId) { setScreen("play"); return; }
    checkParticipation(userId, campaignId).then((participated) => {
      setScreen(participated ? "already" : "play");
    });
  }, [userId, campaignId, campaign]);
  useEffect(() => {
    if (screen === "already") {
      logEvent(userId, "already_participated_view", { campaign_id: campaignId });
    }
  }, [screen, userId, campaignId]);
  if (!campaign || screen === "notfound") {
    return <div className={styles.loadingWrap}><p>존재하지 않는 캠페인입니다.</p></div>;
  }
  const log = (event: string) => logEvent(userId, event, { campaign_id: campaignId });
  const handleSubmit = async () => {
    if (inputValue.length !== campaign.answer.length) return;
    const submitted = inputValue;
    const isCorrect = submitted === campaign.answer;
    if (isCorrect && userId) {
      await recordParticipation(userId, campaignId, submitted, isCorrect);
      logEvent(userId, "result_correct_view", {
        campaign_id: campaignId,
        answer: submitted,
      });
    } else {
      logEvent(userId, "result_wrong_view", {
        campaign_id: campaignId,
        submitted_answer: submitted,
      });
    }
    setScreen(isCorrect ? "correct" : "wrong");
    setInputValue("");
  };
  const handleHint = () => {
    log("quiz_hint_click");
    setShowHint(true);
    hintTimerRef.current = setTimeout(() => {
      getBridge().openExternalBrowser(campaign.productUrl);
      setShowHint(false);
    }, 500);
  };
  const closeHint = () => {
    setShowHint(false);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
  };
  const goToAnswer = () => {
    log("quiz_submit_click");
    setScreen("answer");
    setTimeout(() => inputRef.current?.focus(), 100);
  };
  const handleCloseWebview = () => getBridge().closeWebview();
  const handleVisitProduct = (e: React.MouseEvent) => {
    e.preventDefault();
    getBridge().openExternalBrowser(campaign.productUrl);
  };
  const answerChars = campaign.answer.split("");
  if (screen === "loading") {
    return <div className={styles.loadingWrap}><p>로딩 중...</p></div>;
  }
  return (
    <div className={styles.container}>
      {screen !== "answer" && (
        <button onClick={handleCloseWebview} aria-label="뒤로가기" className={styles.backBtn}>
          <ChevronLeft />
        </button>
      )}
      {screen === "answer" && (
        <button onClick={() => setScreen("play")} aria-label="뒤로가기" className={styles.backBtnStatic}>
          <ChevronLeft />
        </button>
      )}
      {screen === "play" && (
        <div className={styles.screen}>
          <Banner src={campaign.bannerImage} />
          <div className={styles.content}>
            <p className={styles.questionLabel}>초성을 맞혀보세요</p>
            <QuestionHeader campaign={campaign} />
            <SlotsRow chars={campaign.slots} suffix={campaign.slotSuffix} />
            <SmartImg src={campaign.couponImage} alt="쿠폰" className={styles.couponImg} />
            <p className={styles.couponNotice}>{campaign.couponNotice}</p>
            <div className={styles.btnRow}>
              <button className={styles.btnHint} onClick={handleHint}>힌트 보기</button>
              <button className={styles.btnAnswer} onClick={goToAnswer}>정답 입력하기</button>
            </div>
          </div>
        </div>
      )}
      {screen === "answer" && (
        <div className={styles.screen}>
          <div className={styles.content} style={{ paddingTop: 56 }}>
            <p className={styles.answerLabel}>정답을 입력해주세요</p>
            <input
              ref={inputRef}
              type="text"
              className={styles.textInput}
              placeholder="정답을 입력하세요"
              maxLength={campaign.answer.length}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <p className={styles.inputCount}>{inputValue.length} / {campaign.answer.length}자</p>
            <div style={{ flex: 1 }} />
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={inputValue.length !== campaign.answer.length}
              style={{
                background: inputValue.length === campaign.answer.length ? "#ffcc00" : "#3d3d3d",
                color: inputValue.length === campaign.answer.length ? "#322f1b" : "#999",
              }}
            >
              정답 도전하기
            </button>
          </div>
        </div>
      )}
      {screen === "correct" && (
        <div className={styles.screen}>
          <Banner src={campaign.bannerImage} />
          <div className={styles.content}>
            <p className={styles.questionLabel}>퀴즈가 종료됐어요.</p>
            <QuestionHeader campaign={campaign} />
            <SlotsRow chars={answerChars} suffix={campaign.slotSuffix} revealed />
            <div className={styles.resultMessage}>
              <p className={styles.resultTitle}>정답이에요! 🎉</p>
              <p className={styles.resultSub}>{campaign.correctNotice ?? "편의점 쿠폰에 응모 완료되었어요!"}</p>
            </div>
            <SmartImg src={campaign.couponImage} alt="쿠폰" className={`${styles.couponImg} ${styles.couponMini}`} />
            <div style={{ flex: 1 }} />
            <p className={styles.productPrompt}><span className={styles.productHighlight}>{campaign.productHighlight}</span> {campaign.productPrompt}</p>
            <a href={campaign.productUrl} onClick={(e) => { log("result_correct_detail_click"); handleVisitProduct(e); }} className={styles.ctaBtn}>자세히 보기</a>
            <button className={styles.ctaBtnGray} onClick={() => { log("result_correct_back_click"); handleCloseWebview(); }}>확인했어요</button>
          </div>
        </div>
      )}
      {screen === "wrong" && (
        <div className={styles.screen}>
          <div className={styles.wrongContent}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>😢</div>
            <div className={styles.wrongTitle}>아쉬워요!</div>
            <div className={styles.wrongSub}>문제를 다시 풀어봐요!</div>
          </div>
          <div style={{ padding: "0 24px 32px" }}>
            <button className={styles.ctaBtn} onClick={() => { log("result_wrong_retry_click"); setScreen("play"); }}>
              퀴즈 다시보기
            </button>
          </div>
        </div>
      )}
      {screen === "already" && (
        <div className={styles.screen}>
          <Banner src={campaign.bannerImage} />
          <div className={styles.content}>
            <div className={styles.alreadyBadge}>
              <div className={styles.checkCircle}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#ffcc00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className={styles.alreadyText}>이미 참여한 퀴즈예요</span>
            </div>
            <QuestionHeader campaign={campaign} />
            <SlotsRow chars={answerChars} suffix={campaign.slotSuffix} revealed />
            <SmartImg src={campaign.couponImage} alt="쿠폰" className={`${styles.couponImg} ${styles.couponMini}`} />
            <p className={styles.couponNotice}>당첨 결과는 팝업과 푸시 메시지로 알려드릴게요!</p>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 16 }}>
              {campaign.alreadyShowFullPrompt ? (
                <p className={styles.productPrompt}><span className={styles.productHighlight}>{campaign.productHighlight}</span> {campaign.productPrompt}</p>
              ) : (
                <p className={styles.productPromptSmall}>{campaign.productHighlight}가 더 궁금하다면?</p>
              )}
            </div>
            <a href={campaign.productUrl} onClick={(e) => { log("already_participated_detail_click"); handleVisitProduct(e); }} className={styles.ctaBtn}>자세히 보기</a>
            <button className={styles.ctaBtnGray} onClick={() => { log("already_participated_back_click"); handleCloseWebview(); }}>확인했어요</button>
          </div>
        </div>
      )}
      {showHint && (
        <div className={styles.hintOverlay} onClick={closeHint}>
          <div className={styles.hintBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.hintDots}>
              <div className={styles.hintDot} style={{ animationDelay: "-0.32s" }} />
              <div className={styles.hintDot} style={{ animationDelay: "-0.16s" }} />
              <div className={styles.hintDot} />
            </div>
            <p className={styles.hintText}>이동 후 페이지에서 찾아보세요</p>
            <p className={styles.hintRedirect}>잠시 후 페이지로 이동합니다...</p>
          </div>
        </div>
      )}
    </div>
  );
}
function ChevronLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
      <path d="M21.745 28.9726C22.0891 29.3425 22.655 29.3425 22.9991 28.9726C23.3336 28.613 23.3336 28.037 22.9991 27.6774L15.8573 20L22.9991 12.3226C23.3336 11.963 23.3336 11.387 22.9991 11.0274C22.655 10.6575 22.0891 10.6575 21.7451 11.0274L14.0009 19.3524C13.6664 19.712 13.6664 20.288 14.0009 20.6476L21.745 28.9726Z" fill="#ffffff" />
    </svg>
  );
}
function SmartImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  useEffect(() => { setImgSrc(src); }, [src]);
  const handleError = () => {
    if (imgSrc.endsWith(".png")) setImgSrc(imgSrc.replace(/\.png$/, ".jpg"));
    else if (imgSrc.endsWith(".jpg")) setImgSrc(imgSrc.replace(/\.jpg$/, ".jpeg"));
    else if (imgSrc.endsWith(".jpeg")) setImgSrc(imgSrc.replace(/\.jpeg$/, ".webp"));
    else if (imgSrc.endsWith(".webp")) setImgSrc(imgSrc.replace(/\.webp$/, ".png"));
  };
  return <img src={imgSrc} alt={alt} className={className} onError={handleError} />;
}
function Banner({ src }: { src: string }) {
  return (
    <div className={styles.banner}>
      <SmartImg src={src} alt="" className={styles.bannerImg} />
    </div>
  );
}
function QuestionHeader({ campaign }: { campaign: Campaign }) {
  const isShort = campaign.title.length <= 15 && campaign.subtitle.length <= 15;
  const mainClass = isShort ? styles.questionMainBig : styles.questionMain;
  const subClass = isShort ? styles.questionSubBig : styles.questionSub;
  return (
    <div className={styles.questionHeader}>
      <div className={styles.brandLogo}>
        <SmartImg src={campaign.logoImage} alt="" className={styles.logoImg} />
      </div>
      <div>
        <h1 className={mainClass}>{campaign.title}</h1>
        <h2 className={subClass}>{campaign.subtitle}</h2>
      </div>
    </div>
  );
}
function SlotsRow({ chars, suffix, revealed }: { chars: string[]; suffix: string; revealed?: boolean }) {
  return (
    <div className={styles.slotsRow}>
      {chars.map((ch, i) => (
        <div
          key={i}
          className={`${styles.slot} ${revealed ? styles.slotRevealed : ""}`}
          style={revealed ? { animationDelay: `${i * 150}ms` } : undefined}
        >
          {ch}
        </div>
      ))}
      <span className={styles.slotSuffix}>{suffix}</span>
    </div>
  );
}
