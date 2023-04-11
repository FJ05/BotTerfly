const { SlashCommandBuilder, EmbedBuilder, Embed} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('Sends info about the bot'),
	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setTitle('Info')
			.setDescription('This bot was created by @FJ05#0100\n\nThis bot is still in development, so expect bugs and glitches.\nThis bot is running on Node.js, Discord.js and oobabooga/text-generation-webui\n\nThis bot is open source, so you can contribute to it on GitHub: https://github.com/FJ05/BotTerfly')
			.setColor("#FFA500")
		await interaction.reply({ embeds: [embed] });
	},
};