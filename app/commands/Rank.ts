import axios from 'axios'
import Canvas from 'canvas'
import { GuildMember, MessageAttachment, MessageEmbed } from 'discord.js'
import Command from '../Command'
import {
  formatThousands,
  getDisplayName,
  getImageAverageColorData,
  getImageDominantColorData,
  mapNumber,
  textOverflow,
  textWrap,
  randomInt,
} from '../helpers'
import ranksModel, { ExpData } from '../models/Ranks'
import { CommandData, ModelItem } from '../types'

const trianglify = require('trianglify')

class Rank extends Command {
  run() {
    const param = this.paramsList.first

    // If member wants to see the top ranks
    if (param && param.asString.toLowerCase() === 'top') {
      this.sendRankTop()
      return
    }

    // If looking at other member rank
    const member = this.message.mentions.members.first()

    if (member) {
      this.sendMemberRank(member)
      return
    }

    // Otherwise display current member rank
    this.sendMemberRank(this.message.member)
  }

  /**
   * Send user's current rank
   */
  async sendMemberRank(member: GuildMember): Promise<void> {
    const { guild, user } = member

    const exp = await ranksModel.getGuildUserExp(guild.id, user.id)
    const expData = ranksModel.parseExp(exp || 0)
    const attachment = await this.getRankAttachment(member, expData)
    const ranks = await ranksModel.getAllGuildRanks(guild.id)
    const rankNr = await this.getMemberRankNr(ranks, member)
    const displayName = getDisplayName(member)
    const prefixText =
      member.id != this.message.member.id ? `${displayName} is` : 'You are'

    this.send(`${prefixText} rank **#${rankNr}**`, {
      files: [attachment],
    })
    this.success()
  }

  /**
   * Fetch all guild ranks and sort by EXP
   *
   * @async
   */
  async sendRankTop() {
    const guild = this.message.guild
    const ranks = await ranksModel.getAllGuildRanks(guild.id)

    const embedFieldMaxCount = 6
    const embedFields = []
    const rankTopData = []

    for (const rank of ranks) {
      const canAddToEmbedFields = embedFields.length < embedFieldMaxCount
      const member = guild.members.cache.get(rank.userId)

      // Only if the member still exists in the server
      if (member) {
        const rankNr = await this.getMemberRankNr(ranks, member)
        const expData = ranksModel.parseExp(rank.exp || 0)
        const displayName = textOverflow(member.displayName, 20)
        const levelText = textWrap(
          `LVL ${expData.level}`,
          '**',
          expData.level === ranksModel.maxLevel,
        )
        const data = {
          name: `#${rankNr} ${displayName}`,
          value: `${levelText} with ${formatThousands(expData.exp)} exp`,
          inline: true,
        }

        // Add to embed fields if allowed
        if (canAddToEmbedFields) {
          embedFields.push(data)
        }

        // Add data
        rankTopData.push({
          rankNr,
          level: expData.level,
          exp: formatThousands(expData.exp),
          displayName: member.displayName,
        })
      }
    }

    if (rankTopData && rankTopData.length) {
      const rankTopUrl = 'https://oofgaming.eu/rank-top/'
      const rankTopApiUrl = `${rankTopUrl}update.php`
      let canUseUrl = false

      try {
        await axios({
          method: 'post',
          url: rankTopApiUrl,
          data: { guild: guild.id, data: rankTopData },
          headers: { 'Content-Type': 'application/json' },
        })

        canUseUrl = true
      } catch (e) {
        // Who cares
        // console.error(e)
      }

      this.send(canUseUrl ? `${rankTopUrl}${guild.id}` : '', {
        embed: {
          fields: embedFields,
        } as MessageEmbed,
      })
    } else {
      this.send('There are no ranks yet :weary:')
    }

    this.success()
  }

  /**
   * Return number in order in which the person is in terms of ranks
   * Filter out users that are not in the guild anymore
   */
  async getMemberRankNr(
    ranks: ModelItem[],
    member: GuildMember,
  ): Promise<number> {
    const guild = member.guild
    let rankNr = 1

    for (const rank of ranks) {
      const rankMember = guild.members.cache.get(rank.userId)

      if (rankMember) {
        if (rankMember.id == member.id) {
          return rankNr
        }

        rankNr++
      }
    }

    // If none found return last loop number
    return rankNr
  }

