# Google Apps Script 論文清單動態遠端載入器 (Dynamic Remote Loader)

本機制採用 **GitHub 遠端動態載入模式**：
- 試算表的 Google Apps Script 編輯器內**只需保留數行輕量載入代碼**。
- 所有論文同步、ORCID 抓取、Crossref 解析與 Google Scholar 比對之核心程式碼均存放於本儲存庫的 [`scripts/paper_sync.js`](../scripts/paper_sync.js)。
- **日後無論如何修改、擴充功能或調整邏輯，只要直接 `git push` 到 GitHub，Google Apps Script 每次執行時即會自動抓取最新版本執行，完全無需再開啟 Google 試算表複製貼上！**

---

## 快速設定步驟

### 步驟 1：開啟 Apps Script 編輯器
1. 打開您的論文資料庫試算表：[論文試算表](https://docs.google.com/spreadsheets/d/1EsbqSfOS97txN7_nwxpujdkV3g6scHB24TSAaJ25AMo/edit)。
2. 點擊頂部選單 **「擴充功能 (Extensions)」** > **「Apps Script」**。

### 步驟 2：貼入遠端載入代碼 (Loader)
將以下代碼貼入 `Code.gs` 覆蓋原本內容並儲存：

```javascript
/**
 * Google Apps Script 遠端載入器 (Loader Stub)
 * 核心業務邏輯由 GitHub (scripts/paper_sync.js) 自動動態載入
 */

function autoUpdatePapers() {
  const url = "https://raw.githubusercontent.com/kuang-hsun-lin/kuang-hsun-lin.github.io/main/scripts/paper_sync.js?t=" + new Date().getTime();
  const code = UrlFetchApp.fetch(url).getContentText();
  (1, eval)(code);
  runAllPaperSync(); // 依序自動執行 ORCID 同步 -> Google Scholar 補充 -> BibTeX 校對
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
```

---

## 執行方式

1. **手動執行**：
   在 Apps Script 編輯器頂部函式選單中選擇 `autoUpdatePapers`，點擊 **「執行 (Run)」** 即可。
2. **定時自動觸發 (Triggers)**：
   點擊左側時鐘圖示 **「觸發條件 (Triggers)」** > **「新增觸發條件」**：
   - 選擇要執行的功能：`autoUpdatePapers`
   - 選取事件來源：`時間驅動 (Time-driven)`
   - 選取時間類型：例如 `每週計時器 (Week timer)` 或 `每日計時器 (Day timer)`
   - 儲存後即可全自動在背景定期保持網站論文清單為最新狀態。
