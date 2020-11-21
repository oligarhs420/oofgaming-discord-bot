import {
  Guild,
  GuildMember,
  TextChannel,
  GuildChannel,
  PermissionResolvable,
} from 'discord.js'
import fs from 'fs'
import { discord as discordConfig } from '../config'
import axios from 'axios'
import { NumberObject, ImageColorData } from 'app/types'
import Canvas from 'canvas'

const colorThief = require('colorthief')

export const emojis = {
  cross: '❌',
  check: '✅',
  lock: '🔐',
  mail: '📧',
  gift: '🎁',
  timer: '⏲',
  printer: '🖨',
  rage: '😡',
  moneyBag: '💰',
  sandClock: '⏳',
  mailboxWithMail: '📬',
  door: '🚪',
  zipperMouth: '🤐',
  tools: '🛠️',
  noEntry: '⛔',
}

export const colors = {
  white: 0xffffff,
  black: 0x000000,
  red: 0xf04747,
  green: 0x43b581,
  blue: 0x6495ed,
  gold: 0xffd700,
  purple: 0x771177,
}

export const safePath = (path: string): string =>
  path
    .split('/')
    .filter(item => item.length)
    .join('/')

export const downloadImage = async (
  url: string,
  path: string,
): Promise<void> => {
  const writer = fs.createWriteStream(path)
  const { data } = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  })

  data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

/**
 * Constrains a value between a minimum and maximum value.
 */
export const constrainNumber = (n: number, low: number, high: number): number =>
  Math.max(Math.min(n, high), low)

/**
 * Re-maps a number from one range to another.
 */
export const mapNumber = (
  n: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number,
  withinBounds: boolean = false,
): number => {
  const newval = ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2
  if (!withinBounds) {
    return newval
  }
  if (start2 < stop2) {
    return constrainNumber(newval, start2, stop2)
  } else {
    return constrainNumber(newval, stop2, start2)
  }
}

/**
 * Specific truthy check
 */
export const isTrue = (value: any): boolean => {
  if (Number.isInteger(value) || !isNaN(parseInt(value))) {
    return parseInt(value) > 0
  } else if (typeof value === 'string') {
    return ['yes', 'true'].includes(value.trim().toLowerCase())
  } else if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length > 0
  } else if (Array.isArray(value)) {
    return value.length > 0
  }
  return !!value
}

/**
 * Prevent text from being longer than the given length
 */
export const textOverflow = (
  text: string,
  maxLength: number,
  addDots: boolean = true,
): string => {
  if (text.length > maxLength) {
    text = text.substr(0, maxLength).trim()

    if (addDots) {
      text = text.substr(0, text.length - 3).trim()
      text += '...'
    }
  }

  return text
}

/**
 * Wraps the text if the third parameter is true
 */
export const textWrap = (
  text: string,
  wrapWith: string,
  doWrap: boolean = true,
): string => {
  if (doWrap) {
    text = `${wrapWith}${text}${wrapWith}`
  }
  return text
}

/**
 * Get a promise that resolves after the specified ms time
 */
export const delay = (ms: number): Promise<void> =>
  new Promise(res => setTimeout(res, ms))

/**
 * Call a funciton after a delay
 * Defaults to 8 seconds
 */
export const delayCallback = async (
  callback: Function,
  ms: number = 8000,
): Promise<void> => {
  await delay(ms)
  callback()
}

/**
 * Return a safe string of a guild member name
 * Escapes any global mentions
 */
export const getDisplayName = (member: GuildMember | null): string => {
  if (!member) {
    return 'Unknown'
  }

  let displayName = member.displayName

  displayName = displayName.replace(/@everyone/g, '[at]everyone')
  displayName = displayName.replace(/@here/g, '[at]here')

  return displayName
}

/**
 * Convert hex color string to rgb color array
 */
export const hexToRgbArray = (hex: string): number[] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)

  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null
}

/**
 * Convert rgb data to hex string or integer
 */
export const rgbToHex = (
  r: number,
  g: number,
  b: number,
  asString: boolean = true,
): number | string => {
  const toHex = (c: number): string => {
    const hex = c.toString(16)

    return hex.length === 1 ? `0${hex}` : hex
  }
  const hexPart = `${toHex(r)}${toHex(g)}${toHex(b)}`

  return asString ? `#${hexPart}` : parseInt(`0x${hexPart}`)
}

/**
 * Choose a random integer within a range
 */
export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1) + min)

/**
 * Choose a random value from an array or an object
 */
export const randomValue = (data: object): any => {
  // Since array is still an object, can normalize types by getting values
  const values = Object.values(data)

  if (values.length) {
    return values[randomInt(0, values.length - 1)]
  }

  return null
}

/**
 * Checks if the string looks like a URL
 */
export const isUrl = (string: string): boolean =>
  new RegExp(
    '^([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?$',
    'i',
  ).test(string)

/**
 * Checks if the string contains a URL
 */
export const containsURL = (string: string): boolean =>
  new RegExp(
    '([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?',
  ).test(string)

/**
 * Converts bytes to human readable format
 */
export const bytesToSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes'
  }

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const sizesKey = Math.floor(Math.log(bytes) / Math.log(1024))

  return Math.round(bytes / Math.pow(1024, sizesKey)) + ' ' + sizes[sizesKey]
}

/**
 * Convert data object into URL params string
 */
export const dataToUrlParams = (data: object): string => {
  const params = []

  for (const [key, value] of Object.entries(data)) {
    params.push(`${key}=${value}`)
  }

  return params.join('&')
}

/**
 * Adds the ticks separating thousands
 */
