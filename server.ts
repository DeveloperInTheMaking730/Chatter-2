import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

app.use(express.json({ limit: '50mb' }));

// In-memory ephemeral relay state (ZERO persistence to disk or DB)
// Map friendCode/userId -> Set of WebSockets
const clients = new Map<string, Set<WebSocket>>();
// Active presence map: friendCode -> { username, lastSeen, status }
const presence = new Map<string, { username: string; lastSeen: number; status: 'online' | 'offline' }>();

// Simple in-memory ephemeral queue for offline recipients while they reconnect (cleared automatically after 5 minutes)
interface QueuedMessage {
  id: string;
  from: string;
  to: string;
  payload: any;
  timestamp: number;
}
const ephemeralQueue = new Map<string, QueuedMessage[]>(); // toFriendCode -> messages

// Clean up stale queue items every 60s
setInterval(() => {
  const now = Date.now();
  for (const [code, msgs] of ephemeralQueue.entries()) {
    const fresh = msgs.filter((m) => now - m.timestamp < 5 * 60 * 1000);
    if (fresh.length === 0) {
      ephemeralQueue.delete(code);
    } else {
      ephemeralQueue.set(code, fresh);
    }
  }
  // Clean up stale presence (offline > 10 min)
  for (const [code, info] of presence.entries()) {
    if (now - info.lastSeen > 10 * 60 * 1000) {
      presence.delete(code);
    }
  }
}, 60000);

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  let authenticatedCode: string | null = null;

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());
      const { type, from, to, payload } = msg;

      switch (type) {
        case 'register': {
          if (from) {
            authenticatedCode = String(from);
            if (!clients.has(authenticatedCode)) {
              clients.set(authenticatedCode, new Set());
            }
            clients.get(authenticatedCode)!.add(ws);

            presence.set(authenticatedCode, {
              username: msg.username || 'Anonymous',
              lastSeen: Date.now(),
              status: 'online',
            });

            // Send registration confirmation
            ws.send(JSON.stringify({ type: 'registered', friendCode: authenticatedCode }));

            // Deliver any queued ephemeral messages
            const queued = ephemeralQueue.get(authenticatedCode) || [];
            if (queued.length > 0) {
              queued.forEach((q) => {
                ws.send(JSON.stringify({
                  type: 'message',
                  from: q.from,
                  to: q.to,
                  payload: q.payload,
                  queued: true,
                }));
              });
              ephemeralQueue.delete(authenticatedCode);
            }

            // Broadcast presence update
            broadcastPresence();
          }
          break;
        }

        case 'heartbeat': {
          if (authenticatedCode) {
            const p = presence.get(authenticatedCode);
            if (p) {
              p.lastSeen = Date.now();
              p.status = 'online';
            }
          }
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        }

        case 'message':
        case 'typing':
        case 'ephemeral_read':
        case 'reaction':
        case 'webrtc_signal': {
          if (!to) return;
          const sender = payload?.from || from;
          const targetSockets = clients.get(String(to));

          if (targetSockets && targetSockets.size > 0) {
            const out = JSON.stringify({
              type,
              from: sender,
              to,
              payload,
              timestamp: Date.now(),
            });
            targetSockets.forEach((s) => {
              if (s.readyState === WebSocket.OPEN) {
                s.send(out);
              }
            });
          } else if (type === 'message') {
            // Queue ephemerally for max 5 minutes if recipient temporarily disconnected
            const target = String(to);
            if (!ephemeralQueue.has(target)) {
              ephemeralQueue.set(target, []);
            }
            ephemeralQueue.get(target)!.push({
              id: payload?.id || Math.random().toString(),
              from: sender,
              to: target,
              payload,
              timestamp: Date.now(),
            });
          }
          break;
        }

        case 'group_broadcast': {
          // Send to all member codes in group
          const memberCodes = payload?.members || [];
          const out = JSON.stringify({
            type: 'group_message',
            groupId: payload?.groupId,
            from,
            payload: payload?.data,
            timestamp: Date.now(),
          });
          memberCodes.forEach((mCode: string) => {
            if (String(mCode) !== String(from)) {
              const memberSockets = clients.get(String(mCode));
              if (memberSockets) {
                memberSockets.forEach((s) => {
                  if (s.readyState === WebSocket.OPEN) {
                    s.send(out);
                  }
                });
              }
            }
          });
          break;
        }
      }
    } catch {
      // Ignore malformed payloads
    }
  });

  ws.on('close', () => {
    if (authenticatedCode) {
      const set = clients.get(authenticatedCode);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          clients.delete(authenticatedCode);
          const p = presence.get(authenticatedCode);
          if (p) {
            p.status = 'offline';
            p.lastSeen = Date.now();
          }
          broadcastPresence();
        }
      }
    }
  });
});

