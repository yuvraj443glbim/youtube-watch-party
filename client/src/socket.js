import { io } from 'socket.io-client';

// same origin as the page (Express serves both); Vite proxies it in dev
export const socket = io();
