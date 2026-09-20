/**
 * EWN Lab / Kuang-Hsun Lin Academic Publication Auto-Sync Script
 * Source: https://github.com/kuang-hsun-lin/kuang-hsun-lin.github.io/blob/main/scripts/paper_sync.js
 *
 * 整合式腳本功能：
 * 1. 從 ORCID 抓取論文清單。
 * 2. 檢查試算表，只處理未收錄的新論文。
 * 3. 根據 DOI 從 Crossref 取得 BibTeX 或 JSON。
 * 4. 解析資料並填入試算表對應的欄位。
 * 5. 從 Google Scholar BibTeX 連結補足尚未收錄之論文。
 */

// --- 全域設定 ---
var SPREADSHEET_ID = "1EsbqSfOS97txN7_nwxpujdkV3g6scHB24TSAaJ25AMo";
var SHEET_NAME = "ORCID";
var ORCID_ID = '0000-0002-0426-9301'; 
var GOOGLE_SCHOLAR_BIBTEX_URL = "https://scholar.googleusercontent.com/citations?view_op=export_citations&user=pA0SI4cAAAAJ&citsig=ACUpqDcAAAAAaKpcPlTPShxhPdCIn9TtR6uDU08&hl=zh-TW";

// 要從 BibTeX/JSON 解析並填入的欄位名稱
var BIBTEX_MAPPING = {
  'Authors': 'author',
  'Year': 'year',
  'Month': 'month', 
  'Volume': 'volume',
  'Number': 'number',
  'Pages': 'pages',
  'Publisher': 'publisher',
  'Journal/Booktitle': ['journal', 'booktitle']
};

// 出版商名稱對照表
var PUBLISHER_MAPPING = {
  'ieee': 'Institute of Electrical and Electronics Engineers (IEEE)',
  'acm': 'Association for Computing Machinery (ACM)',
  'springer': 'Springer',
  'elsevier': 'Elsevier',
  'iet': 'Institution of Engineering and Technology (IET)',
  'hindawi': 'Hindawi'
};

// 月份英文縮寫與數字對照表
var MONTH_MAPPING = {
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
  'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
};

/**
 * 一鍵執行所有同步任務：ORCID -> Google Scholar -> BibTeX 校準
 */
function runAllPaperSync() {
  Logger.log('=== [1/3] 開始從 ORCID 同步論文 ===');
  updateMyPaperList();
  Logger.log('=== [2/3] 開始從 Google Scholar 補充論文 ===');
  checkByGoogleScholarBibtex();
  Logger.log('=== [3/3] 開始校對與更新 BibTeX 中繼資料 ===');
  checkAndUpdateBibtex();
  Logger.log('=== 全部論文同步流程完成 ===');
}

/**
 * 從 ORCID 抓取論文清單並新增至試算表。
 */
function updateMyPaperList() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`找不到名為 "${SHEET_NAME}" 的工作表。`);
    
    const headerIndex = getHeaderIndex(sheet);
    const existingData = getExistingData(sheet, headerIndex['Title']);

    const url = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
    const response = UrlFetchApp.fetch(url, {'headers': {'Accept': 'application/vnd.orcid+json'}});
    const data = JSON.parse(response.getContentText());
    
    let newWorks = [];
    let updatedDoiRows = [];

    if (data.group && data.group.length > 0) {
      data.group.forEach(group => {
        const work = group['work-summary'][0];
        const title = work.title?.title?.value || 'N/A';
        const normalizedTitle = normalizeTitle(title);
        
        const externalIds = work['external-ids']?.['external-id'] || [];
        const doiObject = externalIds.find(id => id['external-id-type'] === 'doi');
        const doi = doiObject?.['external-id-value'] || null;

        // 檢查論文是否已存在於試算表
        if (existingData[normalizedTitle]) {
          const existingRow = existingData[normalizedTitle];
          const existingDoi = existingRow[headerIndex['DOI']];
          
          if (!existingDoi && doi) {
            updatedDoiRows.push({
              row: existingRow[0],
              col: headerIndex['DOI'],
              value: `https://doi.org/${doi}`
            });
            Logger.log(`更新已存在論文 "${title}" 的 DOI: ${doi}`);
          }
        } else {
          // 這是新論文，開始處理
          const newRowData = new Array(sheet.getLastColumn()).fill('');
          newRowData[headerIndex['Title'] - 1] = title;
          if (work['journal-title']) newRowData[headerIndex['Journal/Booktitle'] - 1] = work['journal-title'].value;
          if (work.url) newRowData[headerIndex['URL'] - 1] = work.url.value;

          if (doi) {
            newRowData[headerIndex['DOI'] - 1] = `https://doi.org/${doi}`;
            const { bibtex, json } = fetchBibtexFromDoi(doi);
            if (bibtex) {
              newRowData[headerIndex['Bibtex'] - 1] = bibtex;
              parseBibtexAndFillRowData(newRowData, headerIndex, bibtex);
            } else if (json) {
              parseJsonAndFillRowData(newRowData, headerIndex, json);
            }
          }
          newWorks.push(newRowData);
        }
      });
    }

    if (newWorks.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newWorks.length, newWorks[0].length).setValues(newWorks);
      Logger.log(`已成功新增 ${newWorks.length} 篇新論文到試算表！`);
    } else {
      Logger.log('沒有找到新的論文可以新增。');
    }

    if (updatedDoiRows.length > 0) {
      updatedDoiRows.forEach(update => sheet.getRange(update.row, update.col).setValue(update.value));
      Logger.log(`已成功更新 ${updatedDoiRows.length} 篇已存在論文的 DOI。`);
    }

  } catch (e) {
    Logger.log('發生錯誤：' + e.message);
  }
}

