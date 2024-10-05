# Recall Js 插件
Yunzai云崽 消息撤回 RecallMessage js插件

## 文件结构
发送`#开启群撤回`会在Yunzai根目录\data\recallGroups\ {BOT_ID}文件夹，生成以当前群号命名的yaml文件

```sh
group_id: 123456789 #当前群聊id
recall_enabled: true #开启关闭群撤回开关
action: '3' #设置当前违禁词处理方式（1.踢出群聊，2.禁言处理，3.仅撤回消息，4.踢出群聊并撤回消息，5.禁言并撤回）
mute_duration: 60 #设置禁言时间(单位：秒)
push_set: true #违禁消息处理是否推送至群聊
keywords: # 违禁词
  - 测试
  - "123"
  - 

```

## 注意
非常不建议手动修改配置文件来新增违禁词，可能会出现问题，建议使用命令`#违禁词添加 123` 和 `#违禁词删除 123` 来管控违禁词的增加与删除
