
const USERS = {
  admin: "admin_dc_2025!",
  qcuser: "qc_dc_2025!",
  viewer: "view_dc_2025!"
};

const DB_SHEET_NAME = "DASHBOARD_DB";

function getDbSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DB_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DB_SHEET_NAME);aa
    sheet.hideSheet();
    sheet.getRange("A1").setNumberFormat("@");
    sheet.getRange("A1").setValue("[]");
  }
  return sheet;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    let action = e.parameter.action;
    let projectsJson = e.parameter.projects;
    
    if (!action && e.postData && e.postData.contents) {
      try {
        const payload = JSON.parse(e.postData.contents);
        action = payload.action;
        projectsJson = payload.projects;
      } catch (err) {}
    }
    
    if (action === "login") {
      let username = e.parameter.username || (e.postData && JSON.parse(e.postData.contents).username);
      let password = e.parameter.password || (e.postData && JSON.parse(e.postData.contents).password);
      
      // Trim inputs to fix "sometimes not working" due to hidden spaces
      username = String(username || "").trim();
      password = String(password || "").trim();

      if (USERS[username] && USERS[username] === password) {
        return json({ success: true });
      }
      return json({ success: false, message: "Invalid credentials. Check for extra spaces." });
    }

    if (action === "saveProjects") {
      if (projectsJson) {
        const dbSheet = getDbSheet();
        dbSheet.getRange("A1").setValue("'" + projectsJson);
        return json({ success: true });
      }
      return json({ success: false, message: "No data provided" });
    }

    return json({ success: false, message: "Invalid action" });
  } catch (err) {
    return json({ success: false, message: "Server error: " + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = e.parameter.action;

  if (action === "getProjects") {
    const dbSheet = getDbSheet();
    const saved = dbSheet.getRange("A1").getValue();
    let data = [];
    try {
      let cleanData = String(saved);
      if (cleanData.startsWith("'")) cleanData = cleanData.substring(1);
      if (cleanData && cleanData.trim().startsWith('[')) {
        data = JSON.parse(cleanData);
      }
    } catch (err) {}
    return json({ projects: data });
  }

  if (!e.parameter.sheet) {
    const sheets = ss.getSheets()
      .filter(s => s.getName() !== DB_SHEET_NAME)
      .map(s => s.getName());
    return json({ sheets });
  }

  const sheet = ss.getSheetByName(e.parameter.sheet);
  if (!sheet) return json({ error: "Sheet not found" });

  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return json([]);

  const headers = data[0];
  const rows = data.slice(1);
  const result = rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  return json(result);
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
