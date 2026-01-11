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

    public async setFilters(filters: any) {
        this.filters = filters;
        await this.node.updatePlayer(this.guildId, {
            filters
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

    public setVaporwave(value: boolean) {
        if (value) {
            this.setFilters({
                timescale: { speed: 0.85, pitch: 0.8, rate: 1.0 }
            });
        } else {
            this.setFilters({ timescale: { speed: 1.0, pitch: 1.0, rate: 1.0 } });
        }
        return this;
    }

    public setKaraoke(value: boolean) {
        if (value) {
            this.setFilters({
                karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 }
            });
        } else {
            this.setFilters({ karaoke: null });
        }
        return this;
    }

    public setEightD(value: boolean) {
        if (value) {
            this.setFilters({
                rotation: { rotationHz: 0.2 }
            });
        } else {
            this.setFilters({ rotation: null });
        }
        return this;
    }

    public setTremolo(value: boolean) {
        if (value) {
            this.setFilters({
                tremolo: { frequency: 2.0, depth: 0.5 }
            });
        } else {
            this.setFilters({ tremolo: null });
        }
        return this;
    }

    public setVibrato(value: boolean) {
        if (value) {
            this.setFilters({
                vibrato: { frequency: 2.0, depth: 0.5 }
            });
        } else {
            this.setFilters({ vibrato: null });
        }
        return this;
    }

    public async setSpeed(value: number) {
        this.filters.timescale = { ...this.filters.timescale, speed: value };
        await this.setFilters(this.filters);
        return this;
    }

    public async setPitch(value: number) {
        this.filters.timescale = { ...this.filters.timescale, pitch: value };
        await this.setFilters(this.filters);
        return this;
    }

    public async setRate(value: number) {
        this.filters.timescale = { ...this.filters.timescale, rate: value };
        await this.setFilters(this.filters);
        return this;
    }

    public async clearFilters() {
        this.filters = {};
        await this.node.updatePlayer(this.guildId, {
            filters: {}
        });
        return this;
    }

    public get duration() {
        return this.queue.current?.info?.length || 0;
    }

    public get isPaused() {
        return this.paused;
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

        this.queue.current = track;
        const trackString = typeof track === 'string' ? track : track.track;

        try {
            await this.node.updatePlayer(this.guildId, {
                encodedTrack: trackString,
                ...options
            });
            this.isPlaying = true;
        } catch (error) {
            this.isPlaying = false;
            console.error(`[Player] Failed to play track:`, error);
            throw error;
        }
    }

    public skip() {
        this.stop();
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

    public async pause(state: boolean = true) {
        this.paused = state;
        await this.node.updatePlayer(this.guildId, {
            paused: state
        });
        return this;
    }

    public resume() {
        return this.pause(false);
    }

    public async seek(position: number) {
        await this.node.updatePlayer(this.guildId, {
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
        
        // Handle v4 response
        let tracks = [];
        if (this.node.options.version === 'v4') {
            tracks = res.data || [];
        } else {
            tracks = res.tracks || [];
        }

        if (tracks && tracks.length > 0) {
            // Find first track that isn't already in history or queue
            const nextTrack = tracks.find((t: any) => 
                (t.encoded || t.track) !== (previousTrack.encoded || previousTrack.track) && 
                !this.queue.previous.some(p => (p.encoded || p.track) === (t.encoded || t.track)) &&
                !this.queue.tracks.some(q => (q.encoded || q.track) === (t.encoded || t.track))
            ) || tracks[0];

            if (nextTrack) {
                // Normalize track for v4
                if (this.node.options.version === 'v4' && !nextTrack.track) {
                    nextTrack.track = nextTrack.encoded;
                }

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
            volume: this.volume,
            repeatMode: this.repeatMode,
            autoplay: this.autoplay,
            queue: this.queue.toJSON()
        };
    }

    public async stop() {
        this.isPlaying = false;
        await this.node.updatePlayer(this.guildId, {
            encodedTrack: null
        });
    }

    public async setVolume(volume: number) {
        this.volume = volume;
        await this.node.updatePlayer(this.guildId, {
            volume: this.volume
        });
    }

    public update(state: any) {
        this.position = state.position;
        this.timestamp = state.time;
    }

    public async destroy() {
        await this.stop();
        
        if (this.node.options.version === 'v4') {
            if (this.node.sessionId) {
                const protocol = this.node.options.secure ? 'https' : 'http';
                const url = `${protocol}://${this.node.options.host}:${this.node.options.port || 2333}/v4/sessions/${this.node.sessionId}/players/${this.guildId}`;
                await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        Authorization: this.node.options.password || 'youshallnotpass'
                    }
                });
            }
        } else {
            this.node.send({
                op: 'destroy',
                guildId: this.guildId
            });
        }
        
        this.manager.players.delete(this.guildId);
        this.manager.emit('playerDestroy', this);
    }
}
