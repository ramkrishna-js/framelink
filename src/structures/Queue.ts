import { Player } from './Player';

export class Queue {
    public readonly player: Player;
    public tracks: any[] = [];
    public previous: any[] = [];
    public current: any | null = null;

    constructor(player: Player) {
        this.player = player;
    }

    public add(track: any | any[]) {
        if (Array.isArray(track)) {
            this.tracks.push(...track);
        } else {
            this.tracks.push(track);
        }
    }

    public next(): any | null {
        if (this.current) {
            this.previous.push(this.current);
        }
        
        const nextTrack = this.tracks.shift();
        this.current = nextTrack || null;
        return this.current;
    }

    public remove(index: number) {
        if (index < 0 || index >= this.tracks.length) return null;
        return this.tracks.splice(index, 1)[0];
    }

    public move(from: number, to: number) {
        if (from < 0 || from >= this.tracks.length || to < 0 || to >= this.tracks.length) return;
        const [track] = this.tracks.splice(from, 1);
        this.tracks.splice(to, 0, track);
    }

    public skipTo(index: number) {
        if (index < 0 || index >= this.tracks.length) return null;
        const skipped = this.tracks.splice(0, index);
        if (this.current) this.previous.push(this.current);
        this.previous.push(...skipped);
        this.current = this.tracks.shift() || null;
        return this.current;
    }

    public clear() {
        this.tracks = [];
        this.previous = [];
        this.current = null;
    }

    public shuffle() {
        for (let i = this.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }
    }

    public get size() {
        return this.tracks.length;
    }

    public get totalSize() {
        return this.tracks.length + (this.current ? 1 : 0);
    }

    public get duration() {
        return this.tracks.reduce((acc, track) => acc + (track.info?.length || 0), 0) + (this.current?.info?.length || 0);
    }

    public removeDuplicates() {
        this.tracks = this.tracks.filter((track, index, self) =>
            index === self.findIndex((t) => t.track === track.track)
        );
    }

    public toJSON() {
        return {
            current: this.current,
            tracks: this.tracks,
            previous: this.previous
        };
    }
}
