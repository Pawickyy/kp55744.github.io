window.todo = {
  tasks: [],
  storageKey: 'todo.tasks',
  searchText: '',
  form: document.getElementById('todo-form'),
  taskInput: document.getElementById('task-input'),
  taskDate: document.getElementById('task-date'),
  searchInput: document.getElementById('search-input'),
  list: document.getElementById('todo-list'),

  load: function loadTasks() {
    window.todo.tasks = JSON.parse(localStorage.getItem(window.todo.storageKey)) || [];
  },

  save: function saveTasks() {
    localStorage.setItem(window.todo.storageKey, JSON.stringify(window.todo.tasks));
  },

  find: function findTask(id) {
    for (let index = 0; index < window.todo.tasks.length; index += 1) {
      if (window.todo.tasks[index].id === id) {
        return window.todo.tasks[index];
      }
    }
    return null;
  },

  matchesSearch: function matchesSearch(task) {
    return task.text.toLowerCase().includes(window.todo.searchText)
      || (task.date || '').toLowerCase().includes(window.todo.searchText);
  },

  add: function addTask(text, date) {
    const taskText = text.trim();
    if (!window.todo.validateTask(taskText, date)) {
      return false;
    }

    window.todo.tasks.push({
      id: Date.now() + Math.random().toString(16).slice(2),
      text: taskText,
      date: date || '',
      done: false,
    });
    window.todo.save();
    window.todo.draw();
    return true;
  },

  delete: function deleteTask(id) {
    const index = window.todo.tasks.indexOf(window.todo.find(id));
    if (index < 0) {
      return;
    }

    window.todo.tasks.splice(index, 1);
    window.todo.save();
    window.todo.draw();
  },

  edit: function editTask(id, text, date) {
    const task = window.todo.find(id);
    const taskText = text.trim();
    if (!task || !window.todo.validateTask(taskText, date)) {
      return;
    }

    task.text = taskText;
    task.date = date || '';
    window.todo.save();
    window.todo.draw();
  },

  validateTask: function validateTask(text, date) {
    return text.length >= 3
      && text.length <= 255
      && (!date || date >= window.todo.minimumDate());
  },

  minimumDate: function minimumDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getFullYear() + '-'
      + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-'
      + String(tomorrow.getDate()).padStart(2, '0');
  },

  toggle: function toggleTask(id, done) {
    const task = window.todo.find(id);
    if (!task) {
      return;
    }

    task.done = done;
    window.todo.save();
    window.todo.draw();
  },

  createElement: function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text) {
      element.textContent = text;
    }
    return element;
  },

  addHighlightedText: function addHighlightedText(element, text) {
    let start = 0;
    let match = text.toLowerCase().indexOf(window.todo.searchText);

    if (!window.todo.searchText || match < 0) {
      element.textContent = text;
      return;
    }

    while (match >= 0) {
      element.appendChild(document.createTextNode(text.slice(start, match)));
      element.appendChild(window.todo.createElement('mark', '', text.slice(match, match + window.todo.searchText.length)));
      start = match + window.todo.searchText.length;
      match = text.toLowerCase().indexOf(window.todo.searchText, start);
    }
    element.appendChild(document.createTextNode(text.slice(start)));
  },

  createTaskField: function createTaskField(task, field) {
    const fieldName = field === 'text' ? 'treść zadania' : 'datę zadania';
    const value = task[field] || (field === 'date' ? 'Dodaj datę' : '');
    const button = window.todo.createElement('button', 'task-edit-field task-' + field);

    button.type = 'button';
    button.dataset.action = 'edit';
    button.dataset.taskId = task.id;
    button.dataset.field = field;
    button.setAttribute('aria-label', 'Kliknij, aby edytować ' + fieldName);
    window.todo.addHighlightedText(button, value);
    return button;
  },

  createTaskItem: function createTaskItem(task) {
    const item = window.todo.createElement('li', task.done ? 'todo-item done' : 'todo-item');
    const checkbox = window.todo.createElement('input');
    const fields = window.todo.createElement('div', 'todo-fields');
    const actions = window.todo.createElement('div', 'todo-actions');
    const deleteButton = window.todo.createElement('button', '', 'Usuń');

    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);
    checkbox.dataset.action = 'toggle';
    checkbox.dataset.taskId = task.id;
    checkbox.setAttribute('aria-label', 'Oznacz zadanie jako ' + (task.done ? 'niewykonane' : 'wykonane'));

    fields.append(
      window.todo.createTaskField(task, 'text'),
      window.todo.createTaskField(task, 'date')
    );
    deleteButton.type = 'button';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.taskId = task.id;
    actions.appendChild(deleteButton);
    item.append(checkbox, fields, actions);
    return item;
  },

  draw: function drawTasks() {
    if (!window.todo.list) {
      return;
    }

    const searchQuery = window.todo.searchInput
      ? window.todo.searchInput.value.trim().toLowerCase()
      : '';
    window.todo.searchText = searchQuery.length >= 2 ? searchQuery : '';
    const tasks = window.todo.tasks.filter(window.todo.matchesSearch);

    window.todo.list.replaceChildren();
    if (!tasks.length) {
      window.todo.list.appendChild(window.todo.createElement('li', 'todo-empty', 'Brak zadań'));
      return;
    }

    tasks.forEach(window.todo.appendTask);
  },

  appendTask: function appendTask(task) {
    window.todo.list.appendChild(window.todo.createTaskItem(task));
  },

  startEditing: function startEditing(button) {
    const task = window.todo.find(button.dataset.taskId);
    if (!task) {
      return;
    }

    const field = button.dataset.field;
    const input = window.todo.createElement('input');
    input.type = field === 'date' ? 'date' : 'text';
    input.value = task[field] || '';
    if (field === 'date') {
      input.min = window.todo.minimumDate();
    }
    input.dataset.action = 'edit-input';
    input.dataset.taskId = task.id;
    input.dataset.field = field;
    input.setAttribute('aria-label', 'Edytuj ' + (field === 'date' ? 'datę zadania' : 'treść zadania'));
    button.replaceWith(input);
    input.focus();
    if (field === 'text') {
      input.select();
    }
  },

  handleTaskClick: function handleTaskClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    if (button.dataset.action === 'delete') {
      window.todo.delete(button.dataset.taskId);
    } else if (button.dataset.action === 'edit') {
      window.todo.startEditing(button);
    }
  },

  handleTaskChange: function handleTaskChange(event) {
    const input = event.target;
    if (input.matches('input[data-action="toggle"]')) {
      window.todo.toggle(input.dataset.taskId, input.checked);
    }
  },

  saveEditedField: function saveEditedField(event) {
    const input = event.target;
    if (!input.matches('input[data-action="edit-input"]') || input.dataset.cancelEdit) {
      return;
    }

    const task = window.todo.find(input.dataset.taskId);
    if (!task) {
      return;
    }

    const value = input.value.trim();
    const editingText = input.dataset.field === 'text';
    const text = editingText ? value : task.text;
    const date = editingText ? task.date : value;
    window.todo.edit(task.id, text, date);
  },

  handleTaskKeydown: function handleTaskKeydown(event) {
    const input = event.target;
    if (!input.matches('input[data-action="edit-input"]')) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      input.blur();
    } else if (event.key === 'Escape') {
      input.dataset.cancelEdit = 'true';
      window.todo.draw();
    }
  },

  handleFormSubmit: function handleFormSubmit(event) {
    event.preventDefault();
    if (!window.todo.add(window.todo.taskInput.value, window.todo.taskDate.value)) {
      return;
    }
    window.todo.form.reset();
    window.todo.taskInput.focus();
  },

  handleSearch: function handleSearch() {
    window.todo.draw();
  }
};

window.todo.load();

if (window.todo.form) {
  window.todo.form.addEventListener('submit', window.todo.handleFormSubmit);
}
if (window.todo.taskDate) {
  window.todo.taskDate.min = window.todo.minimumDate();
}
if (window.todo.searchInput) {
  window.todo.searchInput.addEventListener('input', window.todo.handleSearch);
}
if (window.todo.list) {
  window.todo.list.addEventListener('click', window.todo.handleTaskClick);
  window.todo.list.addEventListener('change', window.todo.handleTaskChange);
  window.todo.list.addEventListener('focusout', window.todo.saveEditedField);
  window.todo.list.addEventListener('keydown', window.todo.handleTaskKeydown);
}

window.todo.draw();
