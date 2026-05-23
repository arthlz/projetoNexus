import { renderHook, act } from '@testing-library/react';
import { useVoiceCall } from '../../hooks/useVoiceCall';

// 1. Mock do AudioContext (NOVO - Resolve o ReferenceError)
global.AudioContext = jest.fn().mockImplementation(() => ({
  createMediaStreamSource: jest.fn(),
  createScriptProcessor: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  createBufferSource: jest.fn(),
  decodeAudioData: jest.fn(),
  destination: {},
  state: 'running',
  close: jest.fn(),
  suspend: jest.fn(),
  resume: jest.fn(),
})) as any;

// 2. Mock do WebSocket global
class MockWebSocket {
  url: string;
  onopen: () => void = () => {};
  onclose: () => void = () => {};
  onmessage: (evt: any) => void = () => {};
  send: jest.Mock = jest.fn();
  close: jest.Mock = jest.fn();
  readyState: number = 1; // 1 = OPEN
  
  constructor(url: string) {
    this.url = url;
    setTimeout(() => this.onopen(), 10);
  }
}
global.WebSocket = MockWebSocket as any;

// 3. Mock da MediaDevices (Microfone)
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
      getAudioTracks: () => [{ enabled: true }],
    }),
  },
  writable: true,
});

describe('useVoiceCall Hook', () => {
  it('deve inicializar com isCalling como false', () => {
    const { result } = renderHook(() => useVoiceCall('123'));
    

    expect(result.current.isCalling).toBe(false);
    expect(result.current.isAISpeaking).toBe(false);
  });

  it('deve iniciar a chamada e mudar isCalling para true', async () => {
    const { result } = renderHook(() => useVoiceCall('123'));
    
    await act(async () => {
      await result.current.startCall(); 
    });

    expect(result.current.isCalling).toBe(true);
    expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
  });
});