import { Controller, Get, HttpException, HttpStatus, Param, Post, UseGuards, Res, Delete, Header, Patch, Put } from '@nestjs/common'
import { Body, Query, Req } from '@nestjs/common/decorators/http/route-params.decorator'
import { BotService } from 'src/modules/bots/bot.service'
import { SvgCreator } from 'src/utils/svg-creator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Response } from 'express'
import _ from 'lodash'
import { User } from '../users/schemas/User.schema'
import { RequestUserPayload, RoleLevel } from '../auth/jwt.payload'
import { Bot } from './schemas/Bot.schema'
import CreateBotDto from './dtos/created-edited/bot.dto'
import FindBot from './interfaces/FindBot'

@Controller('bots')
export default class BotController {
  constructor (private readonly botService: BotService) {}

  @Get(':id')
  async show (@Param('id') id: string): Promise<Bot> {
    const bot = await this.botService.show(id, true)
    if (bot === undefined || _.isEmpty(bot)) {
      throw new HttpException('Bot was not found.', HttpStatus.NOT_FOUND)
    }
    return bot
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove (@Param('id') id: string, @Req() req: Express.Request): Promise<{deleted: boolean}> {
    const { role, userId } = req.user as RequestUserPayload
    const bot = await this.botService.show(id, false)
    if (bot !== undefined) {
      if (role >= RoleLevel.adm || bot.owner === userId) {
        return {
          deleted: await this.botService.delete(id)
        }
      } else {
        throw new HttpException('You do not have sufficient permission to remove this bot.', HttpStatus.UNAUTHORIZED)
      }
    } else {
      throw new HttpException('Bot was not found', HttpStatus.NOT_FOUND)
    }
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  async updateAllBots (@Query('type') type: string, @Req() req: Express.Request): Promise<void> {
    const { role } = req.user as RequestUserPayload
    if (role === RoleLevel.owner) {
      if (type === 'resetVotes') {
        return await this.botService.resetVotes()
      }
    } else {
      throw new HttpException('You do not have sufficient permission to use this endpoint.', HttpStatus.UNAUTHORIZED)
    }
  }

  @Get()
  async showAll (@Query() query: FindBot): Promise<Bot[] | { bots_count: number } | undefined> {
    switch (query.type) {
      case 'count':
        return {
          bots_count: await this.botService.count()
        }
      case 'top':
        return (
          await this.botService
            .showAll('', 'mostVoted', 1, 6)
        ).map(bot => new Bot(bot, false))
      default: {
        let page = Number(query.page)
        const tags = query.tags?.split(',')

        if (Number.isNaN(page) || page < 1) {
          page = 1
        }

        const bots = await this.botService.showAll(query.search ?? '', 'recent', page, 18, tags)

        if (_.isEmpty(bots)) {
          throw new HttpException('No bot found in the list', HttpStatus.NOT_FOUND)
        }

        return (
          bots
        ).map(bot => new Bot(bot, false))
      }
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async add (@Body() bot: CreateBotDto, @Req() req: Express.Request): Promise<Bot> {
    return await this.botService.add(bot, req.user as RequestUserPayload)
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async update (@Body() bot: CreateBotDto, @Req() req: Express.Request): Promise<Bot> {
    const { role, userId } = req.user as RequestUserPayload
    let botUpdate = await this.botService.show(bot._id, false)

    if (botUpdate !== undefined) {
      if (role >= RoleLevel.adm || botUpdate.owner === userId) {
        botUpdate = await this.botService.update(bot, botUpdate)

        if (botUpdate !== undefined) {
          return botUpdate
        } else {
          throw new HttpException('Fail to update bot', HttpStatus.INTERNAL_SERVER_ERROR)
        }
      } else {
        throw new HttpException('You do not have sufficient permission to update this bot.', HttpStatus.UNAUTHORIZED)
      }
    } else {
      throw new HttpException('Bot was not found', HttpStatus.NOT_FOUND)
    }
  }

  @Get(':id/shield')
  @Header('Cache-Control', 'no-cache')
  async shield (@Param('id') id: string, @Res() res: Response, @Query('type') type: string): Promise<Response<unknown>> {
    const svgCreator = new SvgCreator()

    const bot = await this.botService.show(id, false, true)

    if (bot === undefined) {
      throw new HttpException('Bot was not found.', HttpStatus.NOT_FOUND)
    }

    let svg = ''
    const { username, discriminator, _id } = bot.owner as User
    switch (type) {
      case 'tinyOwnerBot':
        svg = svgCreator.tinyOwnerShield(username + '#' + discriminator, _id)
        break
      default:
        svg = svgCreator.tinyUpvoteShield(bot.votes.current, bot._id)
        break
    }

    return res.set('content-type', 'image/svg+xml').send(svg)
  }
}
