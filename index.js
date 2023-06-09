const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, ConnectionVisibility} = require('discord.js');
const { token, clientId } = require('./config.json');
const { prompt } = require('./prompt.json')
const http = require('http');
const Jimp = require('jimp');
const base64 = require('base64-js');
// Global variables used as states
var thinking = false;
// Networking settings
var oobServer = "127.0.0.1"
var oobPort = 5000;
var staDiffServer = "127.0.0.1"
var staDiffPort = 7861;

//
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
// bot replies to messages if it is mentioned
client.on("messageCreate", async (message) => {
    if (message.author.bot) return false;
    // if the message contains the bot's client ID, reply with a mention
    if (message.content.includes(clientId) && !thinking) {
		thinking = true;
		while (thinking){
			message.channel.sendTyping();
			var input = message.content;
			if (input.includes("restartMEMO")){
				// delete './ChatLogs/' + message.channelId + '.json'
				fs.unlink('./ChatLogs/' + message.channelId + '.json', (err) => {
					if (err) {
						console.error(err)
						return
					}
				});
				message.reply("Chat log deleted. :P");
			}
			else if (input.includes("take a selfie") || input.includes("send a selfie")){
				var inputRemoval = ["selfie", "<@"+ clientId + ">", "take a", " of ", "picture", "photo", "pic", "send a"];
				inputRemoval.forEach(element => {
					input = input.replace(element, "");
				});
				input = input.toLowerCase();
				switch(true){
					case input.includes("you holding"):
						input = input.replace("you holding", ", she's holding");
						break;
					case input.includes("you with"):
						input = input.replace("you with a", ", she's has");
						break;
					case input.includes("you and"):
						input = input.replace("you with", ", she's with");
						break;
					case input.includes("you as a"):
						input = input.replace("you as a", ", she's as a");
						break;
					case input.includes("you as an"):
						input = input.replace("you as an", ", she's as an");
						break;
					case input.includes("you"):
						input = input.replace("you", ", she's");
						break;
				}
				// send request to staDiff server
				console.log("sending to staDiff server: " + input);
				imageOutput = await staDiffRequest(input, true);
				// wait for 1 second
				await new Promise(r => setTimeout(r, 1000));
				message.channel.send({files: ["image.png"]});
			}
			else{
				var custom_stopping_strings = ["\n"," " + message.author.username + " says:", " BotTerfly says:" , message.author.username + " says", " BotTerfly says"];
				var bad_words = [message.author.username + " says", "BotTerfly says"];
				input = input.replace("<@"+ clientId + ">", "");
				console.log("sending to oob server: " + input);
				var oobPrompt;
				if (fs.existsSync('./ChatLogs/' + message.channelId + '.json')){
					oobPrompt = require('./ChatLogs/' + message.channelId + '.json');
					// make oob into string
					oobPrompt = JSON.stringify(oobPrompt);
				}
				else{
					oobPrompt = prompt + "\n" + message.author.username + " says:" + input + " BotTerfly says:"
				}
				var response = await oobRequest(oobPrompt, custom_stopping_strings, bad_words, message.channelId);
				console.log("response: " + response);
				if (response != ""){
					message.reply(response);
					thinking = false;
				}
				else {
					fs.unlink('./ChatLogs/' + message.channelId + '.json', (err) => {
						if (err) {
							console.error(err)
							return
						}
					});
				}
			}
		}
		
	}
});


function oobRequest(inputPrompt, custom_stopping_strings, bad_words, ChannelID) {
	// set up a promise to return the response
	return new Promise(function (resolve) {
		const data = JSON.stringify({
			'prompt': inputPrompt,
			'max_new_tokens': 120,
			'do_sample': true,
			'temperature': 0.72,
			'top_p': 0.73,
			'typical_p': 1,
			'repetition_penalty': 1.1,
			'encoder_repetition_penalty': 1.0,
			'top_k': 0,
			'min_length': 2,
			'no_repeat_ngram_size': 0,
			'num_beams': 1,
			'penalty_alpha': 0,
			'length_penalty': 1,
			'early_stopping': true,
			'seed': -1,
			'add_bos_token': true,
			'truncation_length': 2048,
			'ban_eos_token': false,
			'skip_special_tokens': true,
			'stopping_strings': custom_stopping_strings,
		});
		  
		const options = {
			hostname: oobServer,
			port: oobPort,
			path: '/api/v1/generate',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': data.length
			}
		};
		const req = http.request(options, (res) => {
			let responseData = '';
		
			res.on('data', (chunk) => {
			responseData += chunk;
			});
		
			res.on('end', () => {
				if (responseData.trim() !== '') {
					var response = JSON.parse(responseData);
					var msg = response.results[0].text;
					custom_stopping_strings.forEach(element => {
						msg = msg.replace(element, "");
					});

					// this part of the code will save the chat logs to a json file
					// checks if there is a json file in ./ChatLogs/ that matches the server ID
					if (ServerID =! null){
						var chatLogs = inputPrompt + msg;

						if (fs.existsSync('./ChatLogs/' + ChannelID + '.json')) {
							
							// Adds logs to the json file
							var chatLogsJSON = require('./ChatLogs/' + ChannelID + '.json');
							chatLogsJSON = chatLogsJSON + chatLogs;
							fs.writeFileSync('./ChatLogs/' + ChannelID + '.json', JSON.stringify(chatLogsJSON));
						}
						else {
							// creates a new json file if there isn't one
						    fs.writeFileSync('./ChatLogs/' + ChannelID + '.json', JSON.stringify(chatLogs));
						}
					}

					bad_words.forEach(element => {
						msg = msg.replace(element, "");
					});
					console.log(msg);
					resolve(msg);
				} else {
					resolve("Error: Empty response");
				}
			});
		});
		  
		req.on('error', (error) => {
			console.error('Error:', error);
			resolve("Error")
		});
		
		req.write(data);
		req.end();
	});
}
// function to send a request to the Stabile diffusion server
function staDiffRequest(inputPrompt, characterSettings){
	const { characterSettingsPrompt } = require('./prompt.json');
	const { negativePrompts } = require('./prompt.json');
	if (characterSettings != true){
		characterSettingsPrompt = "";
	}
	return new Promise(function (resolve) {
		const data = JSON.stringify({
			'prompt': characterSettingsPrompt + inputPrompt,
			"steps": 50,
			"height": 688,
			"negative_prompt": negativePrompts, // helps filter unwanted images
			"sampler_name": "DDIM",

		});		  
		const options = {
			hostname: staDiffServer,
			port: staDiffPort,
			path: '/sdapi/v1/txt2img',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': data.length
			}
		};
		const req = http.request(options, (res) => {
			let responseData = '';
		
			res.on('data', (chunk) => {
				responseData += chunk;
			});
		
			res.on('end', async () => {
				if (responseData.trim() !== '') {
					// transform the response into a JSON object
					var response = JSON.parse(responseData);
					// translate the raw data to a png image
					const imageData = base64.toByteArray(response.images[0]);
					const image = await Jimp.read(imageData.buffer);
					// save the image to a file
					image.write("image.png");
					// return the image
					resolve("done");
				} else {
					resolve("Error: Empty response");
				}
			});
		});
		  
		req.on('error', (error) => {
			console.error('Error:', error);
			resolve("Error")
		});
		
		req.write(data);
		req.end();
	});

}
// Log in to Discord with your client's token
client.login(token);