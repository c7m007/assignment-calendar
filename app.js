// ============================================
// STATE
// ============================================

let assignments = [];
let classes = [];
let currentDate = new Date();
let currentView = 'month';
let refreshInterval = null;
let settings = {
    minFontSize: 10,
    defaultView: 'month',
    refreshInterval: 5,
    themeColor: '#2c5282',
    darkMode: false
};

// ============================================
// GOOGLE SHEETS API
// ============================================

async function fetchSheetData(sheetName, range) {
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&range=${range}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${sheetName}`);
    }
    
    const csvText = await response.text();
    return parseCSV(csvText);
}

function parseCSV(csvText) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];
        
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
            currentRow.push(currentCell.trim());
            if (currentRow.some(cell => cell !== '')) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
            if (char === '\r') i++;
        } else {
            currentCell += char;
        }
    }
    
    // Don't forget the last cell/row
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
            rows.push(currentRow);
        }
    }
    
    return rows;
}

async function loadClasses() {
    try {
        const data = await fetchSheetData(CONFIG.CLASSES_TAB, 'B2:D50');
        
        classes = data
            .filter(row => row[0] && row[0].trim()) // Has a class name
            .map(row => ({
                name: row[0]?.trim() || '',
                fullName: row[1]?.trim() || '',
                color: row[2]?.trim() || '#888888'
            }));
        
        return classes;
    } catch (error) {
        console.error('Error loading classes:', error);
        throw error;
    }
}

async function loadAssignments() {
    try {
        const data = await fetchSheetData(CONFIG.MASTERLIST_TAB, 'A3:F2000');
        
        assignments = data
            .filter(row => row[CONFIG.COLUMNS.ASSIGNMENT] || row[CONFIG.COLUMNS.CLASS]) // Has assignment or class
            .map(row => {
                const status = row[CONFIG.COLUMNS.STATUS]?.trim() || '';
                const dueDate = row[CONFIG.COLUMNS.DUE_DATE]?.trim() || '';
                const className = row[CONFIG.COLUMNS.CLASS]?.trim() || '';
                const assignmentName = row[CONFIG.COLUMNS.ASSIGNMENT]?.trim() || '';
                const daysUntil = row[CONFIG.COLUMNS.DAYS_UNTIL]?.trim() || '';
                
                return {
                    status: status,
                    completed: status === CONFIG.STATUS_DONE,
                    dueDate: parseDate(dueDate),
                    className: className,
                    name: assignmentName,
                    daysUntil: parseInt(daysUntil) || null
                };
            });
        
        return assignments;
    } catch (error) {
        console.error('Error loading assignments:', error);
        throw error;
    }
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Try to parse various date formats
    // MM/DD/YYYY
    const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slashMatch) {
        let year = parseInt(slashMatch[3]);
        if (year < 100) year += 2000;
        const month = parseInt(slashMatch[1]) - 1;
        const day = parseInt(slashMatch[2]);
        return new Date(year, month, day);
    }
    
    // Try standard parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return date;
    }
    
    return null;
}

// ============================================
// DATA REFRESH
// ============================================

async function refreshData() {
    const refreshBtn = document.getElementById('refreshBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        refreshBtn.classList.add('refreshing');
        loadingOverlay.classList.add('active');
        errorMessage.classList.remove('active');
        
        await Promise.all([loadClasses(), loadAssignments()]);
        
        renderClassLegend();
        renderTasks();
        renderCalendar();
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error refreshing data:', error);
        errorMessage.classList.add('active');
    } finally {
        refreshBtn.classList.remove('refreshing');
        loadingOverlay.classList.remove('active');
    }
}

function updateLastUpdated() {
    const el = document.getElementById('lastUpdated');
    const now = new Date();
    el.textContent = `Last updated: ${now.toLocaleTimeString()}`;
}

function startAutoRefresh() {
    stopAutoRefresh();
    
    if (settings.refreshInterval > 0) {
        refreshInterval = setInterval(refreshData, settings.refreshInterval * 60 * 1000);
    }
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// ============================================
// RENDERING
// ============================================

function getClassColor(className) {
    const classObj = classes.find(c => c.name === className);
    return classObj?.color || '#888888';
}

function getTextColor(bgColor) {
    // Ensure we have a valid hex color
    let hex = bgColor.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    
    const r = parseInt(hex.substr(0, 2), 16) || 0;
    const g = parseInt(hex.substr(2, 2), 16) || 0;
    const b = parseInt(hex.substr(4, 2), 16) || 0;
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#333333' : '#ffffff';
}

function renderClassLegend() {
    const container = document.getElementById('classLegend');
    
    container.innerHTML = classes.map(c => `
        <div class="class-item">
            <div class="class-color-dot" style="background-color: ${c.color};"></div>
            <span class="class-name">${c.name}</span>
        </div>
    `).join('');
}

function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    const completedTasksList = document.getElementById('completedTasksList');
    
    // Tasks without due dates
    const tasksWithoutDate = assignments.filter(a => !a.dueDate);
    const incompleteTasks = tasksWithoutDate.filter(a => !a.completed);
    const completedTasks = tasksWithoutDate.filter(a => a.completed);
    
    if (incompleteTasks.length === 0) {
        tasksList.innerHTML = '<p class="no-tasks">No tasks without due dates</p>';
    } else {
        tasksList.innerHTML = incompleteTasks.map(task => {
            const color = getClassColor(task.className);
            const textColor = getTextColor(color);
            return `
                <div class="task-item" style="background-color: ${color}; color: ${textColor}; border-left-color: ${color};">
                    ${task.className ? `<div class="task-class">${task.className}</div>` : ''}
                    <div class="task-name">${task.name || 'Untitled'}</div>
                </div>
            `;
        }).join('');
    }
    
    if (completedTasks.length === 0) {
        completedTasksList.innerHTML = '<p class="no-tasks">No completed tasks</p>';
    } else {
        completedTasksList.innerHTML = completedTasks.map(task => `
            <div class="task-item completed">
                ${task.className ? `<div class="task-class">${task.className}</div>` : ''}
                <div class="task-name">${task.name || 'Untitled'}</div>
            </div>
        `).join('');
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    
    if (currentView === 'month') {
        renderMonthView(grid);
    } else {
        renderWeekView(grid);
    }
    
    updateCalendarTitle();
}

function renderMonthView(grid) {
    grid.classList.remove('week-view');
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let html = '';
    
    for (let i = 0; i < totalCells; i++) {
        let dayNum, cellDate, isOtherMonth = false;
        
        if (i < startDayOfWeek) {
            dayNum = daysInPrevMonth - startDayOfWeek + i + 1;
            cellDate = new Date(year, month - 1, dayNum);
            isOtherMonth = true;
        } else if (i >= startDayOfWeek + daysInMonth) {
            dayNum = i - startDayOfWeek - daysInMonth + 1;
            cellDate = new Date(year, month + 1, dayNum);
            isOtherMonth = true;
        } else {
            dayNum = i - startDayOfWeek + 1;
            cellDate = new Date(year, month, dayNum);
        }
        
        cellDate.setHours(0, 0, 0, 0);
        const isToday = cellDate.getTime() === today.getTime();
        const dayAssignments = getAssignmentsForDate(cellDate);
        
        html += `
            <div class="cal-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
                <div class="day-number">${dayNum}</div>
                <div class="day-assignments" style="--min-font: ${settings.minFontSize}px;">
                    ${renderDayAssignments(dayAssignments)}
                </div>
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

function renderWeekView(grid) {
    grid.classList.add('week-view');
    
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let html = '';
    
    for (let i = 0; i < 7; i++) {
        const cellDate = new Date(startOfWeek);
        cellDate.setDate(startOfWeek.getDate() + i);
        const isToday = cellDate.getTime() === today.getTime();
        const dayAssignments = getAssignmentsForDate(cellDate);
        
        html += `
            <div class="cal-day ${isToday ? 'today' : ''}">
                <div class="day-number">${cellDate.getDate()}</div>
                <div class="day-assignments">
                    ${renderDayAssignments(dayAssignments, true)}
                </div>
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

function getAssignmentsForDate(date) {
    return assignments.filter(a => {
        if (!a.dueDate) return false;
        const aDate = new Date(a.dueDate);
        aDate.setHours(0, 0, 0, 0);
        return aDate.getTime() === date.getTime();
    });
}

function renderDayAssignments(dayAssignments, showClass = false) {
    if (dayAssignments.length === 0) return '';
    
    // Calculate font size based on number of assignments
    const count = dayAssignments.length;
    let fontSize = 12;
    if (count > 4) fontSize = 11;
    if (count > 6) fontSize = 10;
    if (count > 8) fontSize = Math.max(settings.minFontSize, 9);
    if (count > 10) fontSize = settings.minFontSize;
    
    return dayAssignments.map(a => {
        const color = getClassColor(a.className);
        const textColor = getTextColor(color);
        const isUrgent = a.daysUntil !== null && a.daysUntil <= 2 && !a.completed;
        const displayText = showClass && a.className ? `${a.className}: ${a.name}` : (a.name || 'Untitled');
        
        return `
            <div class="cal-assignment ${a.completed ? 'completed' : ''} ${isUrgent ? 'urgent' : ''}"
                 style="background-color: ${color}; color: ${textColor}; font-size: ${fontSize}px;"
                 title="${a.className}: ${a.name}">
                ${displayText}
            </div>
        `;
    }).join('');
}

function updateCalendarTitle() {
    const title = document.getElementById('calendarTitle');
    
    if (currentView === 'month') {
        title.textContent = currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
    } else {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const startStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        title.textContent = `${startStr} - ${endStr}`;
    }
}

// ============================================
// NAVIGATION
// ============================================

function goToPrevious() {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
        currentDate.setDate(currentDate.getDate() - 7);
    }
    renderCalendar();
}

function goToNext() {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
    } else {
        currentDate.setDate(currentDate.getDate() + 7);
    }
    renderCalendar();
}

function goToToday() {
    currentDate = new Date();
    renderCalendar();
}

function setView(view) {
    currentView = view;
    
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    renderCalendar();
}

// ============================================
// SETTINGS
// ============================================

function loadSettings() {
    const saved = localStorage.getItem('calendarSettings');
    if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
    }
    
    // Apply settings
    currentView = settings.defaultView;
    document.documentElement.style.setProperty('--accent-color', settings.themeColor);
    document.documentElement.style.setProperty('--min-font-size', settings.minFontSize + 'px');
    
    if (settings.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Update view buttons
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === currentView);
    });
}

function saveSettings() {
    settings.minFontSize = parseInt(document.getElementById('minFontSize').value) || 10;
    settings.defaultView = document.getElementById('defaultView').value;
    settings.refreshInterval = parseInt(document.getElementById('refreshInterval').value) || 5;
    settings.themeColor = document.getElementById('themeColor').value;
    settings.darkMode = document.getElementById('darkMode').checked;
    
    localStorage.setItem('calendarSettings', JSON.stringify(settings));
    
    // Apply settings
    document.documentElement.style.setProperty('--accent-color', settings.themeColor);
    document.documentElement.style.setProperty('--min-font-size', settings.minFontSize + 'px');
    
    if (settings.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    
    // Restart auto-refresh with new interval
    startAutoRefresh();
    
    // Re-render calendar with new font size
    renderCalendar();
    
    // Close modal
    document.getElementById('settingsModal').classList.remove('active');
}

function openSettings() {
    document.getElementById('minFontSize').value = settings.minFontSize;
    document.getElementById('defaultView').value = settings.defaultView;
    document.getElementById('refreshInterval').value = settings.refreshInterval;
    document.getElementById('themeColor').value = settings.themeColor;
    document.getElementById('darkMode').checked = settings.darkMode;
    
    document.getElementById('settingsModal').classList.add('active');
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Load settings
    loadSettings();
    
    // Initial data load
    refreshData();
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Event listeners
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
    document.getElementById('retryBtn').addEventListener('click', refreshData);
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettings').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.remove('active');
    });
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    
    document.getElementById('prevBtn').addEventListener('click', goToPrevious);
    document.getElementById('nextBtn').addEventListener('click', goToNext);
    document.getElementById('todayBtn').addEventListener('click', goToToday);
    
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => setView(btn.dataset.view));
    });
    
    // Toggle completed tasks
    const toggleBtn = document.getElementById('toggleCompleted');
    toggleBtn.addEventListener('click', () => {
        const list = document.getElementById('completedTasksList');
        list.classList.toggle('collapsed');
        toggleBtn.classList.toggle('expanded');
    });
    
    // Close modal on overlay click
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
        }
    });
});
