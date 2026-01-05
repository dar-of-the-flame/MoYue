// Читалка

class Reader {
    constructor() {
        this.bookId = null;
        this.book = null;
        this.currentPage = 0;
        this.pages = [];
        this.settings = {
            fontSize: 'medium',
            theme: 'dark',
            spacing: 'normal',
            fontFamily: 'Inter'
        };
        
        this.init();
    }

    async init() {
        // Получаем ID книги
        this.bookId = sessionStorage.getItem('currentBookId');
        
        if (!this.bookId) {
            alert('Книга не выбрана');
            window.location.href = 'library.html';
            return;
        }

        // Загружаем настройки
        this.loadSettings();
        
        // Загружаем книгу
        await this.loadBook();
        
        // Инициализируем элементы
        this.initElements();
        
        // Настраиваем события
        this.initEvents();
        
        // Рендерим страницу
        this.renderPage();
    }

    async loadBook() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoyueLibrary', 2);
            
            request.onerror = () => {
                reject('Ошибка открытия базы данных');
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['books'], 'readonly');
                const store = transaction.objectStore('books');
                const getRequest = store.get(this.bookId);
                
                getRequest.onsuccess = (e) => {
                    this.book = e.target.result;
                    if (!this.book) {
                        alert('Книга не найдена');
                        window.location.href = 'library.html';
                        return;
                    }
                    
                    // Разбиваем текст на страницы
                    this.paginateText();
                    
                    // Загружаем сохраненный прогресс
                    this.loadProgress();
                    
                    resolve();
                };
                
