import { Result, Schema } from 'effect';
import {
  RELAY_PEER_ID_PATTERN,
  RELAY_ROOM_ID_PATTERN,
  RelayClientMessageType,
  RelayErrorCode,
  RelayServerMessageType,
} from './relay.constants';

export const RelayRoomId = Schema.String.check(Schema.isPattern(RELAY_ROOM_ID_PATTERN));
export type RelayRoomId = typeof RelayRoomId.Type;

export const RelayPeerId = Schema.String.check(Schema.isPattern(RELAY_PEER_ID_PATTERN));
export type RelayPeerId = typeof RelayPeerId.Type;

export const RelayPayload = Schema.String.check(Schema.isBase64Url());
export type RelayPayload = typeof RelayPayload.Type;

export const RelayJoinMessage = Schema.Struct({
  type: Schema.Literal(RelayClientMessageType.Join),
  room: RelayRoomId,
  peerId: RelayPeerId,
  version: Schema.Int.check(Schema.isGreaterThan(0)),
});
export type RelayJoinMessage = typeof RelayJoinMessage.Type;

export const RelaySendMessage = Schema.Struct({
  type: Schema.Literal(RelayClientMessageType.Send),
  to: RelayPeerId,
  payload: RelayPayload,
});
export type RelaySendMessage = typeof RelaySendMessage.Type;

export const RelayClientMessage = Schema.Union([RelayJoinMessage, RelaySendMessage]);
export type RelayClientMessage = typeof RelayClientMessage.Type;

export const RelayPeersMessage = Schema.Struct({
  type: Schema.Literal(RelayServerMessageType.Peers),
  peers: Schema.Array(RelayPeerId),
});
export type RelayPeersMessage = typeof RelayPeersMessage.Type;

export const RelayForwardedMessage = Schema.Struct({
  type: Schema.Literal(RelayServerMessageType.Message),
  from: RelayPeerId,
  payload: RelayPayload,
});
export type RelayForwardedMessage = typeof RelayForwardedMessage.Type;

export const RelayErrorMessage = Schema.Struct({
  type: Schema.Literal(RelayServerMessageType.Error),
  code: Schema.Literals(Object.values(RelayErrorCode)),
});
export type RelayErrorMessage = typeof RelayErrorMessage.Type;

export const RelayServerMessage = Schema.Union([RelayPeersMessage, RelayForwardedMessage, RelayErrorMessage]);
export type RelayServerMessage = typeof RelayServerMessage.Type;

const RelayClientMessageJson = Schema.fromJsonString(RelayClientMessage);
const RelayServerMessageJson = Schema.fromJsonString(RelayServerMessage);

export function decodeRelayClientMessage(json: string): Result.Result<RelayClientMessage, Schema.SchemaError> {
  return Schema.decodeUnknownResult(RelayClientMessageJson)(json);
}

export function encodeRelayClientMessage(message: RelayClientMessage): string {
  return Schema.encodeSync(RelayClientMessageJson)(message);
}

export function decodeRelayServerMessage(json: string): Result.Result<RelayServerMessage, Schema.SchemaError> {
  return Schema.decodeUnknownResult(RelayServerMessageJson)(json);
}

export function encodeRelayServerMessage(message: RelayServerMessage): string {
  return Schema.encodeSync(RelayServerMessageJson)(message);
}
