import { LavalinkManager } from './LavalinkManager';

export abstract class Plugin {
    public manager: LavalinkManager | null = null;
    public abstract name: string;

    public load(manager: LavalinkManager) {
        this.manager = manager;
    }
    
    public abstract unload(): void;
}
