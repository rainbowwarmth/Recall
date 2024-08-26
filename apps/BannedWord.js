import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import { pluginData, Cfg } from '#Recall'
import { parse, stringify } from 'yaml'

export class recall extends plugin {
    constructor() {
        super({
            name: '[Recall-Plugin]违禁词',
            dsc: 'Recall违禁词管理',
            event: 'message',
            priority: Cfg.getConfig('priority').BannedWord,
            rule: [
                {
                    reg: "^#违禁词添加 (.+)$",
                    fnc: 'addBannedWord',
                    permission: 'admin'
                },
                {
                    reg: "^#违禁词删除 (.+)$",
                    fnc: 'deleteBannedWord',
                    permission: 'admin'
                },
                {
                    reg: "^#查看违禁词$",
                    fnc: 'viewBannedWords',
                    permission: 'admin'
                }
            ]
        })
    }

    async addBannedWord(e) {
        const botId = e.self_id
        const groupId = e.group_id;
        const botConfigDir = path.join(pluginData, botId.toString());
        const filePath = path.join(botConfigDir, `${groupId}.yaml`);

        if (fs.existsSync(filePath)) {
            let config = parse(fs.readFileSync(filePath, 'utf8'))
            const newBannedWord = e.msg.match(/^#违禁词添加 (.+)$/)[1].trim()

            if (typeof newBannedWord !== 'string' || newBannedWord.length === 0) {
                e.reply('违禁词无效。')
                logger.mark(`群 ${groupId} 添加违禁词失败，违禁词无效：${newBannedWord}`)
                return false
            }

            if (!config.keywords.includes(newBannedWord)) {
                config.keywords.push(newBannedWord)
                fs.writeFileSync(filePath, stringify(config))
                e.reply(`违禁词 "${newBannedWord}" 已添加。`)
                logger.mark(`群 ${groupId} 添加违禁词：${newBannedWord}`)
            } else {
                e.reply(`违禁词 "${newBannedWord}" 已存在。`)
                logger.mark(`群 ${groupId} 违禁词已存在：${newBannedWord}`)
            }
        } else {
            e.reply('本群尚未开启自动撤回功能，请先使用 #开启群撤回 命令。')
            logger.mark(`群 ${groupId} 添加违禁词失败，尚未开启自动撤回功能。`)
        }

        return false
    }

    async deleteBannedWord(e) {
        const botId = e.self_id
        const groupId = e.group_id;
        const botConfigDir = path.join(pluginData, botId.toString());
        const filePath = path.join(botConfigDir, `${groupId}.yaml`);

        if (fs.existsSync(filePath)) {
            let config = parse(fs.readFileSync(filePath, 'utf8'))
            const bannedWordToDelete = e.msg.match(/^#违禁词删除 (.+)$/)[1].trim()

            if (typeof bannedWordToDelete !== 'string' || bannedWordToDelete.length === 0) {
                e.reply('违禁词无效。')
                logger.mark(`群 ${groupId} 删除违禁词失败，违禁词无效：${bannedWordToDelete}`)
                return false
            }

            if (config.keywords.includes(bannedWordToDelete)) {
                config.keywords = config.keywords.filter(kw => kw !== bannedWordToDelete)
                fs.writeFileSync(filePath, stringify(config), 'utf8')
                e.reply(`违禁词 "${bannedWordToDelete}" 已删除。`)
                logger.mark(`群 ${groupId} 删除违禁词：${bannedWordToDelete}`)
            } else {
                e.reply(`违禁词 "${bannedWordToDelete}" 不存在。`)
                logger.mark(`群 ${groupId} 删除违禁词失败，违禁词不存在：${bannedWordToDelete}`)
            }
        } else {
            e.reply('本群尚未开启自动撤回功能，请先使用 #开启群撤回 命令。')
            logger.mark(`群 ${groupId} 删除违禁词失败，尚未开启自动撤回功能。`)
        }

        return false
    }

    async viewBannedWords(e) {
        const botId = e.self_id
        const groupId = e.group_id;
        const botConfigDir = path.join(pluginData, botId.toString());
        const filePath = path.join(botConfigDir, `${groupId}.yaml`);


        if (fs.existsSync(filePath)) {
            let config = parse(fs.readFileSync(filePath, 'utf8'))
            const keywords = config.keywords

            if (keywords.length > 0) {
                e.reply(await Bot.makeForwardArray([`本群当前的违禁词列表:\n- ${keywords.join('\n- ')}`]))
            } else {
                e.reply('本群当前没有设置违禁词。')
            }

            logger.mark(`群 ${groupId} 查看违禁词列表: ${keywords}`)
        } else {
            e.reply('本群尚未开启自动撤回功能，请先使用 #开启群撤回 命令。')
            logger.mark(`群 ${groupId} 查看违禁词列表失败，尚未开启自动撤回功能。`)
        }

        return false
    }
}