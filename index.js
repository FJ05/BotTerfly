const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token, clientId } = require('./config.json');
const { prompt } = require('./prompt.json')
// Create a new client instance
const client = new Client({
    intents: [
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
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
// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

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
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

// array of strings that i don't want in my output
var badWords = ["<start>", "<end>", "undefined", "[end of text]", "you respond with:", "says:", "bot says:", "\""];
var activce = false;
// bot replies to messages if it is mentioned
client.on("messageCreate", (message) => {
    if (message.author.bot) return false;
    // if the message contains the bot's client ID, reply with a mention
    if (message.content.includes(clientId)) {
        var content = message.content;

        // remove the bot's client ID from the message
        if (content.includes("<@1094580903457603714>")) {
            content = content.replace("<@1094580903457603714>","");
        }
        // content will be used as a prompt for the chatbot
        if (!activce) {
            activce = true;
            const Dalai = require('dalai')
            try {
                var responce;
                new Dalai().request({
                    model: "alpaca.7B",
                    n_predict: 128,
                    threads: -2,
                    prompt: prompt + "\n" + message.author.username + " says: " + content + "\nbot says: ",
                    }, (token) => {
                        responce += token;
                        process.stdout.write(token)
                            if (responce.includes("<end>")) {
                                responce = responce.replace(prompt, "");
                                responce = responce.replace(message.author.username, "");
                                responce = responce.replace(content, "");
                                // remove bad words from the output
                                for (var i = 0; i < badWords.length; i++) {
                                    responce = responce.replace(badWords[i], "");
                                }
                                message.reply(responce);
                                activce = false;
                            }
                    })
            } catch (error) {
                console.error(error);
            }  
        }
        
    }
});
// Log in to Discord with your client's token
client.login(token);