const express = require('express');
const app = express();
app.use(express.json());

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// =============================================
// Chatwork Webhook を受け取るエンドポイント
// =============================================

app.post('/chatwork-webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('Chatwork Webhook受信:', JSON.stringify(body, null, 2));

    // Chatworkのwebhookペイロードからメッセージ内容を取得
    const event       = body.webhook_event;
    const messageBody = event?.body          ?? '（本文なし）';
    const senderId    = event?.from_account_id ?? '不明';
    const roomId      = event?.room_id         ?? '不明';

    // Discordに送るメッセージを組み立て
    const discordMessage = {
      username  : 'Chatwork Bot',
      avatar_url: 'https://www.chatwork.com/favicon.ico',
      embeds: [
        {
          title      : '💬 Chatworkに新しい投稿があります',
          description: messageBody,
          color      : 0xe8453c, // Chatworkの赤
          fields: [
            { name: '送信者ID', value: String(senderId), inline: true },
            { name: 'ルームID', value: String(roomId),   inline: true },
          ],
          timestamp: new Date().toISOString(),
        }
      ]
    };

    // Discord Webhook に POST
    const response = await fetch(DISCORD_WEBHOOK_URL, {
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
