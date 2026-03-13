const Component = require("../../../../structures/base/BaseComponent");

class CancelOrganizerButton extends Component {
    constructor(client) {
        super(client, {
            name: "cancel-organizer",
            category: "admin", // Changing to admin so only organizers/admins can cancel
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
             return interaction.reply({ embeds: [this.MentorQ.util.errorEmbed("You must be an Organizer to cancel this ticket.")], ephemeral: true });
        }

        await this.MentorQ.tickets.cancel(interaction.member, interaction.message, true); // isOrganizer = true

        interaction.reply({ embeds: [this.MentorQ.util.successEmbed("Request has been cancelled.")], ephemeral: true });

        return;

    }
}

module.exports = CancelOrganizerButton;
