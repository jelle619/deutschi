// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes, Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token, clientId, guildId, vrchatCooldown, vrchatChannelId } = require('./config.json');
const State = require('./state.js');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMembers] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(token);

// Retrieve commands
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands'); // Grab all the command folders from the commands directory
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const commands = [];

for (const folder of commandFolders) {
	// Grab all the command files from the commands directory
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const rest = new REST().setToken(token); // Construct and prepare an instance of the REST module

(async () => { // and deploy your commands!
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();

// Ping

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
    }
});


// VRChat
const VRCHAT_GAME_ID = '438100'; // VRChat's application ID
const VRCHAT_COOLDOWN = vrchatCooldown; // in milliseconds
const VRCHAT_CHANNEL_ID = vrchatChannelId; // Channel ID for VRChat activity updates

let vrchatLastNotified = new Map(); // mapping that keeps track how long ago it has been since a user played VRChat

if (fs.existsSync('vrchat.json')) { // Check if vrchat.json exists
	const vrchatData = JSON.parse(fs.readFileSync('vrchat.json')); // Load vrchat.json configuration
	State.vrchatOptedInUsers = new Set(vrchatData || []); // Load in users contained in vrchat.json
}

client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
	if (!newPresence || !newPresence.user || !State.vrchatOptedInUsers.has(newPresence.user.id)) return;

	const activities = newPresence.activities || [];
	const isPlayingVRChat = activities.some(act => act.applicationId === VRCHAT_GAME_ID);
	const userId = newPresence.user.id;

	if (isPlayingVRChat) {
		const now = Date.now();
		if (!vrchatLastNotified.has(userId) || now - vrchatLastNotified.get(userId) > VRCHAT_COOLDOWN) {
			vrchatLastNotified.set(userId, now);
			const channel = vrchatChannel ? newPresence.guild.channels.cache.get(VRCHAT_CHANNEL_ID) : newPresence.guild.systemChannel;
			if (channel) {
				channel.send(`${newPresence.user.username} has started playing VRChat!`);
			}
		}
	}
});

setInterval(() => { // Clean up old entries from vrchatLastNotified every hour
	const now = Date.now();
	for (const [userId, lastNotified] of vrchatLastNotified.entries()) {
		if (now - lastNotified > VRCHAT_COOLDOWN) {
			vrchatLastNotified.delete(userId);
		}
	}
}, VRCHAT_COOLDOWN);