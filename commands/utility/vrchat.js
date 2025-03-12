const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const State = require('../../state.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vrchat')
        .setDescription('Manage VRChat notifications')
        .addStringOption(option =>
            option.setName('option')
                .setDescription('Turn notifications on or off')
                .setRequired(true)
                .addChoices(
                    { name: 'On', value: 'on' },
                    { name: 'Off', value: 'off' }
                )),
    async execute(interaction) {
        const option = interaction.options.getString('option');
        const { user } = interaction;

        try {
            if (option === 'on') {
                State.vrchatOptedInUsers.add(user.id);
                fs.writeFileSync('vrchat.json', JSON.stringify([...State.vrchatOptedInUsers]));
                await interaction.reply('You have opted in to VRChat activity tracking.');
            } else if (option === 'off') {
                State.vrchatOptedInUsers.delete(user.id);
                fs.writeFileSync('vrchat.json', JSON.stringify([...State.vrchatOptedInUsers]));
                await interaction.reply('You have opted out of VRChat activity tracking.');
            }
        } catch (error) {
            console.error('Error handling VRChat command:', error);
            await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
        }
    },
};
