import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import { pluginData, Cfg } from '#Recall'
import { parse } from 'yaml'

export class recall extends plugin {
    constructor() {
        super({
            name: '[Recall-Plugin]消息撤回',
            dsc: 'Recall消息撤回',
            event: 'message',
            priority: Cfg.getConfig('priority').recallMessage,
            rule: [
                {
                    reg: ".*",  // 匹配所有消息
                    fnc: 'recallMessage'
                }
            ]
        })
    }
    
    async recallMessage(e) {
        const botId = e.self_id
        const groupId = e.group_id;
        const botConfigDir = path.join(pluginData, botId.toString());
        const filePath = path.join(botConfigDir, `${groupId}.yaml`);
    
        // 检查消息是否包含图片或表情
        if (e.image || e.face) {
            logger.mark(`群 ${groupId} 的消息包含图片或表情，直接放行。`);
            return true;
        }
    
        // 检查消息是否包含特定格式的表情，如 [<face,id=6>]
        const facePattern = /\[<face,id=\d+>\]/;
        if (e.msg && facePattern.test(e.msg)) {
            logger.mark(`群 ${groupId} 的消息 "${e.msg}" 被过滤，包含特定表情格式。`);
            return false; // 不允许此消息传播
        }
    
        // 检查配置文件是否存在
        if (fs.existsSync(filePath)) {
            let config;
            try {
                config = parse(fs.readFileSync(filePath, 'utf8'));
            } catch (error) {
                logger.error(`读取配置文件 ${filePath} 时出错: ${error.message}`);
                return true; // 发生错误时，默认允许消息传播
            }
    
            const recallEnabled = config?.recall_enabled;
            const keywords = config?.keywords || [];
    
            // 确保 recallEnabled 为 true 且 keywords 是一个数组
            if (!recallEnabled || !Array.isArray(keywords)) return true;

            const folderSelfId = path.basename(path.dirname(filePath));
            if (folderSelfId !== botId.toString()) {
                logger.mark(`当前机器人ID ${botId} 与配置文件路径中的ID ${folderSelfId} 不一致，跳过撤回任务。`);
                return true;
            }

            for (let keyword of keywords) {
                if (typeof keyword === 'string' && e.msg && e.msg.includes(keyword)) {
                    // 检查 e.group 和 e.group.recallMsg 是否存在
                    if (e.group && typeof e.group.recallMsg === 'function') {
                        await e.group.recallMsg(e.message_id);
                        logger.mark(`群 ${groupId} 的消息 "${e.msg}" 已被撤回，触发违禁词：${keyword}`);
                        return false;
                    } else {
                        logger.mark(`无法撤回消息，群组对象未定义或 recallMsg 方法不可用。`);
                    }
                }
            }
        }
    
        return false; // 没有匹配到违禁词，允许消息继续传播
    }
}