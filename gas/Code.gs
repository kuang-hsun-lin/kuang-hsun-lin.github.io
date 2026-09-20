/**
 * EWN Lab 論文清單動態遠端載入器
 * 核心代碼託管於 GitHub：kuang-hsun-lin.github.io/scripts/paper_sync.js
 */

// 【重要】權限宣告：因核心代碼為動態 eval 載入，GAS 靜態解析器需看到此行才能請求試算表存取權限 (OAuth Scope)
function _auth() {
  SpreadsheetApp.openById("");
}

// 一鍵執行所有同步：ORCID 同步 -> Crossref BibTeX 校對
function autoUpdatePapers() {
  const url = "https://raw.githubusercontent.com/kuang-hsun-lin/kuang-hsun-lin.github.io/main/scripts/paper_sync.js?t=" + new Date().getTime();
  const code = UrlFetchApp.fetch(url).getContentText();
  (1, eval)(code);
  runAllPaperSync();
}

// 僅從 ORCID 同步新論文
function syncFromOrcid() {
  const url = "https://raw.githubusercontent.com/kuang-hsun-lin/kuang-hsun-lin.github.io/main/scripts/paper_sync.js?t=" + new Date().getTime();
  (1, eval)(UrlFetchApp.fetch(url).getContentText());
  updateMyPaperList();
}

// 僅校對現有 BibTeX 資料
function updateBibtexOnly() {
  const url = "https://raw.githubusercontent.com/kuang-hsun-lin/kuang-hsun-lin.github.io/main/scripts/paper_sync.js?t=" + new Date().getTime();
  (1, eval)(UrlFetchApp.fetch(url).getContentText());
  checkAndUpdateBibtex();
}