/**
 * 檢查與更新現有的 BibTeX 資料。
 */
function checkAndUpdateBibtex() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`找不到名為 "${SHEET_NAME}" 的工作表。`);

    const headerIndex = getHeaderIndex(sheet);
    const doiIndex = headerIndex['DOI'];
    const bibtexIndex = headerIndex['Bibtex'];

    if (!doiIndex || !bibtexIndex) {
      throw new Error('表格中缺少必要的欄位："DOI" 或 "Bibtex"。');
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('試算表中沒有論文資料。');
      return;
    }
    const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    const data = dataRange.getValues();

    let updatedRows = [];
    data.forEach(row => {
      const doiUrl = row[doiIndex - 1];
      const currentBibtex = row[bibtexIndex - 1];
      
      let doi = '';
      if (typeof doiUrl === 'string') {
        const doiMatch = doiUrl.match(/(10\.\d{4,}\/[^\s]+)$/);
        if (doiMatch) {
          doi = doiMatch[1];
        } else if (!doiUrl.startsWith('http')) {
          doi = doiUrl;
        }
      }

      if (doi) {
        const { bibtex: fetchedBibtex } = fetchBibtexFromDoi(doi);
        
        const currentTrimmed = currentBibtex ? currentBibtex.toString().trim() : '';
        const fetchedTrimmed = fetchedBibtex ? fetchedBibtex.trim() : '';
        
        if (fetchedTrimmed && fetchedTrimmed !== currentTrimmed) {
          row[bibtexIndex - 1] = fetchedTrimmed;
          // 解析新 BibTeX 並更新所有相關欄位，包括 Title
          parseBibtexAndFillRowData(row, headerIndex, fetchedTrimmed);
          // 額外更新 Title 欄位
          const newTitleMatch = fetchedTrimmed.match(/title\s*=\s*[{"]?([^}]+)[}"]?/i);
          if (newTitleMatch && newTitleMatch[1] && headerIndex['Title']) {
            row[headerIndex['Title'] - 1] = newTitleMatch[1].replace(/\\/g, '').replace(/\{|\}/g, '').trim();
          }
          updatedRows.push(row);
        }
      }
    });

    if (updatedRows.length > 0) {
      dataRange.setValues(data);
      Logger.log(`更新完成！共有 ${updatedRows.length} 篇論文的 BibTeX 資訊被更新。`);
    } else {
      Logger.log('沒有找到任何需要更新的 BibTeX 資料。');
    }

  } catch (e) {
    Logger.log('發生錯誤：' + e.message);
  }
}

/**
 * 從 Google 學術的 BibTeX 連結檢查並新增漏掉的論文。
 */
