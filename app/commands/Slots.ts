import { Message, MessageEmbed } from 'discord.js'
import moment from 'moment'
import App from '../App'
import Command from '../Command'
import { CommandData } from '../types'
import { colors, formatThousands, randomValue } from '../helpers'
import creditsModel from '../models/Credits'
import settingsModel from '../models/Settings'

class Slots extends Command {
  creditsTotal = 0

  async run() {
    const canRun = await this.canRun()

    if (!canRun) {
      return this.fail()
    }

    const checkDelay = this.checkDelay()

    if (!checkDelay) {
      await this.react('timer')
      // Delete in half of the deletion check for exp
      setTimeout(() => {
        this.hardDelete()
      }, 1500)
      return
    }

    const { guild, member } = this.message
    this.creditsTotal = await creditsModel.getGuildUserTotal(guild.id, member.id)

    this.bet()
  }

  async canRun() {
    const { guild, channel } = this.message
    const allowedChannelId = await settingsModel.getGuildSettingValue(
      guild.id,
      'gambling_channel_id',
    )

    if (allowedChannelId.length) {
      return allowedChannelId === channel.id
    }

    return false
  }

  get delaySeconds(): number {
    return 3
  }

  get delayKey(): string {
    const { guild, member } = this.message

    return `slots-delay-${guild.id}-${member.id}`
  }

  checkDelay(): boolean {
    const delay = this.app.registry.get(this.delayKey)

    if (delay) {
      if (moment().diff(delay, 'seconds') < this.delaySeconds) {
        return false
      }
    }

    return true
  }

  setDelay(): void {
    this.app.registry.set(this.delayKey, moment())
  }

  get items(): { [index: string]: string } {
    return {
      // Items that are fillers
      filler1: '🍊',
      filler2: '🍌',
      filler3: '🍋',
      // Items that have value
      cherry: '🍒',
      bar: '<:slotsbar:754379562393272512>',
      seven: '<:slotsseven:754379369098641429>',
    }
  }

  get distribution(): string[][] {
    // Each slot has equal amount of items
    const slots = [
      // Slot 1
      {
        filler1: 5,
        filler2: 5,
        filler3: 5,
        cherry: 4,
        bar: 3,
        seven: 1,
      },
      // Slot 2
      {
        filler1: 6,
        filler2: 6,
        filler3: 6,
        cherry: 3,
        bar: 1,
        seven: 1,
      },
      // Slot 3
      {
        filler1: 6,
        filler2: 6,
        filler3: 6,
        cherry: 3,
        bar: 1,
        seven: 1,
      },
    ]

    const result = []

    for (const slot of slots) {
      const emojis = []

      for (const [name, count] of Object.entries(slot)) {
        for (let i = 0; i < count; i++) {
          emojis.push(this.items[name])
        }
      }

      result.push(emojis)
    }

    return result
  }

  get rewards() {
    const { cherry, bar, seven } = this.items

    return [
      { label: '2x', multiplier: 2, item: cherry, count: 1 },
      { label: '5x', multiplier: 5, item: cherry, count: 2 },
      { label: '20x', multiplier: 20, item: cherry, count: 3 },
      { label: '40x', multiplier: 40, item: bar, count: 3 },
      { label: '80x', multiplier: 80, item: seven, count: 3 },
    ]
  }

  get betInfo() {
    const betInfo = { amount: 0, sendRewards: true }
    const params = this.paramsList.array

    if (params.length) {
      params.forEach(param => {
        param = param.toLowerCase()

        if (parseInt(param) > 0 || param === 'all') {
          betInfo.amount = parseInt(param) || this.creditsTotal
          betInfo.sendRewards = false
        }
      })
    }

    return betInfo
  }

  async bet() {
    const { member, guild } = this.message
    const { amount, sendRewards } = this.betInfo

    // Send the rewards info if no params
    if (sendRewards) {
      this.sendRewards()
      return this.success()
    }

    // Validate the bet
    if (!amount) {
      if (amount === 0) {
        this.reply("you have 0 credits, you can't bet.")
      } else {
        this.reply('add the amount of credits to bet or "all".')
      }
      return this.fail()
    } else if (amount > this.creditsTotal) {
      this.send(
        `${member} you have ${formatThousands(
          this.creditsTotal,
        )} credits, you can't bet ${formatThousands(amount)}.`,
      )
      return this.fail()
    }

    // Get rolled slot rows
    const rows = this.roll()

    // Check if won anything in the middle row
    const rowReward = this.getReward(rows[1])
    const multiplier = rowReward ? rowReward.multiplier : null
    const wonAmount = multiplier ? amount * multiplier : 0
    const creditsToAdd = wonAmount - amount

    const resultText = wonAmount
      ? `${multiplier}x! Won ${formatThousands(creditsToAdd)} credits`
      : `Lost ${formatThousands(amount)} credits`
    const resultColor = wonAmount ? colors.green : colors.red

    const rowsDisplay = rows
      .map(row => row.join(' '))
      .map((row, i) => (i === 1 ? `👉🏿 ${row}` : `<:blank:754381247802900623> ${row}`))
      .join('\n')

    // Update credits
    await creditsModel.addGuildUserCredits(
      guild.id,
      member.id,
      creditsToAdd,
      creditsModel.types.SLOTS,
    )

    // Update credits total
    this.creditsTotal += creditsToAdd

    // Send the details
    this.send({
      embed: {
        title: `${member.displayName}'s slots roll`,
        description: `${rowsDisplay}\n\n${resultText}`,
        footer: {
          text: `You have ${formatThousands(this.creditsTotal)} credits now`,
        },
        color: resultColor,
      } as MessageEmbed,
    })

    // Set delay and delete
    this.setDelay()
    this.hardDelete()
  }

  sendRewards() {
    const description = this.rewards
      .map(({ label, item, count }) => `**${label}:** ${item.repeat(count)}`)
      .join('\n')

    return this.send({
      embed: {
        title: 'Slots rewards',
        description,
      } as MessageEmbed,
    })
  }

  getReward(rowItems: string[]): { [index: string]: any } | null {
    // Reverse is used to validate e.g. 3 cherries before 2 cherries roll
    const rewards = this.rewards.reverse()
    const rowItemsStr = rowItems.join('')

    // Find the reward
    for (const reward of rewards) {
      const { item, count } = reward
      const matches = rowItemsStr.match(new RegExp(item, 'g'))

      if (matches && matches.length >= count) {
        return reward
      }
    }

    return null
  }

  roll() {
    const distribution = this.distribution
    const rows: string[][] = []

    for (let slot = 0; slot < 3; slot++) {
      const slotItems = distribution[slot]

      for (let row = 0; row < 3; row++) {
        if (!Array.isArray(rows[row])) {
          rows[row] = []
        }

        rows[row][slot] = randomValue(slotItems)
      }
    }

    return rows
  }
}

export default {
  Class: Slots,
  description: ['Add a bet of credits to roll.', 'Use a blank command to see rewards table.'],
  category: 'casino',
  requiredPermissions: [],
  requiredChannelTypes: ['text'],
} as CommandData
