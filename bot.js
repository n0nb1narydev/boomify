const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    InteractionContextType
} = require('discord.js');
const express = require('express');
require('dotenv').config();

// Keep-alive server
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Boomhauer Bot is running, mmm-hmm');
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`Keep-alive server running on port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL']
});

function boomhauerify(text) {
    const fillers = [
        "man I tell ya what",
        "dang ol'",
        "talkin' 'bout",
        "man",
        "yo",
        "I tell you what",
        "know what I'm sayin'",
        "got-dang",
        "ol'",
        "tell you what man",
        "dang",
        "talkin' 'bout that",
        "you know",
        "I mean",
        "talkin' 'bout dang ol'",
        "know'm sayin'",
        "tell ya",
    ];

    const endings = [", man", "mmm-hmm"];

    const words = text.split(" ");
    let output = [];
    for (let word of words) {
        output.push(word);
        if (Math.random() < 0.25) {
            output.push(fillers[Math.floor(Math.random() * fillers.length)]);
        }
    }
    
    // Randomly pick an ending
    output.push(endings[Math.floor(Math.random() * endings.length)]);
    
    return output.join(" ");
}

// Register BOTH context menu commands
const commands = [
    new ContextMenuCommandBuilder()
        .setName('Boomify')
        .setType(ApplicationCommandType.Message)
        .setContexts([0, 1, 2]),

    new ContextMenuCommandBuilder()
        .setName('Boomify Last Message')
        .setType(ApplicationCommandType.User)
        .setContexts([0, 1, 2])
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log('Registering context menu commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID), // Global
            { body: commands }
        );
        console.log('Context menu commands registered.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    // Message context menu
    if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Boomify') {
        const message = interaction.targetMessage;
        const originalText = message.content;

        if (!originalText || originalText.trim().length === 0) {
            return interaction.reply({
                content: "That message doesn't have any text to Boomify, mmm-hmm.",
                ephemeral: true
            });
        }

        const boomed = boomhauerify(originalText);
        const fullMessage = `${message.author} ${boomed}`;
        
        // Check if message is too long (Discord limit is 2000 characters)
        if (fullMessage.length > 2000) {
            return interaction.reply({
                content: "Man I tell ya what, that dang ol' message too long, talkin' 'bout War and Peace or somethin', can't handle all them words, mmm-hmm.",
                ephemeral: true
            });
        }

        return interaction.reply({
            content: fullMessage,
            allowedMentions: { users: [message.author.id] }
        });
    }

    // User context menu
    if (interaction.isUserContextMenuCommand() && interaction.commandName === 'Boomify Last Message') {
        const targetUser = interaction.targetUser;

        // Fetch recent messages in the DM or guild channel
        const messages = await interaction.channel.messages.fetch({ limit: 50 });
        const lastMessage = messages.find(m => m.author.id === targetUser.id && !m.author.bot);

        if (!lastMessage) {
            return interaction.reply({
                content: `${targetUser} hasn't said anything I can Boomify here, mmm-hmm.`,
                ephemeral: true
            });
        }

        const boomed = boomhauerify(lastMessage.content);
        const fullMessage = `${targetUser} ${boomed}`;
        
        // Check if message is too long
        if (fullMessage.length > 2000) {
            return interaction.reply({
                content: "Man I tell ya what, that dang ol' message too long, talkin' 'bout War and Peace or somethin', can't handle all them words, mmm-hmm.",
                ephemeral: true
            });
        }

        return interaction.reply({
            content: fullMessage,
            allowedMentions: { users: [targetUser.id] }
        });
    }
});

client.login(process.env.BOT_TOKEN);
