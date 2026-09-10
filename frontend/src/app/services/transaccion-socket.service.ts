import { Injectable, OnDestroy } from '@angular/core';
import { Client, IFrame, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { TransaccionEvento } from '../models/transaccion-evento.model';

@Injectable({ providedIn: 'root' })
export class TransaccionSocketService implements OnDestroy {
  private readonly eventos$ = new Subject<TransaccionEvento>();
  private readonly client: Client;

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      reconnectDelay: 5000
    });

    this.client.onConnect = () => {
      console.log('[STOMP] conectado a', environment.wsUrl);
      this.client.subscribe('/topic/transacciones', (message: IMessage) => {
        console.log('[STOMP] evento crudo recibido:', message.body);
        const evento: TransaccionEvento = JSON.parse(message.body);
        this.eventos$.next(evento);
      });
    };

    this.client.onStompError = (frame: IFrame) => {
      console.error('[STOMP] error del broker:', frame.headers['message'], frame.body);
    };

    this.client.onWebSocketError = (event: Event) => {
      console.error('[STOMP] error de conexion (websocket/sockjs):', event);
    };

    this.client.onDisconnect = () => {
      console.warn('[STOMP] desconectado');
    };

    this.client.activate();
  }

  onTransaccion(): Observable<TransaccionEvento> {
    return this.eventos$.asObservable();
  }

  ngOnDestroy(): void {
    this.client.deactivate();
  }
}