function checkByGoogleScholarBibtex() {
  if (!GOOGLE_SCHOLAR_BIBTEX_URL || GOOGLE_SCHOLAR_BIBTEX_URL.length < 50) {
    Logger.log('請先更新腳本中的 Google 學術 BibTeX 連結。');
    return;
  }
  
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`找不到名為 "${SHEET_NAME}" 的工作表。`);
    
    const headerIndex = getHeaderIndex(sheet);
    const requiredFields = ['Title', 'Authors', 'Year', 'Journal/Booktitle'];
    requiredFields.forEach(field => {
      if (!headerIndex[field]) throw new Error(`表格中缺少必要的欄位："${field}"。`);
    });

    let bibtexContent = '';
    try {
      const scholarRes = UrlFetchApp.fetch(GOOGLE_SCHOLAR_BIBTEX_URL, {
        'headers': {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        'muteHttpExceptions': true
      });
      const code = scholarRes.getResponseCode();
      if (code === 403 || code === 429) {
        Logger.log('提示：Google 學術 (Scholar) 回傳 HTTP ' + code + '（反爬蟲機器人驗證或 citsig 簽名過期），本次已優雅跳過 Scholar。請以 ORCID 作為主要自動同步來源，或手動更新 citsig 匯出連結。');
        return;
      }
      if (code !== 200) {
        Logger.log('Google 學術請求失敗，HTTP 狀態碼：' + code);
        return;
      }
      bibtexContent = scholarRes.getContentText();
    } catch (err) {
      Logger.log('Google 學術連線失敗：' + err.message);
      return;
    }

    const entries = bibtexContent.split(/\s*@/);
    let newWorks = [];

    entries.forEach(entry => {
      if (!entry.trim()) return;
      const fullEntry = `@${entry}`;
      const titleMatch = fullEntry.match(/title\s*=\s*[{"]?([^}]+)[}"]?/i);
      const title = titleMatch?.[1]?.replace(/\{|\}/g, '').trim() || 'N/A';
      
      const normalizedTitle = normalizeTitle(title);
      
      if (title !== 'N/A' && !existingTitles.has(normalizedTitle)) {
        Logger.log(`發現新論文 (Google 學術)：${title}`);
        const newRowData = new Array(sheet.getLastColumn()).fill('');
        
        newRowData[headerIndex['Title'] - 1] = title;
        newRowData[headerIndex['Bibtex'] - 1] = fullEntry.trim();

        const doiMatch = fullEntry.match(/doi\s*=\s*[{"]?([^}]+)[}"]?/i);
        const doi = doiMatch?.[1]?.replace(/\{|\}/g, '').trim() || null;
        if (doi) {
          newRowData[headerIndex['DOI'] - 1] = `https://doi.org/${doi}`;
          const { bibtex: crossrefBibtex } = fetchBibtexFromDoi(doi);
          if (crossrefBibtex) {
            newRowData[headerIndex['Bibtex'] - 1] = crossrefBibtex;
          }
        }
        
        const finalBibtex = newRowData[headerIndex['Bibtex'] - 1];
        if (finalBibtex) {
          parseBibtexAndFillRowData(newRowData, headerIndex, finalBibtex);
        }
        
        newWorks.push(newRowData);
      }
    });

    if (newWorks.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newWorks.length, newWorks[0].length).setValues(newWorks);
      Logger.log(`已成功從 Google 學術新增 ${newWorks.length} 篇論文。`);
    } else {
      Logger.log('沒有從 Google 學術連結中找到新的論文。');
    }

  } catch (e) {
    Logger.log('發生錯誤：' + e.message);
  }
}

// --- 輔助函式 ---

/**
 * 統一正規化標題，移除空白並轉換為小寫。
 * @param {string} title - 論文標題。
 * @returns {string} 正規化後的標題。
 */
function normalizeTitle(title) {
  if (!title) return '';
  return title.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

/**
 * 根據 DOI 從 Crossref 獲取 BibTeX 或 JSON。
 * @param {string} doi - 論文的 DOI 字串。
 * @returns {Object} 包含 bibtex 或 json 數據的物件。
 */
function fetchBibtexFromDoi(doi) {
  const timestamp = new Date().getTime();
  
  try {
    const bibtexResponse = UrlFetchApp.fetch(`https://doi.org/${doi}?t=${timestamp}`, {
      'headers': {'Accept': 'application/x-bibtex'},
      'muteHttpExceptions': true
    });
    
    if (bibtexResponse.getResponseCode() === 200 && bibtexResponse.getHeaders()['Content-Type']?.toLowerCase().includes('application/x-bibtex')) {
      return { bibtex: bibtexResponse.getContentText().trim() };
    }
    
    const jsonResponse = UrlFetchApp.fetch(`https://doi.org/api/works/${doi}?t=${timestamp}`, {'headers': {'Accept': 'application/json'}, 'muteHttpExceptions': true});
    if (jsonResponse.getResponseCode() === 200) {
      return { json: JSON.parse(jsonResponse.getContentText()) };
    }
  } catch (e) {
    Logger.log(`無法從 DOI ${doi} 獲取 BibTeX/JSON: ${e.message}`);
  }
  return {};
}

/**
 * 取得工作表的標題索引。
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 目標工作表。
 * @returns {Object} 標題名稱到索引的映射。
 */
function getHeaderIndex(sheet) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerIndex = {};
  headerRow.forEach((header, index) => headerIndex[header] = index + 1);
  return headerIndex;
}

/**
 * 取得試算表中現有的所有論文資料，以正規化標題為鍵。
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 目標工作表。
 * @param {number} titleIndex - 標題欄的索引。
 * @returns {Object} 包含所有論文資料的物件，鍵為正規化標題。
 */
