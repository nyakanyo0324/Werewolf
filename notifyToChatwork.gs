// =============================================
// 設定エリア（ここだけ編集してください）
// =============================================

const CHATWORK_API_TOKEN = 'YOUR_CHATWORK_API_TOKEN';
const CHATWORK_ROOM_ID   = 'YOUR_ROOM_ID';

// =============================================
// フォーム送信時に自動実行される関数
// =============================================

function onFormSubmit(e) {
  if (!e || !e.range) {
    Logger.log('⚠️ トリガー経由でのみ動作します。動作確認は testRun() を使ってください。');
    return;
  }

  try {
    const sheet   = e.range.getSheet();
    const headers = getHeaders(sheet);
    const values  = e.values;

    const message = buildMessage(headers, values);
    sendToChatwork(message);

  } catch (error) {
    Logger.log('エラーが発生しました: ' + error.message);
  }
}

// =============================================
// ヘッダー行（1行目）を取得
// =============================================

function getHeaders(sheet) {
  const lastCol = sheet.getLastColumn();
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
}

// =============================================
// メッセージを組み立てる（装飾なしのシンプル形式）
// =============================================

function buildMessage(headers, values) {
  const lines = [];

  headers.forEach(function(header, i) {
    let value = (values[i] !== undefined && values[i] !== '') ? values[i] : '（未回答）';

    // タイムスタンプを整形
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) value = formatDate(d);
    }

    lines.push(header + ': ' + value);
  });

  return lines.join('\n');
}

// =============================================
// 日付を「yyyy年mm月dd日 hh時mm分ss秒」に変換
// =============================================

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mo   = zeroPad(d.getMonth() + 1);
  const dd   = zeroPad(d.getDate());
  const hh   = zeroPad(d.getHours());
  const mi   = zeroPad(d.getMinutes());
  const ss   = zeroPad(d.getSeconds());
  return yyyy + '年' + mo + '月' + dd + '日 ' + hh + '時' + mi + '分' + ss + '秒';
}

function zeroPad(n) {
  return String(n).padStart(2, '0');
}

// =============================================
// Chatwork APIでメッセージを送信
// =============================================

function sendToChatwork(message) {
  const roomId = String(CHATWORK_ROOM_ID).replace(/\D/g, '');
  const url = 'https://api.chatwork.com/v2/rooms/' + roomId + '/messages';

  Logger.log('POST URL: ' + url);
  Logger.log('APIトークン(先頭4文字): ' + String(CHATWORK_API_TOKEN).substring(0, 4) + '****');

  const options = {
    method     : 'post',
    headers    : { 'X-ChatWorkToken': CHATWORK_API_TOKEN },
    payload    : { body: message },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const code     = response.getResponseCode();

  Logger.log('レスポンスコード: ' + code);
  Logger.log('レスポンス内容: ' + response.getContentText());

  if (code !== 200) {
    throw new Error('Chatwork APIエラー: ' + code + ' ' + response.getContentText());
  }

  Logger.log('✅ 通知送信成功');
}

// =============================================
// 【動作確認用】テスト送信（直接実行OK）
// =============================================

function testRun() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getActiveSheet();
  const headers = getHeaders(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('⚠️ テストデータがありません。スプレッドシートに1件以上データを入力してください。');
    return;
  }

  const lastCol = sheet.getLastColumn();
  const values  = sheet.getRange(lastRow, 1, 1, lastCol).getValues()[0];

  const message = buildMessage(headers, values);
  Logger.log('送信するメッセージ:\n' + message);

  sendToChatwork(message);
}

// =============================================
// 【初回のみ実行】トリガーをプログラムから設定する
// =============================================

function createFormSubmitTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'onFormSubmit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  Logger.log('✅ トリガーを設定しました');
}
