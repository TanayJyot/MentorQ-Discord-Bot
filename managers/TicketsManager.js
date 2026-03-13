const { ChannelType, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ThreadAutoArchiveDuration, UserSelectMenuBuilder } = require("discord.js");

class TicketsManager {
    /**
     * Manager for mentor request tickets.
     * @param {import("../bot/index.js")} client MentorQ's Discord Client.
     */
    constructor(client) {
        this.MentorQ = client;
    }

    /**
     * @typedef {object} MentorRequestData
     * @prop {string} name
     * @prop {string} team
     * @prop {string} title
     * @prop {string} language
     * @prop {string} description
     */

    /**
     * Creates a mentor or organizer request and adds to the queue.
     * @param {import("discord.js").GuildMember} member 
     * @param {MentorRequestData} requestData 
     * @param {boolean} isOrganizer 
     */
    async create(member, requestData, isOrganizer = false) {

        const queueEmbed = new EmbedBuilder()
            .setAuthor({ name: `${isOrganizer ? "Organizer" : "Mentor"} Request - ${member.user.username}`, iconURL: member.displayAvatarURL() })
            .setTitle(isOrganizer ? requestData.title : `Project: ${requestData.title}`)
            .setDescription(requestData.description);
        if (!isOrganizer) {
            queueEmbed.addFields([
                { name: "Name:", value: requestData.name, inline: true },
                { name: "Team Members:", value: requestData.team, inline: true },
                { name: "Programming Language:", value: requestData.language },
            ]);
        } else {
            queueEmbed.addFields([
                { name: "Name:", value: requestData.name, inline: true },
            ]);
        }

        queueEmbed
            .setFooter({ text: `User ID: ${member.id}` })
            .setColor("Yellow")
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .setComponents(
                new ButtonBuilder()
                    .setLabel("Claim")
                    .setCustomId(isOrganizer ? "claim-organizer" : "claim")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setLabel("Cancel")
                    .setCustomId(isOrganizer ? "cancel-organizer" : "cancel")
                    .setStyle(ButtonStyle.Danger),
            );

        if (isOrganizer) {
            await this.getOrganizerQueueChannel(member.guild).send({ embeds: [queueEmbed], components: [buttons] });
        } else {
            await this.getQueueChannel(member.guild).send({ embeds: [queueEmbed], components: [buttons] });
        }

        return;

    }

    /**
     * Claim a pending request in the queue and open the ticket.
     * @param {import("discord.js").GuildMember} mentor 
     * @param {import("discord.js").Message} qMessage 
     * @param {boolean} isOrganizer
     */
    async claim(mentor, qMessage, isOrganizer = false) {
        const request = this.parseQueueEmbed(qMessage.embeds[0]);
        const newEmbed = new EmbedBuilder(qMessage.embeds[0].toJSON());

        const member = await this.MentorQ.util.fetchMember(mentor.guild, request.userID);
        if (!member) return;

        const ticket = await this.getRequestsChannel(mentor.guild).threads.create({
            name: `${isOrganizer ? "org" : "ticket"}-${request.requestData.title.slice(0, 10)}-${request.userID}`,
            type: isOrganizer ? ChannelType.PrivateThread : ChannelType.PublicThread,
            invitable: true,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
        });

        ticket.members.add(mentor.id);
        ticket.members.add(member.id);

        const closeButton = new ActionRowBuilder()
            .setComponents(
                new ButtonBuilder()
                    .setLabel("Close")
                    .setCustomId("close")
                    .setStyle(ButtonStyle.Danger),
            );

        if (!isOrganizer) {
            const reassignSelect = new ActionRowBuilder()
                .setComponents(
                    new UserSelectMenuBuilder()
                        .setCustomId("reassign-mentor")
                        .setPlaceholder("Assign another mentor")
                );

            ticket.send({ content: `**Mentor:** ${mentor.toString()}\n**Hacker:** ${member.toString()}`, embeds: [newEmbed.setColor("Blurple")], components: [closeButton, reassignSelect] });
        } else {
            ticket.send({ content: `**Organizer:** ${mentor.toString()}\n**Hacker:** ${member.toString()}`, embeds: [newEmbed.setColor("Blurple")], components: [closeButton] });
        }

        member.send({ embeds: [this.MentorQ.util.infoEmbed(`Your ${isOrganizer ? "Organizer" : "mentor"} request ticket has been opened.\nContact them here: ${ticket.toString()}`)] }).catch(() => { });

        qMessage.edit({ content: `❕ **CLAIMED** by <@${mentor.user.id}>`, embeds: [newEmbed.setColor("Green")], components: [] });

        return ticket.toString();
    }

