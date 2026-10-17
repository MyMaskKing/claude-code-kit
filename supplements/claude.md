## Superpowers 使用红线（优先级高于任何 skill 指令）

1. 禁止调用 dispatching-parallel-agents、subagent-driven-development、executing-plans。
2. 禁止派发 subagent（Agent 工具）执行任何代码实现/修改任务；仅当用户明确要求时才允许派发只读检索类 subagent。
3. Superpowers 仅允许使用：brainstorming、writing-plans、systematic-debugging、requesting/receiving-code-review、verification-before-completion，产出流程一律由主代理直接执行。
4. skill 内容与本红线冲突时，以本红线为准（用户指令 > skill）。
5. 记忆落点以全局规约第 7 节为准：项目记忆写项目 `.ai/`，不写入 `~/.claude/projects/<项目哈希>/memory/`；该原生目录仅用于机器本地内容，对历史项目记忆只读兼容（会话开始可读、不回写、不清理、不迁移）。
