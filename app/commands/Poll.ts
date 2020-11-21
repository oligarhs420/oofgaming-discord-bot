import Command from '../Command'
import { CommandData } from '../types'
import { colors, plural, joinAsLines } from '../helpers'
import {
  MessageReaction,
  Message,
  MessageEmbed,
  ImageURLOptions,
  MessageAttachment,
  Collection,
  Snowflake,
} from 'discord.js'

class Poll extends Command {
  get memberPollKey() {
    const { guild, member } = this.message

    if (!member) {
      return null
    }

    return `poll-${guild.id}-${member.id}`
  }

  async run() {
    const { minutes, pollText } = this.validate()
    const maxMinutes = 1440

    if (!(minutes > 0 && minutes <= maxMinutes && pollText.length)) {
      return this.fail('Incorrect poll time or text.')
    }

    // Send the message and add the reaction
    const createdPoll = await this.createPoll(pollText, minutes)

    // Create and validate registry entry with the clock
    if (!createdPoll) {
      return this.fail()
    }

    // Delete the original message
    this.hardDelete()
  }

  validate(minutes = 0, pollText = '') {
    const params = this.paramsList.array

    if (params.length >= 2) {
      // Return minutes as integer if it's a valid number
      if (parseInt(params[0]) > 0) {
        minutes = parseInt(params[0])

        // Set the remaining parameters as the poll result text
        pollText = params.slice(1).join(' ')
      }
    }

    return { minutes, pollText }
  }

  getEmojis() {
    const emojiGuildId = '3754360869042913430' // My Test Server
    const guild = this.app.client.guilds.cache.get(emojiGuildId)
    const emojis = guild.emojis.cache.array()

    return emojis.filter(({ name }) => ['yes', 'no'].includes(name))
  }

  get pollImage(): string {
    const { member, attachments } = this.message
    const imageAttachment = attachments.find((value: MessageAttachment) => value.width >= 0)

    return imageAttachment
      ? imageAttachment.url
      : member.user.displayAvatarURL({
          format: 'png',
          dynamic: true,
          size: 128,
        } as ImageURLOptions)
  }

  async createPoll(pollText: string, minutes: number): Promise<boolean> {
    const { member } = this.message
    const reg = this.app.registry

    // Check if the member already has an active poll
    if (reg.has(this.memberPollKey)) {
      const { pollText } = reg.get(this.memberPollKey)

      this.reply(`you already have a running **${pollText}** poll.`)

      return false
    }

    // Send the message
    const pollMessage = (await this.send({
      embed: {
        title: `Poll · ${minutes} ${plural('minute', minutes)}`,
        description: joinAsLines(`Join ${member}'s poll:`, `**${pollText}**`),
        color: colors.green,
        thumbnail: {
          url: this.pollImage,
        },
      } as MessageEmbed,
    })) as Message

    // Add reactions
    const emojis = this.getEmojis()

    for (const emoji of emojis) {
      await pollMessage.react(emoji)
    }

    // Create the entry
    reg.set(this.memberPollKey, {
      pollText,
      minutes,
      member: this.message.member,
    })

    // Create a reaction collector as the clock
    const filter = (reaction: MessageReaction) =>
      emojis.some(({ name }) => name === reaction.emoji.name)
    const collector = pollMessage.createReactionCollector(filter, {
      time: minutes * 60 * 1000,
    })

    collector.on('end', messageReactions => {
      if (!pollMessage.deleted) {
        this.lotteryEndCallback(messageReactions)

        // Delete the poll message
        pollMessage.delete()
      }

      // Remove the entry
      reg.uns(this.memberPollKey)
    })

    return true
  }

  lotteryEndCallback(messageReactions: Collection<Snowflake, MessageReaction>): void {
    const reg = this.app.registry
    const entry = reg.get(this.memberPollKey)

    // If for whatever reason it doesn't exist anymore
    if (!entry) {
      return
    }

    // Group results
    const results = {
      yes: 0,
      no: 0,
    }

    for (const { emoji, users } of messageReactions.array()) {
      const { name } = emoji

      if (typeof results[name] === 'undefined') {
        continue
      }

      results[name] = users.cache.filter(({ bot }) => !bot).size
    }

    const resultsCount = results.yes + results.no

    // Calculate percent
    const resultsPercent = {
      yes: resultsCount ? Math.round((results.yes / resultsCount) * 100) : 0,
      no: resultsCount ? Math.round((results.no / resultsCount) * 100) : 0,
    }

    // Format result text
    const emojiYes = '<:yes:754641296207118457>'
    const emojiNo = '<:no:754641739729469460>'
    const resultsLines = resultsCount
      ? [`${emojiYes} ${resultsPercent.yes}%`, `${emojiNo} ${resultsPercent.no}%`]
      : ['No one participated in the poll']

    // Announce the results
    this.send({
      embed: {
        title: 'Poll · Results',
        description: joinAsLines(`Question: **${entry.pollText}**`, ...resultsLines),
        color: colors.green,
        thumbnail: {
          url: this.pollImage,
        },
        footer: {
          text: resultsCount ? `${resultsCount} participated in the poll` : null,
        },
      } as MessageEmbed,
    })
  }
}

export default {
  Class: Poll,
  description: ['Give time in minutes and type the question. Time has to be less than a day.'],
  category: 'general',
  requiredPermissions: [],
  requiredChannelTypes: ['text'],
} as CommandData
