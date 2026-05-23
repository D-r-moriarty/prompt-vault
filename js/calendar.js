const Calendar = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,

    getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    },

    getFirstDayOfMonth(year, month) {
        return new Date(year, month - 1, 1).getDay();
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
                <button class="calendar-nav" onclick="App.prevMonth()">&#9664;</button>
                <div class="calendar-title">${year}年 ${monthNames[month - 1]}</div>
                <button class="calendar-nav" onclick="App.nextMonth()">&#9654;</button>
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

        // Fill empty cells
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Fill days
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

        // Click handler for days
        container.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
            day.addEventListener('click', () => {
                const date = day.dataset.date;
                App.showTodosForDate(date);
            });
        });
    }
};

window.Calendar = Calendar;