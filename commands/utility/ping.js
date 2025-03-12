const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Shows the bot latency'),
    async execute(interaction) {
        // First, send a temporary response
        const response = await interaction.reply({ content: 'Waking up the dragon...', withResponse: true });
        
        // Calculate round-trip latency
        const roundtripLatency = response.resource.message.createdTimestamp - interaction.createdTimestamp;
        
        // Get WebSocket ping
        const websocketPing = interaction.client.ws.ping;
        
        // Edit the reply with both latencies
        await interaction.editReply(`🏓 Pong!\n📶 Roundtrip latency: ${roundtripLatency} ms\n💓 WebSocket heartbeat: ${websocketPing || "Unavailable"} ms`);
    },
};
