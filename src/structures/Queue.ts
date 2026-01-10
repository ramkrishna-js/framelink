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
}
