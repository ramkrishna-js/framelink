# FrameLink

<div align="center">

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Lavalink](https://img.shields.io/badge/Lavalink-V4%20%26%20V3-blue?style=for-the-badge)

**A lightweight, robust, and plugin-ready Lavalink client for Node.js.**  
Designed to work seamlessly with Discord.js, Eris, Oceanic, and more.

</div>

## Features

-   🎵 **Universal Support:** Works with Lavalink v3 and v4.
-   🎼 **Multi-Platform:** Built-in support for YouTube, Spotify, Apple Music, Deezer, and SoundCloud (via Lavalink/LavaSrc).
-   🚀 **Performance:** Lightweight architecture with minimal dependencies.
-   🔄 **Queue & Autoplay:** Advanced queue system with smart autoplay fallback.
-   🧩 **Plugin System:** Extend functionality easily with custom plugins.
-   🛡️ **Type-Safe:** Written in TypeScript with full type definitions.

## Installation

```bash
npm install framelink
```

## Quick Start

```typescript
import { LavalinkManager } from 'framelink';
import { Client } from 'discord.js';

const client = new Client({ intents: ['Guilds', 'GuildVoiceStates'] });

const manager = new LavalinkManager({
    nodes: [
        {
            host: 'localhost',
            port: 2333,
            password: 'youshallnotpass',
            secure: false,
            version: 'v4' 
        }
    ],
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    }
});

client.on('ready', () => {
    manager.init(client.user!.id);
    console.log('FrameLink initialized!');
});

client.on('raw', (d) => manager.handleVoiceUpdate(d));

client.login('YOUR_BOT_TOKEN');
```

## Playing Music

```typescript
// Create a player
const player = manager.createPlayer({
    guildId: 'GUILD_ID',
    voiceChannelId: 'VOICE_CHANNEL_ID',
    textChannelId: 'TEXT_CHANNEL_ID',
    selfDeaf: true,
    autoplay: true
});

// Search and play
const res = await manager.search('ytsearch:Never Gonna Give You Up');
player.queue.add(res.tracks[0]);
player.connect(); // Ensure you join the voice channel (implementation specific depending on lib)
player.play();
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
