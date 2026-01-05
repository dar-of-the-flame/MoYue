// advanced-reader.js - Расширенная читалка

class AdvancedReader {
    constructor() {
        this.bookId = null;
        this.book = null;
        this.currentChapter = 0;
        this.chapters = [];
        this.annotations = [];
        this.bookmarks = [];
        this.settings = {
            fontSize: 'medium',
            theme: 'dark',
            spacing: 'normal',
            fontFamily: 'Inter',
            readingMode: 'scroll', // 'scroll' или 'page'
            lineHeight: 1.8,
            margins: 'normal'
        };
        
        this.init();
    }

    async init() {
        this.bookId = sessionStorage.getItem('currentBookId');
        
        if (!this.bookId) {
            this.redirectToLibrary();
            return;
        }

        await this.loadBook();
        await this.loadSettings();
        await this.loadAnnotations();
        await this.loadBookmarks();
        
        this.initElements();
        this.initEvents();
        this.renderChapter();
        this.updateNavigation();
        this.initTableOfContents();
    }

    async loadBook() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoyueLibrary', 3);
            
            request.onerror = () => reject('Ошибка открытия базы данных');
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['books'], 'readonly');
                const store = transaction.objectStore('books');
                const getRequest = store.get(this.bookId);
                
                getRequest.onsuccess = (e) => {
                    this.book = e.target.result;
                    if (!this.book) {
                        this.redirectToLibrary();
                        return;
                    }
                    
                    // Извлекаем главы из книги
                    this.chapters = this.book.chapters || this.generateChapters();
                    this.currentChapter = this.getSavedChapter();
                    
                    resolve();
                };
                
                getRequest.onerror = () => reject('Ошибка загрузки книги');
            };
        });
    }

    generateChapters() {
        if (!this.book || !this.book.content) return [];
        
        const chapters = [];
        const lines = this.book.content.split('\n');
        let chapterCount = 0;
        
        // Простой алгоритм разбивки на главы
        const linesPerChapter = Math.min(500, Math.max(100, Math.floor(lines.length / 20)));
        
        for (let i = 0; i < lines.length; i += linesPerChapter) {
            chapterCount++;
            chapters.push({
                title: `Глава ${chapterCount}`,
                startLine: i,
                endLine: Math.min(i + linesPerChapter - 1, lines.length - 1),
                content: lines.slice(i, Math.min(i + linesPerChapter, lines.length)).join('\n')
            });
        }
        
        return chapters;
    }

    getSavedChapter() {
        const saved = localStorage.getItem(`book_chapter_${this.bookId}`);
        return saved ? parseInt(saved) : 0;
    }

    saveCurrentChapter() {
        localStorage.setItem(`book_chapter_${this.bookId}`, this.currentChapter);
        this.updateBookProgress();
    }

    async updateBookProgress() {
        if (!this.book) return;
        
        const progress = Math.round(((this.currentChapter + 1) / this.chapters.length) * 100);
        this.book.progress = progress;
        this.book.lastRead = new Date().toISOString();
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoyueLibrary', 3);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['books'], 'readwrite');
                const store = transaction.objectStore('books');
                
                store.put(this.book);
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject();
            };
        });
    }

    async loadSettings() {
        const saved = localStorage.getItem('advanced_reader_settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        this.applySettings();
    }

    async loadAnnotations() {
        const saved = localStorage.getItem(`book_annotations_${this.bookId}`);
        this.annotations = saved ? JSON.parse(saved) : [];
    }

    async loadBookmarks() {
        const saved = localStorage.getItem(`book_bookmarks_${this.bookId}`);
        this.bookmarks = saved ? JSON.parse(saved) : [];
    }

    initElements() {
        this.elements = {
            readerContent: document.getElementById('readerContent'),
            currentPage: document.getElementById('currentPage'),
            totalPages: document.getElementById('totalPages'),
            prevChapter: document.getElementById('prevChapter'),
            nextChapter: document.getElementById('nextChapter'),
            progressPercent: document.getElementById('progressPercent'),
            readingProgressFill: document.getElementById('readingProgressFill'),
            bookmarkBtn: document.getElementById('bookmarkBtn'),
            annotationsBtn: document.getElementById('annotationsBtn'),
            tocBtn: document.getElementById('tocBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            searchBtn: document.getElementById('searchBtn'),
            fontSizeControls: document.querySelector('.font-size-controls'),
            themeControls: document.querySelector('.theme-controls'),
            fontSelect: document.getElementById('fontSelect'),
            readingModeSelect: document.getElementById('readingModeSelect'),
            lineHeightSlider: document.getElementById('lineHeightSlider'),
            marginsSelect: document.getElementById('marginsSelect')
        };
    }

    initEvents() {
        // Навигация по главам
        if (this.elements.prevChapter) {
            this.elements.prevChapter.addEventListener('click', () => this.prevChapter());
        }
        if (this.elements.nextChapter) {
            this.elements.nextChapter.addEventListener('click', () => this.nextChapter());
        }

        // Закладки
        if (this.elements.bookmarkBtn) {
            this.elements.bookmarkBtn.addEventListener('click', () => this.toggleBookmark());
        }

        // Клавиатура
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevChapter();
            if (e.key === 'ArrowRight') this.nextChapter();
            if (e.key === 'Escape') this.closeAllModals();
            if (e.key === 'b' && e.ctrlKey) this.toggleBookmark();
        });

        // Настройки
        this.initSettingsEvents();
    }

    initSettingsEvents() {
        // Размер шрифта
        if (this.elements.fontSizeControls) {
            this.elements.fontSizeControls.addEventListener('click', (e) => {
                const btn = e.target.closest('.font-size-btn');
                if (btn) {
                    this.setFontSize(btn.dataset.size);
                }
            });
        }

        // Темы
        if (this.elements.themeControls) {
            this.elements.themeControls.addEventListener('click', (e) => {
                const btn = e.target.closest('.theme-btn');
                if (btn) {
                    this.setTheme(btn.dataset.theme);
                }
            });
        }

        // Шрифт
        if (this.elements.fontSelect) {
            this.elements.fontSelect.addEventListener('change', (e) => {
                this.setFontFamily(e.target.value);
            });
        }

        // Режим чтения
        if (this.elements.readingModeSelect) {
            this.elements.readingModeSelect.addEventListener('change', (e) => {
                this.setReadingMode(e.target.value);
            });
        }

        // Межстрочный интервал
        if (this.elements.lineHeightSlider) {
            this.elements.lineHeightSlider.addEventListener('input', (e) => {
                this.setLineHeight(parseFloat(e.target.value));
            });
        }

        // Отступы
        if (this.elements.marginsSelect) {
            this.elements.marginsSelect.addEventListener('change', (e) => {
                this.setMargins(e.target.value);
            });
        }
    }

    renderChapter() {
        if (!this.book || !this.chapters[this.currentChapter]) return;

        const chapter = this.chapters[this.currentChapter];
        
        // Обновляем контент
        if (this.elements.readerContent) {
            this.elements.readerContent.innerHTML = `
                <div class="chapter-header">
                    <h2>${chapter.title}</h2>
                </div>
                <div class="chapter-content">${this.formatChapterContent(chapter.content)}</div>
            `;
        }

        // Обновляем навигацию
        this.updateNavigation();
        
        // Обновляем прогресс
        this.updateProgress();
        
        // Прокручиваем к началу
        if (this.elements.readerContent) {
            this.elements.readerContent.scrollTop = 0;
        }

        // Сохраняем текущую главу
        this.saveCurrentChapter();
        
        // Проверяем закладку для этой главы
        this.updateBookmarkButton();
    }

    formatChapterContent(content) {
        // Разбиваем на абзацы и добавляем возможности для аннотаций
        const paragraphs = content.split('\n\n')
            .filter(p => p.trim().length > 0)
            .map((paragraph, index) => `
                <div class="paragraph" data-paragraph="${index}">
                    <p>${paragraph}</p>
                    <div class="paragraph-actions">
                        <button class="annotation-btn" data-action="highlight" title="Выделить">
                            <i class="fas fa-highlighter"></i>
                        </button>
                        <button class="annotation-btn" data-action="note" title="Добавить заметку">
                            <i class="fas fa-sticky-note"></i>
                        </button>
                    </div>
                </div>
            `)
            .join('');
        
        return paragraphs;
    }

    updateNavigation() {
        if (!this.elements.currentPage || !this.elements.totalPages) return;
        
        this.elements.currentPage.textContent = this.currentChapter + 1;
        this.elements.totalPages.textContent = this.chapters.length;
        
        // Обновляем состояние кнопок
        if (this.elements.prevChapter) {
            this.elements.prevChapter.disabled = this.currentChapter === 0;
        }
        if (this.elements.nextChapter) {
            this.elements.nextChapter.disabled = this.currentChapter === this.chapters.length - 1;
        }
    }

    updateProgress() {
        const progress = Math.round(((this.currentChapter + 1) / this.chapters.length) * 100);
        
        if (this.elements.progressPercent) {
            this.elements.progressPercent.textContent = `${progress}%`;
        }
        
        if (this.elements.readingProgressFill) {
            this.elements.readingProgressFill.style.width = `${progress}%`;
        }
    }

    prevChapter() {
        if (this.currentChapter > 0) {
            this.currentChapter--;
            this.renderChapter();
        }
    }

    nextChapter() {
        if (this.currentChapter < this.chapters.length - 1) {
            this.currentChapter++;
            this.renderChapter();
        }
    }

    gotoChapter(chapterIndex) {
        if (chapterIndex >= 0 && chapterIndex < this.chapters.length) {
            this.currentChapter = chapterIndex;
            this.renderChapter();
        }
    }

    toggleBookmark() {
        const chapter = this.chapters[this.currentChapter];
        const bookmarkIndex = this.bookmarks.findIndex(b => 
            b.chapter === this.currentChapter && b.bookId === this.bookId
        );
        
        if (bookmarkIndex > -1) {
            // Удаляем закладку
            this.bookmarks.splice(bookmarkIndex, 1);
            this.showNotification('Закладка удалена');
        } else {
            // Добавляем закладку
            this.bookmarks.push({
                id: Date.now().toString(),
                bookId: this.bookId,
                bookTitle: this.book.title,
                chapter: this.currentChapter,
                chapterTitle: chapter.title,
                date: new Date().toISOString(),
                preview: chapter.content.substring(0, 100) + '...'
            });
            this.showNotification('Закладка добавлена');
        }
        
        // Сохраняем закладки
        localStorage.setItem(`book_bookmarks_${this.bookId}`, JSON.stringify(this.bookmarks));
        this.updateBookmarkButton();
    }

    updateBookmarkButton() {
        if (!this.elements.bookmarkBtn) return;
        
        const hasBookmark = this.bookmarks.some(b => 
            b.chapter === this.currentChapter && b.bookId === this.bookId
        );
        
        if (hasBookmark) {
            this.elements.bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
            this.elements.bookmarkBtn.classList.add('active');
        } else {
            this.elements.bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i>';
            this.elements.bookmarkBtn.classList.remove('active');
        }
    }

    // Настройки чтения
    setFontSize(size) {
        this.settings.fontSize = size;
        this.applySettings();
        this.saveSettings();
    }

    setTheme(theme) {
        this.settings.theme = theme;
        this.applySettings();
        this.saveSettings();
    }

    setFontFamily(font) {
        this.settings.fontFamily = font;
        this.applySettings();
        this.saveSettings();
    }

    setReadingMode(mode) {
        this.settings.readingMode = mode;
        this.applySettings();
        this.saveSettings();
    }

    setLineHeight(height) {
        this.settings.lineHeight = height;
        this.applySettings();
        this.saveSettings();
    }

    setMargins(margins) {
        this.settings.margins = margins;
        this.applySettings();
        this.saveSettings();
    }

    applySettings() {
        // Размер шрифта
        document.body.classList.remove(
            'font-size-small', 'font-size-medium', 'font-size-large', 'font-size-xlarge'
        );
        document.body.classList.add(`font-size-${this.settings.fontSize}`);
        
        // Тема
        document.body.classList.remove(
            'reader-theme-dark', 'reader-theme-light', 'reader-theme-sepia'
        );
        document.body.classList.add(`reader-theme-${this.settings.theme}`);
        
        // Шрифт
        if (this.elements.readerContent) {
            this.elements.readerContent.style.fontFamily = this.settings.fontFamily;
        }
        
        // Режим чтения
        document.body.classList.remove('reading-mode-scroll', 'reading-mode-page');
        document.body.classList.add(`reading-mode-${this.settings.readingMode}`);
        
        // Межстрочный интервал
        if (this.elements.readerContent) {
            this.elements.readerContent.style.lineHeight = this.settings.lineHeight;
        }
        
        // Отступы
        document.body.classList.remove('margins-small', 'margins-normal', 'margins-large');
        document.body.classList.add(`margins-${this.settings.margins}`);
    }

    saveSettings() {
        localStorage.setItem('advanced_reader_settings', JSON.stringify(this.settings));
    }

    initTableOfContents() {
        if (!document.getElementById('tocModal')) {
            const tocModal = document.createElement('div');
            tocModal.id = 'tocModal';
            tocModal.className = 'modal';
            tocModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Оглавление</h3>
                        <div class="toc-search">
                            <input type="text" id="tocSearch" placeholder="Поиск по главам...">
                            <button class="search-btn"><i class="fas fa-search"></i></button>
                        </div>
                        <button class="modal-close" id="tocClose">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="toc-stats">
                            <span>Глав: ${this.chapters.length}</span>
                            <span>Прогресс: ${Math.round(((this.currentChapter + 1) / this.chapters.length) * 100)}%</span>
                            <span>Символов: ${this.book.content.length.toLocaleString()}</span>
                        </div>
                        <div class="toc-list" id="tocList"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(tocModal);
            
            // Обработчик поиска
            const searchInput = document.getElementById('tocSearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.searchTOC(e.target.value);
                });
            }
        }
        
        this.updateTableOfContents();
    }

    updateTableOfContents() {
        const tocList = document.getElementById('tocList');
        if (!tocList) return;
        
        const tocHTML = this.chapters.map((chapter, index) => {
            const wordCount = chapter.content.split(/\s+/).length;
            const isCurrent = index === this.currentChapter;
            const hasAnnotations = this.annotationManager ? 
                this.annotationManager.annotations.filter(ann => 
                    ann.chapter === index
                ).length : 0;
            
            return `
                <div class="toc-item ${isCurrent ? 'active' : ''}" data-chapter="${index}">
                    <div class="toc-item-number">
                        <span class="chapter-number">${index + 1}</span>
                        ${hasAnnotations > 0 ? 
                            `<span class="annotation-badge" title="${hasAnnotations} заметок">
                                <i class="fas fa-sticky-note"></i> ${hasAnnotations}
                            </span>` : ''
                        }
                    </div>
                    <div class="toc-item-content">
                        <h4>${chapter.title}</h4>
                        <p class="toc-item-preview">${chapter.content.substring(0, 80).replace(/\n/g, ' ')}...</p>
                        <div class="toc-item-meta">
                            <span><i class="fas fa-font"></i> ${wordCount} слов</span>
                            <span><i class="fas fa-clock"></i> ${Math.ceil(wordCount / 200)} мин</span>
                        </div>
                    </div>
                    <div class="toc-item-actions">
                        <button class="toc-action-btn" data-action="read" title="Читать">
                            <i class="fas fa-book-open"></i>
                        </button>
                        ${this.bookmarks.some(b => b.chapter === index) ? 
                            `<button class="toc-action-btn active" data-action="bookmark" title="Удалить закладку">
                                <i class="fas fa-bookmark"></i>
                            </button>` :
                            `<button class="toc-action-btn" data-action="bookmark" title="Добавить закладку">
                                <i class="far fa-bookmark"></i>
                            </button>`
                        }
                        <button class="toc-action-btn" data-action="annotations" title="Показать заметки">
                            <i class="fas fa-sticky-note"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        tocList.innerHTML = tocHTML;
        
        // Добавляем обработчики
        this.bindTOCEvents();
    }

    bindTOCEvents() {
        document.querySelectorAll('.toc-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.toc-item-actions')) {
                    const chapterIndex = parseInt(e.currentTarget.dataset.chapter);
                    this.gotoChapter(chapterIndex);
                    this.closeModal('tocModal');
                }
            });
        });
        
        document.querySelectorAll('.toc-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.currentTarget.dataset.action;
                const chapterItem = e.currentTarget.closest('.toc-item');
                const chapterIndex = parseInt(chapterItem.dataset.chapter);
                
                switch (action) {
                    case 'read':
                        this.gotoChapter(chapterIndex);
                        this.closeModal('tocModal');
                        break;
                    case 'bookmark':
                        this.currentChapter = chapterIndex;
                        this.toggleBookmark();
                        this.updateTableOfContents();
                        break;
                    case 'annotations':
                        this.showChapterAnnotations(chapterIndex);
                        break;
                }
            });
        });
        
        // Закрытие модального окна
        const closeBtn = document.getElementById('tocClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal('tocModal'));
        }
    }

    searchTOC(query) {
        if (!query.trim()) {
            this.updateTableOfContents();
            return;
        }
        
        const filteredChapters = this.chapters.filter((chapter, index) => {
            return chapter.title.toLowerCase().includes(query.toLowerCase()) ||
                   chapter.content.toLowerCase().includes(query.toLowerCase());
        });
        
        const tocList = document.getElementById('tocList');
        if (!tocList) return;
        
        const searchHTML = filteredChapters.map((chapter, displayIndex) => {
            const originalIndex = this.chapters.findIndex(c => c === chapter);
            const isCurrent = originalIndex === this.currentChapter;
            
            // Найдем контекст с подсветкой
            const contentPreview = this.getSearchPreview(chapter.content, query);
            
            return `
                <div class="toc-item search-result ${isCurrent ? 'active' : ''}" data-chapter="${originalIndex}">
                    <div class="toc-item-number">
                        <span class="chapter-number">${originalIndex + 1}</span>
                    </div>
                    <div class="toc-item-content">
                        <h4>${this.highlightText(chapter.title, query)}</h4>
                        <p class="toc-item-preview">${contentPreview}</p>
                    </div>
                    <div class="toc-item-actions">
                        <button class="toc-action-btn" data-action="read" title="Перейти">
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        tocList.innerHTML = searchHTML || '<div class="no-results">Ничего не найдено</div>';
        
        // Перепривязываем события
        this.bindTOCEvents();
    }

    getSearchPreview(text, query) {
        const index = text.toLowerCase().indexOf(query.toLowerCase());
        if (index === -1) return text.substring(0, 100) + '...';
        
        const start = Math.max(0, index - 40);
        const end = Math.min(text.length, index + query.length + 40);
        let preview = text.substring(start, end);
        
        if (start > 0) preview = '...' + preview;
        if (end < text.length) preview = preview + '...';
        
        return this.highlightText(preview, query);
    }

    highlightText(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    showChapterAnnotations(chapterIndex) {
        if (!this.annotationManager) return;
        
        const annotations = this.annotationManager.annotations.filter(ann => 
            ann.chapter === chapterIndex
        );
        
        if (annotations.length === 0) {
            this.showNotification('В этой главе нет заметок');
            return;
        }
        
        // Создаем модальное окно с заметками
        const modalId = 'annotationsModal';
        if (!document.getElementById(modalId)) {
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        const modal = document.getElementById(modalId);
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Заметки в главе "${this.chapters[chapterIndex].title}"</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="annotations-list">
                        ${annotations.map(ann => `
                            <div class="annotation-item" data-id="${ann.id}">
                                <div class="annotation-type ${ann.type}">
                                    <i class="fas fa-${ann.type === 'highlight' ? 'highlighter' : 'sticky-note'}"></i>
                                </div>
                                <div class="annotation-content">
                                    <div class="annotation-text">${ann.text}</div>
                                    ${ann.note ? `<div class="annotation-note">${ann.note}</div>` : ''}
                                    <div class="annotation-meta">
                                        <span><i class="far fa-clock"></i> ${new Date(ann.createdAt).toLocaleString()}</span>
                                        <span class="annotation-actions">
                                            <button class="btn-small" onclick="advancedReader.gotoAnnotation(${chapterIndex}, '${ann.id}')">
                                                <i class="fas fa-book-open"></i> Перейти
                                            </button>
                                            <button class="btn-small btn-danger" onclick="advancedReader.deleteAnnotation('${ann.id}')">
                                                <i class="fas fa-trash"></i> Удалить
                                            </button>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="advancedReader.exportAnnotations('json')">
                        <i class="fas fa-download"></i> Экспорт JSON
                    </button>
                    <button class="btn-secondary" onclick="advancedReader.exportAnnotations('txt')">
                        <i class="fas fa-download"></i> Экспорт TXT
                    </button>
                    <button class="btn-primary" onclick="this.closest('.modal').remove()">Закрыть</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    gotoAnnotation(chapterIndex, annotationId) {
        this.gotoChapter(chapterIndex);
        this.closeAllModals();
        
        // Прокручиваем к аннотации
        setTimeout(() => {
            const annotationElement = document.querySelector(`[data-annotation-id="${annotationId}"]`);
            if (annotationElement) {
                annotationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Мигающий эффект
                annotationElement.style.animation = 'pulse 1s 3';
                setTimeout(() => {
                    annotationElement.style.animation = '';
                }, 3000);
            }
        }, 500);
    }

    deleteAnnotation(annotationId) {
        if (!this.annotationManager) return;
        
        const index = this.annotationManager.annotations.findIndex(ann => ann.id === annotationId);
        if (index > -1) {
            this.annotationManager.annotations.splice(index, 1);
            this.annotationManager.saveAnnotations();
            
            // Удаляем из DOM
            const annotationElement = document.querySelector(`[data-annotation-id="${annotationId}"]`);
            if (annotationElement) {
                annotationElement.remove();
            }
            
            this.showNotification('Заметка удалена');
            this.updateTableOfContents();
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'reader-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }

    redirectToLibrary() {
        alert('Книга не выбрана');
        window.location.href = 'library.html';
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('reader.html')) {
        window.advancedReader = new AdvancedReader();
    }
});