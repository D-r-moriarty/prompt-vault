# Todo 模块设计方案

## Context

在现有提示词工坊项目中新增 Todo 功能模块，实现任务管理、日历结合和提醒功能。用户可以通过左上角按钮在"提示词"和"Todo"两个模块间切换。

## 需求摘要

1. **任务管理** — 添加/编辑/删除、优先级（高/中/低）、标签、截止日期
2. **日历结合** — 日视图和月视图，显示任务到期
3. **看板** — 列表视图和看板视图切换（待办→进行中→完成）
4. **提醒** — 浏览器通知 API

## 技术决策

| 项目 | 决策 |
|------|------|
| 数据存储 | 共用 GitHub Gist，单一 JSON 文件 |
| 提醒方式 | 浏览器 Notification API |
| 看板拖拽 | MVP 先做简单切换，拖拽后续迭代 |

## 数据模型

```javascript
{
  version: '2.0',
  prompts: [...],
  categories: [...],
  todos: [{
    id: string,
    title: string,
    description: string,
    status: 'todo' | 'doing' | 'done',
    priority: 'high' | 'medium' | 'low',
    dueDate: string,       // YYYY-MM-DD
    dueTime: string,       // HH:mm
    tags: string[],
    project: string,
    createdAt: string,
    updatedAt: string
  }],
  settings: {...}
}
```

## 架构设计

### 文件结构
```
js/
├── store.js      # 新增 todos 状态和方法
├── components.js # 新增 Todo 相关渲染函数
├── app.js        # 新增视图切换逻辑
├── calendar.js   # 新增日历组件
css/
├── components.css # 新增 Todo 组件样式
index.html        # 新增视图容器、切换按钮
```

### 视图切换
- Header 左侧添加模块切换按钮
- 侧边栏根据当前模块显示不同内容
- 主内容区根据模块渲染对应视图

### 组件划分

1. **Store** — `addTodo()`, `updateTodo()`, `deleteTodo()`, `toggleTodoStatus()`
2. **Components** — `renderTodoList()`, `renderKanbanBoard()`, `renderCalendar()`, `renderTodoEditor()`
3. **Calendar** — `renderMonthView()`, `renderDayView()`, `getTodosForDate()`

## 功能清单

### MVP (第一阶段)
- [ ] 模块切换按钮和视图路由
- [ ] Todo 列表视图（添加/编辑/删除/完成）
- [ ] 优先级筛选和标签
- [ ] 基础日历月视图
- [ ] GitHub Gist 数据同步

### 第二阶段
- [ ] 看板视图（待办/进行中/完成列）
- [ ] 日视图
- [ ] 截止时间设置

### 第三阶段
- [ ] 浏览器通知提醒
- [ ] 看板拖拽
- [ ] 提醒设置界面

## 验证计划

1. 切换到 Todo 模块，验证视图正确显示
2. 创建任务，验证数据保存和同步
3. 设置截止日期，验证日历显示
4. 测试浏览器通知权限和提醒
5. 切换回提示词模块，验证原有功能不受影响