const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    ContextMenuCommandBuilder,
    ApplicationCommandType
} = require('discord.js');
const express = require('express');
require('dotenv').config({ path: '/etc/secrets/.env' });

// Environment check
console.log('Environment check:');
console.log('BOT_TOKEN exists:', !!process.env.BOT_TOKEN);
console.log('CLIENT_ID exists:', !!process.env.CLIENT_ID);

if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID) {
    console.error('Missing required environment variables!');
    process.exit(1);
}

// Start web server immediately for Render
const app = express();
const PORT = process.env.PORT || 10000;

let botStatus = 'starting';
let botUser = null;

app.get('/', (req, res) => {
    res.send(`Boomhauer Bot is ${botStatus}, mmm-hmm`);
});

app.get('/health', (req, res) => {
    const isHealthy = botStatus === 'online';
    res.status(isHealthy ? 200 : 503).json({ 
        status: botStatus,
        bot: botUser ? botUser.tag : 'Not logged in'
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// Discord client setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL']
});

// Your boomhauerify function
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
    
    output.push(endings[Math.floor(Math.random() * endings.length)]);
    return output.join(" ");
}

// Bot event handlers
client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`✅ Bot is in ${client.guilds.cache.size} servers`);
    botStatus = 'online';
    botUser = client.user;
});

client.on('error', error => {
    console.error('❌ Discord client error:', error);
    botStatus = 'error';
});

client.on('interactionCreate', async interaction => {
    try {
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

        if (interaction.isUserContextMenuCommand() && interaction.commandName === 'Boomify Last Message') {
            await interaction.deferReply();
            
            const targetUser = interaction.targetUser;
            const messages = await interaction.channel.messages.fetch({ limit: 50 });
            const lastMessage = messages.find(m => m.author.id === targetUser.id && !m.author.bot);

            if (!lastMessage) {
                return interaction.editReply({
                    content: `${targetUser} hasn't said anything I can Boomify here, mmm-hmm.`
                });
            }

            const boomed = boomhauerify(lastMessage.content);
            const fullMessage = `${targetUser} ${boomed}`;
            
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
    }
});

// Start Discord bot with timeout handling
async function startDiscordBot() {
    try {
        console.log('🚀 Starting Discord bot...');
        
        // Register commands with timeout
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
        
        console.log('📝 Registering commands...');
        
        // Add timeout to command registration
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Command registration timeout after 30s')), 30000)
        );
        
        try {
            await Promise.race([
                rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }),
                timeoutPromise
            ]);
            console.log('✅ Commands registered!');
        } catch (error) {
            console.error('❌ Command registration failed:', error.message);
            botStatus = 'commands_failed';
            // Continue anyway - commands might already be registered
        }
        
        // Login to Discord
        console.log('🔐 Logging in to Discord...');
        await client.login(process.env.BOT_TOKEN);
        
    } catch (error) {
        console.error('❌ Failed to start Discord bot:', error);
        console.error('Error details:', error.message);
        botStatus = 'failed';
        // Don't exit - keep web server running
    }
}

// Start Discord bot after a short delay to ensure web server is up
setTimeout(() => {
    startDiscordBot();
}, 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down...');
    client.destroy();
    process.exit(0);
});