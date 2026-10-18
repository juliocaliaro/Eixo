import '@testing-library/jest-dom';

if (typeof globalThis.WebSocket === 'undefined') {
  // @ts-expect-error Mock simples de WebSocket para evitar quebra no Node < 22 do Supabase Realtime em testes
  globalThis.WebSocket = class MockWebSocket {};
}
