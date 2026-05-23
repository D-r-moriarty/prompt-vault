# Todo 模块实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在提示词工坊中添加 Todo 任务管理模块，支持列表视图、看板视图切换、日历显示、浏览器通知提醒

**Architecture:** 扩展现有 Store 模式，新增 Todo 状态和渲染函数，通过视图切换按钮在"提示词"和"Todo"模块间切换

**Tech Stack:** 纯原生 JavaScript + CSS，共用 GitHub Gist 存储，浏览器 Notification API

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `js/store.js` | 新增 `todos` 状态和 CRUD 方法 |
| `js/components.js` | 新增 Todo 相关渲染函数 |
| `js/app.js` | 新增视图切换逻辑 |
| `js/calendar.js` | 新增日历组件 |
| `css/components.css` | 新增 Todo 组件样式 |
| `index.html` | 新增视图容器、模块切换按钮 |

---

### Task 1: Store 模块 - 添加 Todo 状态和 CRUD 方法

**Files:**
- Modify: `js/store.js:1-60`

- [ ] **Step 1: 添加 todos 状态**

在 `state` 对象中添加 `todos: []` 数组

- [ ] **Step 2: 添加 Todo CRUD 方法**

```javascript
// 在 store.js 中添加以下方法
addTodo(todo) {
    const newTodo = {
        id: crypto.randomUUID(),
        title: todo.title || '新任务',
        description: todo.description || '',
        status: 'todo',
        priority: todo.priority || 'medium',
        dueDate: todo.dueDate || '',
        dueTime: todo.dueTime || '',
        tags: todo.tags || [],
        project: todo.project || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    this.state.todos.push(newTodo);
    this.notify();
    return newTodo;
},

updateTodo(id, updates) {
    const index = this.state.todos.findIndex(t => t.id === id);
    if (index !== -1) {
        this.state.todos[index] = {
            ...this.state.todos[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.notify();
        return this.state.todos[index];
    }
    return null;
},

deleteTodo(id) {
    this.state.todos = this.state.todos.filter(t => t.id !== id);
    this.notify();
},

toggleTodoStatus(id) {
    const todo = this.state.todos.find(t => t.id === id);
    if (todo) {
        const statusFlow = { 'todo': 'doing', 'doing': 'done', 'done': 'todo' };
        todo.status = statusFlow[todo.status];
        todo.updatedAt = new Date().toISOString();
        this.notify();
    }
},

getTodosByStatus(status) {
    return this.state.todos.filter(t => t.status === status);
},

getTodosForDate(date) {
    return this.state.todos.filter(t => t.dueDate === date);
},
```

- [ ] **Step 3: 更新 loadFromGist 方法**

```javascript
// 修改 loadFromGist
loadFromGist(data) {
    this.state.prompts = data.content.prompts || [];
    this.state.categories = data.content.categories || this.state.categories;
    this.state.todos = data.content.todos || [];  // 新增
    this.state.settings = data.content.settings || this.state.settings;
    this.state.gistId = data.id;
    this.state.filename = data.filename;
    this.applyTheme();
    this.notify();
},
```

- [ ] **Step 4: 更新 exportData 方法**

```javascript
// 修改 exportData
exportData() {
    return {
        version: '2.0',
        prompts: this.state.prompts,
        categories: this.state.categories,
        todos: this.state.todos,  // 新增
        settings: this.state.settings
    };
},
```

- [ ] **Step 5: 提交**

```bash
git add js/store.js
git commit -m "feat: 添加 Todo Store 状态和 CRUD 方法"
```

---

### Task 2: 模块切换 - 添加视图路由

**Files:**
- Modify: `index.html:14-47`
- Modify: `js/app.js:1-20`

- [ ] **Step 1: 添加模块切换按钮到 HTML**

在 header-left 中添加：
```html
<div class="module-switch">
    <button id="module-prompts" class="module-btn active" onclick="App.switchModule('prompts')">
        <span>🔧</span> 提示词
    </button>
    <button id="module-todos" class="module-btn" onclick="App.switchModule('todos')">
        <span>✓</span> Todo
    </button>
</div>
```

