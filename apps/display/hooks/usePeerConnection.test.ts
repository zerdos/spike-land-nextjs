import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePeerConnection } from './usePeerConnection';
import type { Peer, DataConnection, MediaConnection } from 'peerjs';

// Mock getStreamMetadata
vi.mock('@apps/display/lib/webrtc/utils', () => ({
  getStreamMetadata: vi.fn(),
}));

describe('usePeerConnection', () => {
  const mockTrack = { stop: vi.fn() };
  const mockStream = {
    getTracks: vi.fn(() => [mockTrack]),
  } as unknown as MediaStream;
  const mockMetadata = {
    peerId: 'remote-peer',
    streamType: 'video' as const,
    isActive: true,
  };

  let mockDataConnection: Partial<DataConnection>;
  let mockMediaConnection: Partial<MediaConnection>;
  let mockPeer: Partial<Peer>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockTrack.stop.mockClear();
    const { getStreamMetadata } = await import('@apps/display/lib/webrtc/utils');
    vi.mocked(getStreamMetadata).mockReturnValue(mockMetadata);

    mockDataConnection = {
      peer: 'remote-peer',
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      open: false,
    };

    mockMediaConnection = {
      peer: 'remote-peer',
      on: vi.fn(),
      close: vi.fn(),
      answer: vi.fn(),
    };

    mockPeer = {
      connect: vi.fn(() => mockDataConnection as DataConnection),
      call: vi.fn(() => mockMediaConnection as MediaConnection),
      on: vi.fn(),
      off: vi.fn(),
    };
  });

  it('should initialize with empty connections', () => {
    const { result } = renderHook(() => usePeerConnection(null));

    expect(result.current.connections.size).toBe(0);
  });

  it('should call a remote peer with stream', async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    expect(mockPeer.connect).toHaveBeenCalledWith('remote-peer', {
      reliable: true,
      serialization: 'json',
    });
    expect(mockPeer.call).toHaveBeenCalledWith('remote-peer', mockStream);

    await waitFor(() => {
      expect(result.current.connections.size).toBe(1);
      const connection = result.current.connections.get('remote-peer');
      expect(connection?.client.id).toBe('remote-peer');
      expect(connection?.client.status).toBe('connecting');
    });
  });

  it('should not call peer when peer is null', () => {
    const { result } = renderHook(() => usePeerConnection(null));

    result.current.callPeer('remote-peer', mockStream);

    expect(mockPeer.connect).not.toHaveBeenCalled();
  });

  it('should handle data connection open event', async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    // Simulate data connection open
    const onHandler = vi.mocked(mockDataConnection.on);
    const openHandler = onHandler.mock.calls.find((call) => call[0] === 'open')?.[1];

    act(() => {
      openHandler?.();
    });

    await waitFor(() => {
      const connection = result.current.connections.get('remote-peer');
      expect(connection?.client.status).toBe('connected');
    });
  });

  it('should handle incoming data on data connection', async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    const onHandler = vi.mocked(mockDataConnection.on);
    const dataHandler = onHandler.mock.calls.find((call) => call[0] === 'data')?.[1];

    const testData = { type: 'test', payload: 'hello' };
    act(() => {
      dataHandler?.(testData);
    });

    // Just verify it doesn't throw
    expect(onHandler).toHaveBeenCalledWith('data', expect.any(Function));
  });

  it('should handle data connection close event', async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    const onHandler = vi.mocked(mockDataConnection.on);
    const closeHandler = onHandler.mock.calls.find((call) => call[0] === 'close')?.[1];

    act(() => {
      closeHandler?.();
    });

    await waitFor(() => {
      const connection = result.current.connections.get('remote-peer');
      expect(connection?.client.status).toBe('closed');
    });
  });

  it('should handle data connection error event', async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    const onHandler = vi.mocked(mockDataConnection.on);
    const errorHandler = onHandler.mock.calls.find((call) => call[0] === 'error')?.[1];

    act(() => {
      errorHandler?.(new Error('Connection error'));
    });

    await waitFor(() => {
      const connection = result.current.connections.get('remote-peer');
      expect(connection?.client.status).toBe('failed');
    });
  });

  it('should handle media connection stream event', async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    const onHandler = vi.mocked(mockMediaConnection.on);
    const streamHandler = onHandler.mock.calls.find((call) => call[0] === 'stream')?.[1];

    act(() => {
      streamHandler?.(mockStream);
    });

    await waitFor(() => {
      const connection = result.current.connections.get('remote-peer');
      expect(connection?.stream).toBe(mockStream);
      expect(connection?.streamMetadata).toEqual(mockMetadata);
    });

    const { getStreamMetadata } = await import('@apps/display/lib/webrtc/utils');
    expect(getStreamMetadata).toHaveBeenCalledWith(mockStream, 'remote-peer');
  });

  it('should handle media connection close event', async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    const onHandler = vi.mocked(mockMediaConnection.on);
    const closeHandler = onHandler.mock.calls.find((call) => call[0] === 'close')?.[1];

    act(() => {
      closeHandler?.();
    });

    // Just verify it doesn't throw
    expect(onHandler).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('should handle media connection error event', async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    const onHandler = vi.mocked(mockMediaConnection.on);
    const errorHandler = onHandler.mock.calls.find((call) => call[0] === 'error')?.[1];

    act(() => {
      errorHandler?.(new Error('Media error'));
    });

    // Just verify it doesn't throw
    expect(onHandler).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should answer incoming call', async () => {
    const incomingCall = {
      ...mockMediaConnection,
      peer: 'caller-peer',
    } as MediaConnection;

    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.answerCall(incomingCall, mockStream);
    });

    expect(incomingCall.answer).toHaveBeenCalledWith(mockStream);

    await waitFor(() => {
      expect(result.current.connections.size).toBe(1);
      const connection = result.current.connections.get('caller-peer');
      expect(connection?.client.id).toBe('caller-peer');
      expect(connection?.client.status).toBe('connected');
    });
  });

  it('should handle stream event when answering call', async () => {
    const incomingCall = {
      ...mockMediaConnection,
      peer: 'caller-peer',
    } as MediaConnection;

    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.answerCall(incomingCall, mockStream);
    });

    const onHandler = vi.mocked(incomingCall.on);
    const streamHandler = onHandler.mock.calls.find((call) => call[0] === 'stream')?.[1];

    act(() => {
      streamHandler?.(mockStream);
    });

    await waitFor(() => {
      const connection = result.current.connections.get('caller-peer');
      expect(connection?.stream).toBe(mockStream);
    });
  });

  it('should handle close event when answering call', async () => {
    const incomingCall = {
      ...mockMediaConnection,
      peer: 'caller-peer',
    } as MediaConnection;

    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.answerCall(incomingCall, mockStream);
    });

    const onHandler = vi.mocked(incomingCall.on);
    const closeHandler = onHandler.mock.calls.find((call) => call[0] === 'close')?.[1];

    act(() => {
      closeHandler?.();
    });

    await waitFor(() => {
      const connection = result.current.connections.get('caller-peer');
      expect(connection?.client.status).toBe('closed');
    });
  });

  it('should handle error event when answering call', async () => {
    const incomingCall = {
      ...mockMediaConnection,
      peer: 'caller-peer',
    } as MediaConnection;

    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.answerCall(incomingCall, mockStream);
    });

    const onHandler = vi.mocked(incomingCall.on);
    const errorHandler = onHandler.mock.calls.find((call) => call[0] === 'error')?.[1];

    act(() => {
      errorHandler?.(new Error('Call error'));
    });

    await waitFor(() => {
      const connection = result.current.connections.get('caller-peer');
      expect(connection?.client.status).toBe('failed');
    });
  });

  it('should send message to specific client', async () => {
    mockDataConnection.open = true;

    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    const message = { type: 'ping' as const, timestamp: Date.now() };

    act(() => {
      result.current.sendMessage('remote-peer', message);
    });

    expect(mockDataConnection.send).toHaveBeenCalledWith(message);
  });

  it('should not send message if connection is not open', async () => {
    mockDataConnection.open = false;

    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    const message = { type: 'ping' as const, timestamp: Date.now() };

    act(() => {
      result.current.sendMessage('remote-peer', message);
    });

    expect(mockDataConnection.send).not.toHaveBeenCalled();
  });

  it('should broadcast message to all clients', async () => {
    const mockDataConnection2 = {
      ...mockDataConnection,
      peer: 'remote-peer-2',
      open: true,
    };

    mockPeer.connect = vi
      .fn()
      .mockReturnValueOnce(mockDataConnection as DataConnection)
      .mockReturnValueOnce(mockDataConnection2 as DataConnection);

    mockDataConnection.open = true;

    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', mockStream);
      result.current.callPeer('remote-peer-2', mockStream);
    });

    const message = { type: 'ping' as const, timestamp: Date.now() };

    act(() => {
      result.current.broadcast(message);
    });

    expect(mockDataConnection.send).toHaveBeenCalledWith(message);
    expect(mockDataConnection2.send).toHaveBeenCalledWith(message);
  });

  it('should disconnect from specific peer', async () => {
    mockDataConnection.open = true;
    const mockTrack = { stop: vi.fn() };
    const streamWithTracks = {
      getTracks: vi.fn(() => [mockTrack]),
    } as unknown as MediaStream;

    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', streamWithTracks);
    });

    // Simulate receiving stream
    const onHandler = vi.mocked(mockMediaConnection.on);
    const streamHandler = onHandler.mock.calls.find((call) => call[0] === 'stream')?.[1];
    act(() => {
      streamHandler?.(streamWithTracks);
    });

    await waitFor(() => {
      expect(result.current.connections.get('remote-peer')?.stream).toBe(streamWithTracks);
    });

    act(() => {
      result.current.disconnectPeer('remote-peer');
    });

    expect(mockDataConnection.close).toHaveBeenCalled();
    expect(mockMediaConnection.close).toHaveBeenCalled();
    expect(mockTrack.stop).toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.connections.size).toBe(0);
    });
  });

  it('should handle disconnecting peer with no connections', () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.disconnectPeer('non-existent');
    });

    expect(result.current.connections.size).toBe(0);
  });

  it('should disconnect all peers', async () => {
    mockPeer.connect = vi
      .fn()
      .mockReturnValueOnce({ ...mockDataConnection, peer: 'peer-1', open: true } as DataConnection)
      .mockReturnValueOnce({ ...mockDataConnection, peer: 'peer-2', open: true } as DataConnection);

    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('peer-1', mockStream);
      result.current.callPeer('peer-2', mockStream);
    });

    await waitFor(() => {
      expect(result.current.connections.size).toBe(2);
    });

    act(() => {
      result.current.disconnectAll();
    });

    await waitFor(() => {
      expect(result.current.connections.size).toBe(0);
    });
  });

  it('should handle incoming connection event', async () => {
    const incomingDataConn = {
      ...mockDataConnection,
      peer: 'incoming-peer',
    } as DataConnection;

    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    // Get the connection handler
    const peerOnHandler = vi.mocked(mockPeer.on);
    const connectionHandler = peerOnHandler.mock.calls.find(
      (call) => call[0] === 'connection'
    )?.[1] as (conn: DataConnection) => void;

    act(() => {
      connectionHandler(incomingDataConn);
    });

    // Simulate open event
    const connOnHandler = vi.mocked(incomingDataConn.on);
    const openHandler = connOnHandler.mock.calls.find((call) => call[0] === 'open')?.[1];

    act(() => {
      openHandler?.();
    });

    await waitFor(() => {
      const connection = result.current.connections.get('incoming-peer');
      expect(connection?.client.id).toBe('incoming-peer');
      expect(connection?.dataConnection).toBe(incomingDataConn);
    });
  });

  it('should update existing connection with incoming data connection', async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    // First, create a connection via call
    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    // Then receive incoming data connection for same peer
    const incomingDataConn = {
      ...mockDataConnection,
      peer: 'remote-peer',
    } as DataConnection;

    const peerOnHandler = vi.mocked(mockPeer.on);
    const connectionHandler = peerOnHandler.mock.calls.find(
      (call) => call[0] === 'connection'
    )?.[1] as (conn: DataConnection) => void;

    act(() => {
      connectionHandler(incomingDataConn);
    });

    const connOnHandler = vi.mocked(incomingDataConn.on);
    const openHandler = connOnHandler.mock.calls.find((call) => call[0] === 'open')?.[1];

    act(() => {
      openHandler?.();
    });

    await waitFor(() => {
      const connection = result.current.connections.get('remote-peer');
      expect(connection?.dataConnection).toEqual(incomingDataConn);
    });
  });

  it('should handle incoming data on incoming connection', async () => {
    const incomingDataConn = {
      ...mockDataConnection,
      peer: 'incoming-peer',
    } as DataConnection;

    renderHook(() => usePeerConnection(mockPeer as Peer));

    const peerOnHandler = vi.mocked(mockPeer.on);
    const connectionHandler = peerOnHandler.mock.calls.find(
      (call) => call[0] === 'connection'
    )?.[1] as (conn: DataConnection) => void;

    act(() => {
      connectionHandler(incomingDataConn);
    });

    const connOnHandler = vi.mocked(incomingDataConn.on);
    const dataHandler = connOnHandler.mock.calls.find((call) => call[0] === 'data')?.[1];

    act(() => {
      dataHandler?.({ type: 'test' });
    });

    // Just verify it doesn't throw
    expect(connOnHandler).toHaveBeenCalledWith('data', expect.any(Function));
  });

  it('should handle incoming connection close', async () => {
    const incomingDataConn = {
      ...mockDataConnection,
      peer: 'incoming-peer',
    } as DataConnection;

    renderHook(() => usePeerConnection(mockPeer as Peer));

    const peerOnHandler = vi.mocked(mockPeer.on);
    const connectionHandler = peerOnHandler.mock.calls.find(
      (call) => call[0] === 'connection'
    )?.[1] as (conn: DataConnection) => void;

    act(() => {
      connectionHandler(incomingDataConn);
    });

    const connOnHandler = vi.mocked(incomingDataConn.on);
    const closeHandler = connOnHandler.mock.calls.find((call) => call[0] === 'close')?.[1];

    act(() => {
      closeHandler?.();
    });

    // Just verify it doesn't throw
    expect(connOnHandler).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('should handle incoming connection error', async () => {
    const incomingDataConn = {
      ...mockDataConnection,
      peer: 'incoming-peer',
    } as DataConnection;

    renderHook(() => usePeerConnection(mockPeer as Peer));

    const peerOnHandler = vi.mocked(mockPeer.on);
    const connectionHandler = peerOnHandler.mock.calls.find(
      (call) => call[0] === 'connection'
    )?.[1] as (conn: DataConnection) => void;

    act(() => {
      connectionHandler(incomingDataConn);
    });

    const connOnHandler = vi.mocked(incomingDataConn.on);
    const errorHandler = connOnHandler.mock.calls.find((call) => call[0] === 'error')?.[1];

    act(() => {
      errorHandler?.(new Error('Connection error'));
    });

    // Just verify it doesn't throw
    expect(connOnHandler).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should handle incoming call event', () => {
    const incomingCall = {
      ...mockMediaConnection,
      peer: 'caller',
    } as MediaConnection;

    renderHook(() => usePeerConnection(mockPeer as Peer));

    const peerOnHandler = vi.mocked(mockPeer.on);
    const callHandler = peerOnHandler.mock.calls.find((call) => call[0] === 'call')?.[1] as (
      call: MediaConnection
    ) => void;

    act(() => {
      callHandler(incomingCall);
    });

    // Just verify it doesn't throw - calls must be answered manually
    expect(peerOnHandler).toHaveBeenCalledWith('call', expect.any(Function));
  });

  it('should cleanup event listeners when peer changes', () => {
    const { rerender } = renderHook(({ peer }) => usePeerConnection(peer), {
      initialProps: { peer: mockPeer as Peer },
    });

    rerender({ peer: null });

    expect(mockPeer.off).toHaveBeenCalledWith('connection', expect.any(Function));
    expect(mockPeer.off).toHaveBeenCalledWith('call', expect.any(Function));
  });

  it('should disconnect all peers on unmount', async () => {
    mockDataConnection.open = true;
    const unmountMockTrack = { stop: vi.fn() };
    const streamWithTracks = {
      getTracks: vi.fn(() => [unmountMockTrack]),
    } as unknown as MediaStream;

    const { result, unmount } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('peer-1', streamWithTracks);
    });

    await waitFor(() => {
      expect(result.current.connections.size).toBe(1);
    });

    // Trigger the stream event to set the stream in connection state
    const onHandler = vi.mocked(mockMediaConnection.on);
    const streamHandler = onHandler.mock.calls.find((call) => call[0] === 'stream')?.[1];

    act(() => {
      streamHandler?.(streamWithTracks);
    });

    await waitFor(() => {
      const connection = result.current.connections.get('peer-1');
      expect(connection?.stream).toBe(streamWithTracks);
    });

    act(() => {
      unmount();
    });

    // Verify cleanup was initiated
    expect(unmountMockTrack.stop).toHaveBeenCalled();
  });

  it('should update existing connection when updateConnection is called', async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    await waitFor(() => {
      expect(result.current.connections.size).toBe(1);
    });

    // Simulate data connection open which calls updateConnection
    const onHandler = vi.mocked(mockDataConnection.on);
    const openHandler = onHandler.mock.calls.find((call) => call[0] === 'open')?.[1];

    act(() => {
      openHandler?.();
    });

    await waitFor(() => {
      const connection = result.current.connections.get('remote-peer');
      expect(connection?.client.status).toBe('connected');
    });
  });

  it('should update existing connection with dataConnection when connection exists on incoming connection', async () => {
    const { result } = renderHook(() => usePeerConnection(mockPeer as Peer));

    // First create a connection via callPeer (which creates mediaConnection but not dataConnection yet)
    act(() => {
      result.current.callPeer('remote-peer', mockStream);
    });

    await waitFor(() => {
      expect(result.current.connections.size).toBe(1);
    });

    // Now simulate incoming data connection for the same peer
    const incomingDataConn = {
      ...mockDataConnection,
      peer: 'remote-peer',
      on: vi.fn(),
    } as unknown as DataConnection;

    const peerOnHandler = vi.mocked(mockPeer.on);
    const connectionHandler = peerOnHandler.mock.calls.find(
      (call) => call[0] === 'connection'
    )?.[1] as (conn: DataConnection) => void;

    act(() => {
      connectionHandler(incomingDataConn);
    });

    // Simulate the open event on incoming connection
    const connOnHandler = vi.mocked(incomingDataConn.on);
    const openHandler = connOnHandler.mock.calls.find((call) => call[0] === 'open')?.[1];

    act(() => {
      openHandler?.();
    });

    // Verify that the existing connection was updated with the dataConnection (line 267)
    await waitFor(() => {
      const connection = result.current.connections.get('remote-peer');
      expect(connection?.dataConnection).toBe(incomingDataConn);
    });
  });
});
