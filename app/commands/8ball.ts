import Command from '../Command'
import { CommandData } from '../types'
import { randomValue, emojis } from '../helpers'
import { ids } from '../config'

class EightBall extends Command {
  get delayRegKey() {
    const { author } = this.message

    return `8ball-delay-${author.id}`
  }

  get delaySeconds() {
    return 4
  }

  async run() {
    const { member } = this.message

    // Require at least some words
    if (this.paramsList.size < 2) {
      return this.fail()
    }

    // Delay is active
    if (this.app.registry.get(this.delayRegKey)) {
      setTimeout(() => {
        this.hardDelete()
      }, this.delaySeconds * 1000)
      return this.react(emojis.timer)
    }

    const answer = randomValue(this.answers)

    await this.reply(answer)

    // Set the delay
    this.app.registry.set(this.delayRegKey, true)
    setTimeout(() => {
      this.app.registry.uns(this.delayRegKey)
    }, this.delaySeconds * 1000)
  }

  get answers() {
    const { guild } = this.message
    const isPepsi = guild.id === ids.pepsi.guild
    const tl = (en: string, lv: string) => (isPepsi ? lv : en)

    const answers = [
      // Positive
      tl('it is certain.', 'it is certain.'),
      tl('it is decidedly so.', 'it is decidedly so.'),
      tl('without a doubt.', 'without a doubt.'),
      tl('yes - definitely.', 'yes - definitely.'),
      tl('you may rely on it.', 'you may rely on it.'),
      tl('as I see it, yes.', 'as I see it, yes..'),
      tl('most likely.', 'most likely.'),
      tl('outlook good.', 'outlook good.'),
      tl('yes.', 'yes.'),
      tl('signs point to yes.', 'signs point to yes.'),
      // Neutral
      '<:idk:779729222658424862>',
      // Negative
      tl("don't count on it.", "don't count on it."),
      tl('my reply is no.', 'my reply is no.'),
      tl('my sources say no.', 'my sources say no.'),
      tl('outlook not so good.', 'outlook not so good.'),
      tl('very doubtful.', 'very doubtful.'),
    ]

    if (isPepsi) {
      answers.push("Wouldn't you like to know.")
    }

    return answers
  }
}

export default {
  Class: EightBall,
  description: 'Ask the magic 8 ball and receive an answer.',
  category: 'general',
  requiredPermissions: [],
  requiredChannelTypes: [],
} as CommandData
