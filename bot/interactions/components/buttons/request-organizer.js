const Component = require("../../../../structures/base/BaseComponent");

class RequestOrganizerButton extends Component {
    constructor(client) {
        super(client, {
            name: "request-organizer",
            category: "general",
            cooldown: 5,
        });
    }

    /**
     * @param {import("discord.js").ButtonInteraction} interaction 
     */
    async run(interaction) {

        if (!this.MentorQ.tickets.isActive(interaction.guild))
            return interaction.reply({ embeds: [this.MentorQ.util.errorEmbed("The MentorQ system is not active. Contact a server admin to complete setup process.")], ephemeral: true });

        const currentTicket = this.MentorQ.tickets.getTicket(interaction.member, true);
        if (currentTicket) return interaction.reply({ embeds: [this.MentorQ.util.errorEmbed(`You can't request an organizer because you already have an active organizer ticket: ${currentTicket.toString()}`)], ephemeral: true });

        const organizerRequestModal = this.MentorQ.tickets.generateOrganizerRequestModal();

        interaction.showModal(organizerRequestModal);

        return;

    }
}

module.exports = RequestOrganizerButton;
