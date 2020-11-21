import { Message } from 'discord.js'
import App from '../App'
import { EventData } from '../types'
import { getGeneralChannel, joinAsLines } from '../helpers'
import { ids } from '../config'

export default {
  event: 'message',

  async callback(app: App, message: Message): Promise<void> {
    const { author, guild, channel, member, type, content } = message

    // Stop for specific messages
    if (channel.type === 'dm' || author.bot || type === 'GUILD_MEMBER_JOIN') {
      return
    }

    // Set up required IDs
    const guildId = ids.pepsi.guild
    const channelId = ids.pepsi.channels.entry
    const roleId = ids.pepsi.roles.entry

    // Verify the guild and the channel
    if (`${guild.id}` !== guildId || `${channel.id}` !== channelId) {
      return
    }

    // Verify the role
    const role = guild.roles.cache.get(roleId)

    if (!role) {
      return
    }

    // Add the entry role
    if (member && !member.roles.cache.get(role.id)) {
      member.roles.add(role)

      // Announce the member joining
      const generalChannel = getGeneralChannel(guild)

      if (generalChannel) {
        generalChannel.send(
          joinAsLines(`> ${content}`, `Hello, ${member}!`),
        )
      }
    }

    // Delete the message
    if (message.deletable) {
      message.delete()
    }
  },
} as EventData