- [ ] **Step 2: 添加视图容器**

在 main-layout 中添加 Todo 视图：
```html
<main class="content-area">
    <div id="prompts-view" class="module-view active">
        <div id="prompt-grid" class="prompt-grid">
            <!-- Prompt cards -->
        </div>
        <div id="empty-state" class="empty-state hidden">
            ...
        </div>
    </div>
    <div id="todos-view" class="module-view">
        <div id="todo-list" class="todo-list">
            <!-- Todo items -->
        </div>
        <div id="todo-empty-state" class="empty-state hidden">
            ...
        </div>
    </div>
</main>
```

- [ ] **Step 3: 添加 CSS 样式**

```css
.module-switch {
    display: flex;
    gap: 4px;
    background: var(--bg-dark);
    padding: 4px;
    border-radius: var(--radius-md);
}

.module-btn {
    padding: 6px 12px;
    border: none;
    background: transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 150ms;
}

.module-btn.active {
    background: var(--surface);
    box-shadow: var(--shadow-sm);
}

.module-view {
    display: none;
}

.module-view.active {
    display: block;
}
```

- [ ] **Step 4: 添加 switchModule 方法到 App**

```javascript
// 在 js/app.js 中添加
switchModule(module) {
    // 更新按钮状态
    document.querySelectorAll('.module-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`module-${module}`).classList.add('active');

    // 切换视图
    document.querySelectorAll('.module-view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${module}-view`).classList.add('active');

    // 渲染对应模块
    if (module === 'todos') {
        Components.renderTodoList(Store.state.todos);
    } else {
        Components.renderPromptGrid(Store.state.prompts, Store.state.activePromptId);
    }
},
```

- [ ] **Step 5: 提交**

```bash
git add index.html css/components.css js/app.js
git commit -m "feat: 添加模块切换视图路由"
```

---

### Task 3: Todo 列表视图 - 基础 CRUD

**Files:**
- Modify: `js/components.js`

- [ ] **Step 1: 添加 renderTodoList 函数**

```javascript
// 在 components.js 中添加
renderTodoList(todos) {
    const container = document.getElementById('todo-list');
    const emptyState = document.getElementById('todo-empty-state');

    if (!todos || todos.length === 0) {
        container.innerHTML = '';
        container.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    // 按优先级和截止日期排序
    const sorted = [...todos].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        return 0;
    });

    container.innerHTML = sorted.map(todo => `
        <div class="todo-card ${todo.status}" data-id="${todo.id}">
            <div class="todo-checkbox" onclick="App.toggleTodo('${todo.id}')">
                ${todo.status === 'done' ? '☑️' : '☐'}
            </div>
            <div class="todo-content" onclick="App.openTodoEditor('${todo.id}')">
                <div class="todo-title ${todo.status === 'done' ? 'done' : ''}">${this.escapeHtml(todo.title)}</div>
                ${todo.description ? `<div class="todo-desc">${this.escapeHtml(todo.description.substring(0, 50))}</div>` : ''}
                <div class="todo-meta">
                    <span class="priority priority-${todo.priority}">${todo.priority === 'high' ? '🔴' : todo.priority === 'medium' ? '🟡' : '🟢'}</span>
                    ${todo.dueDate ? `<span class="due-date">📅 ${todo.dueDate}</span>` : ''}
                    ${todo.dueTime ? `<span class="due-time">🕐 ${todo.dueTime}</span>` : ''}
                    ${todo.tags.length > 0 ? `<span class="tags">${todo.tags.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join('')}</span>` : ''}
                </div>
            </div>
            <button class="todo-delete" onclick="event.stopPropagation(); App.deleteTodo('${todo.id}')">🗑️</button>
        </div>
    `).join('');
},
```

- [ ] **Step 2: 添加 Todo 相关 App 方法**

```javascript
// 在 js/app.js 中添加
createTodo() {
    const todo = Store.addTodo({ title: '新任务' });
    this.syncToGist();
    this.openTodoEditor(todo.id);
},

