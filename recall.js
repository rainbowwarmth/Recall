/**
 更新时间：2025/02/22
 制作人：xinixinxin, rainbowwarmth
 注意：
 需要机器人有管理员权限
 */
import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs/promises'
import path from 'path'
import { parse, stringify } from 'yaml'

const CONFIG_DIR = './data/recallGroups'
const DEFAULT_CONFIG = {
  group_id: null,
  recall_enabled: false,
  keywords: [],
  action: '3',
  mute_duration: 60,
  push_set: false
}
const VALID_ACTIONS = new Set(['1', '2', '3', '4', '5'])

class ConfigManager {
  constructor(botId, groupId) {
    this.botId = botId
    this.groupId = groupId
    this.configPath = path.join(CONFIG_DIR, botId.toString(), `${groupId}.yaml`)
  }

  async ensureConfigDir() {
    try {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true })
    } catch (error) {
      logger.error(`创建配置目录失败: ${error.message}`)
      throw error
    }
  }

  async loadConfig() {
    try {
      const content = await fs.readFile(this.configPath, 'utf8')
      return { ...DEFAULT_CONFIG, ...parse(content) }
    } catch (error) {
      if (error.code === 'ENOENT') return null
      logger.error(`读取配置文件失败: ${error.message}`)
      throw error
    }
  }

  async saveConfig(config) {
    try {
      await this.ensureConfigDir()
      await fs.writeFile(this.configPath, stringify(config))
    } catch (error) {
      logger.error(`保存配置文件失败: ${error.message}`)
      throw error
    }
  }
}

export class Recall extends plugin {
    constructor() {
      super({
        name: '自动撤回',
        dsc: '自动撤回含有特定违禁词的消息',
        event: 'message',
        priority: 100,
        rule: [
          {reg: "^#(开启|关闭)群撤回$", fnc: 'RecallSet', permission: 'admin'},
          {reg: "^#违禁词(添加|删除) (.+)$", fnc: 'BannedWordSet', permission: 'admin'},
          {reg: "^#查看违禁词$", fnc: 'viewBannedWords', permission: 'admin'},
          {reg: "^#设置(违禁词处理方式|禁言时间|违规推送) (.+)$", fnc: 'InfractionSet', permission: 'admin'},
          {reg: ".*", fnc: 'recallMessage', log: false}
        ]
      })
  }