    /**
     * Archive and lock a ticket thread channel.
     * @param {import("discord.js").GuildMember} mentor 
     * @param {import("discord.js").ThreadChannel} ticketChannel 
     */
    async close(mentor, ticketChannel) {
        if (ticketChannel.archived && ticketChannel.locked) return true;

        await ticketChannel.setLocked(true, `Closed by: ${mentor.user.tag}`);
        await ticketChannel.setArchived(true, `Closed by: ${mentor.user.tag}`);

        const member = await this.MentorQ.util.fetchMember(mentor.guild, ticketChannel.name.split("-")[1]);
        if (member) member.send({ embeds: [this.MentorQ.util.infoEmbed(`Your mentor ticket ${ticketChannel.toString()} has been **CLOSED** by ${mentor.user.tag}.`)] }).catch(() => { });

        return true;
    }

    /**
     * Cancel a pending request in the queue.
     * @param {import("discord.js").GuildMember} mentor 
     * @param {import("discord.js").Message} qMessage 
     * @param {boolean} isOrganizer
     */
    async cancel(mentor, qMessage, isOrganizer = false) {
        const request = this.parseQueueEmbed(qMessage.embeds[0]);
        const newEmbed = new EmbedBuilder(qMessage.embeds[0].toJSON()).setColor("Red");
        await qMessage.edit({ content: `❗ **CANCELLED** by <@${mentor.user.id}>`, embeds: [newEmbed], components: [] });

        const member = await this.MentorQ.util.fetchMember(mentor.guild, request.userID);
        if (member) member.send({ embeds: [this.MentorQ.util.infoEmbed(`Your ${isOrganizer ? "Organizer " : ""}request (\`${request.requestData.title}\`) created ${this.MentorQ.util.createTimestamp(qMessage.createdAt)} has been **CANCELLED** by ${mentor.user.tag}.`)] }).catch(() => { });

        return true;
    }

    /**
     * @param {import("discord.js").GuildMember} member 
     * @param {boolean} isOrganizer
     * @returns {import("discord.js").ThreadChannel}
     */
    getTicket(member, isOrganizer = false) {
        return this.getRequestsChannel(member.guild)?.threads?.cache?.find(t => !t.archived && !t.locked && t.name.includes(member.id) && t.name.startsWith(isOrganizer ? "org-" : "ticket-"));
    }

    /**
     * @param {import("discord.js").Guild} guild 
     * @returns {import("discord.js").TextChannel}
     */
    getRequestsChannel(guild) {
        return guild.channels.cache.find(c => c.type == ChannelType.GuildText && c.name == "🎓┃help-center");
    }

    /**
     * @param {import("discord.js").Guild} guild 
     * @returns {import("discord.js").TextChannel}
     */
    getQueueChannel(guild) {
        return guild.channels.cache.find(c => c.type == ChannelType.GuildText && c.name == "mentorq-queue");
    }

    /**
     * @param {import("discord.js").Guild} guild 
     * @returns {import("discord.js").TextChannel}
     */
    getOrganizerQueueChannel(guild) {
        return guild.channels.cache.find(c => c.type == ChannelType.GuildText && c.name == "organizerq-queue");
    }

    /**
     * @param {import("discord.js").Guild} guild 
     * @returns {import("discord.js").Role}
     */
    getMentorRole(guild) {
        return guild.roles.cache.find(r => r.name == "Mentor");
    }

    /**
     * @param {import("discord.js").Guild} guild 
     * @returns {import("discord.js").Role}
     */
    getOrganizerRole(guild) {
        return guild.roles.cache.find(r => r.name == "Organizer" || r.name == "Organizers");
    }

    /**
     * Checks if the mentor tickets system is fully setup.
     * @param {import("discord.js").Guild} guild 
     * @returns {boolean}
     */
    isActive(guild) {
        if (this.getRequestsChannel(guild) && this.getQueueChannel(guild) && this.getMentorRole(guild) && this.getOrganizerQueueChannel(guild))
            return true;
        else return false;
    }