openTodoEditor(todoId) {
    const todo = Store.state.todos.find(t => t.id === todoId);
    if (!todo) return;

    // 创建编辑弹窗
    Components.showTodoEditor(todo);
},

saveTodo() {
    const title = document.getElementById('todo-title-input')?.value.trim();
    const description = document.getElementById('todo-desc-input')?.value || '';
    const priority = document.getElementById('todo-priority-select')?.value || 'medium';
    const dueDate = document.getElementById('todo-due-date')?.value || '';
    const dueTime = document.getElementById('todo-due-time')?.value || '';
    const project = document.getElementById('todo-project-input')?.value || '';
    const tags = (document.getElementById('todo-tags-input')?.value || '').split(',').map(t => t.trim()).filter(Boolean);

    if (!title) {
        Components.showToast('请输入任务标题', 'error');
        return;
    }

    const todoId = document.getElementById('todo-editor-modal')?.dataset.todoId;
    Store.updateTodo(todoId, { title, description, priority, dueDate, dueTime, project, tags });
    this.syncToGist();
    Components.closeTodoEditor();
    Components.renderTodoList(Store.state.todos);
    Components.showToast('任务已保存', 'success');
},

deleteTodo(todoId) {
    if (confirm('确定要删除这个任务吗？')) {
        Store.deleteTodo(todoId);
        this.syncToGist();
        Components.renderTodoList(Store.state.todos);
        Components.showToast('任务已删除', 'success');
    }
},

toggleTodo(todoId) {
    Store.toggleTodoStatus(todoId);
    this.syncToGist();
    Components.renderTodoList(Store.state.todos);
},
```

- [ ] **Step 3: 添加 showTodoEditor 函数**

```javascript
// 在 components.js 中添加
showTodoEditor(todo) {
    const modal = document.createElement('div');
    modal.id = 'todo-editor-modal';
    modal.dataset.todoId = todo.id;
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
                <h2 class="modal-title">编辑任务</h2>
                <button class="modal-close" onclick="Components.closeTodoEditor()">&times;</button>
            </div>
            <div class="modal-body">
                <label class="editor-title-label">标题</label>
                <input type="text" id="todo-title-input" class="editor-title-input" value="${this.escapeHtml(todo.title)}" autofocus>

                <label class="editor-title-label" style="margin-top: 1rem;">描述</label>
                <textarea id="todo-desc-input" class="editor-content" rows="4" placeholder="任务描述...">${this.escapeHtml(todo.description)}</textarea>

                <div class="editor-meta">
                    <div class="editor-field">
                        <label class="editor-label">优先级</label>
                        <select id="todo-priority-select" class="editor-select">
                            <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>🔴 高</option>
                            <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>🟡 中</option>
                            <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>🟢 低</option>
                        </select>
                    </div>
                    <div class="editor-field">
                        <label class="editor-label">截止日期</label>
                        <input type="date" id="todo-due-date" class="editor-input" value="${todo.dueDate || ''}">
                    </div>
                    <div class="editor-field">
                        <label class="editor-label">截止时间</label>
                        <input type="time" id="todo-due-time" class="editor-input" value="${todo.dueTime || ''}">
                    </div>
                </div>

                <div class="editor-meta">
                    <div class="editor-field">
                        <label class="editor-label">项目</label>
                        <input type="text" id="todo-project-input" class="editor-input" value="${this.escapeHtml(todo.project || '')}" placeholder="项目名称">
                    </div>
                    <div class="editor-field">
                        <label class="editor-label">标签（逗号分隔）</label>
                        <input type="text" id="todo-tags-input" class="editor-input" value="${todo.tags.join(', ')}" placeholder="标签1, 标签2">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="Components.closeTodoEditor()">取消</button>
                <button class="btn btn-primary" onclick="App.saveTodo()">保存</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
},

