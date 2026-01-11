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
        const player = this.players.get(options.guildId);
        if (player) return player;

        const node = this.getBestNode();
        if (!node) throw new Error("No available nodes.");
        
        const newPlayer = new Player(this, node, options);
        this.players.set(options.guildId, newPlayer);
        return newPlayer;
    }

    public use(plugin: Plugin) {
        this.plugins.push(plugin);
        plugin.load(this);
        return this;
    }

    public destroy() {
        this.nodes.forEach(node => node.disconnect());
        this.players.forEach(player => player.destroy());
        this.nodes.clear();
        this.players.clear();
    }

    public destroyPlayer(guildId: string): boolean {
        const player = this.players.get(guildId);
        if (!player) return false;

        player.destroy();
        this.players.delete(guildId);
        return true;
    }

    public getBestNode(): LavalinkNode | undefined {
        const connectedNodes = Array.from(this.nodes.values()).filter(node => node.connected);
        if (connectedNodes.length === 0) return undefined;

        // Sort by player count (least loaded first)
        return connectedNodes.sort((a, b) => {
            const aPlayers = a.stats.players || 0;
            const bPlayers = b.stats.players || 0;
            return aPlayers - bPlayers;
        })[0];
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
        
        let tracks: any[] = [];
        
        // Handle all possible load types (v3, v4, and LavaSrc)
        const loadType = res.loadType?.toLowerCase() || 'empty';

        if (['search', 'search_result', 'track', 'track_loaded', 'short'].includes(loadType)) {
            tracks = res.data || res.tracks || (res.loadType === 'track' ? [res.data] : []);
        } else if (['playlist', 'playlist_loaded', 'album', 'artist', 'recommendation', 'text'].includes(loadType)) {
            tracks = res.data?.tracks || res.tracks || [];
        }

        res.tracks = tracks.map((track: any) => {
            const normalized = {
                ...track,
                track: track.encoded || track.track,
                info: track.info || {},
                displayThumbnail: track.info?.uri?.includes('youtube.com') 
                    ? `https://img.youtube.com/vi/${track.info.identifier}/hqdefault.jpg`
                    : track.info?.artworkUrl || track.info?.thumbnail || null
            };
            // Ensure track string is at top level for compatibility
            if (!normalized.track && normalized.encoded) normalized.track = normalized.encoded;
            return normalized;
        });

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
            console.log(`[Lavalink] Received VOICE_SERVER_UPDATE for guild ${guildId}`);
            player.voiceUpdateState.event = data;
        } else {
            if (data.user_id !== this.userId) return;
            console.log(`[Lavalink] Received VOICE_STATE_UPDATE for guild ${guildId}`);

            if (player.voiceChannelId && data.channel_id && player.voiceChannelId !== data.channel_id) {
                this.emit('playerMove', player, player.voiceChannelId, data.channel_id);
            }

            player.voiceUpdateState.sessionId = data.session_id;
            
            if (data.channel_id) {
                player.voiceChannelId = data.channel_id;
            } else {
                player.voiceChannelId = null;
                player.voiceUpdateState.event = null;
                this.emit('playerDisconnect', player);
            }
        }

        if (player.voiceUpdateState.sessionId && player.voiceUpdateState.event) {
            console.log(`[Lavalink] Sending voice update to Lavalink for guild ${guildId}`);
            try {
                await player.node.updatePlayer(guildId, {
                    voice: {
                        token: player.voiceUpdateState.event.token,
                        endpoint: player.voiceUpdateState.event.endpoint,
                        sessionId: player.voiceUpdateState.sessionId
                    }
                });
            } catch (error) {
                console.error(`[Lavalink] Failed to send voice update for guild ${guildId}:`, error);
            }
        }
    }
}
