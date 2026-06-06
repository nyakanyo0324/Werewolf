const express = require('express');
const app = express();
app.use(express.json());

// =============================================
// 設定エリア：ルームIDとDiscord Webhook URLの対応表
// =============================================

const ROOM_TO_DISCORD = {
  '438999159': process.env.DISCORD_WEBHOOK_URL_ROOM1, // 匿名箱
  '438999300': process.env.DISCORD_WEBHOOK_URL_ROOM2, // 匿名連絡箱
  // 追加する場合はここに行を足していく
  // '333333333': process.env.DISCORD_WEBHOOK_URL_ROOM3,
};

// どのルームにも一致しない場合のデフォルト送信先（不要なら null にする）
const DEFAULT_DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL_DEFAULT || null;

// =============================================
// Chatwork Webhook を受け取るエンドポイント
// =============================================

app.post('/chatwork-webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('Chatwork Webhook受信:', JSON.stringify(body, null, 2));

    const event       = body.webhook_event;
    const messageBody = event?.body   ?? '（本文なし）';
    const roomId      = String(event?.room_id ?? '');

    // ルームIDに対応するDiscord Webhook URLを取得
    const discordWebhookUrl = ROOM_TO_DISCORD[roomId] || DEFAULT_DISCORD_WEBHOOK_URL;

    if (!discordWebhookUrl) {
      console.log(`⚠️ ルームID ${roomId} に対応するDiscord Webhook URLが未設定のためスキップ`);
      return res.status(200).json({ status: 'skipped', reason: 'no webhook url for this room' });
    }

    console.log(`ルームID ${roomId} → Discord Webhook に転送`);

    const discordMessage = { content: '```\n' + messageBody + '\n```' };

    const response = await fetch(discordWebhookUrl, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(discordMessage),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Discord APIエラー: ${response.status} ${text}`);
    }

    console.log('✅ Discordへの転送成功');
    res.status(200).json({ status: 'ok' });

  } catch (err) {
    console.error('エラー:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Renderのヘルスチェック用
app.get('/', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 サーバー起動 port:${PORT}`));