// 확장 아이콘 클릭 / 단축키(Alt+Shift+A) → 현재 eClass 탭에서 자동 넘기기 켜기/끄기
async function toggle(tab) {
  if (!tab || !tab.id || !/^https:\/\/eclass\.seoultech\.ac\.kr\//.test(tab.url || "")) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => window.__astraToggle && window.__astraToggle(),
    });
  } catch (e) {
    console.warn("토글 실패", e);
  }
}

chrome.action.onClicked.addListener(toggle);
chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "toggle") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  toggle(tab);
});
