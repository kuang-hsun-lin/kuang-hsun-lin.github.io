# EWN Lab 論文清單自動同步腳本 (Google Apps Script)

本腳本用於自動從 **ORCID** 與 **Google Scholar** 抓取最新論文著作，並自動比對填入 Google 試算表（Spreadsheet ID: `1EsbqSfOS97txN7_nwxpujdkV3g6scHB24TSAaJ25AMo` 的 `ORCID` 工作表），進而即時更新個人網站 [kuang-hsun-lin.github.io](https://kuang-hsun-lin.github.io/) 的著作清單與 CV。

---

## 核心功能

1. **ORCID 自動同步 (`updateMyPaperList`)**：
   - 呼叫 ORCID Public API v3.0 (`0000-0002-0426-9301`) 抓取最新著作。
   - 自動正規化標題比對現有試算表，只新增未收錄之文獻。
   - 若文獻包含 DOI，自動向 Crossref 發送請求獲取精確 BibTeX / JSON 資訊補齊各欄位。
2. **Google Scholar BibTeX 補充 (`checkByGoogleScholarBibtex`)**：
   - 讀取 Google Scholar 匯出之 BibTeX 連結，自動補足 ORCID 尚未登記之最新會議或期刊論文。
3. **BibTeX 與中繼資料校準 (`checkAndUpdateBibtex`)**：
   - 批次檢查試算表內所有 DOI，自動向 Crossref 比對並同步最新正式出版中繼資料。
4. **Web App URL 觸發支援 (`doGet` / `doPost`)**：
   - 部署為 Google Apps Script 網路應用程式後，可透過任何 HTTP GET 請求（瀏覽器打開、`curl` 或 GitHub Actions 定時任務）遠端觸發執行，無須開啟試算表手動按執行。

---

## 部署教學：啟用 URL 觸發 (Web App Deployment)

### 步驟 1：貼上程式碼
1. 開啟您的目標 Google 試算表：[論文資料庫試算表](https://docs.google.com/spreadsheets/d/1EsbqSfOS97txN7_nwxpujdkV3g6scHB24TSAaJ25AMo/edit)。
2. 點擊頂部選單的 **「擴充功能 (Extensions)」** > **「Apps Script」**。
3. 將本目錄下的 [`gas/Code.gs`](./Code.gs) 內容完整複製並貼入編輯器中（覆蓋原有內容）。
4. 點擊磁碟圖示 **「儲存專案 (Save project)」**。

### 步驟 2：部署為網路應用程式 (Web App)
1. 點擊右上角藍色的 **「部署 (Deploy)」** 按鈕 > 選擇 **「新增部署作業 (New deployment)」**。
2. 在左側齒輪選單中，確認選擇類型為 **「網頁應用程式 (Web app)」**。
3. 設定各項參數：
   - **說明 (Description)**：`Paper List Auto-Sync Trigger`
   - **執行身分 (Execute as)**：**「我」(Me)**（以您的 Google 帳號權限讀寫試算表）
   - **誰可以存取 (Who has access)**：**「所有人」(Anyone)**（允許透過 URL 無須登入直接觸發）
4. 點擊 **「部署 (Deploy)」**。
5. 首次部署時，Google 會要求授權存取試算表與發送外部網路請求，依循提示完成授權（若出現「Google 尚未驗證此應用程式」，點擊「進階 (Advanced)」>「前往專案 (Go to project (unsafe))」>「允許」）。
6. 部署完成後，畫面會顯示一組 **網頁應用程式網址 (Web app URL)**，格式如下：
   ```text
   https://script.google.com/macros/s/AKfycbx...YOUR_DEPLOYMENT_ID.../exec
   ```

---

## URL 觸發使用方式

### 1. 完整同步（預設）
直接造訪 Web App 網址，將依序執行 `ORCID` 同步、`Google Scholar` 補充與 `BibTeX` 校對：
```bash
curl -L "https://script.google.com/macros/s/{YOUR_DEPLOYMENT_ID}/exec"
```
或直接將網址貼到瀏覽器網址列按下 Enter 即可。

### 2. 指定單項動作
- **僅同步 ORCID**：
  ```bash
  curl -L "https://script.google.com/macros/s/{YOUR_DEPLOYMENT_ID}/exec?action=orcid"
  ```
- **僅同步 Google Scholar**：
  ```bash
  curl -L "https://script.google.com/macros/s/{YOUR_DEPLOYMENT_ID}/exec?action=scholar"
  ```
- **僅校對現有 BibTeX**：
  ```bash
  curl -L "https://script.google.com/macros/s/{YOUR_DEPLOYMENT_ID}/exec?action=bibtex"
  ```

### 3. 回傳範例 (JSON Response)
執行完成後，GAS 會直接回傳 JSON 格式的執行日誌與筆數統計：
```json
{
  "status": "success",
  "action": "all",
  "triggeredAt": "2026-09-20T06:30:00.000Z",
  "results": {
    "orcid": {
      "newPapers": 1,
      "updatedDoi": 0,
      "message": "ORCID 同步完成：新增 1 篇，更新 DOI 0 篇。"
    },
    "scholar": {
      "newPapers": 0,
      "message": "沒有從 Google 學術連結中找到新的論文。"
    },
    "bibtex": {
      "updatedCount": 0,
      "message": "沒有找到任何需要更新的 BibTeX 資料。"
    }
  },
  "durationSeconds": "3.42"
}
```

---

## 安全性保護（選填）

若您擔心 Web App URL 外洩導致他人濫刷執行配額，可在 `Code.gs` 第 20 行設定專屬金鑰：
```javascript
const ACCESS_TOKEN = "your_secret_token_here";
```
更新部署後，呼叫 URL 時必須附帶 `?key=your_secret_token_here` 方可執行，否則將回傳 `401 Unauthorized`。
