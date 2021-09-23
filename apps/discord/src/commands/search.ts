import { IDiscord, LANG, SUBSCRIPTION_REMOVE } from '@app/core';
import {
  collectionClose,
  collectionSuccess,
  sayHello,
  sayRemove,
  seriousError,
  subscriptionScene,
} from '../subscriptions';
import axios from 'axios';
import qs from 'qs';
import { pick } from 'lodash';
import { discordConfig } from '@app/configuration';
import { SlashCommandBuilder } from '@discordjs/builders';

module.exports = {
  name: 'search',
  description: 'Initiate the subscription process for selected channel which allows you to receive notifications',
  aliases: ['search', 'SEARCH', 'Search'],
  cooldown: 5,
  args: true,
  guildOnly: true,
  inDevelopment: true,
  slashOnly: true,
  slashCommand: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Subscribe current channel for updated events like')
    .addSubcommand(subcommand =>
      subcommand
        .setName('candidates')
        .setDescription('Guild candidate search from WowProgress LFG')
        .addStringOption(option =>
          option.setName('realms')
            .setDescription('Realms')
            .addChoice('Russian', 'ru_RU')
            .addChoice('Гордунни', 'gordunni')
            .addChoice('AHNQRJ, BLNZZR, BLDFST, CHRMGS, DGRSPN, LGHSKL, STRDHL, SNSTRD, TLNVRR, TRLLBN', 'gordunni')
            .addChoice('All', 'all')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('faction')
            .setDescription('Select faction')
            .addChoice('Horde', 'Horde')
            .addChoice('Alliance', 'Alliance')
        )
        .addIntegerOption(option =>
          option.setName('item_level')
            .setDescription('Average character item level must be above or equal'))
        .addIntegerOption(option =>
          option.setName('rio_score')
            .setDescription('Character Raider IO Score (if necessary)'))
        .addIntegerOption(option =>
          option.setName('days_from')
            .setDescription('Raid time days from'))
        .addIntegerOption(option =>
          option.setName('days_to')
            .setDescription('Raid time days to'))
        .addIntegerOption(option =>
          option.setName('wcl_percentile')
            .setDescription('Warcraft Logs Mythic Performance (if necessary)'))
        .addStringOption(option =>
          option.setName('character_class')
            .setDescription('Playable Class (only one if necessary)')
            .addChoice('Warrior', 'Warrior')
            .addChoice('Paladin', 'Paladin')
            .addChoice('Hunter', 'Hunter')
            .addChoice('Rogue', 'Rogue')
            .addChoice('Priest', 'Priest')
            .addChoice('Death Knight', 'Death Knight')
            .addChoice('Shaman', 'Shaman')
            .addChoice('Mage', 'Mage')
            .addChoice('Warlock', 'Warlock')
            .addChoice('Monk', 'Monk')
            .addChoice('Druid', 'Druid')
            .addChoice('Demon Hunter', 'Demon Hunter')
        )
        .addStringOption(option =>
          option.setName('languages')
            .setDescription('Speaking Languages')
            .addChoice('Russian', 'russian')
            .addChoice('English', 'english')
            .addChoice('All', 'all')
        ))
    .addSubcommand(subcommand =>
      subcommand
        .setName('items')
        .setDescription('Appearing selected item on auction house')
        .addIntegerOption(option =>
          option.setName('item_id')
            .setDescription('Item ID number')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('realms')
            .setDescription('Realms')
            .addChoice('Russian', 'ru_RU')
            .addChoice('Гордунни', '1602')
            .addChoice('Kazzak', '1305')
            .addChoice('Blackrock', '581')
            .addChoice('Outland', '1301')
            .addChoice('Aegwynn', '3679')
            .addChoice('Khaz Modan', '3698')
            .addChoice('Stormrage, Azuremyst', '1417')
            .addChoice('Hellscream, Aggramar', '1325')
            .addChoice('LGHSKL, BLNZZR, CHRMGS, TRLLBN, TLNVRR, BOULDFST, STRDHL, SNSTRD, AHNQRJ, DGRSPN', '1598')
            .addChoice('Onyxia, Theradras, Dethecus, Terrordar, Mug\'thol', '531')
            .addChoice('CLTRVNR, CRSDSCRL, CNSLOMBR, KRNTHOR, SNTNLLS, CLAIRVS, CNFRTHR', '1127')
            .addChoice('ALAKIR, SKLLCRSH, BRNLGN, XAVIUS', '3713')
            .addChoice('AHNQRJ, BLNZZR, BLDFST, CHRMGS, DGRSPN, LGHSKL, STRDHL, SNSTRD, TLNVRR, TRLLBN', 'gordunni')
            .addChoice('All', 'all')
            .addChoice('DSTRMTH, MNNRTH, ULDUAR, GILNEAS, GRGNNSH, NEFARIAN, NERATHOR', '612')
            .addChoice('Aerie Peak, Vek\'nilash, Eonar, Blade\'s Edge, Bronzebeard', '1416')
            .addChoice('BRNLGN, TRKKAR, DRJSPR, SHTTRD, BLDFTHR, KORGALL, EXECUTUS, SAURFANG', '633')
            .addChoice('Die Aldor', '1618')
            .addChoice('Свежеватель Душ', '1604')
            .addChoice('Hyjal', '1390')
            .addChoice('Vol\'jin, Chants éternels', '510')
            .addChoice('Eredar', '3692')
            .addChoice('Vek\'lor, Blutkessel, Durotan, Arthas, Kel\'Thuzad, Tirion, Wrathbringer', '578')
            .addChoice('Dragonmaw, Haomarush, Vashj, Spinebreaker, Stormreaver', '3656')
            .addChoice('Varimathras, Elune', '1315')
            .addChoice('Дракономор', '1623')
            .addChoice('Tichondrius, Lordaeron, Blackmoore', '580')
            .addChoice('Alexstrasza, Madmortem, Proudmoore, Nethersturm', '3696')
            .addChoice('Garona, Ner\'zhul, Sargeras', '509')
            .addChoice('Azshara, Baelgun, Lothar, Krag\'jin', '570')
            .addChoice('Frostmane, Grim Batol, Aggra (Português)', '1303')
            .addChoice('Галакронд, Разувий, Подземье', '1614')
            .addChoice('Malorne, Ysera', '1097')
            .addChoice('Azjol-Nerub, Quel\'Thalas', '1396')
            .addChoice('Dentarg, Tarren Mill', '1084')
            .addChoice('Suramar, Medivh', '1331')
            .addChoice('Twisting Nether', '3674')
            .addChoice('Silvermoon', '3391')
            .addChoice('Dalvengyr, Zuluhed, Nazjatar, Frostmourne, Aman\'Thul, Anub\'arak', '1105')
            .addChoice('Chamber of Aspects', '1307')
            .addChoice('Doomhammer, Turalyon', '1402')
            .addChoice('Moonglade, Steamwheedle Cartel, The Sha\'tar', '1085')
            .addChoice('Eversong', '1925')
            .addChoice('Nemesis', '1316')
            .addChoice('Bloodhoof, Khadgar', '1080')
            .addChoice('Wildhammer, Thunderhorn', '1313')
            .addChoice('Malfurion, Malygos', '1098')
            .addChoice('Anachronos, Kul Tiras, Alonsus', '1082')
            .addChoice('Minahonda, Exodar', '1385')
            .addChoice('Dragonblight, Ghostlands, Deathwing, The Maelstrom, Lightning\'s Blade, Karazhan', '1596')
            .addChoice('Ysondre', '1335')
            .addChoice('Los Errantes, Tyrande, Colinas Pardas', '1384')
            .addChoice('Emerald Dream, Terenas', '2074')
            .addChoice('RVNHLDT, SPRGGR, EARTHRNG, DFSBRTHD, VENTRCO, SCRSLGN, DRKMNFR', '1096')
            .addChoice('Rajaxx, Gul\'dan, Nathrezim, Anetheron, Festung der Stürme, Kil\'jaeden', '1104')
        )),

  async execute(message, args) {
    const config: IDiscord = {
      discord_id: message.channel.guild.id,
      discord_name: message.channel.guild.name,
      channel_id: message.channel.id,
      channel_name: message.channel.name,
      author_id: message.author.id,
      author_name: message.author.username,
      actions: {
        skip: ['пропустить', 'skip'],
        russian: ['русский', 'russian'],
        english: ['английский', 'english'],
        languages: ['german', 'french', 'greek', 'spanish', 'polish'],
        alliance: ['альянс', 'alliance'],
        horde: ['орда', 'horde'],
      },
      messages: 40,
      time: 180000,
      language: LANG.EN,
      prev: 0,
      current: 0,
      index: 0,
      next: 0,
      route: {
        recruiting: [1, 2, 100, 101, 102, 103, 104, 105, 106, 107],
        market: [1, 2, 200],
        orders: [1, 2, 200]
      }
    }
    try {
      if (args) {
        if (SUBSCRIPTION_REMOVE.includes(args)) {
          await axios({
            method: 'PUT',
            url: `${discordConfig.basename}/api/osint/discord/unsubscribe`,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: qs.stringify({ discord_id: config.discord_id, channel_id: config.channel_id }),
          });
          const removed = sayRemove(config.discord_name, config.channel_name, config.language)
          await message.channel.send(removed);
          return;
        }
      }

      const { data: discord } = await axios.get(encodeURI(`${discordConfig.basename}/api/osint/discord?discord_id=${config.discord_id}&channel_id=${config.channel_id}`));
      if (discord) Object.assign(config, discord);

      /** Start dialog with settings */
      const filter = m => m.author.id === message.author.id;
      const collector = message.channel.createMessageCollector(filter, {
        max: config.messages,
        time: config.time,
        errors: ['time'],
      });

      const hello = sayHello(message.author.username, !!config.type);

      await message.channel.send(hello);

      collector.on('collect', async m => {
        config.reply = m.content.toLowerCase().trim();
        const configNew = subscriptionScene(config);
        Object.assign(config, configNew);
        if (configNew.question) {
          await message.channel.send(configNew.question)
          if (configNew.next) config.current = configNew.next
        }
        if (configNew.next === 1000) {
          await collector.stop('ok')
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'ok') {
          const subscription = pick(config, [
              'discord_id',
              'discord_name',
              'channel_id',
              'channel_name',
              'author_id',
              'author_name',
              'type',
              'language',
              'timestamp',
              'items',
              'realms',
              'character_class',
              'days_from',
              'days_to',
              'average_item_level',
              'rio_score',
              'wcl_percentile',
              'faction',
              'languages'
            ]
          );
          await axios({
            method: 'POST',
            url: `${discordConfig.basename}/api/osint/discord/subscribe`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: qs.stringify(subscription),
          });
          const ok = collectionSuccess(subscription, !!discord);
          await message.channel.send(ok);
        } else {
          const fail = collectionClose(config.language);
          await message.channel.send(fail);
        }
      });
    } catch (errorException) {
      console.error(errorException);
      const error = seriousError(config.language);
      await message.channel.send(error);
    }
  }
}
