import plugin from '../../../lib/plugins/plugin.js'
import common from "../../../lib/common/common.js"
import _ from 'lodash'
import { exec } from 'child_process'

let Restart = null
try {
  Restart = (await import("../../other/restart.js").catch(e => null))?.Restart
  Restart ||= (await import("../../system/apps/restart.ts")).Restart
} catch {
  logger.error(`[Recall-Plugin]未获取到重启js，重启将无法使用`)
}

// 是否在更新中
let uping = false

export class Update extends plugin {
    constructor () {
        super({
            name: '[Recall-Plugin]插件更新',
            event: 'message',
            priority: 1000,
            rule: [
                {
                    reg: `^#?(撤回|Recall|消息撤回|Recall-Plugin)(插件)?(强制)?更新$`,
                    fnc: 'update'
                }
            ]
        })
    }
    async update () {
        if (!this.e.isMaster) return false

         /** 检查是否正在更新中 */
        if (uping) {
            await this.reply('已有命令更新中..请勿重复操作')
            return
        }

        /** 检查git安装 */
        if (!(await this.checkGit())) return

        const isForce = this.e.msg.includes('强制')
        
        /** 执行更新 */
        await this.runUpdate(isForce)

        /** 是否需要重启 */
        if (this.isUp) {
            // await this.reply("更新完毕，请重启云崽后生效")
            setTimeout(() => this.restart(), 2000)
        }
    }

    restart () {
        new this.restart(this.e).restart()
    }

    async runUpdate (isForce) {
        const _path = './plugins/Recall-Plugin/'
        let command = `git -C ${_path} pull --no-rebase`
        if (isForce) {
          command = `git -C ${_path} fetch --all && git -C ${_path} reset --hard HEAD`
          this.e.reply('正在执行强制更新操作，请稍等')
        } else {
          this.e.reply('正在执行更新操作，请稍等')
        }
        /** 获取上次提交的commitId，用于获取日志时判断新增的更新日志 */
        this.oldCommitId = await this.getcommitId('Recall-Plugin')
        uping = true
        let ret = await this.execSync(command)
        uping = false
    
        if (ret.error) {
          logger.mark(`${this.e.logFnc} 更新失败：Recall-Plugin`)
          this.gitErr(ret.error, ret.stdout)
          return false
        }
    
        /** 获取插件提交的最新时间 */
        let time = await this.getTime('Recall-Plugin')
    
        if (/(Already up[ -]to[ -]date|已经是最新的)/.test(ret.stdout)) {
          await this.reply(`Recall-Plugin已经是最新版本\n最后更新时间：${time}`)
        } else {
          await this.reply(`Recall-Plugin\n最后更新时间：${time}`)
          this.isUp = true
          /** 获取星铁组件的更新日志 */
          let log = await this.getLog('Recall-Plugin')
          await this.reply(log)
        }
    
        logger.mark(`${this.e.logFnc} 最后更新时间：${time}`)
    
        return true
      }
    
      /**
       * 获取星铁插件的更新日志
       * @param {string} plugin 插件名称
       * @returns
       */
      async getLog (plugin = '') {
        let cm = `cd ./plugins/${plugin}/ && git log  -20 --oneline --pretty=format:"%h||[%cd]  %s" --date=format:"%m-%d %H:%M"`
    
        let logAll
        try {
          logAll = await this.execSync(cm, { encoding: 'utf-8' })
        } catch (error) {
          logger.error(error.toString())
          this.reply(error.toString())
        }
    
        if (!logAll.stdout) return false
    
        logAll = logAll.stdout.split('\n')
    
        let log = []
        for (let str of logAll) {
          str = str.split('||')
          if (str[0] == this.oldCommitId) break
          if (str[1].includes('Merge branch')) continue
          log.push(str[1])
        }
        let line = log.length
        log = log.join('\n\n')
    
        if (log.length <= 0) return ''
    
        const end = '更多详细信息，请前往gitee查看\nhttps://gitee.com/rainbowwarmth/Recall-Plugin'
    
        log = await common.makeForwardMsg(this.e, [log, end], `Recall-Plugin更新日志，共${line}条`)
    
        return log
      }
    
      /**
       * 获取上次提交的commitId
       * @param {string} plugin 插件名称
       * @returns
       */
      async getcommitId (plugin = '') {
        let cm = `git -C ./plugins/${plugin}/ rev-parse --short HEAD`
    
        let commitId = await this.execSync(cm, { encoding: 'utf-8' })
        commitId = _.trim(commitId.stdout)
    
        return commitId
      }
    
      /**
       * 获取本次更新插件的最后一次提交时间
       * @param {string} plugin 插件名称
       * @returns
       */
      async getTime (plugin = '') {
        let cm = `cd ./plugins/${plugin}/ && git log -1 --oneline --pretty=format:"%cd" --date=format:"%m-%d %H:%M"`
    
        let time = ''
        try {
          time = await this.execSync(cm, { encoding: 'utf-8' })
          time = _.trim(time.stdout)
        } catch (error) {
          logger.error(error.toString())
          time = '获取时间失败'
        }
        return time
      }
    
      /**
       * 处理更新失败的相关函数
       * @param {string} err
       * @param {string} stdout
       * @returns
       */
      async gitErr (err, stdout) {
        let msg = '更新失败！'
        let errMsg = err.toString()
        stdout = stdout.toString()
    
        if (errMsg.includes('Timed out')) {
          let remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, '')
          await this.reply(msg + `\n连接超时：${remote}`)
          return
        }
    
        if (/Failed to connect|unable to access/g.test(errMsg)) {
          let remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, '')
          await this.reply(msg + `\n连接失败：${remote}`)
          return
        }
    
        if (errMsg.includes('be overwritten by merge')) {
          await this.reply(
            msg +
            `存在冲突：\n${errMsg}\n` +
            '请解决冲突后再更新，或者执行#强制更新，放弃本地修改'
          )
          return
        }
    
        if (stdout.includes('CONFLICT')) {
          await this.reply([
            msg + '存在冲突\n',
            errMsg,
            stdout,
            '\n请解决冲突后再更新，或者执行#强制更新，放弃本地修改'
          ])
          return
        }
    
        await this.reply([errMsg, stdout])
      }
    
      /**
       * 异步执行git相关命令
       * @param {string} cmd git命令
       * @returns
       */
      async execSync (cmd) {
        return new Promise((resolve, reject) => {
          exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
            resolve({ error, stdout, stderr })
          })
        })
      }
    
      /**
       * 检查git是否安装
       * @returns
       */
      async checkGit() {
        let ret = await this.execSync('git --version', { encoding: 'utf-8' })
        if (!ret.stdout || !ret.stdout.includes('git version')) {
          await this.reply('请先安装git')
          return false
        }
        return true
      }
}