function broadcastPresence() {
  const presenceList = Array.from(presence.entries()).map(([code, data]) => ({
    friendCode: code,
    username: data.username,
    status: data.status,
    lastSeen: data.lastSeen,
  }));
  const msg = JSON.stringify({ type: 'presence_update', presence: presenceList });
  for (const set of clients.values()) {
    set.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) {
        s.send(msg);
      }
    });
  }
}

// HTTP API Fallback endpoints for clients
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    securityPolicy: 'zero-storage-ephemeral',
    activeConnections: clients.size,
  });
});

app.get('/api/presence', (_req: Request, res: Response) => {
  const list = Array.from(presence.entries()).map(([code, data]) => ({
    friendCode: code,
    username: data.username,
    status: data.status,
    lastSeen: data.lastSeen,
  }));
  res.json({ presence: list });
});

// Relay message fallback via HTTP POST
app.post('/api/relay/send', (req: Request, res: Response) => {
  const { type, from, to, payload } = req.body;
  if (!to) {
    res.status(400).json({ error: 'Missing recipient' });
    return;
  }
  const targetSockets = clients.get(String(to));
  if (targetSockets && targetSockets.size > 0) {
    const out = JSON.stringify({
      type: type || 'message',
      from,
      to,
      payload,
      timestamp: Date.now(),
    });
    targetSockets.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) {
        s.send(out);
      }
    });
  }
  res.json({ success: true, delivered: Boolean(targetSockets && targetSockets.size > 0) });
});

// Chatter AI API endpoint - Meta AI alternative powered by Gemini 3.8 Flash
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { prompt, history, action, tone, targetLang } = req.body;

  if (!prompt && !action) {
    res.status(400).json({ error: 'Missing prompt or action' });
    return;
  }

  try {
    let systemInstruction = `You are Chatter AI, an intelligent, versatile, privacy-focused AI assistant built directly into the Chatter messaging app (better than Meta AI).
You are helpful, witty, concise, and articulate.
You assist users with answers, translations, message rewriting, coding, creative ideas, and daily assistance.
Keep your conversational responses formatted with clean, readable typography. Avoid mechanical or robotic filler. When appropriate, provide concise bullet points or code snippets.`;

    let userContent = prompt || '';

    if (action === 'summarize') {
      systemInstruction = 'You are a master summarizer. Provide a crystal-clear, 2-4 bullet point executive summary of the conversation thread.';
      userContent = `Summarize this conversation clearly:\n\n${prompt}`;
    } else if (action === 'rewrite') {
      systemInstruction = `You are an expert communicator. Rewrite the given text with a ${tone || 'polite and confident'} tone. Return ONLY the rewritten text without commentary.`;
      userContent = `Rewrite this message:\n"${prompt}"`;
    } else if (action === 'translate') {
      systemInstruction = `You are a fluent multilingual translator. Translate the given text accurately and naturally into ${targetLang || 'English'}. Return ONLY the translated text.`;
      userContent = `Translate:\n"${prompt}"`;
    } else if (action === 'suggestions') {
      systemInstruction = `You are a smart reply assistant. Generate exactly 3 short, natural, contextual smart reply options for the recipient. Return ONLY a valid JSON array of 3 strings, e.g. ["Sounds great!", "Let me check and get back to you", "Thanks for letting me know!"]`;
      userContent = `Context:\n${prompt}`;
    }

    // Build contents with optional chat history
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-8).forEach((item: { role: string; text: string }) => {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }],
        });
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: userContent }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I couldn't process that request right now.";

    if (action === 'suggestions') {
      try {
        const parsed = JSON.parse(reply.replace(/```json|```/g, '').trim());
        res.json({ suggestions: Array.isArray(parsed) ? parsed : [] });
        return;
      } catch {
        res.json({ suggestions: ['Got it!', 'Sounds good', 'Tell me more'] });
        return;
      }
    }

    res.json({ reply });
  } catch (err: any) {
    console.error('Chatter AI error:', err);
    res.json({
      reply: "Chatter AI is currently operating in offline mode. I'm ready to assist as soon as online connectivity resumes!",
      error: err.message,
    });
  }
});

const PORT = 3000;

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CipherZero zero-knowledge relay server listening on port ${PORT}`);
  });
}

startServer();
