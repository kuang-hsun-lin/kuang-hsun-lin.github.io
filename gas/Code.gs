/**
 * Google Apps Script 遠端載入器 (Loader Stub)
 * 貼在 Google 試算表 Apps Script 編輯器中即可。
 * 核心業務邏輯由 GitHub (scripts/paper_sync.js) 自動動態載入，日後維護僅需 git push 到儲存庫，無需再手動進試算表編輯！
 */

function autoUpdatePapers() {
  const url = "https://raw.githubusercontent.com/kuang-hsun-lin/kuang-hsun-lin.github.io/main/scripts/paper_sync.js?t=" + new Date().getTime();
  const code = UrlFetchApp.fetch(url).getContentText();
  (1, eval)(code);
  runAllPaperSync(); // 依序執行 ORCID 同步 -> Google Scholar 補充 -> BibTeX 校對
}

function syncFromOrcid() {
  const url = "https://raw.githubusercontent.com/kuang-hsun-lin/kuang-hsun-lin.github.io/main/scripts/paper_sync.js?t=" + new Date().getTime();
  (1, eval)(UrlFetchApp.fetch(url).getContentText());
  updateMyPaperList();
}

function syncFromScholar() {
  const url = "https://raw.githubusercontent.com/kuang-hsun-lin/kuang-hsun-lin.github.io/main/scripts/paper_sync.js?t=" + new Date().getTime();
  (1, eval)(UrlFetchApp.fetch(url).getContentText());
  checkByGoogleScholarBibtex();
}

function updateBibtexOnly() {
  const url = "https://raw.githubusercontent.com/kuang-hsun-lin/kuang-hsun-lin.github.io/main/scripts/paper_sync.js?t=" + new Date().getTime();
  (1, eval)(UrlFetchApp.fetch(url).getContentText());
  checkAndUpdateBibtex();
}