                getRequest.onerror = () => {
                    reject('Ошибка загрузки книги');
                };
            };
        });
    }

    paginateText() {
        if (!this.book || !this.book.content) {
            this.pages = ['Текст книги отсутствует'];
            return;
        }
        
        const wordsPerPage = 500; // Примерно 500 слов на страницу
        const words = this.book.content.split(/\s+/);
        this.pages = [];
        
        for (let i = 0; i < words.length; i += wordsPerPage) {
            const pageWords = words.slice(i, i + wordsPerPage);
            this.pages.push(pageWords.join(' '));
        }
        
        // Если текст очень короткий
        if (this.pages.length === 0) {
            this.pages = [this.book.content];
        }
    }

    loadProgress() {
        const progress = localStorage.getItem(`book_progress_${this.bookId}`);
        if (progress) {
            this.currentPage = parseInt(progress);
            this.currentPage = Math.min(this.currentPage, this.pages.length - 1);
            this.currentPage = Math.max(this.currentPage, 0);
        }
    }

    saveProgress() {
        localStorage.setItem(`book_progress_${this.bookId}`, this.currentPage);
        this.updateBookProgress();
    }

    async updateBookProgress() {
        if (!this.book) return;
        
        const progress = Math.round(((this.currentPage + 1) / this.pages.length) * 100);
        this.book.progress = progress;
        this.book.lastRead = new Date().toISOString();
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoyueLibrary', 2);
            
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

    initElements() {
        this.elements = {
            backBtn: document.getElementById('backBtn'),
            progressPercent: document.getElementById('progressPercent'),
            bookTitle: document.getElementById('bookTitle'),
            bookAuthor: document.getElementById('bookAuthor'),
            bookFormat: document.getElementById('bookFormat'),
            readerContent: document.getElementById('readerContent'),
            currentPage: document.getElementById('currentPage'),
            totalPages: document.getElementById('totalPages'),
            prevPage: document.getElementById('prevPage'),
            nextPage: document.getElementById('nextPage'),
            readingProgressFill: document.getElementById('readingProgressFill'),
            bookmarkBtn: document.getElementById('bookmarkBtn'),
            searchBtn: document.getElementById('searchBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            settingsModal: document.getElementById('settingsModal'),
            settingsClose: document.getElementById('settingsClose'),
            resetSettings: document.getElementById('resetSettings'),
            saveSettings: document.getElementById('saveSettings'),
            searchModal: document.getElementById('searchModal'),
            searchClose: document.getElementById('searchClose'),
            searchInput: document.getElementById('searchInput'),
            searchNext: document.getElementById('searchNext'),
            searchResults: document.getElementById('searchResults'),
            fontSelect: document.getElementById('fontSelect')
        };
    }

    initEvents() {
        // Навигация
        this.elements.backBtn.addEventListener('click', () => {
            window.history.back();
        });

        // Перелистывание страниц
        this.elements.prevPage.addEventListener('click', () => this.prevPage());
        this.elements.nextPage.addEventListener('click', () => this.nextPage());

        // Клавиши клавиатуры
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevPage();
            if (e.key === 'ArrowRight') this.nextPage();
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Закладки
        this.elements.bookmarkBtn.addEventListener('click', () => this.toggleBookmark());

        // Поиск
        this.elements.searchBtn.addEventListener('click', () => this.openSearch());
        this.elements.searchClose.addEventListener('click', () => this.closeSearch());
        this.elements.searchNext.addEventListener('click', () => this.performSearch());
        this.elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Настройки
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        this.elements.settingsClose.addEventListener('click', () => this.closeSettings());
        this.elements.resetSettings.addEventListener('click', () => this.resetSettings());
        this.elements.saveSettings.addEventListener('click', () => this.saveSettingsToStorage());

        // Размер шрифта
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFontSize(e.target.dataset.size);
                this.updateActiveButton('.font-size-btn', e.target);
            });
        });

        // Темы
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTheme(e.target.dataset.theme);
                this.updateActiveButton('.theme-btn', e.target);
            });
        });

        // Интервал
        document.querySelectorAll('.spacing-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setSpacing(e.target.dataset.spacing);
                this.updateActiveButton('.spacing-btn', e.target);
            });
        });

        // Шрифт
        this.elements.fontSelect.addEventListener('change', (e) => {
            this.setFontFamily(e.target.value);
        });

        // Закрытие модальных окон по клику на фон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Сохранение прогресса при закрытии
        window.addEventListener('beforeunload', () => {
            this.saveProgress();
        });
    }

    renderPage() {
        if (!this.book) return;

        // Обновляем информацию о книге
        this.elements.bookTitle.textContent = this.book.title;
        this.elements.bookAuthor.textContent = this.book.author || 'Неизвестный автор';
        this.elements.bookFormat.textContent = this.book.format ? `.${this.book.format.toUpperCase()}` : 'TXT';

        // Обновляем контент
        if (this.pages.length > 0) {
            this.elements.readerContent.innerHTML = `<p>${this.pages[this.currentPage]}</p>`;
        }

        // Обновляем навигацию
        this.elements.currentPage.textContent = this.currentPage + 1;
        this.elements.totalPages.textContent = this.pages.length;

        // Обновляем прогресс
        const progress = Math.round(((this.currentPage + 1) / this.pages.length) * 100);
        this.elements.progressPercent.textContent = `${progress}%`;
        this.elements.readingProgressFill.style.width = `${progress}%`;

        // Обновляем состояние кнопок
        this.elements.prevPage.disabled = this.currentPage === 0;
        this.elements.nextPage.disabled = this.currentPage === this.pages.length - 1;

        // Применяем настройки
        this.applySettings();
    }

    prevPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.renderPage();
            this.saveProgress();
        }
    }

    nextPage() {
        if (this.currentPage < this.pages.length - 1) {
            this.currentPage++;
            this.renderPage();
            this.saveProgress();
        }
    }

    toggleBookmark() {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '{}');
        const bookmarkKey = `${this.bookId}_${this.currentPage}`;
        
        if (bookmarks[bookmarkKey]) {
            delete bookmarks[bookmarkKey];
            this.elements.bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i>';
            this.showNotification('Закладка удалена');
        } else {
            bookmarks[bookmarkKey] = {
                bookId: this.bookId,
                bookTitle: this.book.title,
                page: this.currentPage,
                date: new Date().toISOString(),
                preview: this.pages[this.currentPage].substring(0, 100) + '...'
            };
            this.elements.bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
            this.showNotification('Закладка добавлена');
        }
        
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    }

    openSearch() {
        this.elements.searchModal.classList.add('active');
        this.elements.searchInput.focus();
    }

    closeSearch() {
        this.elements.searchModal.classList.remove('active');
        this.elements.searchInput.value = '';
        this.elements.searchResults.innerHTML = '';
    }

    performSearch() {
        const query = this.elements.searchInput.value.trim().toLowerCase();
        if (!query) return;

        const results = [];
        
        // Ищем по всем страницам
        this.pages.forEach((page, pageIndex) => {
            const pageLower = page.toLowerCase();
            let position = pageLower.indexOf(query);
            
            while (position !== -1) {
                // Находим контекст (около 100 символов)
                const start = Math.max(0, position - 50);
                const end = Math.min(page.length, position + query.length + 50);
                const context = page.substring(start, end);
                
                // Подсвечиваем найденное
                const highlighted = context.replace(
                    new RegExp(query, 'gi'),
                    match => `<span class="search-highlight">${match}</span>`
                );
                
                results.push({
                    page: pageIndex,
                    position: position,
                    context: highlighted,
                    fullText: page
                });
                
                position = pageLower.indexOf(query, position + 1);
            }
        });

        // Отображаем результаты
        this.displaySearchResults(results);
    }

    displaySearchResults(results) {
        if (results.length === 0) {
            this.elements.searchResults.innerHTML = '<p class="no-results">Ничего не найдено</p>';
            return;
        }

        const resultsHTML = results.slice(0, 20).map((result, index) => `
            <div class="search-result-item" data-page="${result.page}" data-index="${index}">
                <div class="search-result-context">
                    Страница ${result.page + 1}: ...${result.context}...
                </div>
            </div>
        `).join('');

        this.elements.searchResults.innerHTML = resultsHTML;

        // Добавляем обработчики кликов
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = parseInt(item.dataset.page);
                this.currentPage = page;
                this.renderPage();
                this.closeSearch();
                this.showNotification(`Переход на страницу ${page + 1}`);
            });
        });
    }

    openSettings() {
        // Устанавливаем активные кнопки
        this.updateActiveButton('.font-size-btn', 
            document.querySelector(`.font-size-btn[data-size="${this.settings.fontSize}"]`));
        this.updateActiveButton('.theme-btn',
            document.querySelector(`.theme-btn[data-theme="${this.settings.theme}"]`));
        this.updateActiveButton('.spacing-btn',
            document.querySelector(`.spacing-btn[data-spacing="${this.settings.spacing}"]`));
        
        // Устанавливаем выбранный шрифт
        this.elements.fontSelect.value = this.settings.fontFamily;
        
        this.elements.settingsModal.classList.add('active');
    }

    closeSettings() {
        this.elements.settingsModal.classList.remove('active');
    }

    updateActiveButton(selector, activeButton) {
        document.querySelectorAll(selector).forEach(btn => {
            btn.classList.remove('active');
        });
        activeButton.classList.add('active');
    }

    setFontSize(size) {
        this.settings.fontSize = size;
        this.applySettings();
    }

    setTheme(theme) {
        this.settings.theme = theme;
        this.applySettings();
    }

    setSpacing(spacing) {
        this.settings.spacing = spacing;
        this.applySettings();
    }

    setFontFamily(font) {
        this.settings.fontFamily = font;
        this.applySettings();
    }

    applySettings() {
        // Размер шрифта
        document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large', 'font-size-xlarge');
        document.body.classList.add(`font-size-${this.settings.fontSize}`);
        
        // Тема
        document.body.classList.remove('reader-theme-dark', 'reader-theme-light', 'reader-theme-sepia');
        document.body.classList.add(`reader-theme-${this.settings.theme}`);
        
        // Интервал
        document.body.classList.remove('spacing-tight', 'spacing-normal', 'spacing-wide');
        document.body.classList.add(`spacing-${this.settings.spacing}`);
        
        // Шрифт
        this.elements.readerContent.style.fontFamily = this.settings.fontFamily;
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('reader_settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    saveSettingsToStorage() {
        localStorage.setItem('reader_settings', JSON.stringify(this.settings));
        this.closeSettings();
        this.showNotification('Настройки сохранены');
    }

    resetSettings() {
        this.settings = {
            fontSize: 'medium',
            theme: 'dark',
            spacing: 'normal',
            fontFamily: 'Inter'
        };
        
        this.applySettings();
        this.openSettings(); // Переоткрываем, чтобы обновить UI
        this.showNotification('Настройки сброшены');
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    showNotification(message) {
        // Создаем временное уведомление
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--sky-blue);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }
}

// Добавляем CSS для анимаций уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Инициализация читалки
document.addEventListener('DOMContentLoaded', () => {
    new Reader();
});