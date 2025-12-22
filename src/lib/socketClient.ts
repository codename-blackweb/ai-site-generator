import { io } from "socket.io-client";
import type { ChatSocket } from "@/lib/chatTypes";

type SocketAuth = {
  siteId: string;
  pageId: string;
  sessionId: string;
};

export function createSocketClient(url: string, auth: SocketAuth): ChatSocket {
  const socket = io(url, {
    transports: ["websocket"],
    autoConnect: false,
    auth,
  });

  return {
    get connected() {
      return socket.connected;
    },
    connect() {
      socket.connect();
    },
    disconnect() {
      socket.disconnect();
    },
    on(event, handler) {
      socket.on(event, handler);
    },
    off(event, handler) {
      socket.off(event, handler);
    },
    emit(event, payload) {
      socket.emit(event, payload);
    },
    abort() {
      socket.emit("cancel", {});
    },
  };
}
