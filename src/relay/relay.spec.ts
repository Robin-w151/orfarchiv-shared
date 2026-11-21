import { Result } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  decodeRelayClientMessage,
  decodeRelayServerMessage,
  encodeRelayClientMessage,
  encodeRelayServerMessage,
  type RelayServerMessage,
} from './relay';
import {
  RELAY_JOIN_TIMEOUT_MS,
  RELAY_MAX_MESSAGE_BYTES,
  RELAY_MAX_PEERS_PER_ROOM,
  RELAY_PING_INTERVAL_MS,
  RELAY_PROTOCOL_VERSION,
  RELAY_RATE_LIMIT_MESSAGES_PER_SECOND,
  RelayClientMessageType,
  RelayCloseCode,
  RelayErrorCode,
  RelayServerMessageType,
} from './relay.constants';

const room = 'a'.repeat(32) + '0123456789abcdef'.repeat(2);
const peerId = 'Ab3_-xyz0123456789ABCD';
const otherPeerId = '0f6c1e9a-4b7d-4e2a-9c3f-8d5b6a7e1f20';
const payload = 'SGVsbG8gV29ybGQ_-w';

describe('constants', () => {
  it('match the protocol definition', () => {
    expect(RELAY_PROTOCOL_VERSION).toBe(1);
    expect(RELAY_MAX_MESSAGE_BYTES).toBe(65_536);
    expect(RELAY_MAX_PEERS_PER_ROOM).toBe(16);
    expect(RELAY_RATE_LIMIT_MESSAGES_PER_SECOND).toBe(50);
    expect(RELAY_JOIN_TIMEOUT_MS).toBe(10_000);
    expect(RELAY_PING_INTERVAL_MS).toBe(30_000);
    expect(RelayClientMessageType).toEqual({ Join: 'join', Send: 'send' });
    expect(RelayServerMessageType).toEqual({ Peers: 'peers', Message: 'message', Error: 'error' });
    expect(Object.values(RelayErrorCode)).toEqual([
      'InvalidMessage',
      'RoomFull',
      'RateLimited',
      'TooLarge',
      'NotJoined',
      'UnknownPeer',
      'UnsupportedVersion',
    ]);
    expect(RelayCloseCode).toEqual({
      JoinTimeout: 4000,
      RoomFull: 4001,
      UnsupportedVersion: 4002,
      TooLarge: 1009,
      ServerFull: 1013,
    });
  });
});

