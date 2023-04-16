const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token, clientId } = require('./config.json');
const { prompt } = require('./prompt.json')
const axios = require('axios');
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

// Networking settings¨
var oobServer = "127.0.0.1"
var oobPort = 7860;


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
// bot replies to messages if it is mentioned
var thinking = false;
client.on("messageCreate", async (message) => {
    if (message.author.bot) return false;
    // if the message contains the bot's client ID, reply with a mention
    if (message.content.includes(clientId) && !thinking) {
		thinking = true;
		var custom_stopping_strings = ["\n", message.author.username + " says: ", "BotTerfly says: "]
		var input = message.content
		input = input.replace("<@"+ clientId + ">", "");
		var response = await oobRequest(prompt + "\n" + message.author.username + " says: " + input + "\nBotTerfly says: ", custom_stopping_strings);
		message.reply(response);
		thinking = false;
	}
});

function oobRequest(inputPrompt, custom_stopping_strings) {
	// set up a promise to return the response
	return new Promise(function (resolve) {
		// settings for the request
		var url = "http://" + oobServer + ":" + oobPort + "/run/textgen";
		const params = {
			'max_new_tokens': 120,
			'do_sample': true,
			'temperature': 0.72,
			'top_p': 0.73,
			'typical_p': 1,
			'repetition_penalty': 1.1,
			'encoder_repetition_penalty': 1.0,
			'top_k': 0,
			'min_length': 0,
			'no_repeat_ngram_size': 0,
			'num_beams': 1,
			'penalty_alpha': 0,
			'length_penalty': 1,
			'early_stopping': true,
			'seed': -1,
			'add_bos_token': true,
			'custom_stopping_strings': [custom_stopping_strings],
		};

		console.log("Input prompt: " + inputPrompt);
		const payload = JSON.stringify([inputPrompt, params]);
		const requestData = { data: [payload] };

		// sends out the request and returns the response
		axios.post(url, requestData)
			.then(response => {
				// Handle the response
				var botResponse = response.data.data[0];
				// remove the prompt from the response
				botResponse = botResponse.replace(inputPrompt, "");
				resolve(botResponse);
			})
			.catch(error => {
				// Handle errors
				console.error('Error:', error);
				resolve("Error");
			});
	});
}
// Log in to Discord with your client's token
client.login(token);