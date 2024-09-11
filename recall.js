import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import { parse, stringify } from 'yaml'

const _path = process.cwd().replace(/\\/g, '/')

export class recall extends plugin {
    constructor() {
        super({
            name: '[Recall]消息撤回',
            dsc: '[Recall]消息撤回',
            event: 'message',
            priority: -114514,
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
                },
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
                },
                {
                    reg: ".*",
                    fnc: 'recallMessage'
                }
            ]
        })
    }

    async enableRecall(e) {
        const botId = e.self_id
        const groupId = e.group_id
        const botConfigDir = path.join(_path, botId.toString())
        if (!groupId) {
            return true
        }
        if (!fs.existsSync(botConfigDir)) {
            fs.mkdirSync(botConfigDir, { recursive: true })
        }
        const filePath = path.join(botConfigDir, `${groupId}.yaml`)

        if (!fs.existsSync(_path)) {
            fs.mkdirSync(_path, { recursive: true })
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
        const botConfigDir = path.join(_path, botId.toString())
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
    async addBannedWord(e) {
        const botId = e.self_id
        const groupId = e.group_id
        const botConfigDir = path.join(_path, botId.toString())
        if (!groupId) {
            return true
        }
        const filePath = path.join(botConfigDir, `${groupId}.yaml`)
        if (fs.existsSync(filePath)) {
            let config = parse(fs.readFileSync(filePath, 'utf8'))
            const newBannedWord = e.msg.match(/^#违禁词添加 (.+)$/)[1].trim()

            if (typeof newBannedWord !== 'string' || newBannedWord.length === 0) {
                e.reply('违禁词无效。');
                logger.mark(`群 ${groupId} 添加违禁词失败，违禁词无效：${newBannedWord}`)
                return false;
            }

            if (!config.keywords.includes(newBannedWord)) {
                config.keywords.push(newBannedWord);
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

        return false;
    }

    async deleteBannedWord(e) {
        const botId = e.self_id
        const groupId = e.group_id
        const botConfigDir = path.join(_path, botId.toString())
        if (!groupId) {
            return true
        }
        const filePath = path.join(botConfigDir, `${groupId}.yaml`)

        if (fs.existsSync(filePath)) {
            let config = parse(fs.readFileSync(filePath, 'utf8'))
            const bannedWordToDelete = e.msg.match(/^#违禁词删除 (.+)$/)[1].trim();

            if (typeof bannedWordToDelete !== 'string' || bannedWordToDelete.length === 0) {
                e.reply('违禁词无效。');
                logger.mark(`群 ${groupId} 删除违禁词失败，违禁词无效：${bannedWordToDelete}`)
                return false;
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

        return false;
    }

    async viewBannedWords(e) {
        const botId = e.self_id
        const groupId = e.group_id
        const botConfigDir = path.join(_path, botId.toString())
        if (!groupId) {
            return true
        }
        const filePath = path.join(botConfigDir, `${groupId}.yaml`)

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

    async recallMessage(e) {
        const botId = e.self_id
        const groupId = e.group_id
        const botConfigDir = path.join(_path, botId.toString())
        const filePath = path.join(botConfigDir, `${groupId}.yaml`)
    
        if (e.image || e.face) {
            logger.mark(`群 ${groupId} 的消息包含图片或表情，直接放行。`)
            return true
        }
    
        const facePattern = /\[<face,id=\d+>\]/
        if (e.msg && facePattern.test(e.msg)) {
            logger.mark(`群 ${groupId} 的消息 "${e.msg}" 被过滤，包含特定表情格式。`)
            return false
        }

        if (fs.existsSync(filePath)) {
            let config
            try {
                config = parse(fs.readFileSync(filePath, 'utf8'))
            } catch (error) {
                logger.error(`读取配置文件 ${filePath} 时出错: ${error.message}`)
                return true;
            }
    
            const recallEnabled = config?.recall_enabled
            const keywords = config?.keywords || []

            if (!recallEnabled || !Array.isArray(keywords)) return true

            const folderSelfId = path.basename(path.dirname(filePath))
            if (folderSelfId !== botId.toString()) {
                logger.mark(`当前机器人ID ${botId} 与配置文件路径中的ID ${folderSelfId} 不一致，跳过撤回任务。`)
                return true
            }

            for (let keyword of keywords) {
                if (typeof keyword === 'string' && e.msg && e.msg.includes(keyword)) {
                    if (e.group && typeof e.group.recallMsg === 'function') {
                        await e.group.recallMsg(e.message_id)
                        logger.mark(`群 ${groupId} 的消息 "${e.msg}" 已被撤回，触发违禁词：${keyword}`)
                        return false
                    } else {
                        logger.mark(`无法撤回消息，群组对象未定义或 recallMsg 方法不可用。`)
                    }
                }
            }
        }
    
        return false
    }
}