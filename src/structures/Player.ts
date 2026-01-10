import { LavalinkNode } from './LavalinkNode';
import { LavalinkManager } from './LavalinkManager';
import { Queue } from './Queue';

export interface PlayerOptions {
    guildId: string;
    textChannelId?: string;
    voiceChannelId?: string;
    selfDeaf?: boolean;
    selfMute?: boolean;
    autoplay?: boolean;
}

export class Player {
    public manager: LavalinkManager;
    public node: LavalinkNode;
    public guildId: string;
    public voiceChannelId: string | null = null;
    public textChannelId: string | null = null;
    public position: number = 0;
    public paused: boolean = false;
    public isPlaying: boolean = false;
    public timestamp: number = 0;
    public voiceUpdateState: { sessionId?: string; event?: any } = {};
    public queue: Queue;
    public autoplay: boolean = false;
    
    constructor(manager: LavalinkManager, node: LavalinkNode, options: PlayerOptions) {
        this.manager = manager;
        this.node = node;
        this.guildId = options.guildId;
        this.voiceChannelId = options.voiceChannelId || null;
        this.textChannelId = options.textChannelId || null;
        this.autoplay = options.autoplay || false;
        this.queue = new Queue(this);
    }

    public async play(track?: string | any, options: any = {}) {
        if (!track && !this.queue.current && this.queue.tracks.length > 0) {
            const next = this.queue.next();
            if (next) {
                track = next.track; // Assuming object has .track
            }
        }

        if (!track) {
             if (this.autoplay) {
                 return this.triggerAutoplay();
             }
             return;
        }

        this.isPlaying = true;
        
        // Handle if track is an object (Lavalink track object) or string
        const trackString = typeof track === 'string' ? track : track.track;

        this.node.send({
            op: 'play',
            guildId: this.guildId,
            track: trackString,
            ...options
        });
    }

    public async triggerAutoplay() {
        const previousTrack = this.queue.previous[this.queue.previous.length - 1];
        if (!previousTrack) return; // Cannot autoplay without seed

        // Use previous track URI or ID for recommendation
        // Simple implementation: Search for related tracks or a mix
        // Ideally, this uses a specific source feature like "spotify:seed_tracks" or similar via a plugin
        // For general usage:
        
        const source = previousTrack.info?.sourceName;
        let identifier = '';

        if (source === 'spotify' || source === 'applemusic' || source === 'deezer') {
             // If using Lavasrc, we might get recommendations. 
             // Common pattern: `sprec:${trackId}` or similar if plugin supports it.
             // Fallback to "related" search on YouTube if all else fails?
             identifier = `ytsearch:${previousTrack.info.author} - ${previousTrack.info.title}`;
        } else {
             identifier = `ytmsearch:${previousTrack.info.author} - ${previousTrack.info.title}`;
        }
        
        const res = await this.node.loadTracks(identifier);
        if (res && res.tracks && res.tracks.length > 0) {
            // Filter out current track?
            const nextTrack = res.tracks[0].track === previousTrack.track ? res.tracks[1] : res.tracks[0];
            if (nextTrack) {
                this.queue.add(nextTrack);
                this.play();
            }
        }
    }

    public stop() {
        this.isPlaying = false;
        this.node.send({
            op: 'stop',
            guildId: this.guildId
        });
    }

    public setVolume(volume: number) {
        this.node.send({
            op: 'volume',
            guildId: this.guildId,
            volume: volume
        });
    }

    public update(state: any) {
        this.position = state.position;
        this.timestamp = state.time;
    }

    public destroy() {
        this.stop();
        this.node.send({
            op: 'destroy',
            guildId: this.guildId
        });
        this.manager.emit('playerDestroy', this);
    }
}
