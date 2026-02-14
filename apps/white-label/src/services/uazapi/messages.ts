import { uazapiRequest } from './client';

export interface UazapiChat {
  id: string;
  wa_fastid?: string;
  wa_chatid?: string;
  wa_chatlid?: string;
  wa_archived?: boolean;
  wa_contactName?: string;
  wa_name?: string;
  name?: string;
  image?: string;
  imagePreview?: string;
  wa_isBlocked?: boolean;
  wa_isGroup?: boolean;
  wa_isGroup_admin?: boolean;
  wa_isGroup_announce?: boolean;
  wa_isGroup_member?: boolean;
  wa_isPinned?: boolean;
  wa_label?: string[];
  wa_lastMessageTextVote?: string;
  wa_lastMessageType?: string;
  wa_lastMsgTimestamp?: number;
  wa_lastMessageSender?: string;
  wa_unreadCount?: number;
  phone?: string;
}

export interface FindChatsRequest {
  operator?: 'AND' | 'OR';
  sort?: string;
  limit?: number;
  offset?: number;
  wa_fastid?: string;
  wa_chatid?: string;
  wa_contactName?: string;
  wa_name?: string;
  name?: string;
  wa_isBlocked?: boolean;
  wa_isGroup?: boolean;
  wa_isPinned?: boolean;
  wa_label?: string;
  lead_status?: string;
}

export interface FindChatsResponse {
  chats: UazapiChat[];
  totalChatsStats?: Record<string, unknown>;
  pagination?: {
    totalRecords?: number;
    currentPage?: number;
    totalPages?: number;
    pageSize?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

export interface UazapiMessage {
  id: string;
  messageid?: string;
  chatid?: string;
  sender?: string;
  senderName?: string;
  isGroup?: boolean;
  fromMe?: boolean;
  messageType?: string;
  source?: string;
  messageTimestamp?: number;
  status?: string;
  text?: string;
  quoted?: string;
  edited?: string;
  reaction?: string;
  vote?: string;
  convertOptions?: string;
  buttonOrListid?: string;
  owner?: string;
  error?: string;
  content?: Record<string, unknown> | string;
  wasSentByApi?: boolean;
  sendFunction?: string;
  sendPayload?: Record<string, unknown> | string;
  fileURL?: string;
  track_source?: string;
  track_id?: string;
}

export interface FindMessagesRequest {
  id?: string;
  chatid?: string;
  track_source?: string;
  track_id?: string;
  limit?: number;
  offset?: number;
}

export interface FindMessagesResponse {
  returnedMessages?: number;
  messages: UazapiMessage[];
  limit?: number;
  offset?: number;
  nextOffset?: number;
  hasMore?: boolean;
}

export interface DownloadMessageRequest {
  id: string;
  return_base64?: boolean;
  generate_mp3?: boolean;
  return_link?: boolean;
  transcribe?: boolean;
  openai_apikey?: string;
  download_quoted?: boolean;
}

export interface DownloadMessageResponse {
  fileURL?: string;
  mimetype?: string;
  base64Data?: string;
  transcription?: string;
}

export interface SendTextRequest {
  number: string;
  text: string;
}

export interface SendTextResponse {
  id?: string;
  messageid?: string;
  status?: string;
  response?: string;
  error?: string;
}

export async function findChats(instanceId: string, payload: FindChatsRequest) {
  return uazapiRequest<FindChatsResponse>('/chat/find', {
    method: 'POST',
    instanceId,
    body: payload,
  });
}

export async function findMessages(instanceId: string, payload: FindMessagesRequest) {
  return uazapiRequest<FindMessagesResponse>('/message/find', {
    method: 'POST',
    instanceId,
    body: payload,
  });
}

export async function downloadMessage(instanceId: string, payload: DownloadMessageRequest) {
  return uazapiRequest<DownloadMessageResponse>('/message/download', {
    method: 'POST',
    instanceId,
    body: payload,
  });
}

export async function sendTextMessage(instanceId: string, payload: SendTextRequest) {
  return uazapiRequest<SendTextResponse>('/send/text', {
    method: 'POST',
    instanceId,
    body: payload,
  });
}
