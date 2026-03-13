const Component = require("../../../../structures/base/BaseComponent");

class ClaimOrganizerButton extends Component {
    constructor(client) {
        super(client, {
            name: "claim-organizer",
            category: "admin", // Changing to admin since you likely need to be an Organizer/Admin to claim these. Or we can just rely on the channel ping.
            cooldown: 5,
        });
    }

    /**
     * @param {import("discord.js").ButtonInteraction} interaction 
     */
    async run(interaction) {

        if (!this.MentorQ.tickets.isActive(interaction.guild))
            return interaction.reply({ embeds: [this.MentorQ.util.errorEmbed("The MentorQ system is not active. Contact a server admin to complete setup process.")], ephemeral: true });

        // Let's assume Organizers have admin/ManageGuild or a specific role
        if (!interaction.member.permissions.has("ManageGuild") && !interaction.member.roles.cache.find(r => r.name === "Organizer" || r.name === "Organizers")) {
             return interaction.reply({ embeds: [this.MentorQ.util.errorEmbed("You must be an Organizer to claim this ticket.")], ephemeral: true });
        }

        const ticket = await this.MentorQ.tickets.claim(interaction.member, interaction.message, true);
        if (!ticket) return interaction.reply({ embeds: [this.MentorQ.util.errorEmbed("A ticket could not be created because the member was not found.")], ephemeral: true });

        interaction.reply({ embeds: [this.MentorQ.util.successEmbed(`Ticket ${ticket} has been created.`)], ephemeral: true });

        return;

    }
}

module.exports = ClaimOrganizerButton;
