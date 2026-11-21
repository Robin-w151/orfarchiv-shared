export const RELAY_PROTOCOL_VERSION = 1;
export const RELAY_MAX_MESSAGE_BYTES = 65_536;
export const RELAY_MAX_PEERS_PER_ROOM = 16;
export const RELAY_RATE_LIMIT_MESSAGES_PER_SECOND = 50;
export const RELAY_JOIN_TIMEOUT_MS = 10_000;
export const RELAY_PING_INTERVAL_MS = 30_000;

export const RELAY_ROOM_ID_PATTERN = /^[0-9a-f]{64}$/;
export const RELAY_PEER_ID_PATTERN = /^[A-Za-z0-9_-]{22,36}$/;

export const RelayClientMessageType = {
  Join: 'join',
  Send: 'send',
} as const;
export type RelayClientMessageType = (typeof RelayClientMessageType)[keyof typeof RelayClientMessageType];

export const RelayServerMessageType = {
  Peers: 'peers',
  Message: 'message',
  Error: 'error',
} as const;
export type RelayServerMessageType = (typeof RelayServerMessageType)[keyof typeof RelayServerMessageType];

export const RelayErrorCode = {
  InvalidMessage: 'InvalidMessage',
  RoomFull: 'RoomFull',
  RateLimited: 'RateLimited',
  TooLarge: 'TooLarge',
  NotJoined: 'NotJoined',
  UnknownPeer: 'UnknownPeer',
  UnsupportedVersion: 'UnsupportedVersion',
} as const;
export type RelayErrorCode = (typeof RelayErrorCode)[keyof typeof RelayErrorCode];

export const RelayCloseCode = {
  JoinTimeout: 4000,
  RoomFull: 4001,
  UnsupportedVersion: 4002,
  TooLarge: 1009,
  ServerFull: 1013,
} as const;
export type RelayCloseCode = (typeof RelayCloseCode)[keyof typeof RelayCloseCode];
