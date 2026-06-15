import '@testing-library/jest-dom';

// Mockar APIs de navegador que o useVoiceCall usa
if (typeof window !== 'undefined') {
  // Mock do WebSocket
  class MockWebSocket {
    constructor(url) { this.url = url; }
    send = jest.fn();
    close = jest.fn();
    onopen = null;
    onmessage = null;
  }
  global.WebSocket = MockWebSocket;

  // Mock do MediaDevices
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
    },
    writable: true,
  });

}