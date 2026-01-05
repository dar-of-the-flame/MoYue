// Библиотека книг
class LibraryManager {
    constructor() {
        this.db = null;
        this.currentBookId = null;
        this.books = [];
        this.init();
    }

    async init() {
        await this.initDB();
        await this.loadBooks();
        this.initEvents();
        this.renderBooks();
        this.updateStats();
        
        // Проверяем, нужно ли открыть шаринг книги с главной
        const shareBookId = sessionStorage.getItem('shareBookId');
        if (shareBookId) {
            sessionStorage.removeItem('shareBookId');
            setTimeout(() => {
                this.shareBook(shareBookId);
            }, 1000);
        }
    }

    // Инициализация IndexedDB
    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoyueLibrary', 2);
            
            request.onerror = (event) => {
                console.error('Ошибка IndexedDB:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ База данных открыта');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создаем хранилище для книг
                if (!db.objectStoreNames.contains('books')) {
                    const bookStore = db.createObjectStore('books', { keyPath: 'id' });
                    bookStore.createIndex('title', 'title', { unique: false });
                    bookStore.createIndex('author', 'author', { unique: false });
                    bookStore.createIndex('addedAt', 'addedAt', { unique: false });
                    bookStore.createIndex('format', 'format', { unique: false });
                }
                
                // Создаем хранилище для настроек
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                console.log('🔄 Структура базы данных обновлена');
            };
        });
    }

    // Загрузка книг из базы
    async loadBooks() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('База данных не инициализирована');
                return;
            }
            
            const transaction = this.db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            const request = store.getAll();
            
            request.onsuccess = (event) => {
                this.books = event.target.result || [];
                console.log(`📚 Загружено ${this.books.length} книг`);
                resolve(this.books);
            };
            
            request.onerror = (event) => {
                console.error('❌ Ошибка загрузки книг:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Сохранение книги
    async saveBook(book) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('База данных не инициализирована');
                return;
            }
            
            const transaction = this.db.transaction(['books'], 'readwrite');
            const store = transaction.objectStore('books');
            
            // Генерируем ID если его нет
            if (!book.id) {
                book.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                book.addedAt = new Date().toISOString();
            }
            
            const request = store.put(book);
            
            request.onsuccess = async () => {
                console.log('💾 Книга сохранена:', book.title);
                // Ждем загрузку книг перед рендерингом
                await this.loadBooks();
                this.renderBooks();
                this.updateStats();
                resolve(book);
            };
            
            request.onerror = (event) => {
                console.error('❌ Ошибка сохранения книги:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Удаление книги
    async deleteBook(bookId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('База данных не инициализирована');
                return;
            }
            
            const transaction = this.db.transaction(['books'], 'readwrite');
            const store = transaction.objectStore('books');
            const request = store.delete(bookId);
            
            request.onsuccess = async () => {
                console.log('🗑️ Книга удалена:', bookId);
                await this.loadBooks();
                this.renderBooks();
                this.updateStats();
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('❌ Ошибка удаления книги:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Получение книги по ID
    async getBook(bookId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('База данных не инициализирована');
                return;
            }
            
            const transaction = this.db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            const request = store.get(bookId);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // Обновление прогресса чтения
    async updateProgress(bookId, progress) {
        const book = await this.getBook(bookId);
        if (book) {
            book.progress = Math.min(Math.max(progress, 0), 100);
            book.lastRead = new Date().toISOString();
            await this.saveBook(book);
        }
    }

    // Обработка загрузки файлов
    async processFiles(files) {
        const uploadProgress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressCount = document.getElementById('progressCount');
        const progressFiles = document.getElementById('progressFiles');
        
        uploadProgress.style.display = 'block';
        progressFiles.innerHTML = '';
        
        let processed = 0;
        const total = files.length;
        
        for (let file of files) {
            const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            
            // Добавляем файл в список
            const fileElement = document.createElement('div');
            fileElement.className = 'progress-file';
            fileElement.innerHTML = `
                <div class="progress-file-name">${file.name}</div>
                <div class="progress-file-status queued">Ожидание</div>
            `;
            progressFiles.appendChild(fileElement);
            
            try {
                // Обновляем статус
                fileElement.querySelector('.progress-file-status').className = 'progress-file-status processing';
                fileElement.querySelector('.progress-file-status').textContent = 'Обработка';
                
                // Читаем файл
                const bookData = await this.readFile(file);
                
                // Создаем объект книги
                const book = {
                    id: fileId,
                    title: this.extractTitle(file.name, bookData.content),
                    author: this.extractAuthor(bookData.content),
                    content: bookData.content,
                    format: this.getFileFormat(file.name),
                    size: file.size,
                    addedAt: new Date().toISOString(),
                    progress: 0,
                    characters: bookData.content.length,
                    metadata: bookData.metadata || {}
                };
                
                // Сохраняем книгу
                await this.saveBook(book);
                
                // Обновляем статус
                processed++;
                fileElement.querySelector('.progress-file-status').className = 'progress-file-status success';
                fileElement.querySelector('.progress-file-status').textContent = 'Успешно';
                
                // Обновляем прогресс
                const progress = Math.round((processed / total) * 100);
                progressFill.style.width = `${progress}%`;
                progressCount.textContent = `${processed}/${total}`;
                
            } catch (error) {
                console.error('❌ Ошибка обработки файла:', error);
                fileElement.querySelector('.progress-file-status').className = 'progress-file-status error';
                fileElement.querySelector('.progress-file-status').textContent = 'Ошибка';
                processed++;
            }
        }
        
        // Скрываем прогресс через 2 секунды
        setTimeout(() => {
            uploadProgress.style.display = 'none';
            progressFill.style.width = '0%';
        }, 2000);
    }

    // Чтение файла в зависимости от формата
    async readFile(file) {
        const format = this.getFileFormat(file.name);
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                try {
                    let content = '';
                    let metadata = {};
                    
                    switch (format) {
                        case 'txt':
                            content = event.target.result;
                            break;
                            
                        case 'docx':
                            if (typeof mammoth !== 'undefined') {
                                const result = await mammoth.extractRawText({ arrayBuffer: event.target.result });
                                content = result.value;
                                metadata = result.metadata || {};
                            } else {
                                throw new Error('Mammoth.js не загружен');
                            }
                            break;
                            
                        case 'pdf':
                            // Для PDF пока возвращаем заглушку
                            content = `[PDF файл: ${file.name}]\n\nПоддержка PDF будет добавлена в следующем обновлении.`;
                            metadata = { pages: 0 };
                            break;
                            
                        default:
                            throw new Error(`Неподдерживаемый формат: ${format}`);
                    }
                    
                    resolve({ content, metadata });
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = (error) => reject(error);
            
            switch (format) {
                case 'txt':
                    reader.readAsText(file);
                    break;
                case 'docx':
                case 'pdf':
                    reader.readAsArrayBuffer(file);
                    break;
                default:
                    reject(new Error(`Неподдерживаемый формат: ${format}`));
            }
        });
    }

    // Определение формата файла
    getFileFormat(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ext;
    }

    // Извлечение названия из имени файла и содержимого
    extractTitle(filename, content) {
        // Пробуем извлечь из первых строк содержимого
        const lines = content.split('\n').slice(0, 10);
        for (let line of lines) {
            if (line.trim().length > 10 && line.trim().length < 100) {
                // Убираем лишние символы
                const cleanLine = line.trim().replace(/[#*_\-=]/g, '').trim();
                if (cleanLine.length > 5) {
                    return cleanLine;
                }
            }
        }
        
        // Если не нашли в содержимом, используем имя файла
        return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }

    // Извлечение автора
    extractAuthor(content) {
        // Простой парсинг первых строк для поиска автора
        const lines = content.split('\n').slice(0, 20);
        for (let line of lines) {
            const lowerLine = line.toLowerCase();
            if (lowerLine.includes('автор:') || lowerLine.includes('author:')) {
                return line.split(':')[1].trim();
            }
        }
        return 'Неизвестный автор';
    }

    // Рендеринг списка книг
    renderBooks(filteredBooks = null) {
        const libraryGrid = document.getElementById('libraryGrid');
        const emptyLibrary = document.getElementById('emptyLibrary');
        const books = filteredBooks || this.books;
        
        if (books.length === 0) {
            if (emptyLibrary) {
                emptyLibrary.style.display = 'block';
            }
            if (libraryGrid) {
                libraryGrid.innerHTML = '';
                libraryGrid.appendChild(emptyLibrary);
            }
            return;
        }
        
        if (emptyLibrary) {
            emptyLibrary.style.display = 'none';
        }
        
        // Сортируем книги
        const sortedBooks = this.sortBooks(books);
        
        // Рендерим книги
        if (libraryGrid) {
            libraryGrid.innerHTML = sortedBooks.map(book => `
                <div class="book-card" data-book-id="${book.id}">
                    <div class="book-cover">
                        <div class="book-cover-content">
                            <div class="book-cover-text">${this.getCoverText(book)}</div>
                            <div class="book-cover-title">${this.truncateText(book.title, 40)}</div>
                        </div>
                        <div class="book-format">.${book.format}</div>
                    </div>
                    <div class="book-info">
                        <h3 class="book-title">${this.truncateText(book.title, 50)}</h3>
                        <p class="book-author">${book.author || 'Неизвестный автор'}</p>
                        <div class="book-meta">
                            <span><i class="far fa-calendar"></i> ${this.formatDate(book.addedAt)}</span>
                            <span><i class="fas fa-weight-hanging"></i> ${this.formatFileSize(book.size)}</span>
                        </div>
                        <div class="book-progress">
                            <div class="progress-header">
                                <span>Прогресс</span>
                                <span>${book.progress || 0}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${book.progress || 0}%"></div>
                            </div>
                        </div>
                        <div class="book-actions">
                            <button class="btn-small read-book-btn" data-book-id="${book.id}">
                                <i class="fas fa-book-open"></i> Читать
                            </button>
                            <button class="btn-small share-book-btn" data-book-id="${book.id}">
                                <i class="fas fa-share-alt"></i> Поделиться
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        // Добавляем обработчики кликов на карточки
        document.querySelectorAll('.book-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.book-actions')) {
                    const bookId = card.dataset.bookId;
                    this.showBookInfo(bookId);
                }
            });
        });
        
        // Добавляем обработчики для кнопок
        document.querySelectorAll('.read-book-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bookId = btn.dataset.bookId;
                this.readBook(bookId);
            });
        });
        
        document.querySelectorAll('.share-book-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bookId = btn.dataset.bookId;
                this.shareBook(bookId);
            });
        });
    }

    // Получение текста для обложки
    getCoverText(book) {
        if (book.title) {
            // Берем первую букву названия
            const firstChar = book.title.charAt(0).toUpperCase();
            if (/[A-ZА-ЯЁ]/.test(firstChar)) {
                return firstChar;
            }
        }
        return '書'; // Дефолтный иероглиф
    }

    // Обрезка текста
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    // Форматирование даты
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU');
        } catch {
            return 'Неизвестно';
        }
    }

    // Форматирование размера файла
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 Б';
        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Сортировка книг
    sortBooks(books) {
        const sortSelect = document.getElementById('sortSelect');
        const sortValue = sortSelect ? sortSelect.value : 'date-desc';
        
        // Создаем копию переданного массива
        const booksToSort = [...books];
        
        return booksToSort.sort((a, b) => {
            switch (sortValue) {
                case 'date-desc':
                    return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
                case 'date-asc':
                    return new Date(a.addedAt || 0) - new Date(b.addedAt || 0);
                case 'title-asc':
                    return (a.title || '').localeCompare(b.title || '');
                case 'title-desc':
                    return (b.title || '').localeCompare(a.title || '');
                case 'progress-desc':
                    return (b.progress || 0) - (a.progress || 0);
                default:
                    return 0;
            }
        });
    }

    // Поиск книг
    searchBooks(query) {
        if (!query.trim()) {
            this.renderBooks();
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        const filtered = this.books.filter(book => {
            const title = book.title ? book.title.toLowerCase() : '';
            const author = book.author ? book.author.toLowerCase() : '';
            const format = book.format ? book.format.toLowerCase() : '';
            
            return title.includes(lowerQuery) ||
                   author.includes(lowerQuery) ||
                   format.includes(lowerQuery);
        });
        
        this.renderBooks(filtered);
    }

    // Обновление статистики
    updateStats() {
        const totalBooks = document.getElementById('totalBooks');
        const totalReadingTime = document.getElementById('totalReadingTime');
        const avgProgress = document.getElementById('avgProgress');
        const totalSize = document.getElementById('totalSize');
        const libraryStats = document.getElementById('libraryStats');
        
        if (this.books.length === 0) {
            if (libraryStats) libraryStats.style.display = 'none';
            return;
        }
        
        if (libraryStats) libraryStats.style.display = 'grid';
        
        // Общее количество книг
        if (totalBooks) totalBooks.textContent = this.books.length;
        
        // Общее время чтения (оценочно)
        const totalChars = this.books.reduce((sum, book) => sum + (book.characters || 0), 0);
        const readingHours = Math.round(totalChars / 15000); // ~250 слов в минуту
        if (totalReadingTime) totalReadingTime.textContent = `${readingHours}ч`;
        
        // Средний прогресс
        const avg = this.books.reduce((sum, book) => sum + (book.progress || 0), 0) / this.books.length;
        if (avgProgress) avgProgress.textContent = `${Math.round(avg)}%`;
        
        // Общий размер
        const totalBytes = this.books.reduce((sum, book) => sum + (book.size || 0), 0);
        if (totalSize) totalSize.textContent = this.formatFileSize(totalBytes);
    }

    // Показ информации о книге
    async showBookInfo(bookId) {
        const book = await this.getBook(bookId);
        if (!book) return;
        
        this.currentBookId = bookId;
        
        // Заполняем модальное окно
        const modalCoverText = document.getElementById('modalCoverText');
        const modalBookTitle = document.getElementById('modalBookTitle');
        const modalBookFormat = document.getElementById('modalBookFormat');
        const modalBookDate = document.getElementById('modalBookDate');
        const modalBookSize = document.getElementById('modalBookSize');
        const modalBookChars = document.getElementById('modalBookChars');
        const modalBookProgress = document.getElementById('modalBookProgress');
        const modalProgressFill = document.getElementById('modalProgressFill');
        const modalBookDescription = document.getElementById('modalBookDescription');
        
        if (modalCoverText) modalCoverText.textContent = this.getCoverText(book);
        if (modalBookTitle) modalBookTitle.textContent = book.title;
        if (modalBookFormat) modalBookFormat.textContent = (book.format || 'TXT').toUpperCase();
        if (modalBookDate) modalBookDate.textContent = this.formatDate(book.addedAt);
        if (modalBookSize) modalBookSize.textContent = this.formatFileSize(book.size);
        if (modalBookChars) modalBookChars.textContent = (book.characters || 0).toLocaleString();
        if (modalBookProgress) modalBookProgress.textContent = `${book.progress || 0}%`;
        if (modalProgressFill) modalProgressFill.style.width = `${book.progress || 0}%`;
        
        // Описание
        const description = book.metadata?.description || 
                           `Книга в формате .${book.format}. Загружена ${this.formatDate(book.addedAt)}.`;
        if (modalBookDescription) modalBookDescription.textContent = description;
        
        // Показываем модальное окно
        const modal = document.getElementById('bookInfoModal');
        if (modal) modal.classList.add('active');
    }

    // Чтение книги
    readBook(bookId) {
        // Сохраняем ID книги в sessionStorage для читалки
        sessionStorage.setItem('currentBookId', bookId);
        // Переходим на страницу читалки
        window.location.href = 'reader.html';
    }

    // Поделиться книгой с QR-кодом
    async shareBook(bookId) {
        const book = await this.getBook(bookId);
        if (!book) {
            alert('Книга не найдена');
            return;
        }
        
        // Используем модуль QR-шаринга
        if (window.qrShare && typeof window.qrShare.openShareModal === 'function') {
            window.qrShare.openShareModal(bookId);
        } else {
            alert('Модуль QR-шаринга не загружен. Перезагрузите страницу.'); 
        }
    }

    // Инициализация событий
    initEvents() {
        // Загрузка файлов
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const uploadFirstBook = document.getElementById('uploadFirstBook');
        
        if (uploadZone) {
            uploadZone.addEventListener('click', () => {
                if (fileInput) fileInput.click();
            });
        }
        
        if (uploadFirstBook) {
            uploadFirstBook.addEventListener('click', () => {
                if (fileInput) fileInput.click();
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.processFiles(Array.from(e.target.files));
                    fileInput.value = '';
                }
            });
        }
        
        // Drag & drop
        if (uploadZone) {
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('dragover');
            });
            
            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('dragover');
            });
            
            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    this.processFiles(Array.from(e.dataTransfer.files));
                }
            });
        }
        
        // Поиск
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchBooks(e.target.value);
            });
        }
        
        // Сортировка
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.renderBooks();
            });
        }
        
        // Настройки
        const settingsToggle = document.getElementById('settingsToggle');
        const settingsModal = document.getElementById('settingsModal');
        const settingsClose = document.getElementById('settingsClose');
        
        if (settingsToggle && settingsModal) {
            settingsToggle.addEventListener('click', () => {
                settingsModal.classList.add('active');
            });
        }
        
        if (settingsClose) {
            settingsClose.addEventListener('click', () => {
                const modal = document.getElementById('settingsModal');
                if (modal) modal.classList.remove('active');
            });
        }
        
        // Модальное окно книги
        const bookInfoModal = document.getElementById('bookInfoModal');
        const bookInfoClose = document.getElementById('bookInfoClose');
        const deleteBookBtn = document.getElementById('deleteBook');
        const editBookBtn = document.getElementById('editBook');
        const readBookBtn = document.getElementById('readBook');
        
        if (bookInfoClose) {
            bookInfoClose.addEventListener('click', () => {
                const modal = document.getElementById('bookInfoModal');
                if (modal) modal.classList.remove('active');
            });
        }
        
        if (deleteBookBtn) {
            deleteBookBtn.addEventListener('click', async () => {
                if (this.currentBookId && confirm('Вы уверены, что хотите удалить эту книгу?')) {
                    await this.deleteBook(this.currentBookId);
                    const modal = document.getElementById('bookInfoModal');
                    if (modal) modal.classList.remove('active');
                }
            });
        }
        
        if (editBookBtn) {
            editBookBtn.addEventListener('click', () => {
                alert('Редактирование книги будет добавлено в следующем обновлении');
            });
        }
        
        if (readBookBtn) {
            readBookBtn.addEventListener('click', () => {
                if (this.currentBookId) {
                    this.readBook(this.currentBookId);
                }
            });
        }
        
        // Закрытие модальных окон по клику на фон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Экспорт библиотеки
        const exportBtn = document.getElementById('exportLibrary');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportLibrary();
            });
        }
    }

    // Экспорт библиотеки
    async exportLibrary() {
        const backup = {
            version: '1.0',
            date: new Date().toISOString(),
            books: this.books.map(book => ({
                id: book.id,
                title: book.title,
                author: book.author,
                format: book.format,
                addedAt: book.addedAt,
                progress: book.progress,
                metadata: book.metadata
                // Не экспортируем content для экономии места
            }))
        };
        
        const dataStr = JSON.stringify(backup, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `moyue_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        alert('Бекап библиотеки создан! Сохраните этот файл в безопасном месте.');
    }
}

// Инициализация библиотеки при загрузке страницы
let libraryManager;

document.addEventListener('DOMContentLoaded', () => {
    libraryManager = new LibraryManager();
});

// Экспортируем для глобального доступа
window.libraryManager = libraryManager;