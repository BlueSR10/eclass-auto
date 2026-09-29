// 서울과기대 eClass 영상 자동 넘기기
// - 목록 화면: 100%가 아닌 첫 영상을 연다. 다 봤으면 왼쪽 목록의 다음 "영상" 항목으로 넘어간다.
// - 학습 화면: 영상을 재생하고, 끝나면 출석(종료)를 누른다.
// 재생 속도는 건드리지 않는다(출석인정 시간을 채워야 하므로).
(() => {
  const KEY_ON = "astraAuto.on";
  const KEY_TRIES = "astraAuto.tries";
  const KEY_NEED = "astraAuto.need"; // { title, sec }: 이번 영상에서 더 채워야 하는 시간
  const MARGIN_SEC = 10; // 서버 저장 지연 대비 여유 (30초로 했을 때 실제로 46초 초과됨)
  const MAX_TRIES = 3; // 같은 영상을 이만큼 열어도 100%가 안 되면 건너뜀
  const TICK_MS = 2000;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const isOn = () => store.get(KEY_ON, false);
  const log = (...a) => console.log("[자동넘기기]", ...a);

  const path = location.pathname;
  const isLearningPage = path.includes("/online/online_learning_form.acl");
  const isListPage = path.includes("/activity/activity_form.acl");

  // ---- 직접 영상 목록에 들어오면 OFF ----------------------------------------
  // 매크로가 스스로 목록으로 돌아올 때는 직전에 표시를 남겨서 ON을 유지한다.
  const KEY_SELF_NAV = "astraAuto.selfNav";
  const markSelfNav = () => { try { sessionStorage.setItem(KEY_SELF_NAV, String(Date.now())); } catch {} };
  const consumeSelfNav = () => {
    try {
      const t = Number(sessionStorage.getItem(KEY_SELF_NAV) || 0);
      sessionStorage.removeItem(KEY_SELF_NAV);
      return Date.now() - t < 30000; // 30초 안에 남긴 표시만 인정
    } catch { return false; }
  };
  if (isListPage && isOn() && !consumeSelfNav()) {
    store.set(KEY_ON, false);
    log("직접 목록에 들어와서 OFF");
  }
  // 왼쪽 회차 목록을 사람이 직접 클릭해도 OFF (매크로의 click()은 isTrusted가 false)
  document.addEventListener("click", (e) => {
    if (e.isTrusted && isOn() && e.target.closest && e.target.closest("#class_activity_list a.activity")) {
      store.set(KEY_ON, false);
      renderButton();
      log("직접 목록 항목을 눌러서 OFF");
    }
  }, true);

  // ---- 확인창 자동 처리 ----------------------------------------------------
  let shortTimeDeclined = false;
  const origConfirm = window.confirm.bind(window);
  const origAlert = window.alert.bind(window);
  window.confirm = (msg = "") => {
    if (!isOn()) return origConfirm(msg);
    // 출석인정 시간이 모자란데 나가려는 경우 → 나가지 않고 다시 재생
    if (msg.includes("출석인정시간보다 적습니다")) {
      log("출석인정 시간 부족 → 나가지 않음");
      shortTimeDeclined = true;
      return false;
    }
    // "다른 기기에서 시청 중", "출석인정기간이 지나" 등 → 확인
    log("확인창 자동 확인:", msg);
    return true;
  };
  window.alert = (msg = "") => {
    if (!isOn()) return origAlert(msg);
    log("알림:", msg);
    toast(String(msg));
  };

  // 뒤로가기로 돌아왔을 때 옛날 화면(진도율 갱신 전)이 보이지 않도록 새로고침
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && isOn()) location.reload();
  });

  // ---- 화면 켜기/끄기 버튼 ------------------------------------------------
  let btn, toastEl;
  function renderButton() {
    if (!btn) return;
    const on = isOn();
    btn.textContent = on ? "자동 넘기기 ON" : "자동 넘기기 OFF";
    btn.style.background = on ? "#1e8e5a" : "#555";
    // 매크로가 일하는 화면에서만 보임: 영상 목록 화면(항상), 영상 화면(켜져 있을 때만).
    // 메인 등 그 외 화면에선 숨김. 켜기/끄기는 확장 아이콘 / Alt+Shift+A로도 가능
    const onListPage = !!document.getElementById("class_activity_list");
    btn.style.display = onListPage || (isLearningPage && on) ? "block" : "none";
  }
  // 확장 아이콘 클릭 / 단축키에서 호출됨 (background.js)
  window.__astraToggle = () => {
    store.set(KEY_ON, !isOn());
    if (isOn()) store.set(KEY_TRIES, {});
    renderButton();
    toast(isOn() ? "자동 넘기기를 켰어요" : "자동 넘기기를 껐어요");
  };
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.style.display = "block";
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (toastEl.style.display = "none"), 6000);
  }
  function mountUI() {
    if (!document.body || btn) return;
    btn = document.createElement("button");
    btn.style.cssText =
      "position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 14px;border:0;border-radius:20px;" +
      "color:#fff;font:bold 14px sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4)";
    btn.onclick = () => window.__astraToggle();
    toastEl = document.createElement("div");
    toastEl.style.cssText =
      "position:fixed;right:16px;bottom:64px;z-index:2147483647;max-width:320px;padding:8px 12px;border-radius:8px;" +
      "background:rgba(0,0,0,.85);color:#fff;font:13px sans-serif;display:none;white-space:pre-wrap";
    document.body.append(btn, toastEl);
    renderButton();
  }

  // ---- 학습(영상) 화면 ----------------------------------------------------
  let exiting = false;
  let playedSec = 0; // 이 화면에서 실제로 재생된 시간(초)
  let lastTick = 0;
  function tickLearning() {
    const frame = document.getElementById("contentViewer");
    let video;
    try { video = frame && frame.contentDocument && frame.contentDocument.querySelector("video"); } catch {}
    if (!video || !video.duration) return;

    const now = Date.now();
    if (lastTick && !video.paused && !video.ended) playedSec += (now - lastTick) / 1000;
    lastTick = now;

    // 목록에서 계산해 둔 "더 채워야 하는 시간"을 다 채웠으면 영상이 안 끝났어도 종료
    const need = store.get(KEY_NEED, null);
    const title = document.querySelector(".learning_title")?.textContent.trim();
    const timeFilled = need && need.title === title && playedSec >= need.sec + MARGIN_SEC;

    const done = timeFilled || video.ended || video.currentTime >= video.duration - 0.5;

    if (shortTimeDeclined) {
      // 시간이 모자라다고 해서 처음부터 다시 재생
      shortTimeDeclined = false;
      exiting = false;
      // 계산보다 사이트 기록이 적었던 것 → 1분 더 채운 뒤 다시 시도
      playedSec = Math.min(playedSec, need ? need.sec + MARGIN_SEC - 60 : 0);
      if (video.ended || video.currentTime >= video.duration - 0.5) video.currentTime = 0;
      toast("출석인정 시간이 모자라서 다시 재생해요");
    } else if (done) {
      if (!exiting) {
        exiting = true;
        toast((timeFilled ? "출석인정 시간을 채웠어요" : "영상이 끝났어요") + ". 잠시 후 출석(종료)를 누릅니다");
        // 학습시간이 서버에 저장될 여유를 두고 종료
        setTimeout(() => {
          if (!isOn()) { exiting = false; return; }
          log("출석(종료)");
          markSelfNav(); // 목록으로 돌아가도 OFF 되지 않게
          if (typeof window.exitLearning === "function") window.exitLearning();
          // exitLearning이 확인창에서 거절되면 shortTimeDeclined가 켜지고 위에서 다시 재생됨
          setTimeout(() => { if (!shortTimeDeclined) exiting = false; }, 5000);
        }, 4000);
      }
      return;
    }

    if (video.paused) {
      video.play().catch(() => {
        // 브라우저가 소리 있는 자동재생을 막으면 음소거 후 재생
        video.muted = true;
        video.play().catch(() => {});
        toast("자동재생이 막혀서 음소거로 재생해요");
      });
    }
  }

  // ---- 목록 화면 ----------------------------------------------------------
  // "1:38:27" / "25:00" → 초
  const toSec = (t) => (t && /^[\d:]+$/.test(t) ? t.split(":").reduce((s, n) => s * 60 + Number(n), 0) : 0);
  let cooldownUntil = 0;
  function tickList() {
    if (Date.now() < cooldownUntil) return;
    const sideItems = [...document.querySelectorAll("#class_activity_list a.activity")];
    if (!sideItems.length) return; // 목록 화면이 아님

    const selected = document.querySelector("#class_activity_list a.activity.selected");
    const onVideoActivity = selected && selected.classList.contains("activity_lecture_weeks");
    const cards = [...document.querySelectorAll("button.online_contents_wrap")];

    // 선택된 항목이 영상인데 아직 목록이 안 그려졌으면 기다림
    if (onVideoActivity && !cards.length) return;

    if (onVideoActivity) {
      const tries = store.get(KEY_TRIES, {});
      for (const card of cards) {
        const title = card.querySelector(".video_title")?.textContent.trim() || "";
        const pct = parseInt(card.querySelector(".percent")?.textContent || "0", 10);
        if (pct >= 100) continue;
        if ((tries[title] || 0) >= MAX_TRIES) { log("건너뜀(시도 초과):", title); continue; }
        tries[title] = (tries[title] || 0) + 1;
        store.set(KEY_TRIES, tries);
        // 배지: [학습시간, 1:52, 출석인정, 1:45]
        const badge = [...card.querySelectorAll(".online_contents_badge span")].map((s) => s.textContent.trim());
        const studied = toSec(badge[badge.indexOf("학습시간") + 1]);
        const required = toSec(badge[badge.indexOf("출석인정") + 1]);
        if (required > 0) store.set(KEY_NEED, { title, sec: Math.max(required - studied, 0) });
        else store.set(KEY_NEED, null);
        log(`영상 열기: ${title} (${pct}%)`);
        toast(`영상 열기: ${title}`);
        cooldownUntil = Date.now() + 10000;
        card.click();
        return;
      }
    }

    // 이 항목은 다 봤음 → 왼쪽 목록에서 아직 안 끝난("not_submit") 다음 "영상" 항목으로.
    // 현재 항목 뒤를 먼저 찾고, 없으면 앞쪽도 찾는다(중간부터 시작한 경우).
    const idx = selected ? sideItems.indexOf(selected) : -1;
    const unfinished = (a) =>
      a !== selected && a.classList.contains("activity_lecture_weeks") && a.classList.contains("not_submit");
    const next = sideItems.slice(idx + 1).find(unfinished) || sideItems.slice(0, Math.max(idx, 0)).find(unfinished);
    if (next) {
      const name = next.querySelector(".activity_title")?.textContent.trim();
      log("다음 항목으로:", name);
      toast(`다음 항목으로: ${name}`);
      cooldownUntil = Date.now() + 8000;
      next.click();
      return;
    }

    store.set(KEY_ON, false);
    renderButton();
    toast("이 과목의 영상을 모두 봤어요! 자동 넘기기를 껐어요");
    log("완료");
  }

  // ---- 단축키 (Tampermonkey용) ---------------------------------------------
  // 크롬 확장에선 manifest의 commands가 Alt+Shift+A를 처리하므로, Tampermonkey에서 돌 때만 직접 받는다.
  const isUserscript = !!window.__astraUserscript || typeof GM_info !== "undefined"; // 앞은 build-userscript.ps1이 넣어줌
  const onKey = (e) => {
    if (e.altKey && e.shiftKey && e.code === "KeyA") { e.preventDefault(); window.__astraToggle(); }
  };
  const hookedDocs = new WeakSet();
  function hookKeys() {
    if (!isUserscript) return;
    const docs = [document];
    // 영상은 iframe 안에 있어서, 영상을 클릭한 뒤엔 키 입력이 iframe으로 감
    try { const d = document.getElementById("contentViewer")?.contentDocument; if (d) docs.push(d); } catch {}
    for (const d of docs) if (!hookedDocs.has(d)) { hookedDocs.add(d); d.addEventListener("keydown", onKey, true); }
  }

  // ---- 메인 루프 ----------------------------------------------------------
  const start = () => {
    mountUI();
    setInterval(() => {
      hookKeys();
      renderButton(); // 화면이 바뀌어도(목록 ↔ 다른 곳) 버튼 표시를 맞춤
      if (!isOn()) return;
      try { isLearningPage ? tickLearning() : tickList(); } catch (e) { log("오류", e); }
    }, TICK_MS);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
