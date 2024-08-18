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
                    reg: ".*",
                    fnc: 'recallMessage'
                }
            ]
        })
    }
    
    async recallMessage(e) {
        const groupId = e.group_id;
        const filePath = path.join(pluginData, `${groupId}.yaml`);

        if (e.image || e.face) {
            logger.mark(`群 ${groupId} 的消息包含图片或表情，直接放行。`);
            return true;
        }
    
        const facePattern = /\[<face,id=\d+>\]/;
        if (e.msg && facePattern.test(e.msg)) {
            logger.mark(`群 ${groupId} 的消息 "${e.msg}" 被过滤，包含特定表情格式。`);
            return false;
        }
    
        if (fs.existsSync(filePath)) {
            let config;
            try {
                config = parse(fs.readFileSync(filePath, 'utf8'));
            } catch (error) {
                logger.error(`读取配置文件 ${filePath} 时出错: ${error.message}`);
                return true;
            }
    
            const recallEnabled = config?.recall_enabled;
            const keywords = config?.keywords || [];
    
            if (!recallEnabled || !Array.isArray(keywords)) return true;
    
            for (let keyword of keywords) {
                if (typeof keyword === 'string' && e.msg && e.msg.includes(keyword)) {
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
    
        return false;
    }
}