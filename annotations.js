// annotations.js - Система аннотаций и заметок

class AnnotationManager {
    constructor(reader) {
        this.reader = reader;
        this.annotations = [];
        this.highlights = [];
        this.currentSelection = null;
        this.init();
    }

    init() {
        this.loadAnnotations();
        this.initEvents();
        this.initAnnotationToolbar();
    }

    async loadAnnotations() {
        const saved = localStorage.getItem(`book_annotations_${this.reader.bookId}`);
        this.annotations = saved ? JSON.parse(saved) : [];
        this.applyAnnotations();
    }

    saveAnnotations() {
        localStorage.setItem(`book_annotations_${this.reader.bookId}`, JSON.stringify(this.annotations));
    }

    initEvents() {
        // Обработка выделения текста
        document.addEventListener('mouseup', () => this.handleTextSelection());
        document.addEventListener('touchend', () => this.handleTextSelection());

        // Горячие клавиши для аннотаций
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                this.createHighlight();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.createNote();
            }
        });
    }

    initAnnotationToolbar() {
        // Создаем плавающую панель аннотаций
        if (!document.getElementById('annotationToolbar')) {
            const toolbar = document.createElement('div');
            toolbar.id = 'annotationToolbar';
            toolbar.className = 'annotation-toolbar';
            toolbar.innerHTML = `
                <div class="annotation-tools">
                    <button class="annotation-tool-btn" data-action="highlight" title="Выделить (Ctrl+H)">
                        <i class="fas fa-highlighter"></i>
                    </button>
                    <button class="annotation-tool-btn" data-action="note" title="Заметка (Ctrl+N)">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                    <button class="annotation-tool-btn" data-action="underline" title="Подчеркнуть">
                        <i class="fas fa-underline"></i>
                    </button>
                    <div class="color-picker">
                        <button class="color-btn" data-color="#ffeb3b" style="background: #ffeb3b;"></button>
                        <button class="color-btn" data-color="#4caf50" style="background: #4caf50;"></button>
                        <button class="color-btn" data-color="#2196f3" style="background: #2196f3;"></button>
                        <button class="color-btn" data-color="#ff9800" style="background: #ff9800;"></button>
                    </div>
                </div>
            `;
            document.body.appendChild(toolbar);
        }

        // Добавляем обработчики
        document.querySelectorAll('.annotation-tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAnnotationAction(action);
            });
        });

        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.currentTarget.dataset.color;
                this.setHighlightColor(color);
            });
        });
    }

    handleTextSelection() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            this.hideAnnotationToolbar();
            return;
        }

        const selectedText = selection.toString().trim();
        if (selectedText.length < 3 || selectedText.length > 500) {
            this.hideAnnotationToolbar();
            return;
        }

        this.currentSelection = {
            text: selectedText,
            range: selection.getRangeAt(0),
            position: this.getSelectionPosition(selection)
        };

        this.showAnnotationToolbar(this.currentSelection.position);
    }

    getSelectionPosition(selection) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        return {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY - 50,
            width: rect.width
        };
    }

    showAnnotationToolbar(position) {
        const toolbar = document.getElementById('annotationToolbar');
        if (!toolbar) return;

        toolbar.style.display = 'block';
        toolbar.style.left = `${position.x + position.width/2}px`;
        toolbar.style.top = `${position.y}px`;
        toolbar.style.transform = 'translateX(-50%)';
    }

    hideAnnotationToolbar() {
        const toolbar = document.getElementById('annotationToolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
        this.currentSelection = null;
    }

    handleAnnotationAction(action) {
        if (!this.currentSelection) return;

        switch (action) {
            case 'highlight':
                this.createHighlight();
                break;
            case 'note':
                this.createNote();
                break;
            case 'underline':
                this.createUnderline();
                break;
        }

        this.hideAnnotationToolbar();
        window.getSelection().removeAllRanges();
    }

    createHighlight(color = '#ffeb3b') {
        if (!this.currentSelection) return;

        const highlight = {
            id: Date.now().toString(),
            bookId: this.reader.bookId,
            chapter: this.reader.currentChapter,
            type: 'highlight',
            color: color,
            text: this.currentSelection.text,
            context: this.getContextAroundSelection(50),
            position: this.getSelectionPositionString(this.currentSelection.range),
            createdAt: new Date().toISOString()
        };

        this.annotations.push(highlight);
        this.saveAnnotations();
        
        // Визуально выделяем текст
        this.applyHighlightToDOM(highlight);
        
        this.reader.showNotification('Текст выделен');
    }

    createNote() {
        if (!this.currentSelection) return;

        const noteText = prompt('Введите заметку для выделенного текста:', '');
        if (!noteText) return;

        const note = {
            id: Date.now().toString(),
            bookId: this.reader.bookId,
            chapter: this.reader.currentChapter,
            type: 'note',
            text: this.currentSelection.text,
            note: noteText,
            context: this.getContextAroundSelection(50),
            position: this.getSelectionPositionString(this.currentSelection.range),
            createdAt: new Date().toISOString()
        };

        this.annotations.push(note);
        this.saveAnnotations();
        
        // Добавляем иконку заметки
        this.applyNoteToDOM(note);
        
        this.reader.showNotification('Заметка добавлена');
    }

    createUnderline() {
        if (!this.currentSelection) return;

        const underline = {
            id: Date.now().toString(),
            bookId: this.reader.bookId,
            chapter: this.reader.currentChapter,
            type: 'underline',
            text: this.currentSelection.text,
            context: this.getContextAroundSelection(50),
            position: this.getSelectionPositionString(this.currentSelection.range),
            createdAt: new Date().toISOString()
        };

        this.annotations.push(underline);
        this.saveAnnotations();
        
        this.applyUnderlineToDOM(underline);
        
        this.reader.showNotification('Текст подчеркнут');
    }

    getContextAroundSelection(chars) {
        const range = this.currentSelection.range;
        const container = range.commonAncestorContainer;
        const text = container.textContent || container.innerText;
        const start = Math.max(0, range.startOffset - chars);
        const end = Math.min(text.length, range.endOffset + chars);
        
        return text.substring(start, end);
    }

    getSelectionPositionString(range) {
        const container = range.commonAncestorContainer;
        const xpath = this.getXPath(container);
        const offset = range.startOffset;
        
        return JSON.stringify({ xpath, offset, length: range.toString().length });
    }

    getXPath(element) {
        if (element.id) return `//*[@id="${element.id}"]`;
        
        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling = element.previousSibling;
            
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && 
                    sibling.nodeName === element.nodeName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            
            const tagName = element.nodeName.toLowerCase();
            const part = index ? `${tagName}[${index + 1}]` : tagName;
            parts.unshift(part);
            
            element = element.parentNode;
        }
        
        return parts.length ? `/${parts.join('/')}` : null;
    }

    applyAnnotations() {
        // Применяем все аннотации для текущей главы
        this.annotations
            .filter(ann => ann.bookId === this.reader.bookId && ann.chapter === this.reader.currentChapter)
            .forEach(annotation => {
                switch (annotation.type) {
                    case 'highlight':
                        this.applyHighlightToDOM(annotation);
                        break;
                    case 'note':
                        this.applyNoteToDOM(annotation);
                        break;
                    case 'underline':
                        this.applyUnderlineToDOM(annotation);
                        break;
                }
            });
    }

    applyHighlightToDOM(highlight) {
        try {
            const position = JSON.parse(highlight.position);
            const element = document.evaluate(
                position.xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;

            if (element && element.textContent) {
                const text = element.textContent;
                const before = text.substring(0, position.offset);
                const selected = text.substring(position.offset, position.offset + position.length);
                const after = text.substring(position.offset + position.length);
                
                const highlighted = document.createElement('span');
                highlighted.className = 'annotation-highlight';
                highlighted.style.backgroundColor = highlight.color;
                highlighted.style.opacity = '0.3';
                highlighted.style.borderRadius = '2px';
                highlighted.textContent = selected;
                highlighted.dataset.annotationId = highlight.id;

                const newContent = before + highlighted.outerHTML + after;
                element.innerHTML = newContent;
            }
        } catch (error) {
            console.error('Ошибка применения выделения:', error);
        }
    }

    applyNoteToDOM(note) {
        try {
            const position = JSON.parse(note.position);
            const element = document.evaluate(
                position.xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;

            if (element) {
                const noteIcon = document.createElement('span');
                noteIcon.className = 'annotation-note-icon';
                noteIcon.innerHTML = '<i class="fas fa-sticky-note"></i>';
                noteIcon.title = note.note;
                noteIcon.dataset.annotationId = note.id;
                
                // Добавляем иконку после элемента
                element.parentNode.insertBefore(noteIcon, element.nextSibling);
            }
        } catch (error) {
            console.error('Ошибка применения заметки:', error);
        }
    }

    applyUnderlineToDOM(underline) {
        try {
            const position = JSON.parse(underline.position);
            const element = document.evaluate(
                position.xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;

            if (element && element.textContent) {
                const text = element.textContent;
                const before = text.substring(0, position.offset);
                const selected = text.substring(position.offset, position.offset + position.length);
                const after = text.substring(position.offset + position.length);
                
                const underlined = document.createElement('span');
                underlined.className = 'annotation-underline';
                underlined.style.textDecoration = 'underline';
                underlined.style.textDecorationColor = '#ff9800';
                underlined.style.textDecorationThickness = '2px';
                underlined.textContent = selected;
                underlined.dataset.annotationId = underline.id;

                const newContent = before + underlined.outerHTML + after;
                element.innerHTML = newContent;
            }
        } catch (error) {
            console.error('Ошибка применения подчеркивания:', error);
        }
    }

    setHighlightColor(color) {
        this.currentHighlightColor = color;
        const toolbar = document.getElementById('annotationToolbar');
        if (toolbar) {
            const highlightBtn = toolbar.querySelector('[data-action="highlight"]');
            if (highlightBtn) {
                highlightBtn.style.color = color;
            }
        }
    }

    // Экспорт аннотаций
    exportAnnotations(format = 'json') {
        const bookAnnotations = this.annotations.filter(ann => ann.bookId === this.reader.bookId);
        
        if (format === 'json') {
            const data = JSON.stringify(bookAnnotations, null, 2);
            this.downloadFile(`annotations_${this.reader.bookId}.json`, data, 'application/json');
        } else if (format === 'txt') {
            const text = bookAnnotations.map(ann => {
                return `[${new Date(ann.createdAt).toLocaleString()}]
Текст: ${ann.text}
${ann.note ? `Заметка: ${ann.note}` : ''}
Контекст: ...${ann.context}...
---`;
            }).join('\n\n');
            
            this.downloadFile(`annotations_${this.reader.bookId}.txt`, text, 'text/plain');
        }
    }

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Поиск по аннотациям
    searchAnnotations(query) {
        return this.annotations.filter(ann => 
            ann.bookId === this.reader.bookId &&
            (ann.text.toLowerCase().includes(query.toLowerCase()) ||
             (ann.note && ann.note.toLowerCase().includes(query.toLowerCase())))
        );
    }
}

// Добавляем в AdvancedReader
AdvancedReader.prototype.initAnnotationManager = function() {
    this.annotationManager = new AnnotationManager(this);
};

AdvancedReader.prototype.exportAnnotations = function(format) {
    if (this.annotationManager) {
        this.annotationManager.exportAnnotations(format);
    }
};