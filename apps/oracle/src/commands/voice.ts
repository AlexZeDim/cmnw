// @ts-ignore
import Discord from "v11-discord.js";
import { OracleCommandInterface } from "../interface";

export const Voice: OracleCommandInterface = {
    name: 'voice',
    guildOnly: true,
    async execute(
        message: Discord.Message,
        args: string,
        client: Discord.Client,
    ) {
        try {
            const [channelId] = args.split(' ');

            const channel = client.channels.get(channelId);
            if (channel.type === 'voice') {
                await channel.join();
            }

        } catch (errorOrException) {
            console.error(`voice: ${errorOrException}`);
        }
    }
}
