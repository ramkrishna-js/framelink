<div align="center">

<img src="https://capsule-render.vercel.app/render?type=waving&color=auto&height=250&section=header&text=FrameLink&fontSize=90&animation=fadeIn&fontAlignY=38" />

**🚀 A lightweight, robust, and plugin-ready Lavalink client (v3 & v4) for Node.js.**

[![npm version](https://img.shields.io/npm/v/@ramkrishna-js/framelink.svg?style=flat-square)](https://www.npmjs.com/package/@ramkrishna-js/framelink)
[![npm downloads](https://img.shields.io/npm/dm/@ramkrishna-js/framelink.svg?style=flat-square)](https://www.npmjs.com/package/@ramkrishna-js/framelink)
[![license](https://img.shields.io/github/license/ramkrishna-js/framelink.svg?style=flat-square)](https://github.com/ramkrishna-js/framelink/blob/master/LICENSE)
[![stars](https://img.shields.io/github/stars/ramkrishna-js/framelink.svg?style=flat-square)](https://github.com/ramkrishna-js/framelink/stargazers)

---

[📄 Documentation](https://github.com/ramkrishna-js/framelink#readme) | [💬 Discord Support](https://discord.gg/your-invite-link) | [📦 NPM](https://www.npmjs.com/package/@ramkrishna-js/framelink)

</div>

<hr />

## ✨ Features
- 🎵 **Universal Support:** Seamlessly works with Lavalink v3 and v4.
- 🎼 **Multi-Platform:** Built-in support for YouTube, Spotify, Apple Music, Deezer, and more.
- 🚀 **Performance:** Optimized for speed with minimal memory footprint.
- 🔄 **Smart Queue:** Advanced queue system with automated autoplay logic.
- 🧩 **Extensible:** Robust plugin system to customize your experience.
- 🛡️ **Type-Safe:** Written entirely in TypeScript for a superior DX.

<hr />

## 📦 Installation

```bash
npm install @ramkrishna-js/framelink
```

<hr />

## ╰┈1️⃣ Quick Start

### Initializing the Manager

```typescript
import { LavalinkManager } from '@ramkrishna-js/framelink';

const manager = new LavalinkManager({
    nodes: [
        {
            host: 'localhost',
            port: 2333,
            password: 'youshallnotpass',
            version: 'v4' // or 'v3'
        }
    ],
    send: (guildId, payload) => {
        // Your library's send logic (Discord.js, Eris, etc.)
    }
});

manager.init('YOUR_BOT_ID');
```

### Creating a Player & Playing

```typescript
const player = manager.createPlayer({
    guildId: 'GUILD_ID',
    voiceChannelId: 'VOICE_CHANNEL_ID',
    textChannelId: 'TEXT_CHANNEL_ID',
    autoplay: true
});

// Search for a track
const res = await manager.search('Never Gonna Give You Up', 'yt');

// Add to queue and play
player.queue.add(res.tracks[0]);
player.play();
```

<hr />

## ╰┈2️⃣ Event Handling

```typescript
manager.on('nodeConnect', (node) => {
    console.log(`Node ${node.options.host} connected!`);
});

manager.on('trackStart', (player, track) => {
    console.log(`Now playing: ${track.info.title}`);
});

manager.on('queueEnd', (player) => {
    console.log(`Queue ended for guild ${player.guildId}`);
});
```

<hr />

## ╰┈3️⃣ Supported Platforms

FrameLink supports any platform compatible with Lavalink and its plugins (like LavaSrc):
- YouTube / YouTube Music
- Spotify
- Apple Music
- Deezer
- SoundCloud
- Twitch
- HTTP Links

<hr />

## 🧩 Plugins

FrameLink is built with extensibility in mind. You can easily create and load plugins to extend the manager's functionality.

```typescript
import { Plugin } from '@ramkrishna-js/framelink';

class MyCustomPlugin extends Plugin {
    name = 'MyPlugin';
    load(manager) {
        super.load(manager);
        console.log('Plugin loaded!');
    }
    unload() {}
}

const manager = new LavalinkManager({
    // ... other options
    plugins: [new MyCustomPlugin()]
});
```

<hr />

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

<hr />

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

<hr />

<div align="center">

Built with ❤️ by [Ramkrishna](https://github.com/ramkrishna-js)

</div>