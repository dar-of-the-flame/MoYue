// Модуль QR-шаринга книг

class QRShare {
    constructor() {
        this.currentBookId = null;
        this.qrCode = null;
        this.shareData = null;
        this.qrScanner = null;
        
        this.init();
    }

    init() {
        this.initElements();
        this.initEvents();
        this.initImportFromUrl();
    }

    initElements() {
        // Кнопки в библиотеке
        this.elements = {
            // Модальные окна
            shareModal: document.getElementById('shareModal'),
            importModal: document.getElementById('importModal'),
            
            // Кнопки закрытия
            shareClose: document.getElementById('shareClose'),
            importClose: document.getElementById('importClose'),
            closeShare: document.getElementById('closeShare'),
            cancelImport: document.getElementById('cancelImport'),
            
            // Элементы шаринга
            shareBookTitle: document.getElementById('shareBookTitle'),
            shareBookInfo: document.getElementById('shareBookInfo'),
            qrContainer: document.getElementById('qrContainer'),
            shareLink: document.getElementById('shareLink'),
            copyLink: document.getElementById('copyLink'),
            copyQR: document.getElementById('copyQR'),
            downloadQR: document.getElementById('downloadQR'),
            generateNewQR: document.getElementById('generateNewQR'),
            
            // Настройки шаринга
            shareCompress: document.getElementById('shareCompress'),
            shareEncrypt: document.getElementById('shareEncrypt'),
            shareExpire: document.getElementById('shareExpire'),
            
            // Элементы импорта
            importTabs: document.querySelectorAll('.import-tab'),
            linkTab: document.getElementById('linkTab'),
            qrTab: document.getElementById('qrTab'),
            fileTab: document.getElementById('fileTab'),
            importLink: document.getElementById('importLink'),
            importFromLink: document.getElementById('importFromLink'),
            qrScanner: document.getElementById('qrScanner'),
            startCamera: document.getElementById('startCamera'),
            qrUpload: document.getElementById('qrUpload'),
            qrFile: document.getElementById('qrFile'),
            dataFileUpload: document.getElementById('dataFileUpload'),
            dataFile: document.getElementById('dataFile'),
            importProgress: document.getElementById('importProgress'),
            importProgressFill: document.getElementById('importProgressFill'),
            importStatus: document.getElementById('importStatus'),
            confirmImport: document.getElementById('confirmImport')
        };
    }

