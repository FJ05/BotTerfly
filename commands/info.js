const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('Sends info about the bot'),
	async execute(interaction) {
		await interaction.reply('This is a certified hood classic bot.');
	},
};