  async getRankAttachment(
    member: GuildMember,
    expData: ExpData,
  ): Promise<MessageAttachment> {
    const { exp, level, min, max } = expData

    // Get avatar data
    const avatarImageUrl =
      member.user.displayAvatarURL({
        format: 'png',
        dynamic: false,
        size: 64,
      }) || this.app.getAsset('blank.png')

    const averageColorData = await getImageAverageColorData(avatarImageUrl)
    const dominantColorData = await getImageDominantColorData(avatarImageUrl)
    const isAvatarColorBright = averageColorData.isBright

    // Measurements
    const [width, height] = [300, 75]
    const elementMargin = 7
    const expBarHeight = 2

    // Colors
    const primaryColor = isAvatarColorBright ? '#000' : '#fff'
    const secondaryColor = isAvatarColorBright ? '#fff' : '#000'

    // Canvas settings
    const canvas = Canvas.createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Register fonts
    const fontAsset = this.app.getAsset('seguiemj.ttf')

    Canvas.registerFont(fontAsset, { family: 'seguiemj' })

    // Draw the background image
    trianglify({
      width,
      height,
      xColors: [
        // secondaryColor,
        averageColorData.colorHex,
        dominantColorData.colorHex,
      ],
      cellSize: randomInt(height / 2, height),
      variance: 1,
      colorFunction: isAvatarColorBright
        ? trianglify.colorFunctions.shadows(0.5)
        : trianglify.colorFunctions.sparkle(1),
    }).toCanvas(canvas)

    // Draw the avatar
    const avatarImage = await Canvas.loadImage(avatarImageUrl)
    const avatarWidth = height - elementMargin * 2
    const avatarOuterWidth = height

    ctx.save()
    ctx.ellipse(
      elementMargin + avatarWidth / 2,
      elementMargin + avatarWidth / 2,
      avatarWidth / 2,
      avatarWidth / 2,
      0,
      0,
      Math.PI * 2,
    )
    ctx.clip()
    ctx.drawImage(
      avatarImage,
      elementMargin,
      elementMargin,
      avatarWidth,
      avatarWidth,
    )
    ctx.restore()

    // Draw EXP bar background
    const expBarWidth = width - avatarOuterWidth - elementMargin
    const expBarY = height - expBarHeight - elementMargin

    ctx.fillStyle = secondaryColor
    ctx.fillRect(avatarOuterWidth, expBarY, expBarWidth, expBarHeight)

    // Draw EXP bar foreground
    ctx.fillStyle = primaryColor
    ctx.fillRect(
      avatarOuterWidth,
      expBarY,
      mapNumber(exp, min, max, 0, expBarWidth),
      expBarHeight,
    )

    // Level
    ctx.font = '15px sans-serif'
    ctx.fillStyle = primaryColor
    ctx.textBaseline = 'bottom'

    const levelText = `LVL ${level}`
    const levelTextMetrics = ctx.measureText(levelText)

    ctx.fillText(levelText, avatarOuterWidth, expBarY - elementMargin)

    // EXP
    ctx.font = '10px sans-serif'
    ctx.fillStyle = primaryColor
    ctx.textBaseline = 'bottom'

    const expText = `${exp} / ${max}`

    ctx.fillText(
      expText,
      avatarOuterWidth + levelTextMetrics.width + elementMargin,
      expBarY - elementMargin,
    )

    // Display name
    const displayName = getDisplayName(member)

    ctx.font = this.getDisplayNameFont(
      ctx,
      displayName,
      width - avatarOuterWidth,
      24,
    )
    ctx.fillStyle = primaryColor
    ctx.textBaseline = 'bottom'

    ctx.fillText(
      displayName,
      avatarOuterWidth,
      expBarY -
        elementMargin -
        levelTextMetrics.actualBoundingBoxAscent -
        elementMargin,
    )

    // Return the canvas as an image attachment
    return new MessageAttachment(canvas.toBuffer(), 'rank.png')
  }

  getDisplayNameFont(
    ctx: CanvasRenderingContext2D,
    text: string,
    containmentWidth: number,
    initialFontSize: number,
    reduceIncrement: number = 1,
  ): string {
    let fontSize = initialFontSize

    do {
      ctx.font = `${(fontSize -= reduceIncrement)}px seguiemj`
    } while (ctx.measureText(text).width > containmentWidth)

    return ctx.font
  }
}

export default {
  Class: Rank,
  description: [
    'Ranking system command. Will output your current rank if no parameters.',
    'Add "top" and current server top ranks based on EXP will be shown.',
    'Mention a user to see his rank. Users with GIF avatars will take more time to render.',
  ],
  category: 'general',
  requiredPermissions: [],
  requiredChannelTypes: ['text'],
} as CommandData
