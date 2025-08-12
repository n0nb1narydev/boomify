const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    ContextMenuCommandBuilder,
    ApplicationCommandType
} = require('discord.js');
const express = require('express');
require('dotenv').config();

// Keep-alive server
const app = express();
const PORT = process.env.PORT || 10000;

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

    const endings = ["man", "mmm-hmm"];

    const words = text.split(" ");
    let output = [];
    for (let word of words) {
        output.push(word);
        if (Math.random() < 0.25) {
            output.push(fillers[Math.floor(Math.random() * fillers.length)]);
        }
    }
    
    output.push(endings[Math.floor(Math.random() * endings.length)]);
    return output.join(" ");
}

// Register commands
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

// Register commands and login
(async () => {
    try {
        console.log('Registering context menu commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Context menu commands registered successfully.');
        
        // Login to Discord
        console.log('Logging in to Discord...');
        await client.login(process.env.BOT_TOKEN);
        console.log('Successfully logged in to Discord!');
        
    } catch (error) {
        console.error('Error during startup:', error);
        process.exit(1);
    }
})();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Bot is in ${client.guilds.cache.size} servers`);
});

client.on('error', error => {
    console.error('Discord client error:', error);
});

client.on('interactionCreate', async interaction => {
    try {
        // Message context menu
        if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Boomify') {
            await interaction.deferReply();
            
            const message = interaction.targetMessage;
            const originalText = message.content;

            if (!originalText || originalText.trim().length === 0) {
                return interaction.editReply({
                    content: "That message doesn't have any text to Boomify, mmm-hmm."
                });
            }

            const boomed = boomhauerify(originalText);
            const fullMessage = `${message.author} ${boomed}`;
            
            if (fullMessage.length > 2000) {
                return interaction.editReply({
                    content: "Man I tell ya what, that dang ol' message too long, talkin' 'bout War and Peace or somethin', can't handle all them words, mmm-hmm."
                });
            }

            return interaction.editReply({
                content: fullMessage,
                allowedMentions: { users: [message.author.id] }
            });
        }

        // User context menu
        if (interaction.isUserContextMenuCommand() && interaction.commandName === 'Boomify Last Message') {
            await interaction.deferReply();
            
            const targetUser = interaction.targetUser;

            const messages = await interaction.channel.messages.fetch({ limit: 50 });
            const lastMessage = messages.find(m => m.author.id === targetUser.id && !m.author.bot);

            if (!lastMessage) {
                return interaction.editReply({
                    content: `${targetUser} hasn't said anything I can Boomify here, mmm-hmm.`,
                    ephemeral: true
                });
            }

            const boomed = boomhauerify(lastMessage.content);
            const fullMessage = `${boomed}`;
            
            if (fullMessage.length > 2000) {
                return interaction.editReply({
                    content: "Man I tell ya what, that dang ol' message too long, talkin' 'bout War and Peace or somethin', can't handle all them words, mmm-hmm."
                });
            }

            return interaction.editReply({
                content: fullMessage,
                allowedMentions: { users: [targetUser.id] }
            });
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'Man I tell ya what, somethin\' went wrong there, mmm-hmm.', 
                ephemeral: true 
            });
        }
    }
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});