    initEvents() {
        // Шаринг книги
        document.addEventListener('click', (e) => {
            const shareBtn = e.target.closest('.share-btn');
            if (shareBtn && shareBtn.dataset.bookId) {
                this.openShareModal(shareBtn.dataset.bookId);
            }
        });

        // Закрытие модальных окон
        if (this.elements.shareClose) {
            this.elements.shareClose.addEventListener('click', () => {
                this.closeShareModal();
            });
        }

        if (this.elements.importClose) {
            this.elements.importClose.addEventListener('click', () => {
                this.closeImportModal();
            });
        }

        if (this.elements.closeShare) {
            this.elements.closeShare.addEventListener('click', () => {
                this.closeShareModal();
            });
        }

        if (this.elements.cancelImport) {
            this.elements.cancelImport.addEventListener('click', () => {
                this.closeImportModal();
            });
        }

        // Копирование ссылки
        if (this.elements.copyLink) {
            this.elements.copyLink.addEventListener('click', () => {
                this.copyToClipboard(this.elements.shareLink.value);
            });
        }

        // Копирование QR-кода как изображение
        if (this.elements.copyQR) {
            this.elements.copyQR.addEventListener('click', () => {
                this.copyQRToClipboard();
            });
        }

        // Скачивание QR-кода
        if (this.elements.downloadQR) {
            this.elements.downloadQR.addEventListener('click', () => {
                this.downloadQRCode();
            });
        }

        // Генерация нового QR-кода
        if (this.elements.generateNewQR) {
            this.elements.generateNewQR.addEventListener('click', () => {
                this.generateQRCode(this.currentBookId);
            });
        }

        // Вкладки импорта
        if (this.elements.importTabs) {
            this.elements.importTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    this.switchImportTab(e.target.dataset.tab);
                });
            });
        }

        // Импорт по ссылке
        if (this.elements.importFromLink) {
            this.elements.importFromLink.addEventListener('click', () => {
                this.importFromLink(this.elements.importLink.value);
            });
        }

        // Включение камеры для сканирования QR
        if (this.elements.startCamera) {
            this.elements.startCamera.addEventListener('click', () => {
                this.startQRScanner();
            });
        }

        // Загрузка изображения с QR-кодом
        if (this.elements.qrUpload) {
            this.elements.qrUpload.addEventListener('click', () => {
                this.elements.qrFile.click();
            });
        }

        if (this.elements.qrFile) {
            this.elements.qrFile.addEventListener('change', (e) => {
                this.handleQRFileUpload(e.target.files[0]);
            });
        }

        // Загрузка файла данных
        if (this.elements.dataFileUpload) {
            this.elements.dataFileUpload.addEventListener('click', () => {
                this.elements.dataFile.click();
            });
        }

        if (this.elements.dataFile) {
            this.elements.dataFile.addEventListener('change', (e) => {
                this.handleDataFileUpload(e.target.files[0]);
            });
        }

        // Подтверждение импорта
        if (this.elements.confirmImport) {
            this.elements.confirmImport.addEventListener('click', () => {
                this.confirmImport();
            });
        }
    }

    initImportFromUrl() {
        // Проверяем, есть ли параметр import в URL
        const urlParams = new URLSearchParams(window.location.search);
        const importData = urlParams.get('import');
        
        if (importData) {
            setTimeout(() => {
                this.importFromLink(window.location.href);
                // Очищаем URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 1000);
        }
    }

    async openShareModal(bookId) {
        this.currentBookId = bookId;
        const book = await this.getBook(bookId);
        
        if (!book) {
            alert('Книга не найдена');
            return;
        }
        
        // Обновляем информацию о книге
        if (this.elements.shareBookTitle) {
            this.elements.shareBookTitle.textContent = book.title;
        }
        
        if (this.elements.shareBookInfo) {
            this.elements.shareBookInfo.textContent = `Автор: ${book.author || 'Неизвестный автор'} | Формат: .${book.format}`;
        }
        
        // Генерируем QR-код
        await this.generateQRCode(bookId);
        
        // Показываем модальное окно
        if (this.elements.shareModal) {
            this.elements.shareModal.classList.add('active');
        }
    }

    closeShareModal() {
        if (this.elements.shareModal) {
            this.elements.shareModal.classList.remove('active');
        }
        
        // Очищаем QR-код
        if (this.qrCode) {
            this.qrCode.clear();
            this.qrCode = null;
        }
        
        this.currentBookId = null;
        this.shareData = null;
    }

    async generateQRCode(bookId) {
        try {
            const book = await this.getBook(bookId);
            if (!book) return;
            
            // Подготовка данных для передачи
            const shareData = await this.prepareShareData(book);
            this.shareData = shareData;
            
            // Создание ссылки
            const shareUrl = this.createShareUrl(shareData);
            
            // Обновляем поле со ссылкой
            if (this.elements.shareLink) {
                this.elements.shareLink.value = shareUrl;
            }
            
            // Генерация QR-кода
            if (this.elements.qrContainer) {
                // Очищаем контейнер
                this.elements.qrContainer.innerHTML = '';
                
                // Создаем новый QR-код
                this.qrCode = new QRCode(this.elements.qrContainer, {
                    text: shareUrl,
                    width: 256,
                    height: 256,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
                
                // Добавляем класс анимации
                setTimeout(() => {
                    const qrCanvas = this.elements.qrContainer.querySelector('canvas');
                    if (qrCanvas) {
                        qrCanvas.classList.add('qr-generated');
                    }
                }, 100);
            }
            
            return shareUrl;
            
        } catch (error) {
            console.error('Ошибка генерации QR-кода:', error);
            this.showError('Не удалось сгенерировать QR-код');
        }
    }

    async prepareShareData(book) {
        // Клонируем объект книги, чтобы не изменять оригинал
        const bookData = { ...book };
        
        // Удаляем служебные поля
        delete bookData.id;
        delete bookData.addedAt;
        
        // Сжимаем данные, если включена опция
        const compress = this.elements.shareCompress?.checked ?? true;
        const encrypt = this.elements.shareEncrypt?.checked ?? true;
        
        let dataString = JSON.stringify(bookData);
        
        // Сжатие
        if (compress && typeof pako !== 'undefined') {
            try {
                const compressed = pako.deflate(dataString);
                dataString = this.arrayBufferToBase64(compressed);
                bookData.compressed = true;
            } catch (error) {
                console.error('Ошибка сжатия:', error);
            }
        }
        
        // Шифрование (базовое)
        if (encrypt) {
            dataString = this.simpleEncrypt(dataString);
            bookData.encrypted = true;
        }
        
        // Добавляем метаданные
        const metadata = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            expires: this.elements.shareExpire?.checked ? 
                new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
            ...bookData
        };
        
        // Кодируем в base64
        const base64Data = btoa(JSON.stringify(metadata));
        
        return {
            data: base64Data,
            metadata: metadata,
            compressed: compress,
            encrypted: encrypt
        };
    }

    createShareUrl(shareData) {
        const baseUrl = window.location.origin + window.location.pathname;
        const params = new URLSearchParams({
            import: shareData.data,
            v: '1.0',
            ts: Date.now()
        });
        
        return `${baseUrl}?${params.toString()}`;
    }

    async getBook(bookId) {
        return new Promise((resolve, reject) => {
            if (!libraryManager || !libraryManager.db) {
                reject('Библиотека не инициализирована');
                return;
            }
            
            const transaction = libraryManager.db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            const request = store.get(bookId);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = () => {
                reject('Ошибка загрузки книги');
            };
        });
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Ссылка скопирована в буфер обмена');
        }).catch(err => {
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Ссылка скопирована в буфер обмена');
        });
    }

    async copyQRToClipboard() {
        const canvas = this.elements.qrContainer.querySelector('canvas');
        if (!canvas) return;
        
        try {
            canvas.toBlob(async (blob) => {
                const item = new ClipboardItem({
                    'image/png': blob
                });
                await navigator.clipboard.write([item]);
                this.showNotification('QR-код скопирован в буфер обмена');
            });
        } catch (error) {
            console.error('Ошибка копирования QR-кода:', error);
            this.showError('Не удалось скопировать QR-код');
        }
    }

    downloadQRCode() {
        const canvas = this.elements.qrContainer.querySelector('canvas');
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = `qr-${this.currentBookId || 'book'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    switchImportTab(tabName) {
        // Обновляем активные вкладки
        this.elements.importTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Показываем соответствующий контент
        [this.elements.linkTab, this.elements.qrTab, this.elements.fileTab].forEach(tab => {
            if (tab) {
                tab.classList.toggle('active', tab.id === `${tabName}Tab`);
            }
        });
    }

    async importFromLink(link) {
        try {
            this.showImportProgress(0, 'Проверка ссылки...');
            
            // Извлекаем данные из ссылки
            let importData;
            try {
                const url = new URL(link);
                importData = url.searchParams.get('import');
            } catch {
                // Если это не URL, возможно это base64 строка напрямую
                importData = link;
            }
            
            if (!importData) {
                throw new Error('Не найдены данные для импорта');
            }
            
            // Обработка данных
            const book = await this.processImportData(importData);
            
            // Сохраняем книгу
            await this.saveImportedBook(book);
            
            this.showImportProgress(100, 'Книга успешно импортирована!');
            
            setTimeout(() => {
                this.closeImportModal();
                this.showNotification(`Книга "${book.title}" добавлена в библиотеку`);
                
                // Обновляем библиотеку
                if (libraryManager) {
                    libraryManager.loadBooks().then(() => {
                        libraryManager.renderBooks();
                        libraryManager.updateStats();
                    });
                }
            }, 1000);
            
        } catch (error) {
            console.error('Ошибка импорта:', error);
            this.showError(`Ошибка импорта: ${error.message}`);
        }
    }

    async processImportData(importData) {
        this.showImportProgress(20, 'Декодирование данных...');
        
        try {
            // Декодируем base64
            const jsonString = atob(importData);
            const metadata = JSON.parse(jsonString);
            
            this.showImportProgress(40, 'Проверка версии...');
            
            // Проверяем версию
            if (metadata.version !== '1.0') {
                throw new Error('Неподдерживаемая версия данных');
            }
            
            // Проверяем срок действия
            if (metadata.expires && new Date(metadata.expires) < new Date()) {
                throw new Error('Срок действия ссылки истек');
            }
            
            this.showImportProgress(60, 'Обработка книги...');
            
            let bookData = { ...metadata };
            
            // Удаляем служебные поля
            delete bookData.version;
            delete bookData.timestamp;
            delete bookData.expires;
            
            // Расшифровка
            if (bookData.encrypted) {
                this.showImportProgress(70, 'Расшифровка...');
                bookData = this.simpleDecrypt(bookData);
                delete bookData.encrypted;
            }
            
            // Распаковка
            if (bookData.compressed && typeof pako !== 'undefined') {
                this.showImportProgress(80, 'Распаковка...');
                const compressedData = this.base64ToArrayBuffer(bookData.content || bookData.data);
                const decompressed = pako.inflate(compressedData, { to: 'string' });
                bookData = JSON.parse(decompressed);
                delete bookData.compressed;
            }
            
            this.showImportProgress(90, 'Проверка данных...');
            
            // Валидация книги
            if (!bookData.title || !bookData.content) {
                throw new Error('Некорректные данные книги');
            }
            
            // Добавляем метаданные
            bookData.addedAt = new Date().toISOString();
            bookData.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            bookData.progress = 0;
            
            return bookData;
            
        } catch (error) {
            console.error('Ошибка обработки данных:', error);
            throw new Error('Невозможно обработать данные книги');
        }
    }

    async saveImportedBook(book) {
        return new Promise((resolve, reject) => {
            if (!libraryManager || !libraryManager.db) {
                reject('Библиотека не инициализирована');
                return;
            }
            
            const transaction = libraryManager.db.transaction(['books'], 'readwrite');
            const store = transaction.objectStore('books');
            const request = store.put(book);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Ошибка сохранения книги');
        });
    }

    startQRScanner() {
        // Проверяем поддержку камеры
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showError('Ваш браузер не поддерживает доступ к камере');
            return;
        }
        
        this.showImportProgress(0, 'Запрос доступа к камере...');
        
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                this.showImportProgress(30, 'Запуск сканера...');
                
                // Создаем видео элемент
                const video = document.createElement('video');
                video.style.width = '100%';
                video.style.height = '300px';
                video.style.objectFit = 'cover';
                video.style.borderRadius = '12px';
                
                // Заменяем плейсхолдер
                this.elements.qrScanner.innerHTML = '';
                this.elements.qrScanner.appendChild(video);
                
                video.srcObject = stream;
                video.play();
                
                // Добавляем кнопку остановки
                const stopBtn = document.createElement('button');
                stopBtn.className = 'btn-danger';
                stopBtn.innerHTML = '<i class="fas fa-stop"></i> Остановить сканирование';
                stopBtn.style.marginTop = '20px';
                stopBtn.addEventListener('click', () => {
                    stream.getTracks().forEach(track => track.stop());
                    this.resetQRScanner();
                });
                
                this.elements.qrScanner.appendChild(stopBtn);
                
                // TODO: Здесь нужно добавить библиотеку для чтения QR-кодов
                // Например, jsQR или Instascan
                this.showImportProgress(50, 'Сканер запущен. Наведите камеру на QR-код...');
                
            })
            .catch(error => {
                console.error('Ошибка доступа к камере:', error);
                this.showError('Не удалось получить доступ к камере');
                this.resetQRScanner();
            });
    }

    resetQRScanner() {
        this.elements.qrScanner.innerHTML = `
            <i class="fas fa-camera"></i>
            <p>Наведите камеру на QR-код</p>
            <button class="btn-secondary" id="startCamera">
                <i class="fas fa-video"></i> Включить камеру
            </button>
        `;
        
        // Переинициализируем событие
        const startBtn = this.elements.qrScanner.querySelector('#startCamera');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startQRScanner());
        }
    }

    async handleQRFileUpload(file) {
        if (!file) return;
        
        this.showImportProgress(0, 'Загрузка изображения...');
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                this.showImportProgress(30, 'Анализ QR-кода...');
                
                // TODO: Здесь нужно реализовать чтение QR-кода из изображения
                // Используйте библиотеку типа jsQR
                
                // Временная заглушка
                this.showImportProgress(100, 'Функция чтения QR-кода из изображения будет добавлена в следующем обновлении');
                
                setTimeout(() => {
                    this.showError('Чтение QR-кода из изображения временно недоступно. Используйте сканирование камерой или импорт по ссылке.');
                }, 1000);
                
            } catch (error) {
                console.error('Ошибка чтения QR-кода:', error);
                this.showError('Не удалось прочитать QR-код');
            }
        };
        
        reader.readAsDataURL(file);
    }

    async handleDataFileUpload(file) {
        if (!file) return;
        
        this.showImportProgress(0, 'Чтение файла...');
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                this.showImportProgress(30, 'Обработка данных...');
                
                // Проверяем расширение файла
                if (!file.name.endsWith('.moyue') && !file.name.endsWith('.json')) {
                    throw new Error('Неподдерживаемый формат файла');
                }
                
                // Парсим данные
                const data = JSON.parse(e.target.result);
                
                // Проверяем структуру
                if (data.type !== 'moyue-book' || !data.data) {
                    throw new Error('Некорректный файл книги');
                }
                
                this.showImportProgress(60, 'Импорт книги...');
                
                // Обрабатываем данные
                const book = await this.processImportData(data.data);
                
                // Сохраняем книгу
                await this.saveImportedBook(book);
                
                this.showImportProgress(100, 'Книга успешно импортирована!');
                
                setTimeout(() => {
                    this.closeImportModal();
                    this.showNotification(`Книга "${book.title}" добавлена в библиотеку`);
                    
                    // Обновляем библиотеку
                    if (libraryManager) {
                        libraryManager.loadBooks().then(() => {
                            libraryManager.renderBooks();
                            libraryManager.updateStats();
                        });
                    }
                }, 1000);
                
            } catch (error) {
                console.error('Ошибка импорта файла:', error);
                this.showError(`Ошибка импорта: ${error.message}`);
            }
        };
        
        reader.readAsText(file);
    }

    confirmImport() {
        // Реализация будет зависеть от выбранного метода импорта
        // В текущей реализации импорт происходит автоматически при загрузке файла или вставке ссылки
    }

    showImportProgress(percent, message) {
        if (this.elements.importProgress) {
            this.elements.importProgress.style.display = 'block';
        }
        
        if (this.elements.importProgressFill) {
            this.elements.importProgressFill.style.width = `${percent}%`;
        }
        
        if (this.elements.importStatus) {
            this.elements.importStatus.textContent = message;
        }
    }

    showImportModal() {
        if (this.elements.importModal) {
            this.elements.importModal.classList.add('active');
        }
    }

    closeImportModal() {
        if (this.elements.importModal) {
            this.elements.importModal.classList.remove('active');
        }
        
        // Сбрасываем прогресс
        this.showImportProgress(0, '');
        this.elements.importProgress.style.display = 'none';
        
        // Сбрасываем форму
        if (this.elements.importLink) {
            this.elements.importLink.value = '';
        }
        
        // Сбрасываем сканер
        this.resetQRScanner();
    }

    // Вспомогательные функции
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    simpleEncrypt(text) {
        // Базовая шифровка для демонстрации
        // В реальном приложении используйте более надежное шифрование
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ 0x55);
        }
        return btoa(result);
    }

    simpleDecrypt(data) {
        // Базовая дешифровка
        const text = atob(data.content || data.data);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ 0x55);
        }
        return JSON.parse(result);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    showError(message) {
        this.showNotification(`❌ ${message}`);
    }
}

// Глобальная функция для открытия импорта
function openImportModal() {
    if (window.qrShare) {
        window.qrShare.showImportModal();
    } else {
        alert('Модуль импорта не загружен');
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем только на странице библиотеки
    if (window.location.pathname.includes('library.html') || 
        window.location.pathname.endsWith('/library')) {
        window.qrShare = new QRShare();
    }
});