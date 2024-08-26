import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import { pluginData, Cfg } from '#Recall'
import { parse, stringify } from 'yaml'

export class recall extends plugin {
    constructor() {
        super({
            name: '[Recall-Plugin]设置',
            dsc: 'Recall功能设置',
            event: 'message',
            priority: Cfg.getConfig('priority').setRecall,
            rule: [
                {
                    reg: "^#开启群撤回$",
                    fnc: 'enableRecall',
                    permission: 'admin'
                },
                {
                    reg: "^#关闭群撤回$",
                    fnc: 'disableRecall',
                    permission: 'admin'
                }
            ]
        })
    }

    async enableRecall(e) {
        const botId = e.self_id
        const groupId = e.group_id
        const botConfigDir = path.join(pluginData, botId.toString())
        if (!groupId) {
            return true
        }
        if (!fs.existsSync(botConfigDir)) {
            fs.mkdirSync(botConfigDir, { recursive: true })
        }
        const filePath = path.join(botConfigDir, `${groupId}.yaml`)

        if (!fs.existsSync(pluginData)) {
            fs.mkdirSync(pluginData, { recursive: true })
        }

        if (fs.existsSync(filePath)) {
            let config = parse(fs.readFileSync(filePath, 'utf8'))
            config.recall_enabled = true
            fs.writeFileSync(filePath, stringify(config))
            e.reply('本群已开启自动撤回功能。')
        } else {
            const defaultConfig = {
                group_id: groupId,
                recall_enabled: true,
                keywords: []
            };
            fs.writeFileSync(filePath, stringify(defaultConfig))
            e.reply('已为本群开启自动撤回功能。')
        }

        logger.mark(`群 ${groupId} 已开启自动撤回功能。`)
        return false
    }

    async disableRecall(e) {
        const botId = e.self_id
        const groupId = e.group_id
        const botConfigDir = path.join(pluginData, botId.toString())
        if (!fs.existsSync(botConfigDir)) {
            fs.mkdirSync(botConfigDir, { recursive: true })
        }
        const filePath = path.join(botConfigDir, `${groupId}.yaml`)

        if (fs.existsSync(filePath)) {
            let config = parse(fs.readFileSync(filePath, 'utf8'))
            config.recall_enabled = false;
            fs.writeFileSync(filePath, stringify(config))
            e.reply('本群已关闭自动撤回功能。')
        } else {
            e.reply('本群尚未开启自动撤回功能。')
        }

        logger.mark(`群 ${groupId} 已关闭自动撤回功能。`)
        return false
    }
}