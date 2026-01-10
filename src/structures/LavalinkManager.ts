import { EventEmitter } from 'events';
import { LavalinkNode, NodeOptions } from './LavalinkNode';
import { Player, PlayerOptions } from './Player';
import { Plugin } from './Plugin';

export interface LavalinkManagerOptions {
    nodes: NodeOptions[];
    send: (guildId: string, payload: any) => void;
    autoResume?: boolean;
    plugins?: Plugin[];
}

export class LavalinkManager extends EventEmitter {
    public nodes: Map<string, LavalinkNode>;
    public players: Map<string, Player>;
    public options: LavalinkManagerOptions;
    public userId: string | null = null;
    public plugins: Plugin[] = [];

    constructor(options: LavalinkManagerOptions) {
        super();
        this.options = options;
        this.nodes = new Map();
        this.players = new Map();
        if (options.plugins) {
            this.plugins = options.plugins;
            this.plugins.forEach(p => p.load(this));
        }
    }

    public init(userId: string) {
        this.userId = userId;
        this.options.nodes.forEach(nodeOptions => {
            this.createNode(nodeOptions);
        });
    }

    public createNode(options: NodeOptions): LavalinkNode {
        const node = new LavalinkNode(this, options);
        this.nodes.set(options.id || options.host, node);
        node.connect();
        return node;
    }

    public createPlayer(options: PlayerOptions): Player {
        const node = this.getBestNode();
        if (!node) throw new Error("No available nodes.");
        
        const player = new Player(this, node, options);
        this.players.set(options.guildId, player);
        return player;
    }

    public destroyPlayer(guildId: string): boolean {
        const player = this.players.get(guildId);
        if (!player) return false;

        player.destroy();
        this.players.delete(guildId);
        return true;
    }

    public getBestNode(): LavalinkNode | undefined {
        // Simple strategy: return first connected node
        // In future: load balancing
        for (const node of this.nodes.values()) {
            if (node.connected) return node;
        }
        return undefined;
    }

    /**
     * Search for tracks using a specific source or default.
     * @param query The search query.
     * @param source The source prefix (e.g., 'yt', 'sc', 'sp'). Defaults to 'yt'.
     * @returns The load result.
     */
    public async search(query: string, source: 'yt' | 'ytm' | 'sc' | 'sp' | 'am' | 'dz' | string = 'yt') {
        const node = this.getBestNode();
        if (!node) throw new Error("No available nodes.");

        const prefixes: Record<string, string> = {
            yt: 'ytsearch:',
            ytm: 'ytmsearch:',
            sc: 'scsearch:',
            sp: 'spsearch:',
            am: 'amsearch:',
            dz: 'dzsearch:',
            js: 'jssearch:'
        };

        const identifier = /^(https?:\/\/)/.test(query) 
            ? query 
            : `${prefixes[source] || source + 'search:'}${query}`;

        const res = await node.loadTracks(identifier);
        
        // Add helper properties to tracks
        if (res.tracks) {
            res.tracks = res.tracks.map((track: any) => ({
                ...track,
                displayThumbnail: track.info.uri.includes('youtube.com') 
                    ? `https://img.youtube.com/vi/${track.info.identifier}/hqdefault.jpg`
                    : track.info.artworkUrl || null
            }));
        }

        return res;
    }

    // Handle voice state updates from Discord
    public async handleVoiceUpdate(update: any) {
        if (!['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'].includes(update.t)) return;

        const data = update.d;
        const guildId = data.guild_id;
        if (!guildId) return;

        const player = this.players.get(guildId);
        if (!player) return;

        if (update.t === 'VOICE_SERVER_UPDATE') {
            player.voiceUpdateState.event = data;
        } else {
            if (data.user_id !== this.userId) {
                // Potential player move (if the user is moving someone else or just seeing movement)
                // But typically we only care about our own moves for Lavalink
                return;
            }

            if (player.voiceChannelId && data.channel_id && player.voiceChannelId !== data.channel_id) {
                this.emit('playerMove', player, player.voiceChannelId, data.channel_id);
            }

            player.voiceUpdateState.sessionId = data.session_id;
            
            if (data.channel_id) {
                player.voiceChannelId = data.channel_id;
            } else {
                // Disconnected from voice
                player.voiceChannelId = null;
                player.voiceUpdateState.event = null;
                this.emit('playerDisconnect', player);
            }
        }

        if (player.voiceUpdateState.sessionId && player.voiceUpdateState.event) {
            player.node.send({
                op: 'voiceUpdate',
                guildId: guildId,
                sessionId: player.voiceUpdateState.sessionId,
                event: player.voiceUpdateState.event
            });
            // Clear after sending? Usually Lavalink handles it. 
            // Some libs keep it for reconnection. Let's keep it.
        }
    }
}
