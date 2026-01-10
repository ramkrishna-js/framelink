import WebSocket from 'ws';
import { LavalinkManager } from './LavalinkManager';

export interface NodeOptions {
    id?: string;
    host: string;
    port?: number;
    password?: string;
    secure?: boolean;
    retryAmount?: number;
    retryDelay?: number;
    version?: 'v3' | 'v4';
}

export class LavalinkNode {
    public manager: LavalinkManager;
    public options: NodeOptions;
    public socket: WebSocket | null = null;
    public stats: any = {};
    public connected: boolean = false;

    constructor(manager: LavalinkManager, options: NodeOptions) {
        this.manager = manager;
        this.options = {
            version: 'v4',
            ...options
        };
    }

    public connect() {
        if (this.socket) return;
        
        const headers: Record<string, string> = {
            Authorization: this.options.password || 'youshallnotpass',
            'User-Id': this.manager.userId || '0',
            'Client-Name': '@ramkrishna-js/framelink/1.0.0'
        };

        const protocol = this.options.secure ? 'wss' : 'ws';
        let endpoint = '';

        if (this.options.version === 'v4') {
            endpoint = '/v4/websocket';
        }

        const url = `${protocol}://${this.options.host}:${this.options.port || 2333}${endpoint}`;

        this.socket = new WebSocket(url, { headers });

        this.socket.on('open', this.onOpen.bind(this));
        this.socket.on('message', this.onMessage.bind(this));
        this.socket.on('error', this.onError.bind(this));
        this.socket.on('close', this.onClose.bind(this));
    }

    public send(payload: any) {
        if (!this.connected || !this.socket) return;
        this.socket.send(JSON.stringify(payload));
    }

    public async loadTracks(identifier: string) {
        const protocol = this.options.secure ? 'https' : 'http';
        let endpoint = '/loadtracks';
        
        if (this.options.version === 'v4') {
            endpoint = '/v4/loadtracks';
        }

        const url = new URL(`${protocol}://${this.options.host}:${this.options.port || 2333}${endpoint}`);
        url.searchParams.append('identifier', identifier);

        const response = await fetch(url.toString(), {
            headers: {
                Authorization: this.options.password || 'youshallnotpass'
            }
        });
        
        return await response.json();
    }

    private onOpen() {
        this.connected = true;
        this.manager.emit('nodeConnect', this);
    }

    private onMessage(data: WebSocket.Data) {
        const payload = JSON.parse(data.toString());
        
        switch (payload.op) {
            case 'stats':
                this.stats = payload;
                this.manager.emit('nodeStats', this, payload);
                break;
            
            case 'playerUpdate':
                const player = this.manager.players.get(payload.guildId);
                if (player) player.update(payload.state);
                break;

            case 'event':
                this.handleEvent(payload);
                break;

            default:
                this.manager.emit('nodeMessage', this, payload);
        }
    }

    private handleEvent(payload: any) {
        const player = this.manager.players.get(payload.guildId);
        if (!player) return;

        switch (payload.type) {
            case 'TrackStartEvent':
                this.manager.emit('trackStart', player, payload.track);
                break;
            case 'TrackEndEvent':
                this.manager.emit('trackEnd', player, payload.track, payload.reason);
                if (payload.reason === 'FINISHED' || payload.reason === 'LOAD_FAILED') {
                     // Auto-play next track in queue or trigger autoplay
                     if (player.queue.tracks.length > 0) {
                         player.play();
                     } else if (player.autoplay) {
                         player.triggerAutoplay();
                     } else {
                        player.isPlaying = false;
                        this.manager.emit('queueEnd', player);
                     }
                }
                break;
            case 'TrackExceptionEvent':
                this.manager.emit('trackError', player, payload.track, payload.exception);
                break;
            case 'TrackStuckEvent':
                this.manager.emit('trackStuck', player, payload.track, payload.thresholdMs);
                break;
            case 'WebSocketClosedEvent':
                this.manager.emit('socketClosed', player, payload);
                break;
        }
    }

    private onError(error: Error) {
        this.manager.emit('nodeError', this, error);
    }

    private onClose(code: number, reason: string) {
        this.connected = false;
        this.socket = null;
        this.manager.emit('nodeDisconnect', this, code, reason);
    }
}
