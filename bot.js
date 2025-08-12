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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL']
});

// Your boomhauerify function here...
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
});

client.on('error', error => {
    console.error('❌ Discord client error:', error);
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

// Start everything
async function startBot() {
    try {
        console.log('🚀 Starting bot...');
        
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
        
        console.log('📝 Registering commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('✅ Commands registered!');
        
        // Login to Discord
        console.log('🔐 Logging in to Discord...');
        await client.login(process.env.BOT_TOKEN);
        
        // Start web server AFTER successful login
        const app = express();
        const PORT = process.env.PORT || 10000;

        app.get('/', (req, res) => {
            res.send(`Boomhauer Bot is ${client.user ? 'online' : 'offline'}, mmm-hmm`);
        });

        app.get('/health', (req, res) => {
            const status = client.user ? 'healthy' : 'unhealthy';
            res.status(client.user ? 200 : 503).json({ 
                status,
                bot: client.user ? client.user.tag : 'Not logged in'
            });
        });

        app.listen(PORT, () => {
            console.log(`🌐 Web server running on port ${PORT}`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        // Exit so Render will restart
        process.exit(1);
    }
}

// Start the bot
startBot();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down...');
    client.destroy();
    process.exit(0);
});