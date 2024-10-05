/**
 更新时间：2024/10/5
 制作人：xinixinxin, rainbowwarmth
 注意：
 1.需要机器人有管理员权限
 2.如果使用TRSS-Yunzai的OneBotV11适配器无法撤回消息，请修改OneBotV11.js将第131-139行代码改为下面代码
  
 async recallMsg(data, message_id) {
    Bot.makeLog("info", `撤回消息：${message_id}`, data.self_id)
    if (!Array.isArray(message_id))
      message_id = [message_id]
    const results = await Promise.all(
        message_id.map(async i => {
            try {
                const result = await data.bot.sendApi("delete_msg", { message_id: i });
                Bot.makeLog("success", `成功撤回消息 ${i}`, data.self_id);
                return result;
            } catch (error) {
                return null
            }
        })
    );
    return results.filter(result => result !== null)
}
 */

import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import { parse, stringify } from 'yaml'

export class recall extends plugin {
    constructor() {
        super({
            name: '自动撤回',
            dsc: '自动撤回含有特定违禁词的消息',
            event: 'message',
            priority: 100,
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
                    reg: "^#设置违禁词处理方式 (.+)$",
                    fnc: 'setBannedWordAction',
                    permission: 'admin'
                },
                {
                    reg: "^#设置禁言时间 (.+)$",
                    fnc: 'setMuteDuration',
                    permission: 'admin'
                },
                {
                    reg: ".*",
                    fnc: 'recallMessage'
                }
            ]
        })
    }
   
   /**
   * 处理群消息撤回开启
   */
   async enableRecall(e) {
       const botId = e.self_id
       const groupId = e.group_id
       const botConfigDir = path.join('./data/recallGroups', botId.toString())
       if (!fs.existsSync(botConfigDir)) {
           fs.mkdirSync(botConfigDir, { recursive: true })
       }
       
       const filePath = path.join(botConfigDir, `${groupId}.yaml`)
       
       if (!fs.existsSync(filePath)) {
           fs.writeFileSync(filePath, '', 'utf8')
        } else {
            if (!fs.lstatSync(filePath).isFile()) {
                fs.rmdirSync(filePath)
                fs.writeFileSync(filePath, '', 'utf8')
            }
        }
        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
            try {
                let config = parse(fs.readFileSync(filePath, 'utf8'))
                if (config === null) {
                    config = {}
                }
                
                config.group_id = groupId
                config.recall_enabled = true
                config.keywords = config.keywords || []
                config.action = config.action || '3'
                config.mute_duration = config.mute_duration || 60
                fs.writeFileSync(filePath, stringify(config), 'utf8')
                e.reply('本群已开启自动撤回功能。')
            } catch (error) {
                logger.error(`读取配置文件 ${filePath} 时出错: ${error.message}`)
                return true
            }
        } else {
            const defaultConfig = {
                group_id: groupId,
                recall_enabled: true,
                keywords: [],
                action: '3',
                mute_duration: 60
            }
            fs.writeFileSync(filePath, stringify(defaultConfig), 'utf8')
            e.reply('已为本群开启自动撤回功能。')
        }
        logger.mark(`群 ${groupId} 已开启自动撤回功能。`)
        return false
    }

   /**
   * 处理群消息撤回关闭
   */
   async disableRecall(e) {
    const botId = e.self_id
    const groupId = e.group_id
    const botConfigDir = path.join('./data/recallGroups', botId.toString())
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
   
   /**
    * 添加群违禁词
    */
   async addBannedWord(e) {
    const botId = e.self_id
    const groupId = e.group_id
    const botConfigDir = path.join('./data/recallGroups', botId.toString())
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

    return false
}

   /**
   * 删除群违禁词
   */
   async deleteBannedWord(e) {
    const botId = e.self_id
    const groupId = e.group_id
    const botConfigDir = path.join('./data/recallGroups', botId.toString())
    if (!groupId) {
        return true
    }
    const filePath = path.join(botConfigDir, `${groupId}.yaml`)
    
    if (fs.existsSync(filePath)) {
        let config = parse(fs.readFileSync(filePath, 'utf8'))
        const bannedWordToDelete = e.msg.match(/^#违禁词删除 (.+)$/)[1].trim()
        
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
    
    return false
}

   /**
   * 查看群违禁词
   */
   async viewBannedWords(e) {
    const botId = e.self_id
    const groupId = e.group_id
    const botConfigDir = path.join('./data/recallGroups', botId.toString())
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

   /**
   * 设置违禁词处理方式
   */
   async setBannedWordAction(e) {
    const botId = e.self_id
    const groupId = e.group_id
    const botConfigDir = path.join('./data/recallGroups', botId.toString())
    const filePath = path.join(botConfigDir, `${groupId}.yaml`)
    const action = e.msg.match(/^#设置违禁词处理方式 (.+)$/)[1].trim()
    const validActions = ['1', '2', '3', '4', '5']
    
    if (!validActions.includes(action)) {
        e.reply(`无效的处理方式，请选择以下之一：${validActions.join(', ')}`)
        return false
    }
    
    if (fs.existsSync(filePath)) {
        let config = parse(fs.readFileSync(filePath, 'utf8'))
        config.action = action;
        fs.writeFileSync(filePath, stringify(config), 'utf8')
        e.reply(`违禁词处理方式已设为：${action}`)
    } else {
        e.reply('本群尚未开启自动撤回功能，请先使用 #开启群撤回 命令。')
    }
    
    return false
}

   /**
   * 设置禁言时间
   */
   async setMuteDuration(e) {
    const botId = e.self_id
    const groupId = e.group_id
    const botConfigDir = path.join('./data/recallGroups', botId.toString())
    const filePath = path.join(botConfigDir, `${groupId}.yaml`)
    const muteDuration = parseInt(e.msg.match(/^#设置禁言时间 (.+)$/)[1].trim(), 10)
  
    if (isNaN(muteDuration) || muteDuration <= 0) {
      e.reply('无效的禁言时间，请输入一个正整数。')
      return false
    }
  
    if (fs.existsSync(filePath)) {
      let config = parse(fs.readFileSync(filePath, 'utf8'))
      config.mute_duration = muteDuration;
      fs.writeFileSync(filePath, stringify(config), 'utf8')
      e.reply(`禁言时间已设置为：${muteDuration} 秒`)
    } else {
      e.reply('本群尚未开启自动撤回功能，请先使用 #开启群撤回 命令。')
    }
  
    return false
}
   /**
   * 处理消息撤回逻辑
   */
   async recallMessage(e) {
    const botId = e.self_id
    const groupId = e.group_id
    const senderCard = e.sender.card || e.sender.nickname
    const botConfigDir = path.join('./data/recallGroups', botId.toString())
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
        const action = config?.action || '3'
        const mute_duration = config.mute_duration || 60

        if (!recallEnabled || !Array.isArray(keywords)) return true

        const folderSelfId = path.basename(path.dirname(filePath))
        if (folderSelfId !== botId.toString()) {
             logger.mark(`当前机器人ID ${botId} 与配置文件路径中的ID ${folderSelfId} 不一致，跳过撤回任务。`)
             return true
        }

        for (let keyword of keywords) {
             if (typeof keyword === 'string' && e.msg && e.msg.includes(keyword)) {
                 if (e.group && typeof e.group.recallMsg === 'function') {
                  switch (action) {
                    case '1':
                      await e.group.kickMember(e.user_id)
                      e.reply(`${senderCard} 已被踢出群聊，触发违禁词：${keyword}`)
                      break
                    case '2':
                      await e.group.muteMember(e.user_id, mute_duration);
                      e.reply(`${senderCard} 已被禁言，触发违禁词：${keyword}`)
                      break
                    case '3':
                      await e.group.recallMsg(e.message_id)
                      e.reply(`消息已撤回，触发违禁词：${keyword}`)
                      break;
                    case '4':
                      await e.group.kickMember(e.user_id)
                      await e.group.recallMsg(e.message_id)
                      e.reply(`${senderCard} 已被踢出并消息已撤回，触发违禁词：${keyword}`)
                      break
                    case '5':
                      await e.group.muteMember(e.user_id, mute_duration)
                      await e.group.recallMsg(e.message_id)
                      e.reply(`${senderCard} 已被禁言并消息已撤回，触发违禁词：${keyword}`)
                      break
                    }
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
