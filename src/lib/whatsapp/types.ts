export type WhatsAppStatus = 'disconnected' | 'qr_ready' | 'connecting' | 'connected';

export interface WhatsAppState {
  status: WhatsAppStatus;
  qrCodeDataUrl?: string;
  connectedPhone?: string;
  connectedName?: string;
  lastError?: string;
  connectedAt?: string;
}
