// 서울과기대 eClass 영상 자동 넘기기
// - 목록 화면: 100%가 아닌 첫 영상을 연다. 다 봤으면 왼쪽 목록의 다음 "영상" 항목으로 넘어간다.
// - 학습 화면: 출석인정에 모자란 시간만큼 머문 뒤 출석(종료)를 누른다. (학습시간은 재생과 무관하게 쌓임)
(() => {
  const KEY_ON = "astraAuto.on";
  const KEY_TRIES = "astraAuto.tries";
  const KEY_NEED = "astraAuto.need"; // { title, sec }: 이번 영상에서 더 채워야 하는 시간
  const KEY_LOG = "astraAuto.log"; // 최근 로그 (콘솔에서 __astraLog(), 또는 버튼 우클릭으로 저장)
  const MAX_LOG = 300;
  const RETRY_SEC = 10; // 여유 없이 출석을 눌렀다가 "시간 부족" 확인창이 뜨면 이만큼 뒤에 다시 누름
  const RETRY_LATER_SEC = 60; // 그래도 또 부족하면 이만큼씩 더 기다림
  const EXIT_DELAY_MS = 4000; // "곧 누릅니다" 알림을 띄우고 실제로 누르기까지
  const MAX_TRIES = 3; // 같은 영상을 이만큼 열어도 100%가 안 되면 건너뜀
  const TICK_MS = 2000;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const isOn = () => store.get(KEY_ON, false);
  // 콘솔은 화면이 바뀌면 지워지므로 localStorage에도 남긴다 (브라우저별로 따로 저장됨)
  const log = (...a) => {
    console.log("[자동넘기기]", ...a);
    const lines = store.get(KEY_LOG, []);
    lines.push(`${new Date().toLocaleString("sv")} ${a.map(String).join(" ")}`);
    store.set(KEY_LOG, lines.slice(-MAX_LOG));
  };
  window.__astraLog = () => store.get(KEY_LOG, []).join("\n");

  const path = location.pathname;
  const isLearningPage = path.includes("/online/online_learning_form.acl");
  const isListPage = path.includes("/activity/activity_form.acl");
  if (isOn() && (isLearningPage || isListPage)) {
    log(`화면 열림: ${isLearningPage ? "영상" : "목록"} (${performance.getEntriesByType("navigation")[0]?.type || "?"})`);
  }

  // ---- 직접 영상 목록에 들어오면 OFF ----------------------------------------
  // 매크로가 스스로 목록으로 돌아올 때는 직전에 표시를 남겨서 ON을 유지한다.
  const KEY_SELF_NAV = "astraAuto.selfNav";
  const markSelfNav = () => { try { sessionStorage.setItem(KEY_SELF_NAV, String(Date.now())); } catch {} };
  // 표시는 지우지 않고 시간으로만 판단한다: 사이트가 뒤로가기로 들어온 목록을 한 번 더 새로고침해서
  // (pageshow에서 location.reload) 목록이 연달아 두 번 열리기 때문. 한 번 쓰고 지우면 두 번째에 OFF가 된다.
  const isSelfNav = () => {
    try {
      const t = Number(sessionStorage.getItem(KEY_SELF_NAV) || 0);
      return Date.now() - t < 30000; // 30초 안에 남긴 표시만 인정
    } catch { return false; }
  };
  if (isListPage && isOn() && !isSelfNav()) {
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
  let btn, toastEl, menuEl;
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
    log(isOn() ? "직접 켬" : "직접 끔");
    toast(isOn() ? "자동 넘기기를 켰어요" : "자동 넘기기를 껐어요");
  };
  function saveLog() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([window.__astraLog()], { type: "text/plain" }));
    a.download = "eclass-auto-log.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }
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
    btn.title = "우클릭: 로그 메뉴";
    // 우클릭 메뉴: 바로 내려받지 않고 고르게 한다
    menuEl = document.createElement("div");
    menuEl.style.cssText =
      "position:fixed;right:16px;bottom:64px;z-index:2147483647;padding:4px;border-radius:8px;" +
      "background:#222;box-shadow:0 2px 8px rgba(0,0,0,.4);display:none";
    const addItem = (text, fn) => {
      const item = document.createElement("button");
      item.textContent = text;
      item.style.cssText =
        "display:block;width:100%;padding:8px 12px;border:0;border-radius:6px;background:none;" +
        "color:#fff;font:13px sans-serif;text-align:left;cursor:pointer";
      item.onmouseenter = () => (item.style.background = "#444");
      item.onmouseleave = () => (item.style.background = "none");
      item.onclick = () => { menuEl.style.display = "none"; fn(); };
      menuEl.append(item);
    };
    addItem("남은 시간 보기", showLeft);
    addItem("건너뛴 영상 다시 시도", () => { store.set(KEY_TRIES, {}); log("시도 횟수 초기화"); toast("건너뛴 영상을 다시 시도해요"); });
    addItem("로그 기록 받기", saveLog);
    addItem("로그 복사", () => {
      navigator.clipboard.writeText(window.__astraLog()).then(
        () => toast("로그를 복사했어요"),
        () => toast("복사하지 못했어요. '로그 기록 받기'를 써 주세요"),
      );
    });
    addItem("로그 지우기", () => { store.set(KEY_LOG, []); toast("로그를 지웠어요"); });
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      menuEl.style.display = menuEl.style.display === "none" ? "block" : "none";
    };
    // 메뉴 바깥을 누르면 닫음
    document.addEventListener("click", (e) => { if (!menuEl.contains(e.target)) menuEl.style.display = "none"; });
    toastEl = document.createElement("div");
    toastEl.style.cssText =
      "position:fixed;right:16px;bottom:64px;z-index:2147483647;max-width:320px;padding:8px 12px;border-radius:8px;" +
      "background:rgba(0,0,0,.85);color:#fff;font:13px sans-serif;display:none;white-space:pre-wrap";
    document.body.append(btn, toastEl, menuEl);
    renderButton();
  }

  // ---- 학습(영상) 화면 ----------------------------------------------------
  // 학습시간은 영상 재생과 상관없이 이 화면에 머문 시간만큼 쌓인다(사이트의 출석 타이머).
  // 그래서 목록에서 계산해 둔 "더 채워야 하는 시간"만큼 머문 뒤 출석(종료)를 누른다.
  // 영상이 다른 도메인 iframe 안에 있어서 접근할 수 없는 과목도 있으므로 영상 상태에 기대지 않는다.
  const enteredAt = Date.now();
  let exiting = false;
  let exitAt = 0; // 이 시각이 되면 출석(종료). 0이면 채울 시간을 모름
  let declines = 0; // "시간 부족" 확인창이 뜬 횟수
  // 우클릭 메뉴 "남은 시간 보기"
  function showLeft() {
    if (!isLearningPage) return toast("영상 화면에서만 볼 수 있어요");
    if (!isOn()) return toast("자동 넘기기가 꺼져 있어요");
    if (!exitAt) return toast("채울 시간을 몰라서, 영상이 끝나면 출석(종료)를 눌러요");
    const left = Math.max(Math.ceil((exitAt - Date.now()) / 1000), 0);
    toast(`약 ${Math.floor(left / 60)}분 ${left % 60}초 뒤 출석(종료)를 눌러요`);
  }
  function tickLearning() {
    const frame = document.getElementById("contentViewer");
    let video = null;
    try { video = frame && frame.contentDocument && frame.contentDocument.querySelector("video"); } catch {}

    if (!exitAt) {
      const need = store.get(KEY_NEED, null);
      const title = document.querySelector(".learning_title")?.textContent.trim();
      if (need && need.title === title) {
        exitAt = enteredAt + need.sec * 1000; // 여유 없이 딱 맞춰 누른다. 모자라면 아래에서 다시 시도
        const left = Math.max(Math.ceil((exitAt - Date.now()) / 1000), 0);
        log(`${left}초 뒤 출석(종료) 예정`);
        toast(`약 ${Math.floor(left / 60)}분 ${left % 60}초 뒤 출석(종료)를 눌러요`);
      }
    }

    if (shortTimeDeclined) {
      // 계산보다 사이트 기록이 적었던 것 → 처음엔 10초, 그 뒤로는 1분씩 더 머문 뒤 다시 시도
      shortTimeDeclined = false;
      exiting = false;
      const wait = ++declines === 1 ? RETRY_SEC : RETRY_LATER_SEC;
      exitAt = Date.now() + wait * 1000;
      log(`시간 부족 ${declines}번째 → ${wait}초 뒤 다시 시도`);
      toast(`출석인정 시간이 모자라서 ${wait}초 더 기다려요`);
    }

    // 알림을 먼저 띄우고 EXIT_DELAY_MS 뒤에 누르므로 그만큼 일찍 시작해야 exitAt에 눌린다
    const timeFilled = exitAt > 0 && Date.now() >= exitAt - EXIT_DELAY_MS;
    // 채울 시간을 모를 때(목록을 거치지 않고 들어온 경우)만 영상이 끝나는 것을 기준으로 한다
    const videoEnded = !exitAt && !!video && (video.ended || video.currentTime >= video.duration - 0.5);

    if (timeFilled || videoEnded) {
      if (!exiting) {
        exiting = true;
        toast((timeFilled ? "출석인정 시간을 채웠어요" : "영상이 끝났어요") + ". 잠시 후 출석(종료)를 누릅니다");
        setTimeout(() => {
          if (!isOn()) { exiting = false; return; }
          log("출석(종료)");
          markSelfNav(); // 목록으로 돌아가도 OFF 되지 않게
          if (typeof window.exitLearning === "function") window.exitLearning();
          // exitLearning이 확인창에서 거절되면 shortTimeDeclined가 켜지고 위에서 1분 더 기다림
          setTimeout(() => { if (!shortTimeDeclined) exiting = false; }, 5000);
        }, EXIT_DELAY_MS);
      }
      return;
    }

    // 재생은 덤: 영상에 접근할 수 있으면 틀어둔다 (안 틀어져도 시간은 쌓임)
    if (video && video.paused && !video.ended) {
      video.play().catch(() => {
        // 브라우저가 소리 있는 자동재생을 막으면 음소거 후 재생
        video.muted = true;
        video.play().catch(() => {});
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
        markSelfNav(); // 영상을 열다가 사이트가 목록을 새로고침해도(2차 인증 확인 실패 등) OFF 되지 않게
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
