import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { playQuery, replyMusicSuccess } from '../../services/music/musicActions.js';

export default {
    slashOnly: true,
    category: 'Music',
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Spiele einen Song oder füge ihn der Warteschlange hinzu')
        .addStringOption((opt) =>
            opt
                .setName('query')
                .setDescription('Songname oder URL')
                .setRequired(true)
                .setAutocomplete(true),
        ),

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        if (!focusedValue || focusedValue.trim().length < 2) {
            return interaction.respond([]);
        }

        try {
            const riffy = client.riffy || client.manager;
            if (!riffy) {
                return interaction.respond([]);
            }

            const res = await riffy.resolve({
                query: focusedValue,
                requester: interaction.user,
            });

            if (!res || !res.tracks || res.tracks.length === 0) {
                return interaction.respond([]);
            }

            const results = res.tracks.slice(0, 25).map((track) => {
                const author = track.info?.author || 'Unbekannter Künstler';
                const title = track.info?.title || 'Unbekannter Titel';
                const displayName = `${author} - ${title}`;

                return {
                    name: displayName.length > 100 ? displayName.substring(0, 97) + '...' : displayName,
                    value: track.info?.title || focusedValue,
                };
            });

            await interaction.respond(results);
        } catch (error) {
            await interaction.respond([]).catch(() => {});
        }
    },

    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) {
            return;
        }

        const result = await playQuery(client, interaction, interaction.options.getString('query'));
        await replyMusicSuccess(interaction, result.embed);
    },
};