closeTodoEditor() {
    const modal = document.getElementById('todo-editor-modal');
    if (modal) modal.remove();
},
```

- [ ] **Step 4: 绑定新建按钮事件**

在 bindEvents 中添加：
```javascript
safeOn('new-todo-btn', 'click', () => this.createTodo());
```

在 HTML 中添加新建按钮到 header

- [ ] **Step 5: 提交**

```bash
git add js/components.js js/app.js
git commit -m "feat: 添加 Todo 列表视图和基础 CRUD"
```

---

### Task 4: 看板视图 - 三列切换

**Files:**
- Modify: `js/components.js`
- Modify: `css/components.css`

- [ ] **Step 1: 添加视图切换按钮**

在 Todo 视图顶部添加：
```html
<div class="todo-view-header">
    <div class="view-toggle">
        <button id="view-list" class="view-btn active" onclick="App.switchTodoView('list')">📋 列表</button>
        <button id="view-kanban" class="view-btn" onclick="App.switchTodoView('kanban')">📊 看板</button>
        <button id="view-calendar" class="view-btn" onclick="App.switchTodoView('calendar')">📅 日历</button>
    </div>
    <button class="btn btn-primary" id="new-todo-btn">+ 新建任务</button>
</div>
```

- [ ] **Step 2: 添加 switchTodoView 方法**

```javascript
// 在 app.js 中添加
switchTodoView(view) {
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');

    document.querySelectorAll('.todo-view-container').forEach(v => v.classList.remove('active'));
    document.getElementById(`todo-${view}-view`).classList.add('active');

    if (view === 'kanban') {
        Components.renderKanbanBoard(Store.state.todos);
    } else if (view === 'calendar') {
        Components.renderCalendarMonth(new Date().getFullYear(), new Date().getMonth() + 1);
    }
},
```

- [ ] **Step 3: 添加 renderKanbanBoard 函数**

```javascript
// 在 components.js 中添加
renderKanbanBoard(todos) {
    const container = document.getElementById('todo-kanban-view');
    if (!container) return;

    const columns = {
        todo: { title: '待办', icon: '📋', todos: [] },
        doing: { title: '进行中', icon: '🔄', todos: [] },
        done: { title: '已完成', icon: '✅', todos: [] }
    };

    todos.forEach(todo => {
        if (columns[todo.status]) {
            columns[todo.status].todos.push(todo);
        }
    });

    container.innerHTML = Object.entries(columns).map(([key, col]) => `
        <div class="kanban-column">
            <div class="kanban-header">
                <span class="kanban-icon">${col.icon}</span>
                <span class="kanban-title">${col.title}</span>
                <span class="kanban-count">${col.todos.length}</span>
            </div>
            <div class="kanban-cards">
                ${col.todos.map(todo => `
                    <div class="kanban-card" data-id="${todo.id}" onclick="App.openTodoEditor('${todo.id}')">
                        <div class="priority-indicator priority-${todo.priority}"></div>
                        <div class="kanban-card-title">${this.escapeHtml(todo.title)}</div>
                        ${todo.dueDate ? `<div class="kanban-card-meta">📅 ${todo.dueDate}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
},
```

- [ ] **Step 4: 添加看板 CSS 样式**

```css
.todo-view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.view-toggle {
    display: flex;
    gap: 4px;
    background: var(--bg-dark);
    padding: 4px;
    border-radius: var(--radius-md);
}

.view-btn {
    padding: 6px 12px;
    border: none;
    background: transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.875rem;
}

.view-btn.active {
    background: var(--surface);
    box-shadow: var(--shadow-sm);
}

.todo-view-container {
    display: none;
}

.todo-view-container.active {
    display: block;
}

.kanban-board {
    display: flex;
    gap: 1rem;
    height: calc(100vh - 200px);
}

.kanban-column {
    flex: 1;
    background: var(--bg-dark);
    border-radius: var(--radius-lg);
    padding: 1rem;
    display: flex;
    flex-direction: column;
}

.kanban-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
}

.kanban-icon { font-size: 1.25rem; }
.kanban-title { font-weight: 600; }
.kanban-count {
    margin-left: auto;
    background: var(--surface);
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
}

.kanban-cards {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.kanban-card {
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: 0.75rem;
    cursor: pointer;
    transition: all 150ms;
    position: relative;
}

.kanban-card:hover {
    box-shadow: var(--shadow);
    transform: translateY(-2px);
}

.priority-indicator {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    border-radius: var(--radius-md) 0 0 var(--radius-md);
}

.priority-indicator.priority-high { background: #EF4444; }
.priority-indicator.priority-medium { background: #F59E0B; }
.priority-indicator.priority-low { background: #22C55E; }

.kanban-card-title {
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
}

.kanban-card-meta {
    font-size: 0.75rem;
    color: var(--text-muted);
}
```

- [ ] **Step 5: 提交**

```bash
git add js/components.js js/app.js css/components.css index.html
git commit -m "feat: 添加 Todo 看板视图"
```

---

### Task 5: 日历视图 - 月视图显示

**Files:**
- Create: `js/calendar.js`
- Modify: `js/components.js`

- [ ] **Step 1: 创建 calendar.js**

```javascript
// js/calendar.js
const Calendar = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,

    getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    },

    getFirstDayOfMonth(year, month) {
        return new Date(year, month - 1, 1).getDay();
    },

    renderMonth(year, month, todos) {
        const container = document.getElementById('todo-calendar-view');
        if (!container) return;

        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                            '七月', '八月', '九月', '十月', '十一月', '十二月'];
        const daysInMonth = this.getDaysInMonth(year, month);
        const firstDay = this.getFirstDayOfMonth(year, month);
        const today = new Date();

        let html = `
            <div class="calendar-header">
                <button class="calendar-nav" onclick="App.prevMonth()">◀</button>
                <div class="calendar-title">${year}年 ${monthNames[month - 1]}</div>
                <button class="calendar-nav" onclick="App.nextMonth()">▶</button>
            </div>
            <div class="calendar-grid">
                <div class="calendar-weekday">日</div>
                <div class="calendar-weekday">一</div>
                <div class="calendar-weekday">二</div>
                <div class="calendar-weekday">三</div>
                <div class="calendar-weekday">四</div>
                <div class="calendar-weekday">五</div>
                <div class="calendar-weekday">六</div>
        `;

        // 填充空白
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // 填充日期
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTodos = todos.filter(t => t.dueDate === dateStr);
            const isToday = today.getFullYear() === year &&
                           today.getMonth() + 1 === month &&
                           today.getDate() === day;

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
                    <div class="calendar-day-num">${day}</div>
                    ${dayTodos.length > 0 ? `
                        <div class="calendar-todos">
                            ${dayTodos.slice(0, 3).map(t => `
                                <div class="calendar-todo-item priority-${t.priority}">${this.escapeHtml(t.title.substring(0, 10))}</div>
                            `).join('')}
                            ${dayTodos.length > 3 ? `<div class="calendar-todo-more">+${dayTodos.length - 3} 更多</div>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;

        // 点击日期打开当天任务
        container.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
            day.addEventListener('click', () => {
                const date = day.dataset.date;
                App.showTodosForDate(date);
            });
        });
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.Calendar = Calendar;
```

- [ ] **Step 2: 添加 App 方法**

```javascript
// 在 app.js 中添加
prevMonth() {
    Calendar.currentMonth--;
    if (Calendar.currentMonth < 1) {
        Calendar.currentMonth = 12;
        Calendar.currentYear--;
    }
    Components.renderCalendarMonth(Calendar.currentYear, Calendar.currentMonth);
},

nextMonth() {
    Calendar.currentMonth++;
    if (Calendar.currentMonth > 12) {
        Calendar.currentMonth = 1;
        Calendar.currentYear++;
    }
    Components.renderCalendarMonth(Calendar.currentYear, Calendar.currentMonth);
},

showTodosForDate(date) {
    const todos = Store.getTodosForDate(date);
    // 显示当天任务的弹窗
    if (todos.length > 0) {
        Components.showDateTodosModal(date, todos);
    }
},

renderCalendarMonth(year, month) {
    Components.renderCalendarMonth(year, month);
},
```

- [ ] **Step 3: 添加 renderCalendarMonth 函数**

```javascript
// 在 components.js 中添加
renderCalendarMonth(year, month) {
    Calendar.renderMonth(year, month, Store.state.todos);
},
```

- [ ] **Step 4: 添加日历 CSS 样式**

```css
.calendar-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.calendar-title {
    font-size: 1.25rem;
    font-weight: 600;
}

.calendar-nav {
    background: var(--bg-dark);
    border: none;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    cursor: pointer;
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    background: var(--bg-dark);
    padding: 1rem;
    border-radius: var(--radius-lg);
}

.calendar-weekday {
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    padding: 0.5rem;
}

.calendar-day {
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.5rem;
    min-height: 80px;
    cursor: pointer;
    transition: all 150ms;
}

.calendar-day:hover {
    background: var(--surface-hover);
}

.calendar-day.empty {
    background: transparent;
    cursor: default;
}

.calendar-day.today {
    background: var(--primary-light);
}

.calendar-day-num {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.calendar-todos {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.calendar-todo-item {
    font-size: 0.625rem;
    padding: 2px 4px;
    border-radius: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.calendar-todo-item.priority-high { background: #FEE2E2; color: #DC2626; }
.calendar-todo-item.priority-medium { background: #FEF3C7; color: #D97706; }
.calendar-todo-item.priority-low { background: #DCFCE7; color: #16A34A; }

.calendar-todo-more {
    font-size: 0.625rem;
    color: var(--text-muted);
}
```

- [ ] **Step 5: 提交**

```bash
git add js/calendar.js js/components.js js/app.js css/components.css
git commit -m "feat: 添加 Todo 日历月视图"
```

---

### Task 6: 浏览器通知提醒

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: 添加通知初始化**

```javascript
// 在 App 中添加
initNotifications() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                this.checkReminders();
            }
        });
    }
},

checkReminders() {
    setInterval(() => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().substring(0, 5);

        Store.state.todos.forEach(todo => {
            if (todo.dueDate === currentDate && todo.dueTime === currentTime && todo.status !== 'done') {
                this.showNotification(todo);
            }
        });
    }, 60000); // 每分钟检查一次
},

showNotification(todo) {
    if (document.hidden) {
        new Notification('任务提醒', {
            body: todo.title + (todo.dueTime ? ` - ${todo.dueTime}` : ''),
            icon: '🔔'
        });
    }
},
```

- [ ] **Step 2: 在 init 中调用初始化**

```javascript
// 在 init 末尾添加
if (token) {
    await this.loadApp(token);
    this.bindStoreListener();
    this.initNotifications();
} else {
    this.showLogin();
}
```

- [ ] **Step 3: 提交**

```bash
git add js/app.js
git commit -m "feat: 添加浏览器通知提醒功能"
```

---

## 验证计划

1. **模块切换** — 点击左上角按钮切换"提示词"和"Todo"，视图正确切换
2. **Todo CRUD** — 创建任务、编辑任务、删除任务、标记完成
3. **列表视图** — 任务按优先级和截止日期排序显示
4. **看板视图** — 三列显示（待办/进行中/已完成）
5. **日历视图** — 月视图正确显示，点击日期查看当天任务
6. **提醒功能** — 浏览器授权后，到期任务弹出通知
7. **数据同步** — Todo 数据保存到 GitHub Gist，刷新页面后数据保持

---

**Plan complete. 如何执行？**

**1. Subagent-Driven (推荐)** — 每个 Task 分发子代理，任务间审查
**2. Inline Execution** — 在此会话中顺序执行，带检查点