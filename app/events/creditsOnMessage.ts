import { Message } from 'discord.js'
import moment from 'moment'
import App from '../App'
import { EventData } from '../types'
import { credits as creditsConfig } from '../config'
import { randomInt } from '../helpers'
import creditsModel from '../models/Credits'

// The credits handler for message sending
export default {
  event: 'message',

  async callback(app: App, message: Message): Promise<void> {
    const { author, guild, channel, member, type, content } = message

    // Stop for specific messages
    if (channel.type === 'dm' || author.bot || type === 'GUILD_MEMBER_JOIN') {
      return
    }

    // Weekend double rate
    const weekday = moment().format('dddd')
    const isWeekend = ['Sunday', 'Saturday'].includes(weekday)

    /**
     * Time based "passive" credits
     */
    await (async () => {
      const creditsPerMinute = creditsConfig.creditsPerMinute || 0
      const creditsItem = await creditsModel.getGuildUserModel(guild.id, member.id)

      if (!creditsItem) {
        return
      }

      const lastActivityDate = moment(creditsItem.get('created_at'))

      if (!lastActivityDate.isValid()) {
        return
      }

      const minutesSince = moment().diff(lastActivityDate, 'minutes')
      let creditsToAdd = minutesSince >= 1 ? minutesSince * creditsPerMinute : 0

      // Weekend double rate
      if (isWeekend) {
        creditsToAdd *= 2
      }

      if (creditsToAdd) {
        await creditsModel.addGuildUserCredits(
          guild.id,
          member.id,
          creditsToAdd,
          creditsModel.types.TIME,
        )
      }
    })()

    /**
     * Activity based credits
     */
    const isCommand = /^[\.|\!|?|=|,|#|~]{1,2}[a-zA-Z]+/.test(content.trim())

    if (isCommand) {
      // Make it pass 1/5 of times
      if (randomInt(1, 5) !== 1) {
        return
      }
    }

    // If the message has only one word or none
    if (content.split(' ').length <= 1) {
      // Make it pass 1/3 of times
      if (randomInt(1, 3) !== 1) {
        return
      }
    }

    // Set a delay before adding exp to check if the message is deleted
    setTimeout(() => {
      // Check if the message was deleted
      if (!message.deleted) {
        return
      }

      let creditsToAdd = creditsConfig.creditPerPost

      // Double rate for Pepsi Dog counting channel
      if (channel.id === '740340031167922226') {
        creditsToAdd *= 2
      }

      // Weekend double rate
      if (isWeekend) {
        creditsToAdd *= 2
      }

      // Add the exp
      creditsModel.addGuildUserCredits(
        guild.id,
        member.id,
        creditsToAdd,
        creditsModel.types.MESSAGE,
      )
    }, 3000) // 3 seconds
  },
} as EventData