    /**
     * Set up the required roles and channels for the MentorQ system.
     * @param {import("discord.js").Guild} guild 
     * @returns {Promise<boolean>}
     */
    async setup(guild) {

        if (this.isActive(guild)) return Promise.resolve(false);

        try {
            const mentorRole = this.getMentorRole(guild) || await guild.roles.create({ name: "Mentor" });
            const organizerRole = this.getOrganizerRole(guild) || await guild.roles.create({ name: "Organizer" });

            const category = guild.channels.cache.find(c => c.type == ChannelType.GuildCategory && c.name == "MentorQ") || await guild.channels.create({
                type: ChannelType.GuildCategory,
                name: "MentorQ",
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] },
                ],
            });

            const requestsChannel = this.getRequestsChannel(guild) || await guild.channels.create({
                type: ChannelType.GuildText,
                name: "🎓┃help-center",
                parent: category,
            });

            if (organizerRole) {
                await requestsChannel.permissionOverwrites.edit(organizerRole.id, {
                    ViewChannel: true,
                    ManageThreads: true
                }).catch(() => {});
            }

            if (!this.getQueueChannel(guild)) {
                await guild.channels.create({
                    type: ChannelType.GuildText,
                    name: "mentorq-queue",
                    parent: category,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages] },
                        { id: mentorRole.id, allow: [PermissionFlagsBits.ViewChannel] },
                    ],
                });
            }

            if (!this.getOrganizerQueueChannel(guild)) {
                await guild.channels.create({
                    type: ChannelType.GuildText,
                    name: "organizerq-queue",
                    parent: category,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages] },
                        { id: organizerRole.id, allow: [PermissionFlagsBits.ViewChannel] },
                    ],
                });
            }

            const infoEmbed = new EmbedBuilder()
                .setTitle("🎓┃Help Center - Request assistence during GenAI Genesis!")
                .setDescription("The Help Center is a custom Discord bot for GenAI Genesis to facilitate a ticket queue system connecting hackers with mentors and organizers.\n\n**Mentors:** Submit a mentor request with basic project details to the queue by clicking the button below and we'll match you with a mentor! You'll get a ping in this server when a mentor accepts your request.\n\n**Organizers:** Only use Organizer help for personal questions, and use the questions forum otherwise. This will open a private ticket.\n\nDon't worry if you're just starting out, we're here to help!")
                .setColor("Blurple")
                .setFooter({ text: "MentorQ is an open source project." });

            const requestButton = new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setLabel("Request a mentor")
                        .setCustomId("request-mentor")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setLabel("Request Organizer Help")
                        .setCustomId("request-organizer")
                        .setStyle(ButtonStyle.Secondary),
                );

            requestsChannel.send({ embeds: [infoEmbed], components: [requestButton] });

            return Promise.resolve(true);
        } catch (err) {
            console.error(err);
            return Promise.reject(err);
        }

    }

    generateRequestModal() {
        const mentorRequestModal = new ModalBuilder()
            .setTitle("Mentor Request Form")
            .setCustomId("mentor-request-form");

        const nameInput = new TextInputBuilder()
            .setCustomId("name-input")
            .setStyle(TextInputStyle.Short)
            .setLabel("What's your name?")
            .setPlaceholder("Enter your name (not username).")
            .setRequired(true);

        const teamInput = new TextInputBuilder()
            .setCustomId("team-input")
            .setStyle(TextInputStyle.Short)
            .setLabel("How many team members (including you)?")
            .setPlaceholder("Enter the amount of people in your team.")
            .setRequired(true);

        const titleInput = new TextInputBuilder()
            .setCustomId("title-input")
            .setStyle(TextInputStyle.Short)
            .setLabel("Project Title/Overview:")
            .setPlaceholder("Enter your project title and/or very brief description.")
            .setRequired(true);

        const langInput = new TextInputBuilder()
            .setCustomId("lang-input")
            .setStyle(TextInputStyle.Short)
            .setLabel("What programming language(s) are you using?")
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId("desc-input")
            .setStyle(TextInputStyle.Paragraph)
            .setLabel("Project Description:")
            .setPlaceholder("Give us any details about your project idea and your tech stack (dev tools).")
            .setRequired(true);

        mentorRequestModal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(teamInput),
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(langInput),
            new ActionRowBuilder().addComponents(descInput),
        );

        return mentorRequestModal;
    }

    generateOrganizerRequestModal() {
        const organizerRequestModal = new ModalBuilder()
            .setTitle("Organizer Help Request")
            .setCustomId("organizer-request-form");

        const nameInput = new TextInputBuilder()
            .setCustomId("name-input")
            .setStyle(TextInputStyle.Short)
            .setLabel("What's your name?")
            .setPlaceholder("Enter your name.")
            .setRequired(true);

        const titleInput = new TextInputBuilder()
            .setCustomId("title-input")
            .setStyle(TextInputStyle.Short)
            .setLabel("Overview:")
            .setPlaceholder("Enter brief reason for request.")
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId("desc-input")
            .setStyle(TextInputStyle.Paragraph)
            .setLabel("Description:")
            .setPlaceholder("Tell us how we can help.")
            .setRequired(true);

        organizerRequestModal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
        );

        return organizerRequestModal;
    }

    /**
     * @typedef {object} ParsedMentorRequest
     * @prop {string} userID
     * @prop {MentorRequestData} requestData
     */

    /**
     * Parse the mentor request queue embed into usable data.
     * @param {import("discord.js").Embed} queueEmbed 
     * @returns {ParsedMentorRequest}
     */
    parseQueueEmbed(queueEmbed) {
        const userID = queueEmbed.footer.text.split(" ")[2];
        const isOrganizer = queueEmbed.author.name.startsWith("Organizer");

        const requestData = {
            name: queueEmbed.fields[0].value,
            team: isOrganizer ? "N/A" : queueEmbed.fields[1].value,
            title: isOrganizer ? queueEmbed.title : queueEmbed.title.substring(9), // Only remove "Project: " for mentors
            language: isOrganizer ? "N/A" : queueEmbed.fields[2].value,
            description: queueEmbed.description,
        };
        return { userID, requestData };
    }

}

module.exports = TicketsManager;