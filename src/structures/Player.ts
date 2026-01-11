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

export type RepeatMode = 'off' | 'track' | 'queue';

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
    public volume: number = 100;
    public voiceUpdateState: { sessionId?: string; event?: any } = {};
    public queue: Queue;
    public autoplay: boolean = false;
    public repeatMode: RepeatMode = 'off';
    public filters: any = {};
    
    constructor(manager: LavalinkManager, node: LavalinkNode, options: PlayerOptions) {
        this.manager = manager;
        this.node = node;
        this.guildId = options.guildId;
        this.voiceChannelId = options.voiceChannelId || null;
        this.textChannelId = options.textChannelId || null;
        this.autoplay = options.autoplay || false;
        this.queue = new Queue(this);
    }

    public setRepeatMode(mode: RepeatMode) {
        this.repeatMode = mode;
        return this;
    }

    public setFilters(filters: any) {
        this.filters = filters;
        this.node.send({
            op: 'filters',
            guildId: this.guildId,
            ...filters
        });
        return this;
    }

    public setBassboost(value: boolean) {
        if (value) {
            this.setFilters({
                equalizer: [
                    { band: 0, gain: 0.25 },
                    { band: 1, gain: 0.25 },
                    { band: 2, gain: 0.25 },
                    { band: 3, gain: 0.25 }
                ]
            });
        } else {
            this.setFilters({ equalizer: [] });
        }
        return this;
    }

    public setNightcore(value: boolean) {
        if (value) {
            this.setFilters({
                timescale: { speed: 1.1, pitch: 1.1, rate: 1.0 }
            });
        } else {
            this.setFilters({ timescale: { speed: 1.0, pitch: 1.0, rate: 1.0 } });
        }
        return this;
    }

    public async play(track?: string | any, options: any = {}) {
        if (!track && !this.queue.current && this.queue.tracks.length > 0) {
            const next = this.queue.next();
            if (next) {
                track = next;
            }
        }

        if (!track && this.queue.current) {
            track = this.queue.current;
        }

        if (!track) {
             if (this.autoplay) {
                 return this.triggerAutoplay();
             }
             return;
        }

        this.isPlaying = true;
        this.queue.current = track;
        
        const trackString = typeof track === 'string' ? track : track.track;

        this.node.send({
            op: 'play',
            guildId: this.guildId,
            track: trackString,
            ...options
        });
    }

    public skip() {
        this.node.send({
            op: 'stop',
            guildId: this.guildId
        });
        return this;
    }

    public previous() {
        if (this.queue.previous.length === 0) return this;
        const prev = this.queue.previous.pop();
        if (this.queue.current) this.queue.tracks.unshift(this.queue.current);
        this.queue.current = prev;
        this.play(prev);
        return this;
    }

    public pause(state: boolean = true) {
        this.paused = state;
        this.node.send({
            op: 'pause',
            guildId: this.guildId,
            pause: state
        });
        return this;
    }

    public resume() {
        return this.pause(false);
    }

    public seek(position: number) {
        this.node.send({
            op: 'seek',
            guildId: this.guildId,
            position
        });
        return this;
    }

    public async triggerAutoplay() {
        const previousTrack = this.queue.previous[this.queue.previous.length - 1] || this.queue.current;
        if (!previousTrack) return;

        const source = previousTrack.info?.sourceName;
        let identifier = '';

        if (source === 'youtube' || source === 'youtube music') {
            identifier = `https://www.youtube.com/watch?v=${previousTrack.info.identifier}&list=RD${previousTrack.info.identifier}`;
        } else {
            identifier = `ytmsearch:${previousTrack.info.author} - ${previousTrack.info.title}`;
        }
        
        const res = await this.node.loadTracks(identifier);
        if (res && res.tracks && res.tracks.length > 0) {
            // Find first track that isn't already in history or queue
            const nextTrack = res.tracks.find((t: any) => 
                t.track !== previousTrack.track && 
                !this.queue.previous.some(p => p.track === t.track) &&
                !this.queue.tracks.some(q => q.track === t.track)
            ) || res.tracks[0];

            if (nextTrack) {
                this.queue.add(nextTrack);
                if (!this.isPlaying) this.play();
                this.manager.emit('autoplay', this, nextTrack);
            }
        }
    }

    public connect(options: { voiceChannelId: string; textChannelId?: string; selfDeaf?: boolean; selfMute?: boolean }) {
        this.voiceChannelId = options.voiceChannelId;
        this.textChannelId = options.textChannelId || this.textChannelId;
        
        this.manager.options.send(this.guildId, {
            op: 4,
            d: {
                guild_id: this.guildId,
                channel_id: this.voiceChannelId,
                self_mute: options.selfMute ?? false,
                self_deaf: options.selfDeaf ?? true
            }
        });
        return this;
    }

    public disconnect() {
        this.voiceChannelId = null;
        this.manager.options.send(this.guildId, {
            op: 4,
            d: {
                guild_id: this.guildId,
                channel_id: null,
                self_mute: false,
                self_deaf: false
            }
        });
        return this;
    }

    public toJSON() {
        return {
            guildId: this.guildId,
            voiceChannelId: this.voiceChannelId,
            textChannelId: this.textChannelId,
            paused: this.paused,
            isPlaying: this.isPlaying,
            volume: 100, // Should probably track volume in player too
            repeatMode: this.repeatMode,
            autoplay: this.autoplay,
            queue: this.queue.toJSON()
        };
    }

    public stop() {
        this.isPlaying = false;
        this.node.send({
            op: 'stop',
            guildId: this.guildId
        });
    }

    public setVolume(volume: number) {
        this.volume = volume;
        this.node.send({
            op: 'volume',
            guildId: this.guildId,
            volume: this.volume
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