  /** 开启/关闭群撤回 */
  async RecallSet(e) {
    const [_, operation] = e.msg.match(/^#(开启|关闭)群撤回$/)
    const config = new ConfigManager(e.self_id, e.group_id)

    try {
      if (operation === '开启') {
        const newConfig = { ...DEFAULT_CONFIG, group_id: e.group_id, recall_enabled: true }
        await config.saveConfig(newConfig)
        e.reply('已为本群开启自动撤回功能。')
        logger.mark(`群 ${e.group_id} 开启自动撤回`)
      } else {
        const existing = await config.loadConfig()
        if (existing) {
          await config.saveConfig({ ...existing, recall_enabled: false })
          e.reply('本群已关闭自动撤回功能。')
        } else {
          e.reply('本群尚未开启自动撤回功能。')
        }
      }
    } catch (error) {
      e.reply('操作失败，请检查日志')
      logger.error(`RecallSet 操作失败: ${error.message}`)
    }
    return false
  }

  /** 违禁词添加/删除 */
  async BannedWordSet(e) {
    const [_, operation, keyword] = e.msg.match(/^#违禁词(添加|删除) (.+)$/)
    const config = new ConfigManager(e.self_id, e.group_id)
    
    try {
      const current = await config.loadConfig()
      if (!current?.recall_enabled) {
        return this.replyWithStatus(e, '本群尚未开启自动撤回功能')
      }

      const keywords = new Set(current.keywords)
      const verb = operation === '添加' ? 'add' : 'delete'

      if (verb === 'add') {
        if (keywords.has(keyword)) {
          e.reply(`违禁词 "${keyword}" 已存在`)
        } else {
          keywords.add(keyword)
          await config.saveConfig({ ...current, keywords: [...keywords] })
          e.reply(`违禁词 "${keyword}" 已添加`)
        }
      } else {
        if (keywords.delete(keyword)) {
          await config.saveConfig({ ...current, keywords: [...keywords] })
          e.reply(`违禁词 "${keyword}" 已删除`)
        } else {
          e.reply(`违禁词 "${keyword}" 不存在`)
        }
      }
    } catch (error) {
      this.handleError(e, 'BannedWordSet', error)
    }
    return false
  }

  /**查看违禁词 */
  async viewBannedWords(e) {
    const config = new ConfigManager(e.self_id, e.group_id)
    
    try {
      const current = await config.loadConfig()
      if (!current?.recall_enabled) {
        return this.replyWithStatus(e, '本群尚未开启自动撤回功能')
      }

      const keywords = current.keywords
      keywords.length > 0 
        ? e.reply(await this.formatKeywords(keywords))
        : e.reply('本群当前没有设置违禁词')
    } catch (error) {
      this.handleError(e, 'viewBannedWords', error)
    }
    return false
  }

  /**设置违禁词处理方式/禁言时间/违规推送*/
  async InfractionSet(e) {
    const [_, settingType, value] = e.msg.match(/^#设置(违禁词处理方式|禁言时间|违规推送) (.+)$/)
    
    try {
      const handler = {
        '违禁词处理方式': this.handleActionSetting,
        '禁言时间': this.handleMuteSetting,
        '违规推送': this.handlePushSetting
      }[settingType]

      return handler ? await handler.call(this, e, value) : false
    } catch (error) {
      this.handleError(e, 'InfractionSet', error)
      return false
    }
  }

  async handleActionSetting(e, value) {
    if (!VALID_ACTIONS.has(value)) {
      e.reply(`无效操作类型，有效值: ${[...VALID_ACTIONS].join(', ')}`)
      return false
    }

    const config = new ConfigManager(e.self_id, e.group_id)
    const current = await this.ensureConfig(config)
    await config.saveConfig({ ...current, action: value })
    e.reply(`处理方式已设置为: ${value}`)
    return false
  }

  async handleMuteSetting(e, value) {
    const duration = parseInt(value, 10)
    if (isNaN(duration) || duration <= 0) {
      e.reply('请输入有效的正整数时间（秒）')
      return false
    }

    const config = new ConfigManager(e.self_id, e.group_id)
    const current = await this.ensureConfig(config)
    await config.saveConfig({ ...current, mute_duration: duration })
    e.reply(`禁言时间已设置为: ${duration}秒`)
    return false
  }

  async handlePushSetting(e, value) {
    const flag = value === '开启'
    const config = new ConfigManager(e.self_id, e.group_id)
    const current = await this.ensureConfig(config)
    await config.saveConfig({ ...current, push_set: flag })
    e.reply(`违规推送已${flag ? '开启' : '关闭'}`)
    return false
  }

  async recallMessage(e) {
    if (this.shouldSkipProcessing(e)) return true

    const config = new ConfigManager(e.self_id, e.group_id)
    try {
      const current = await config.loadConfig()
      if (!current?.recall_enabled) return true

      const matchedKeyword = current.keywords.find(kw => e.msg?.includes(kw))
      if (!matchedKeyword) return true

      await this.applyAction(e, current, matchedKeyword)
      return false
    } catch (error) {
      logger.error(`消息撤回失败: ${error.message}`)
      return true
    }
  }

  async ensureConfig(config) {
    const current = await config.loadConfig()
    if (!current) throw new Error('配置不存在')
    return current
  }

  replyWithStatus(e, message) {
    e.reply(message)
    return false
  }

  handleError(e, context, error) {
    e.reply('操作失败，请稍后重试')
    logger.error(`${context} 错误: ${error.message}`)
  }

  async formatKeywords(keywords) {
    return Bot.makeForwardArray([`违禁词列表:\n${keywords.map(k => `- ${k}`).join('\n')}`])
  }

  shouldSkipProcessing(e) {
    return e.image || e.face || /\[<face,id=\d+>\]/.test(e.msg)
  }

  async applyAction(e, config, keyword) {
    const actions = {
      '1': async () => {
        await e.group.kickMember(e.user_id)
        return '踢出群聊'
      },
      '2': async () => {
        await e.group.muteMember(e.user_id, config.mute_duration)
        return '禁言'
      },
      '3': async () => {
        await e.group.recallMsg(e.message_id)
        return '撤回消息'
      },
      '4': async () => {
        await Promise.all([
          e.group.kickMember(e.user_id),
          e.group.recallMsg(e.message_id)
        ])
        return '踢出并撤回'
      },
      '5': async () => {
        await Promise.all([
          e.group.muteMember(e.user_id, config.mute_duration),
          e.group.recallMsg(e.message_id)
        ])
        return '禁言并撤回'
      }
    }

    const actionResult = await actions[config.action]?.()
    if (config.push_set && actionResult) {
      e.reply(`${e.sender.card || e.sender.nickname} 因触发违禁词 [${keyword}] 已被${actionResult}`)
    }
  }
}
