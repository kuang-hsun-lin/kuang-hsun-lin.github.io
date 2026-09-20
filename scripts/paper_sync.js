/**
 * EWN Lab / Kuang-Hsun Lin Academic Publication Auto-Sync Script
 * Source: https://github.com/kuang-hsun-lin/kuang-hsun-lin.github.io/blob/main/scripts/paper_sync.js
 *
 * 整合式腳本功能：
 * 1. 從 ORCID 抓取論文清單，自動比對並新增未收錄之新論文。
 * 2. 根據 DOI 透過 Crossref Polite Pool 高速取得官方 BibTeX / JSON。
 * 3. 智慧增量檢查與更新缺漏或未補齊之 BibTeX 中繼資料。
 * 4. 嚴格保持原生 BibTeX 月份格式，相容於 IEEEtran 等標準學術排版規範。
 */

// --- 全域設定 ---
var SPREADSHEET_ID = "1EsbqSfOS97txN7_nwxpujdkV3g6scHB24TSAaJ25AMo";
var SHEET_NAME = "ORCID";
var ORCID_ID = '0000-0002-0426-9301'; 

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

// 月份英文縮寫與數字對照表（僅供試算表 Month 欄位填寫，不更動原始 Bibtex 字串）
var MONTH_MAPPING = {
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
  'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
};

/**
 * 一鍵執行所有同步任務：ORCID 同步 -> Crossref BibTeX 智慧增量校對
 * @param {boolean} forceAllBibtex - 若設為 true 則強制全表重新向 Crossref 查詢更新，預設為 false (智慧增量模式)
 */
function runAllPaperSync(forceAllBibtex = false) {
  const startTime = new Date().getTime();
  Logger.log('=== [1/2] 開始從 ORCID 同步最新論文 ===');
  const orcidRes = updateMyPaperList();
  
  Logger.log('=== [2/2] 開始智慧增量校對與補齊 BibTeX 中繼資料 ===');
  const bibtexRes = checkAndUpdateBibtex(forceAllBibtex);
  
  const elapsed = ((new Date().getTime() - startTime) / 1000).toFixed(2);
  Logger.log(`=== 全部論文同步流程完成 (總耗時: ${elapsed} 秒) ===`);
}

/**
 * 從 ORCID 抓取論文清單並新增至試算表。
 */
function updateMyPaperList() {
  const result = { newPapers: 0, updatedDoi: 0 };
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`找不到名為 "${SHEET_NAME}" 的工作表。`);
    
    const headerIndex = getHeaderIndex(sheet);
    const existingData = getExistingData(sheet, headerIndex['Title']);

    const url = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;
    const response = UrlFetchApp.fetch(url, {
      'headers': {
        'Accept': 'application/vnd.orcid+json',
        'User-Agent': 'EWN-Lab-Publication-Sync/1.0 (https://kuang-hsun-lin.github.io/; mailto:khlin@nycu.edu.tw)'
      },
      'muteHttpExceptions': true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error(`ORCID API 連線失敗，HTTP 狀態碼：${response.getResponseCode()}`);
    }

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
        const rawDoi = doiObject?.['external-id-value'] || null;
        const doi = cleanDoi(rawDoi);

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
      result.newPapers = newWorks.length;
      Logger.log(`已成功新增 ${newWorks.length} 篇新論文到試算表！`);
    } else {
      Logger.log('ORCID 檢查完畢：沒有找到新的論文可以新增。');
    }

    if (updatedDoiRows.length > 0) {
      updatedDoiRows.forEach(update => sheet.getRange(update.row, update.col).setValue(update.value));
      result.updatedDoi = updatedDoiRows.length;
      Logger.log(`已成功更新 ${updatedDoiRows.length} 篇已存在論文的 DOI。`);
    }

    return result;

  } catch (e) {
    Logger.log('ORCID 同步發生錯誤：' + e.message);
    return result;
  }
}

/**
 * 檢查與補齊現有的 BibTeX 資料（支援智慧增量檢查，大幅節省時間與配額）。
 * @param {boolean} forceAll - 是否強制掃描整張表向 Crossref 重新拉取
 */
