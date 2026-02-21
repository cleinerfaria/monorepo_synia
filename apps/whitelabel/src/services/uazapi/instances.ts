import { uazapiRequest } from './client';

export type UazapiInstanceStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UazapiInstance {
  id: string;
  token: string;
  status?: UazapiInstanceStatus | string;
  paircode?: string;
  qrcode?: string;
  name?: string;
  profileName?: string;
  profilePicUrl?: string;
  isBusiness?: boolean;
  plataform?: string;
  owner?: string;
  current_presence?: 'available' | 'unavailable';
  lastDisconnect?: string;
  lastDisconnectReason?: string;
  adminField01?: string;
  adminField02?: string;
  created?: string;
  updated?: string;
}

export interface InitInstanceRequest {
  name: string;
  adminField01?: string;
  adminField02?: string;
  fingerprintProfile?: string;
  browser?: string;
}

export interface InitInstanceResponse {
  response?: string;
  instance?: UazapiInstance;
  connected?: boolean;
  loggedIn?: boolean;
  name?: string;
  token?: string;
}

export interface ConnectInstanceResponse {
  connected?: boolean;
  loggedIn?: boolean;
  jid?: unknown;
  instance?: UazapiInstance;
}

export interface DisconnectInstanceResponse {
  instance?: UazapiInstance;
  response?: string;
  info?: string;
}

export interface DeleteInstanceResponse {
  response?: string;
  info?: string;
}

export interface InstanceStatusResponse {
  instance?: UazapiInstance;
  status?: {
    connected?: boolean;
    loggedIn?: boolean;
    jid?: unknown;
  };
}

export async function initInstance(payload: InitInstanceRequest) {
  return uazapiRequest<InitInstanceResponse>('/instance/init', {
    method: 'POST',
    body: payload,
    admin: true,
  });
}

export async function listAllInstances() {
  return uazapiRequest<UazapiInstance[]>('/instance/all', {
    method: 'GET',
    admin: true,
  });
}

export async function connectInstance(instanceId: string, payload?: { phone?: string }) {
  return uazapiRequest<ConnectInstanceResponse>('/instance/connect', {
    method: 'POST',
    body: payload,
    instanceId,
  });
}

export async function disconnectInstance(instanceId: string) {
  return uazapiRequest<DisconnectInstanceResponse>('/instance/disconnect', {
    method: 'POST',
    instanceId,
  });
}

export async function deleteInstance(instanceId: string) {
  return uazapiRequest<DeleteInstanceResponse>('/instance', {
    method: 'DELETE',
    instanceId,
  });
}

export async function getInstanceStatus(instanceId: string) {
  return uazapiRequest<InstanceStatusResponse>('/instance/status', {
    method: 'GET',
    instanceId,
  });
}
