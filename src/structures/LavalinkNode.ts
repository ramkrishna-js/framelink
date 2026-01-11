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
    resumeKey?: string;
    resumeTimeout?: number;
}

export class LavalinkNode {
    public manager: LavalinkManager;
    public options: NodeOptions;
    public socket: WebSocket | null = null;
    public stats: any = {};
    public connected: boolean = false;
    public sessionId: string | null = null;
    private reconnectAttempts: number = 0;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(manager: LavalinkManager, options: NodeOptions) {
        this.manager = manager;
        this.options = {
            version: 'v4',
            retryAmount: 5,
            retryDelay: 5000,
            resumeTimeout: 60,
            ...options
        };
    }

    public connect() {
        if (this.socket) return;
        
        const headers: Record<string, string> = {
            Authorization: this.options.password || 'youshallnotpass',
            'User-Id': this.manager.userId || '0',
            'Client-Name': '@ramkrishna-js/framelink/1.0.7'
        };

        if (this.options.resumeKey) {
            headers['Resume-Key'] = this.options.resumeKey;
        }

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

    public disconnect() {
        if (!this.socket) return;
        this.socket.close();
        this.socket = null;
        this.connected = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
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

    public async updatePlayer(guildId: string, data: any) {
        if (this.options.version === 'v4') {
            if (!this.sessionId) throw new Error("No session ID available for v4 node.");
            const protocol = this.options.secure ? 'https' : 'http';
            const url = `${protocol}://${this.options.host}:${this.options.port || 2333}/v4/sessions/${this.sessionId}/players/${guildId}`;
            
            console.log(`[Lavalink] Updating player for guild ${guildId} on node ${this.options.host}`);
            
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    Authorization: this.options.password || 'youshallnotpass',
                    'Content-Type': 'application/json',
                    'Client-Name': '@ramkrishna-js/framelink/1.0.5'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.text();
                console.error(`[Lavalink] Failed to update player: ${response.status} ${response.statusText}`, error);
            }
        } else {
            if (data.voice) {
                this.send({
                    op: 'voiceUpdate',
                    guildId,
                    ...data.voice
                });
            } else {
                this.send({
                    op: 'play',
                    guildId,
                    ...data
                });
            }
        }
    }

    private onOpen() {
        this.connected = true;
        this.reconnectAttempts = 0;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.options.resumeKey) {
            this.send({
                op: 'configureResuming',
                key: this.options.resumeKey,
                timeout: this.options.resumeTimeout
            });
        }
        this.manager.emit('nodeConnect', this);
    }

    private onMessage(data: WebSocket.Data) {
        const payload = JSON.parse(data.toString());
        
        if (payload.op === 'ready') {
            this.sessionId = payload.sessionId;
            console.log(`[Lavalink] Node ${this.options.host} ready with session ${this.sessionId}`);
        }
        
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
                     // Handle repeat modes
                     if (player.repeatMode === 'track' && player.queue.current) {
                         player.play(player.queue.current);
                         return;
                     }

                     if (player.repeatMode === 'queue' && player.queue.current) {
                         player.queue.add(player.queue.current);
                     }

                     // Transition to next track
                     const nextTrack = player.queue.next();

                     if (nextTrack) {
                         player.play(nextTrack);
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

        if (this.reconnectAttempts < (this.options.retryAmount || 5)) {
            this.reconnectAttempts++;
            console.log(`[Lavalink] Node ${this.options.host} disconnected. Retrying in ${this.options.retryDelay || 5000}ms... (${this.reconnectAttempts}/${this.options.retryAmount || 5})`);
            this.reconnectTimeout = setTimeout(() => {
                this.connect();
            }, this.options.retryDelay || 5000);
        } else {
            console.error(`[Lavalink] Node ${this.options.host} failed to reconnect after ${this.options.retryAmount || 5} attempts.`);
        }
    }
}
