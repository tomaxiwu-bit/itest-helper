# iTest Helper

**本脚本只用于解放双手，答案请自行获得。**

一个用于 iTest 在线考试平台的答案导入助手（ScriptCat / Tampermonkey 用户脚本）。

## 功能

- 自动扫描页面题目，按 DOM 顺序精确匹配
- 支持选择题（A→选项1, B→选项2, C→选项3, D→选项4）
- 支持写作/填空题
- 支持自动翻页，逐页填写
- 答案可保存到本地，下次自动加载

## 安装

### 方法一：直接安装（推荐）

1. 安装 [ScriptCat](https://docs.scriptcat.org/) 或 Tampermonkey 扩展
2. 点击 [itest-helper.user.js](itest-helper.user.js) 直接安装

### 方法二：手动安装

1. 复制 itest-helper.user.js 全部内容
2. 打开 ScriptCat / Tampermonkey → 新建脚本 → 粘贴 → 保存

## 使用

1. 进入 iTest 考试页面（itestcloud.unipus.cn/itest-api/itest/s/answer/index）
2. 页面右侧会出现操作面板
3. 先点击 **扫描题目** 确认题数
4. 粘贴答案 JSON → 点击 **保存答案**（下次自动加载）
5. 点击 **填写当前页** 或 **全部**（自动翻页）

## 答案格式

`json
["A","B","C","D","A","B","C","D",...]
`

- 按题目在页面上出现的**顺序**排列，每个字母一道题
- 支持格式：纯数组 ["A","B"] 或对象 {"answers":["A","B"]}
- 映射规则：A→第1选项，B→第2选项，C→第3选项，D→第4选项

## 自定义

如需修改翻页上限，打开浏览器控制台输入：

`js
GM_setValue("itest_maxPages", 999)
`

## License

MIT
