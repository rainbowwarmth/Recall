# Recall
Yunzai云崽 消息撤回 RecallMessage js插件

## 文件结构
发送`#开启群撤回`会在Yunzai根目录\data\recallGroups\ {BOT_ID}文件夹，生成以当前群号命名的yaml文件

```sh
group_id: 123456789 #当前群聊id
recall_enabled: true #开启关闭群撤回开关
keywords: # 违禁词
  - 测试
  - "123"
  - 

```
