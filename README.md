# Recall-Plugin
Yunzai云崽 消息撤回 RecallMessage 插件

# 安装
```bash
git clone https://github.com/rainbowwarmth/Recall-Plugin ./plugins/Recall-Plugin
```
> [!tip]
> 如果您的网络环境较差，建议使用代理加速
> ```
> git clone https://ghproxy.mihomo.me/https://github.com/rainbowwarmth/Recall-Plugin ./plugins/Recall-Plugin
> ```

# 配置文件说明
1.使用`#开启群撤回`命令，会在项目文件内生成一个`data`文件夹，`data`文件夹会有以你当前BotID(机器人ID)的文件夹，文件夹内含有以你当前群聊发送`#开启群撤回`命令所生成的配置文件。
```
// 配置文件示例
group_id: 575164125 //当前群聊ID
recall_enabled: true //群撤回开关
keywords: // 违禁词填写
  - '123'
  - 测试
```
> [!WARNING]
> 非常不建议手动修改配置文件，请使用命令来修改配置文件

2.运行时自动生成`config`文件夹，文件夹含有priority.yaml，为各个js的命令优先级设置。

# 命令汇总
### 开启/关闭群撤回
### 违禁词添加/删除 测试
### Recall/撤回插件更新