function getExistingData(sheet, titleIndex) {
  const existingData = {};
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    dataRange.forEach((row, index) => {
      const normalizedTitle = normalizeTitle(row[titleIndex - 1]);
      if (normalizedTitle) {
        existingData[normalizedTitle] = [index + 2, ...row];
      }
    });
  }
  return existingData;
}

/**
 * 取得試算表中現有的所有論文標題。
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 目標工作表。
 * @param {number} titleIndex - 標題欄的索引。
 * @returns {Set} 包含所有正規化標題的 Set。
 */
function getExistingTitles(sheet, titleIndex) {
  const existingTitles = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const titleRange = sheet.getRange(2, titleIndex, lastRow - 1, 1).getValues();
    titleRange.forEach(row => existingTitles.add(normalizeTitle(row[0])));
  }
  return existingTitles;
}

/**
 * 通用函式：根據 BibTeX 字串解析並填入資料到指定的行。
 * @param {Array} rowData - 欲寫入資料的陣列。
 * @param {Object} headerIndex - 標題索引映射。
 * @param {string} fullEntry - 完整的 BibTeX 字串。
 */
function parseBibtexAndFillRowData(rowData, headerIndex, fullEntry) {
  const typeMatch = fullEntry.match(/@(\w+)\s*\{/);
  if (typeMatch?.[1] && headerIndex['Type']) {
    rowData[headerIndex['Type'] - 1] = typeMatch[1].trim();
  }

  const combinedMapping = { ...BIBTEX_MAPPING, 'Title': 'title' };

  for (const [key, bibtexKeys] of Object.entries(combinedMapping)) {
    if (headerIndex[key]) {
      const keysToSearch = Array.isArray(bibtexKeys) ? bibtexKeys : [bibtexKeys];
      for (const bibtexKey of keysToSearch) {
        const regex = new RegExp(`\\b${bibtexKey}\\s*=\\s*[{"]?([^}]+)[}"]?`, 'i');
        const match = fullEntry.match(regex);
        if (match) {
          let parsedValue = match[1].replace(/\\/g, '').replace(/\{|\}/g, '').trim();
          
          if (key === 'Authors') {
            parsedValue = parsedValue.replace(/\s+and\s+/gi, '; ');
          } else if (key === 'Publisher') {
            const publisherKey = parsedValue.toLowerCase();
            parsedValue = PUBLISHER_MAPPING[publisherKey] || parsedValue;
          } else if (key === 'Month') {
            const monthKey = parsedValue.toLowerCase().substring(0, 3);
            parsedValue = MONTH_MAPPING[monthKey] || parsedValue;
          }
          
          rowData[headerIndex[key] - 1] = parsedValue;
          break;
        }
      }
    }
  }
}

/**
 * 通用函式：根據 JSON 數據解析並填入資料到指定的行 (專為 ORCID 備用)。
 * @param {Array} rowData - 欲寫入資料的陣列。
 * @param {Object} headerIndex - 標題索引映射。
 * @param {Object} jsonData - 從 Crossref 獲取的 JSON 數據。
 */
function parseJsonAndFillRowData(rowData, headerIndex, jsonData) {
  if (jsonData.title && headerIndex['Title']) {
    rowData[headerIndex['Title'] - 1] = jsonData.title[0];
  }
  if (jsonData.author && headerIndex['Authors']) {
    const authors = jsonData.author.map(a => a.literal || (a.family && a.given ? `${a.family}, ${a.given}` : a.name)).filter(name => name).join('; ');
    rowData[headerIndex['Authors'] - 1] = authors;
  }
  if (jsonData.issued?.['date-parts']?.[0] && headerIndex['Year']) {
    rowData[headerIndex['Year'] - 1] = jsonData.issued['date-parts'][0][0];
    if (jsonData.issued['date-parts'][0][1] && headerIndex['Month']) {
      rowData[headerIndex['Month'] - 1] = jsonData.issued['date-parts'][0][1];
    }
  }
  if (jsonData.volume && headerIndex['Volume']) rowData[headerIndex['Volume'] - 1] = jsonData.volume;
  if (jsonData.issue && headerIndex['Number']) rowData[headerIndex['Number'] - 1] = jsonData.issue;
  if (jsonData.page && headerIndex['Pages']) rowData[headerIndex['Pages'] - 1] = jsonData.page;
  if (jsonData.publisher && headerIndex['Publisher']) rowData[headerIndex['Publisher'] - 1] = jsonData.publisher;
  if (jsonData.type && headerIndex['Type']) rowData[headerIndex['Type'] - 1] = jsonData.type;
  if (jsonData['container-title'] && headerIndex['Journal/Booktitle']) rowData[headerIndex['Journal/Booktitle'] - 1] = jsonData['container-title'][0];
}