describe('decodeRelayClientMessage', () => {
  it.each([
    ['a join', { type: 'join', room, peerId, version: 1 }],
    ['a join with a UUID peer ID', { type: 'join', room, peerId: otherPeerId, version: 1 }],
    ['a send', { type: 'send', to: otherPeerId, payload }],
    ['a send with an empty payload', { type: 'send', to: peerId, payload: '' }],
  ])('decodes %s', (_label, message) => {
    const result = decodeRelayClientMessage(JSON.stringify(message));
    expect(Result.isSuccess(result)).toBe(true);
    expect(Result.getOrThrow(result)).toEqual(message);
  });

  it.each([
    ['invalid JSON', '{"type":"join"'],
    ['a non-object', '"join"'],
    ['an unknown type', JSON.stringify({ type: 'leave', room, peerId, version: 1 })],
    ['a server message type', JSON.stringify({ type: 'peers', peers: [] })],
    ['a missing type', JSON.stringify({ room, peerId, version: 1 })],
    ['an uppercase room ID', JSON.stringify({ type: 'join', room: room.toUpperCase(), peerId, version: 1 })],
    ['a short room ID', JSON.stringify({ type: 'join', room: room.slice(1), peerId, version: 1 })],
    ['a long room ID', JSON.stringify({ type: 'join', room: `${room}0`, peerId, version: 1 })],
    ['a non-hex room ID', JSON.stringify({ type: 'join', room: `${room.slice(1)}g`, peerId, version: 1 })],
    ['a peer ID with forbidden characters', JSON.stringify({ type: 'join', room, peerId: `${peerId}!`, version: 1 })],
    ['a peer ID with a space', JSON.stringify({ type: 'join', room, peerId: `${peerId.slice(1)} `, version: 1 })],
    ['a too short peer ID', JSON.stringify({ type: 'join', room, peerId: 'a'.repeat(21), version: 1 })],
    ['a too long peer ID', JSON.stringify({ type: 'join', room, peerId: 'a'.repeat(37), version: 1 })],
    ['a missing version', JSON.stringify({ type: 'join', room, peerId })],
    ['a string version', JSON.stringify({ type: 'join', room, peerId, version: '1' })],
    ['a fractional version', JSON.stringify({ type: 'join', room, peerId, version: 1.5 })],
    ['a zero version', JSON.stringify({ type: 'join', room, peerId, version: 0 })],
    ['a send with an invalid recipient', JSON.stringify({ type: 'send', to: 'x', payload })],
    ['a send with a non-base64url payload', JSON.stringify({ type: 'send', to: peerId, payload: 'a+b/' })],
    ['a send without payload', JSON.stringify({ type: 'send', to: peerId })],
  ])('rejects %s', (_label, json) => {
    expect(Result.isFailure(decodeRelayClientMessage(json))).toBe(true);
  });

  it('drops unknown fields', () => {
    const result = decodeRelayClientMessage(JSON.stringify({ type: 'send', to: peerId, payload, extra: true }));
    expect(Result.getOrThrow(result)).toEqual({ type: 'send', to: peerId, payload });
  });

  it('decodes a join with a newer version and extra fields', () => {
    const result = decodeRelayClientMessage(
      JSON.stringify({ type: 'join', room, peerId, version: 2, capabilities: ['x'] }),
    );
    expect(Result.getOrThrow(result)).toEqual({ type: 'join', room, peerId, version: 2 });
  });
});

describe('encodeRelayClientMessage', () => {
  it('round-trips a join and a send', () => {
    const join = { type: 'join', room, peerId, version: RELAY_PROTOCOL_VERSION } as const;
    const send = { type: 'send', to: otherPeerId, payload } as const;
    expect(Result.getOrThrow(decodeRelayClientMessage(encodeRelayClientMessage(join)))).toEqual(join);
    expect(Result.getOrThrow(decodeRelayClientMessage(encodeRelayClientMessage(send)))).toEqual(send);
  });
});

describe('relay server messages', () => {
  it.each<[string, RelayServerMessage]>([
    ['peers', { type: 'peers', peers: [peerId, otherPeerId] }],
    ['empty peers', { type: 'peers', peers: [] }],
    ['message', { type: 'message', from: otherPeerId, payload }],
    ...Object.values(RelayErrorCode).map((code): [string, RelayServerMessage] => [
      `error ${code}`,
      { type: 'error', code },
    ]),
  ])('round-trips %s', (_label, message) => {
    expect(Result.getOrThrow(decodeRelayServerMessage(encodeRelayServerMessage(message)))).toEqual(message);
  });

  it.each([
    ['an unknown error code', JSON.stringify({ type: 'error', code: 'Nope' })],
    ['peers with an invalid peer ID', JSON.stringify({ type: 'peers', peers: ['x'] })],
    ['a message without sender', JSON.stringify({ type: 'message', payload })],
    ['a client message type', JSON.stringify({ type: 'send', to: peerId, payload })],
  ])('rejects %s', (_label, json) => {
    expect(Result.isFailure(decodeRelayServerMessage(json))).toBe(true);
  });

  it('drops unknown fields', () => {
    const result = decodeRelayServerMessage(JSON.stringify({ type: 'peers', peers: [peerId], count: 1 }));
    expect(Result.getOrThrow(result)).toEqual({ type: 'peers', peers: [peerId] });
  });
});
