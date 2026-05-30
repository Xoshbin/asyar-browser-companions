import { parseServerMessage, type ServerReq } from './protocol';

export interface WsHandlers {
  onOpen: () => void;
  onReq: (req: ServerReq) => void;
  onClose: (code: number) => void;
}

export function connect(port: number, variant: string, token: string, handlers: WsHandlers): WebSocket {
  const url = `ws://127.0.0.1:${port}/bridge?family=chromium&variant=${encodeURIComponent(variant)}`;
  // Browsers can't set Authorization; smuggle the token via subprotocol.
  const ws = new WebSocket(url, ['asyar.v1', `bearer.${token}`]);
  ws.addEventListener('open', () => handlers.onOpen());
  ws.addEventListener('message', (ev) => {
    const req = parseServerMessage(typeof ev.data === 'string' ? ev.data : '');
    if (req) handlers.onReq(req);
  });
  ws.addEventListener('close', (ev) => handlers.onClose(ev.code));
  return ws;
}