function checkAndUpdateBibtex(forceAll = false) {
  const result = { updatedCount: 0, skippedCount: 0 };
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
      return result;
    }
    const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    const data = dataRange.getValues();

    const volumeIndex = headerIndex['Volume'];
    const numberIndex = headerIndex['Number'];
    const pagesIndex = headerIndex['Pages'];
    const titleIndex = headerIndex['Title'];

    let updatedCount = 0;
    let skippedCount = 0;
    let earlyAccessCheckedCount = 0;

    data.forEach(row => {
      const doiUrl = row[doiIndex - 1];
      const currentBibtex = row[bibtexIndex - 1];
      const currentTrimmed = currentBibtex ? currentBibtex.toString().trim() : '';

      const volumeVal = volumeIndex ? String(row[volumeIndex - 1] || '').trim() : '';
      const pagesVal = pagesIndex ? String(row[pagesIndex - 1] || '').trim() : '';
      const bibtexLower = currentTrimmed.toLowerCase();

      // 判定是否為「Early Access / 待補齊正式卷期」的論文：
      // 1. 尚未收錄 BibTeX
      // 2. 卷 (Volume) 為空，或 頁碼 (Pages) 為空
      // 3. 原 BibTeX 中註記有 early access / to appear
      const isMissingBibtex = currentTrimmed.length < 40;
      const isMissingVolOrPages = !volumeVal || !pagesVal;
      const isEarlyAccess = bibtexLower.includes('early access') || bibtexLower.includes('earlyaccess') || bibtexLower.includes('to appear');

      const needsCheck = forceAll || isMissingBibtex || isMissingVolOrPages || isEarlyAccess;

      // 若已有完整卷期頁碼與 BibTeX，且非強制模式，直接略過以節省網路請求
      if (!needsCheck) {
        skippedCount++;
        return;
      }

      const doi = cleanDoi(doiUrl);

      if (doi) {
        earlyAccessCheckedCount++;
        const { bibtex: fetchedBibtex } = fetchBibtexFromDoi(doi);
        const fetchedTrimmed = fetchedBibtex ? fetchedBibtex.trim() : '';
        
        if (fetchedTrimmed && fetchedTrimmed !== currentTrimmed) {
          const oldVol = volumeVal;
          const oldPages = pagesVal;
          
          row[bibtexIndex - 1] = fetchedTrimmed;
          // 解析新 BibTeX 並更新所有相關欄位（Volume, Number, Pages, Publisher, Month 等）
          parseBibtexAndFillRowData(row, headerIndex, fetchedTrimmed);
          
          // 若有新標題，乾淨同步 Title 欄位
          const newTitleMatch = fetchedTrimmed.match(/title\s*=\s*[{"]?([^}]+)[}"]?/i);
          if (newTitleMatch && newTitleMatch[1] && titleIndex) {
            row[titleIndex - 1] = newTitleMatch[1].replace(/\\/g, '').replace(/\{|\}/g, '').trim();
          }

          const newVol = volumeIndex ? String(row[volumeIndex - 1] || '').trim() : '';
          const newPages = pagesIndex ? String(row[pagesIndex - 1] || '').trim() : '';
          const paperTitle = titleIndex ? row[titleIndex - 1] : doi;

          if ((!oldVol && newVol) || (!oldPages && newPages)) {
            Logger.log(`[正式出版更新] 論文 "${paperTitle}" 已更新正式卷期頁碼：Vol. ${newVol || '-'}, No. ${numberIndex ? (row[numberIndex - 1] || '-') : '-'}, pp. ${newPages || '-'}`);
          } else {
            Logger.log(`[中繼資料更新] 論文 "${paperTitle}" 的 BibTeX 已同步更新。`);
          }

          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      dataRange.setValues(data);
      Logger.log(`BibTeX 更新完成！共有 ${updatedCount} 篇論文更新了中繼資料與正式卷期。`);
    } else {
      Logger.log(`BibTeX 檢查完畢：現有已完整收錄文獻無需重複拉取（已檢查 Early Access/缺漏文獻 ${earlyAccessCheckedCount} 篇，略過完整歷史論文 ${skippedCount} 篇）。`);
    }

    result.updatedCount = updatedCount;
    result.skippedCount = skippedCount;
    return result;

  } catch (e) {
    Logger.log('BibTeX 校驗發生錯誤：' + e.message);
    return result;
  }
}

// --- 輔助函式 ---

/**
 * 統一正規化標題，移除空白並轉換為小寫，折疊連續空格與換行符號。
 * @param {string} title - 論文標題。
 * @returns {string} 正規化後的標題。
 */
function normalizeTitle(title) {
  if (!title) return '';
  return title.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

/**
 * 清理並擷取乾淨的 DOI 字串（去除 URL 前綴、結尾句點與多餘符號）。
 * @param {string} doiStr - 原始 DOI 字串或網址。
 * @returns {string} 乾淨的純 DOI。
 */
function cleanDoi(doiStr) {
  if (!doiStr || typeof doiStr !== 'string') return '';
  let doi = doiStr.trim();
  const doiMatch = doi.match(/(10\.\d{4,}\/[^\s"']+)/);
  if (doiMatch) {
    doi = doiMatch[1];
  } else if (doi.startsWith('http')) {
    doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  }
  return doi.replace(/[.,/]+$/, '').trim();
}

/**
 * 根據 DOI 透過 Crossref Polite Pool 獲取官方 BibTeX 或 JSON。
 * @param {string} rawDoi - 論文的 DOI 字串。
 * @returns {Object} 包含 bibtex 或 json 數據的物件。
 */
function fetchBibtexFromDoi(rawDoi) {
  const doi = cleanDoi(rawDoi);
  if (!doi) return {};
  const timestamp = new Date().getTime();
  
  // 遵循 Crossref 官方禮貌池 (Polite Pool) 規範，附帶學術聯絡郵箱以獲得高速與穩定配額
  const politeHeaders = {
    'Accept': 'application/x-bibtex',
    'User-Agent': 'EWN-Lab-Publication-Sync/1.0 (https://kuang-hsun-lin.github.io/; mailto:khlin@nycu.edu.tw)'
  };

  try {
    const bibtexResponse = UrlFetchApp.fetch(`https://doi.org/${doi}?t=${timestamp}`, {
      'headers': politeHeaders,
      'muteHttpExceptions': true
    });
    
    if (bibtexResponse.getResponseCode() === 200 && bibtexResponse.getHeaders()['Content-Type']?.toLowerCase().includes('application/x-bibtex')) {
      return { bibtex: bibtexResponse.getContentText().trim() };
    }
    
    const jsonHeaders = {
      'Accept': 'application/json',
      'User-Agent': 'EWN-Lab-Publication-Sync/1.0 (https://kuang-hsun-lin.github.io/; mailto:khlin@nycu.edu.tw)'
    };
    const jsonResponse = UrlFetchApp.fetch(`https://doi.org/api/works/${doi}?t=${timestamp}`, {
      'headers': jsonHeaders,
      'muteHttpExceptions': true
    });
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
 * 嚴格保留原始 BibTeX 中的月份巨集 (month = jan/feb/...)，絕不擅改 BibTeX 格式。
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
            parsedValue = parsedValue.replace(/\s+and\s+/gi, '; ').replace(/\s*;\s*/g, '; ');
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
