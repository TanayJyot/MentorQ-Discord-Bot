const Component = require("../../../../structures/base/BaseComponent");

class ReassignMentorSelect extends Component {
    constructor(client) {
        super(client, {
            name: "reassign-mentor",
            category: "mentor",
            cooldown: 5,
        });
    }

    /**
     * @param {import("discord.js").UserSelectMenuInteraction} interaction 
     */
    async run(interaction) {

        if (!this.MentorQ.tickets.isActive(interaction.guild))
            return interaction.reply({ embeds: [this.MentorQ.util.errorEmbed("The MentorQ system is not active. Contact a server admin to complete setup process.")], ephemeral: true });

        const selectedUserId = interaction.values[0];
        if (!selectedUserId) {
            return interaction.reply({ embeds: [this.MentorQ.util.errorEmbed("No user was selected.")], ephemeral: true });
        }
        
        const targetMember = await this.MentorQ.util.fetchMember(interaction.guild, selectedUserId);
        if (!targetMember) {
            return interaction.reply({ embeds: [this.MentorQ.util.errorEmbed("Could not find the selected user.")], ephemeral: true });
        }

        const ticketThread = interaction.channel;
        if (!ticketThread || !ticketThread.isThread()) {
            return interaction.reply({ embeds: [this.MentorQ.util.errorEmbed("This action must be performed in a ticket thread.")], ephemeral: true });
        }

        await ticketThread.members.add(targetMember.id).catch(() => {});
        
        await interaction.reply({ content: `Successfully requested help from ${targetMember.toString()}.`, ephemeral: false });

        return;

    }
}

module.exports = ReassignMentorSelect;
