const { SlashCommandBuilder, EmbedBuilder, Embed} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('goals')
		.setDescription('Sends info about the development goals of the bot'),
	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setTitle('Info')
			.setDescription('This bot was created by @FJ05#0100\nDevelopment goals for the bot\n1. Integrate stable diffusion into the bot which will make it able to generate pictures\n2. Integrate long term memory')
			.setColor("#FFA500")
		await interaction.reply({ embeds: [embed] });
	},
};