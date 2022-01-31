const chalk = require('chalk');
const { MessageEmbed } = require('discord.js');
const Playlist = require('../../settings/models/Playlist.js');
const Premium = require('../../settings/models/Premium.js');
const PremiumGuild = require('../../settings/models/PremiumGuild.js');
const TrackAdd = [];

module.exports = { 
    config: {
        name: "create",
        aliases: [],
        usage: "create <playlist link> <playlist name>",
        description: "Create or add to a playlist",
        accessableby: "Member",
        category: "playlist",
    },
    run: async (client, message, args) => {
        console.log(chalk.magenta(`[COMMAND] Create used by ${message.author.tag} from ${message.guild.name}`));

        const premiummember = await Premium.findOne({ member: message.author.id });
        const premiumguild = await PremiumGuild.findOne({ guild: message.guild.id });
        if(!premiummember && !premiumguild) return message.channel.send(`You need to be a premium member/guild to use this command.`);

        const msg = await message.channel.send('Loading please wait...')

        if(!args[0]) return msg.edit("Please provide a playlist link. Example: #create <playlist link> <playlist name>");
        if(!args[1]) return msg.edit("Please provide a playlist name. Example: #create <playlist link> <playlist name>");
        if(args[1].length > 16) return msg.edit("Playlist name can't be longer than 16 characters.");

        const PlaylistName = args[1].replace(/_/g, ' ');
        const Inputed = args[0];

        const res = await client.manager.search(Inputed, message.author.id);
        if(res.loadType != "NO_MATCHES") {
            if(res.loadType == "TRACK_LOADED") {
                TrackAdd.push(res.tracks[0])
                const embed = new MessageEmbed()
                    .setDescription(`Searched • **[${res.tracks[0].title}](${res.tracks[0].uri})** • **${message.author}**`)
                    .setColor('#000001')
                msg.edit({ content: " ", embeds: [embed] }).then(msg => {
                    message.delete()
                    setTimeout(() => msg.delete(), 5000)
                  });
            }
            else if(res.loadType == "PLAYLIST_LOADED") {
                for (let t = 0; t < res.tracks.length; t++) {
                    TrackAdd.push(res.tracks[t]);
                }
                const embed = new MessageEmbed()
                    .setDescription(`Searched • **[${res.playlist.name}](${args[0]})** (${res.tracks.length} tracks) • **${message.author}**`)
                    .setColor('#000001')
                msg.edit({ content: " ", embeds: [embed] }).then(msg => {
                    message.delete()
                    setTimeout(() => msg.delete(), 5000)
                  })
            }
            else if(res.loadType == "SEARCH_RESULT") {
                TrackAdd.push(res.tracks[0]);
                const embed = new MessageEmbed()
                    .setDescription(`Searched • **[${res.tracks[0].title}](${res.tracks[0].uri})** • **${message.author}**`)
                    .setColor('#000001')
                msg.edit({ content: " ", embeds: [embed] }).then(msg => {
                    message.delete()
                    setTimeout(() => msg.delete(), 5000)
                  })
            }
            else if(res.loadType == "LOAD_FAILED") {
                return msg.edit("Error loading playlist.");
            }
        }
        else {
            return msg.edit("Error loading playlist.");
        }

        const LimitPlaylist = await Playlist.find({ owner: message.author.id }).countDocuments();

        Playlist.findOne({ name: PlaylistName }).then(playlist => {
            if(playlist) {
                if(playlist.owner !== message.author.id) return message.channel.send("You can't add to this playlist.");
                const LimitTrack = playlist.tracks.length + TrackAdd.length;
                if(LimitTrack > client.config.LIMIT_TRACK) return message.channel.send(`You can't add more than ${client.config.LIMIT_TRACK} tracks to this playlist.`);
                for (let songs = 0; songs < TrackAdd.length; songs++) {
                    playlist.tracks.push(TrackAdd[songs]);
                }
                playlist.save().then(() => {
                const embed = new MessageEmbed()
                    .setDescription(`**Added • [\`${TrackAdd.length} track's\`] | Playlist • ${PlaylistName}**`)
                    .setColor('#000001')
                message.channel.send({ content: " ", embeds: [embed] });

                TrackAdd.length = 0;
                }).catch(err => console.log(err));
            }
            else {
                if(TrackAdd.length > client.config.LIMIT_TRACK)  return message.channel.send(`You can't add more than ${client.config.LIMIT_TRACK} tracks to this playlist.`);
                if(LimitPlaylist >= client.config.LIMIT_PLAYLIST) return message.channel.send(`You can't have playlist more than ${client.config.LIMIT_PLAYLIST} playlists.`);
                const CreateNew = new Playlist({
                    name: PlaylistName,
                    owner: message.author.id,
                    tracks: TrackAdd,
                    created: Date.now()
                });
                CreateNew.save().then(() => {
                    const embed = new MessageEmbed()
                    .setDescription(`**Created • ${PlaylistName} | Added • [\`${TrackAdd.length} track's\`]**`)
                    .setColor('#000001')
                message.channel.send({ content: " ", embeds: [embed] });
                    TrackAdd.length = 0;
                }).catch(err => {
                    console.log(err);
                    msg.edit("Error adding tracks to playlist.");
                });
            }
        }).catch(err => console.log(err));
    }
}