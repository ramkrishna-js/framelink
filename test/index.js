"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const manager = new index_1.LavalinkManager({
    nodes: [
        {
            host: 'localhost',
            port: 2333,
            password: 'youshallnotpass'
        }
    ],
    send: (guildId, payload) => {
        console.log(`Sending to guild ${guildId}:`, payload);
    }
});
manager.init('123456789012345678');
console.log('Manager initialized.');
try {
    const node = manager.nodes.get('localhost');
    if (node) {
        console.log('Node found:', node.options.host);
        // node.connect(); // Don't connect as there is no server
    }
    else {
        console.error('Node not found!');
    }
}
catch (e) {
    console.error(e);
}
//# sourceMappingURL=index.js.map