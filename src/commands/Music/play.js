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
                .setAutocomplete(true), // Live-Suchvorschläge aktivieren
        ),

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        if (!focusedValue || focusedValue.length < 2) {
            return interaction.respond([]);
        }

        try {
            // Nutzt den Lavalink-Node deines Clients für die Suche
            const node = client.lavalink?.node || client.manager?.node;
            
            // Falls dein Client `poru`, `erela.js`, `kazagumo` oder standard `lavalink` nutzt:
            const player = client.manager || client.poru || client.lavalink;

            if (!player) {
                return interaction.respond([]);
            }

            // Führe eine Suchanfrage über deinen Music-Manager durch (YouTube/Spotify)
            const res = await player.search({
                query: focusedValue,
                source: 'ytsearch',
                requester: interaction.user,
            });

            if (!res || !res.tracks || res.tracks.length === 0) {
                return interaction.respond([]);
            }

            // Formatiere maximal 25 Suchergebnisse für Discord
            const results = res.tracks.slice(0, 25).map((track) => {
                const title = `${track.info.author} - ${track.info.title}`;
                return {
                    name: title.length > 100 ? title.substring(0, 97) + '...' : title,
                    value: track.info.uri || track.info.title,
                };
            });

            await interaction.respond(results);
        } catch (error) {
            // Verhindert Abstürze bei Abbruch der Suche
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
