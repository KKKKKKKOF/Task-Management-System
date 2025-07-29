document.addEventListener('DOMContentLoaded', () => {
    const todoPage = document.getElementById('todo-page');
    const completedPage = document.getElementById('completed-page');
    const todoList = document.getElementById('todo-list');
    const completedList = document.getElementById('completed-list');
    const showTodoBtn = document.getElementById('show-todo-btn');
    const showCompletedBtn = document.getElementById('show-completed-btn');
    const toggleOrientationBtn = document.getElementById('toggle-orientation-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportPngBtn = document.getElementById('export-png-btn');
    const pageContainer = document.getElementById('page-container');

    const exportPageContainer = document.getElementById('export-page-container');
    const exportPage = document.getElementById('export-page');
    const exportPageTitle = document.getElementById('export-page-title');
    const exportTodoList = document.getElementById('export-todo-list');
    const exportCompletedList = document.getElementById('export-completed-list');

    const TODO_STORAGE_KEY = 'todoItems';
    const COMPLETED_STORAGE_KEY = 'completedItems';

    let todoItems = JSON.parse(localStorage.getItem(TODO_STORAGE_KEY)) || [];
    let completedItems = JSON.parse(localStorage.getItem(COMPLETED_STORAGE_KEY)) || [];
    let isTodoView = true;
    let isPortrait = true;

    let dragSrcEl = null;
    let dragStartIndex = -1;
    let dropTargetIndex = -1;

    const saveItems = () => {
        todoItems = todoItems.filter(item => item.text && item.text.trim() !== "");
        localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todoItems));
        localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completedItems));
    };

    const createTodoListItem = (item, index, isExport = false) => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        listItem.dataset.index = index;

        const editableText = `<div class="list-item-text" contenteditable="${!isExport}">${item.text}</div>`;
        const staticText = `<div class="list-item-text">${item.text}</div>`;

        let dragHandle = '';
        if (!isExport) {
            dragHandle = `<div class="drag-handle" draggable="true"></div>`;
        }

        listItem.innerHTML = `
            ${dragHandle}
            <div class="checkbox-box"></div>
            ${isExport ? staticText : editableText}
            <div class="item-meta">
                <select class="priority-select ${item.priority}" ${isExport ? 'disabled' : ''}>
                    <option value="low" ${item.priority === 'low' ? 'selected' : ''}>低</option>
                    <option value="medium" ${item.priority === 'medium' ? 'selected' : ''}>中</option>
                    <option value="high" ${item.priority === 'high' ? 'selected' : ''}>高</option>
                </select>
                <input type="date" class="date-input" value="${item.date || ''}" ${isExport ? 'disabled' : ''}>
            </div>
            ${!isExport ? '<button class="delete-btn">×</button>' : ''}
        `;
        return listItem;
    };

    // **重要更新：添加新行时返回元素，并移除 Input 监听器，改为在 blur 和 tab 时处理**
    const addEmptyTodoItem = () => {
        const emptyItem = createTodoListItem({ text: '', priority: 'low', date: '' }, undefined);
        const emptyTextElement = emptyItem.querySelector('.list-item-text');
        emptyTextElement.dataset.placeholder = '输入新的待办事项...';
        todoList.appendChild(emptyItem);

        emptyTextElement.addEventListener('blur', (e) => {
            const text = e.target.textContent.trim();
            if (text) {
                 const newItem = {
                    text: text,
                    priority: 'low',
                    date: ''
                };
                todoItems.push(newItem);
                saveItems();
                e.target.parentNode.dataset.index = todoItems.length - 1;
                // 确保blur事件处理后，输入框已经不是空行
                if (e.target.parentNode.nextElementSibling === null) {
                    addEmptyTodoItem();
                }
            } else if (!text && e.target.parentNode.dataset.index === undefined) {
                e.target.parentNode.remove();
            }
        });
        return emptyItem;
    };

    const renderTodoItems = (container, items, isExport = false) => {
        container.innerHTML = '';
        items.forEach((item, index) => {
            const listItem = createTodoListItem(item, index, isExport);
            container.appendChild(listItem);
        });

        if (!isExport) {
            addEmptyTodoItem();
        }
    };

    const renderCompletedItems = (container, items, isExport = false) => {
        container.innerHTML = '';
        items.forEach((item, index) => {
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.dataset.index = index;
            listItem.innerHTML = `
                <div class="checkbox-box checked"></div>
                <div class="list-item-text">${item.text}</div>
                <div class="item-meta">
                    <span class="priority-select ${item.priority}">${item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}</span>
                    <span class="date-display">${item.date || ''}</span>
                </div>
                <span class="completion-time">${item.timestamp}</span>
                ${!isExport ? '<button class="delete-btn">×</button>' : ''}
            `;
            container.appendChild(listItem);
        });
    };

    const handleCheckboxClick = (e) => {
        const listItem = e.target.closest('.list-item');
        if (!listItem || listItem.dataset.index === undefined) return;

        const index = parseInt(listItem.dataset.index);
        if (isTodoView) {
            const item = todoItems.splice(index, 1)[0];
            if (item.text && item.text.trim() !== "") {
                const timestamp = new Date().toLocaleString();
                completedItems.push({ ...item, timestamp });
            }
            saveItems();
            renderTodoItems(todoList, todoItems);
        } else {
            const item = completedItems.splice(index, 1)[0];
            todoItems.push(item);
            saveItems();
            renderCompletedItems(completedList, completedItems);
        }
    };

    const handleTextChange = (e) => {
        const target = e.target;
        if (target.classList.contains('list-item-text')) {
            const listItem = target.closest('.list-item');
            const index = parseInt(listItem.dataset.index);
            const newText = target.textContent.trim();

            if (index !== undefined && !isNaN(index)) {
                if (newText) {
                    todoItems[index].text = newText;
                } else {
                    todoItems.splice(index, 1);
                }
                saveItems();
                renderTodoItems(todoList, todoItems);
            }
        }
    };

    const handleMetaChange = (e) => {
        const target = e.target;
        const listItem = target.closest('.list-item');
        const index = parseInt(listItem.dataset.index);
        
        if (index !== undefined && !isNaN(index)) {
            if (target.classList.contains('priority-select')) {
                todoItems[index].priority = target.value;
                target.className = `priority-select ${target.value}`;
            } else if (target.classList.contains('date-input')) {
                todoItems[index].date = target.value;
            }
            saveItems();
        }
    };

    // 添加删除功能
    const handleDeleteClick = (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;
        
        const listItem = deleteBtn.closest('.list-item');
        const index = parseInt(listItem.dataset.index);
        
        if (isTodoView) {
            if (index !== undefined && !isNaN(index)) {
                todoItems.splice(index, 1);
                saveItems();
                renderTodoItems(todoList, todoItems);
            }
        } else {
            if (index !== undefined && !isNaN(index)) {
                completedItems.splice(index, 1);
                saveItems();
                renderCompletedItems(completedList, completedItems);
            }
        }
    };

    const toggleView = (isTodo) => {
        isTodoView = isTodo;
        if (isTodoView) {
            todoPage.classList.remove('hidden');
            completedPage.classList.add('hidden');
            showTodoBtn.classList.add('active');
            showCompletedBtn.classList.remove('active');
            renderTodoItems(todoList, todoItems);
            
            if (isPortrait) {
                todoPage.classList.remove('landscape');
                todoPage.classList.add('portrait');
                pageContainer.style.width = '210mm';
            } else {
                todoPage.classList.remove('portrait');
                todoPage.classList.add('landscape');
                pageContainer.style.width = '297mm';
            }
        } else {
            todoPage.classList.add('hidden');
            completedPage.classList.remove('hidden');
            showTodoBtn.classList.remove('active');
            showCompletedBtn.classList.add('active');
            renderCompletedItems(completedList, completedItems);
            
            if (isPortrait) {
                completedPage.classList.remove('landscape');
                completedPage.classList.add('portrait');
                pageContainer.style.width = '210mm';
            } else {
                completedPage.classList.remove('portrait');
                completedPage.classList.add('landscape');
                pageContainer.style.width = '297mm';
            }
        }
    };

    const handleDragStart = (e) => {
        const dragHandle = e.target.closest('.drag-handle');
        if (!dragHandle) {
            e.preventDefault();
            return;
        }

        dragSrcEl = e.target.closest('.list-item');
        dragStartIndex = parseInt(dragSrcEl.dataset.index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'dragging');
        
        setTimeout(() => {
            dragSrcEl.classList.add('dragging');
        }, 0);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const targetEl = e.target.closest('.list-item');
        if (!targetEl || targetEl === dragSrcEl || targetEl.dataset.index === undefined) {
            const allItems = todoList.querySelectorAll('.list-item');
            allItems.forEach(item => item.classList.remove('drag-over'));
            dropTargetIndex = -1;
            return;
        }
        
        const rect = targetEl.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        const allItems = todoList.querySelectorAll('.list-item');
        allItems.forEach(item => item.classList.remove('drag-over'));
        
        if (y > rect.height / 2) {
            targetEl.nextElementSibling?.classList.add('drag-over');
            dropTargetIndex = parseInt(targetEl.dataset.index) + 1;
        } else {
            targetEl.classList.add('drag-over');
            dropTargetIndex = parseInt(targetEl.dataset.index);
        }

        if (dropTargetIndex === todoItems.length && dragSrcEl) {
             const lastItem = todoList.lastElementChild;
             if (lastItem) {
                 lastItem.classList.remove('drag-over');
                 todoList.appendChild(dragSrcEl);
                 dropTargetIndex = todoItems.length;
             }
        }
    };

    const handleDrop = (e) => {
        e.stopPropagation();
        e.preventDefault();
    };

    const handleDragEnd = (e) => {
        if (!dragSrcEl) return;

        dragSrcEl.classList.remove('dragging');
        
        const allItems = todoList.querySelectorAll('.list-item');
        allItems.forEach(item => item.classList.remove('drag-over'));
        
        if (dropTargetIndex !== -1 && dragStartIndex !== dropTargetIndex) {
            const [draggedItem] = todoItems.splice(dragStartIndex, 1);
            
            const adjustedIndex = (dropTargetIndex > dragStartIndex) ? dropTargetIndex -1 : dropTargetIndex;
            todoItems.splice(adjustedIndex, 0, draggedItem);
            saveItems();
        }

        dragSrcEl = null;
        dragStartIndex = -1;
        dropTargetIndex = -1;

        renderTodoItems(todoList, todoItems);
    };

    todoList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('.checkbox-box')) {
            // 只有当点击的项目有索引时才处理复选框点击
            const listItem = target.closest('.list-item');
            if (listItem.dataset.index !== undefined) {
                handleCheckboxClick(e);
            }
        } else if (target.classList.contains('list-item-text')) {
            return;
        } else if (target.classList.contains('delete-btn')) {
            handleDeleteClick(e);
        }
    });

    // **重要更新：优化 Tab 键逻辑以实现无缝添加新行**
    todoList.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && e.target.classList.contains('list-item-text')) {
            e.preventDefault();
            const currentItem = e.target.closest('.list-item');
            const nextItem = currentItem.nextElementSibling;
            
            if (nextItem) {
                const nextTextElement = nextItem.querySelector('.list-item-text');
                if (nextTextElement) {
                    nextTextElement.focus();
                }
            } else {
                // 如果当前是最后一行，则添加一个新行并立即聚焦
                const newItem = addEmptyTodoItem();
                const newTextElement = newItem.querySelector('.list-item-text');
                if (newTextElement) {
                    newTextElement.focus();
                }
            }
        }
    });
    
    completedList.addEventListener('click', (e) => {
        // 只有点击复选框时才将项目移回待办列表
        if (e.target.closest('.checkbox-box')) {
            handleCheckboxClick(e);
        } else if (e.target.classList.contains('delete-btn')) {
            handleDeleteClick(e);
        }
    });
    todoList.addEventListener('blur', handleTextChange, true);
    todoList.addEventListener('change', handleMetaChange, true);
    
    todoList.addEventListener('dragstart', handleDragStart, false);
    todoList.addEventListener('dragover', handleDragOver, false);
    todoList.addEventListener('drop', handleDrop, false);
    todoList.addEventListener('dragend', handleDragEnd, false);

    toggleOrientationBtn.addEventListener('click', () => {
        isPortrait = !isPortrait;
        const currentPage = isTodoView ? todoPage : completedPage;
        
        if (isPortrait) {
            currentPage.classList.remove('landscape');
            currentPage.classList.add('portrait');
            pageContainer.style.width = '210mm';
        } else {
            currentPage.classList.remove('portrait');
            currentPage.classList.add('landscape');
            pageContainer.style.width = '297mm';
        }
    });

    const exportPageContent = (format) => {
        exportPageTitle.textContent = isTodoView ? '待办事项' : '已完成事项';
        exportTodoList.innerHTML = '';
        exportCompletedList.innerHTML = '';
        
        if (isTodoView) {
            renderTodoItems(exportTodoList, todoItems, true);
        } else {
            renderCompletedItems(exportCompletedList, completedItems, true);
        }

        exportPageContainer.style.display = 'block';

        const currentPage = isTodoView ? todoPage : completedPage;
        if (currentPage.classList.contains('portrait')) {
            exportPage.classList.remove('landscape');
            exportPage.classList.add('portrait');
        } else {
            exportPage.classList.remove('portrait');
            exportPage.classList.add('landscape');
        }

        html2canvas(exportPage, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pageName = isTodoView ? '待办事项' : '已完成事项';
            
            if (format === 'pdf') {
                const orientation = currentPage.classList.contains('portrait') ? 'p' : 'l';
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF(orientation, 'mm', 'a4');
                const imgWidth = pdf.internal.pageSize.getWidth();
                const imgHeight = canvas.height * imgWidth / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                pdf.save(`${pageName}.pdf`);
            } else if (format === 'png') {
                const link = document.createElement('a');
                link.href = imgData;
                link.download = `${pageName}.png`;
                document.body.appendChild(link);
                document.body.removeChild(link);
            }
            
            exportPageContainer.style.display = 'none';
        });
    };

    showTodoBtn.addEventListener('click', () => toggleView(true));
    showCompletedBtn.addEventListener('click', () => toggleView(false));
    exportPdfBtn.addEventListener('click', () => exportPageContent('pdf'));
    exportPngBtn.addEventListener('click', () => exportPageContent('png'));

    toggleView(true);
});