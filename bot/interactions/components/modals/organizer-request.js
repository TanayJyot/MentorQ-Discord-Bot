const Component = require("../../../../structures/base/BaseComponent");

class OrganizerRequestModal extends Component {
    constructor(client) {
        super(client, {
            name: "organizer-request-form",
            category: "general",
        });
    }

    /**
     * @param {import("discord.js").ModalSubmitInteraction} interaction 
     */
    async run(interaction) {

        try {
            await this.MentorQ.tickets.create(interaction.member, {
                name: interaction.fields.getTextInputValue("name-input"),
                team: "N/A", // Not applicable for organizer requests
                title: interaction.fields.getTextInputValue("title-input"),
                language: "N/A", // Not applicable
                description: interaction.fields.getTextInputValue("desc-input"),
            }, true); // isOrganizer = true

            interaction.reply({ embeds: [this.MentorQ.util.successEmbed("Your Organizer help request has been submitted. You will receive a notification and a private ticket when an Organizer reviews it.")], ephemeral: true });
        } catch (err) {
            interaction.reply({ embeds: [this.MentorQ.util.errorEmbed(err.message)], ephemeral: true });
        }

        return;

    }
}

module.exports = OrganizerRequestModal;
