import { io } from "socket.io-client";

import { API_ORIGIN } from "@/lib/config";

export const socket = io(API_ORIGIN, {
  autoConnect: false,
  transports: ["websocket"],
});
