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
            // Greift dynamisch auf die bestehende Musik-Instanz deines Bots zu
            const manager = client.manager || client.poru || client.lavalink || client.kazagumo || client.player;

            if (!manager) {
                return interaction.respond([]);
            }

            // Suche über den aktiven Musik-Manager durchführen
            const res = await manager.search(focusedValue, { requester: interaction.user });
            
            if (!res || !res.tracks || res.tracks.length === 0) {
                return interaction.respond([]);
            }

            // Maximal 25 Ergebnisse für das Discord Dropdown-Menü formatieren
            const results = res.tracks.slice(0, 25).map((track) => {
                const author = track.info?.author || track.author || 'Unbekannt';
                const title = track.info?.title || track.title || 'Unbekannter Titel';
                const displayName = `${author} - ${title}`;
                
                return {
                    name: displayName.length > 100 ? displayName.substring(0, 97) + '...' : displayName,
                    value: track.info?.uri || track.info?.title || track.title || focusedValue,
                };
            });

            await interaction.respond(results);
        } catch (error) {
            // Bei Abbrüchen oder Fehlern leere Antwort senden, damit Discord nicht fehlschlägt
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