export const formatThousands = (number: number): string => {
  const isNegative = number < 0

  // Reverse numbers
  let result: string | string[] = number
    .toString()
    .split('')
    .reverse()
    .join('')

  // Split per 3 numbers
  result = result.match(/\d{1,3}/g) || []

  // Add separators and flip it back
  result = result
    .join("'")
    .split('')
    .reverse()
    .join('')

  return isNegative ? `-${result}` : result
}

/**
 * Adds an "s" or a specifiac suffix based on the number
 */
export const plural = (
  word: string,
  number: number,
  suffix: string = 's',
): string => (number !== 1 ? `${word}${suffix}` : word)

/**
 * Remove parameters from an URL
 */
export const stripUrlParams = (url: string): string => {
  let index = 0
  let newUrl = url

  index = url.indexOf('?')

  if (index === -1) {
    index = url.indexOf('#')
  }

  if (index !== -1) {
    newUrl = url.substring(0, index)
  }

  return newUrl
}

/**
 * Check whether the user ID is one of BOT owners
 */
export const isBotOwner = (userId: string): boolean =>
  discordConfig.ownerIds.indexOf(userId) !== -1

/**
 * Find a general channel if it's not given by Discord
 */
export const getGeneralChannel = (guild: Guild): TextChannel | null => {
  const { id, systemChannel, channels } = guild

  // Check if there is a system channel already given
  if (systemChannel) {
    return systemChannel as TextChannel
  }

  // Otherwise find the first text channel that is visible by all
  return channels.cache.find((value: GuildChannel): boolean => {
    const everyonePermissions = value.permissionsFor(id)

    return (
      value.type === 'text' &&
      (everyonePermissions !== null &&
        everyonePermissions.has('READ_MESSAGES' as PermissionResolvable, false))
    )
  }) as TextChannel
}

/**
 * A horrible way of making a clock
 */
export const secondsToClock = (seconds: number): string => {
  const date = new Date(seconds * 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = date.getMinutes()
  seconds = date.getSeconds()

  return [hours, minutes, seconds]
    .map((digits: number): string =>
      digits.toString().length === 1 ? `0${digits}` : `${digits}`,
    )
    .map((part: string, i: number) => {
      // Remove hours if leading with both zeroes
      if (i === 0 && part === '00') {
        return null
      }
      // For hours and minutes remove leading zeroes
      if ((i === 0 || i === 1) && part.indexOf('0') === 0) {
        return part.substr(1, 1)
      }
      // Always returns seconds as is
      return part
    })
    .filter((part: string | null) => part !== null)
    .join(':')
}

export const sortNumberObject = (data: NumberObject): NumberObject => {
  const result: NumberObject = {}

  Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, value]) => {
      result[key] = value
    })

  return result
}

export const joinAsLines = (...args: string[]): string => {
  const lines = []

  for (const arg of args) {
    if (Array.isArray(arg)) {
      for (const line of arg) {
        lines.push(line)
      }
    } else {
      lines.push(arg)
    }
  }

  return lines.join('\n')
}

export const isColorBright = (R: number, G: number, B: number): boolean =>
  R + G + B > 255 * 1.5

export const getImageAverageColorData = async (
  imageUrl: string,
): Promise<ImageColorData> => {
  // Sizes
  const [width, height] = [64, 64]

  // Canvas settings
  const canvas = Canvas.createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // Draw image
  const image = await Canvas.loadImage(imageUrl)

  ctx.drawImage(image, 0, 0, width, height)

  // Get image color data
  let colorCount = 0
  const colorSum = {
    R: 0,
    G: 0,
    B: 0,
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { data } = ctx.getImageData(x, y, 1, 1)

      colorCount++
      colorSum.R += data[0]
      colorSum.G += data[1]
      colorSum.B += data[2]
    }
  }

  const [R, G, B] = [
    Math.floor(colorSum.R / colorCount),
    Math.floor(colorSum.G / colorCount),
    Math.floor(colorSum.B / colorCount),
  ]

  // Fill the canvas with the color
  ctx.fillStyle = `rgb(${R}, ${G}, ${B})`
  ctx.fillRect(0, 0, width, height)

  return {
    R,
    G,
    B,
    color: rgbToHex(R, G, B, false) as number,
    colorHex: rgbToHex(R, G, B) as string,
    isBright: isColorBright(R, G, B),
  }
}

export const getImageDominantColorData = async (
  imageUrl: string,
): Promise<ImageColorData> => {
  const [R, G, B] = await colorThief.getColor(imageUrl)

  return {
    R,
    G,
    B,
    color: rgbToHex(R, G, B, false) as number,
    colorHex: rgbToHex(R, G, B) as string,
    isBright: isColorBright(R, G, B),
  }
}

export const getImageBestColorData = async (
  imageUrl: string,
): Promise<ImageColorData> => {
  const { R: R1, G: G1, B: B1 } = await getImageAverageColorData(imageUrl)
  const { R: R2, G: G2, B: B2 } = await getImageDominantColorData(imageUrl)
  const getBrightestColor = () => {
    const a = [R1, G1, B1]
    const b = [R2, G2, B2]
    const sumA = R1 + G1 + B1
    const sumB = R2 + G2 + B2

    return sumA > sumB ? a : b
  }
  const [R, G, B] = getBrightestColor()

  return {
    R,
    G,
    B,
    color: rgbToHex(R, G, B, false) as number,
    colorHex: rgbToHex(R, G, B) as string,
    isBright: isColorBright(R, G, B),
  }
}

export const invertColorData = (colorData: ImageColorData): ImageColorData => {
  const R = 255 - colorData.R
  const G = 255 - colorData.G
  const B = 255 - colorData.B

  return {
    R,
    G,
    B,
    color: rgbToHex(R, G, B, false) as number,
    colorHex: rgbToHex(R, G, B) as string,
    isBright: isColorBright(R, G, B),
  }
}
