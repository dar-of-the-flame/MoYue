// advanced-qr-share.js - Расширенный QR-шаринг с шифрованием

class AdvancedQRShare {
    constructor() {
        this.encryptionKey = null;
        this.shareSession = null;
        this.expirationTime = 24 * 60 * 60 * 1000; // 24 часа
        this.maxDownloads = 10;
        this.init();
    }

    async init() {
        this.initElements();
        this.initEvents();
        this.generateEncryptionKey();
        await this.initCrypto();
    }

    async initCrypto() {
        // Проверяем поддержку Web Crypto API
        if (!window.crypto || !window.crypto.subtle) {
            console.warn('Web Crypto API не поддерживается');
            return;
        }

        try {
            // Генерируем ключ для шифрования
            this.encryptionKey = await crypto.subtle.generateKey(
                {
                    name: 'AES-GCM',
                    length: 256,
                },
                true,
                ['encrypt', 'decrypt']
            );
        } catch (error) {
            console.error('Ошибка инициализации шифрования:', error);
        }
    }

    initElements() {
        this.elements = {
            shareModal: document.getElementById('shareModal'),
            importModal: document.getElementById('importModal'),
            qrContainer: document.getElementById('qrContainer'),
            shareLink: document.getElementById('shareLink'),
            downloadQR: document.getElementById('downloadQR'),
            copyLink: document.getElementById('copyLink'),
            generateNewQR: document.getElementById('generateNewQR'),
            shareExpire: document.getElementById('shareExpire'),
            sharePassword: document.getElementById('sharePassword'),
            maxDownloads: document.getElementById('maxDownloads'),
            sessionLink: document.getElementById('sessionLink')
        };
    }

    initEvents() {
        // Кнопка скачивания QR
        if (this.elements.downloadQR) {
            this.elements.downloadQR.addEventListener('click', () => this.downloadQRCode());
        }

        // Копирование ссылки
        if (this.elements.copyLink) {
            this.elements.copyLink.addEventListener('click', () => this.copyToClipboard());
        }

        // Генерация нового QR
        if (this.elements.generateNewQR) {
            this.elements.generateNewQR.addEventListener('click', () => this.generateNewSession());
        }
    }

    async openShareModal(bookId) {
        this.currentBookId = bookId;
        const book = await this.getBook(bookId);
        
        if (!book) {
            alert('Книга не найдена');
            return;
        }

        await this.createShareSession(book);
        await this.generateQRCode();
        this.updateShareUI();
        
        if (this.elements.shareModal) {
            this.elements.shareModal.classList.add('active');
        }
    }

    async createShareSession(book) {
        // Создаем сессию шаринга
        this.shareSession = {
            id: this.generateSessionId(),
            bookId: book.id,
            bookTitle: book.title,
            bookAuthor: book.author,
            format: book.format,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.expirationTime).toISOString(),
            maxDownloads: parseInt(this.elements.maxDownloads?.value || this.maxDownloads),
            passwordProtected: this.elements.sharePassword?.checked || false,
            downloadCount: 0,
            isActive: true
        };

        // Шифруем данные книги
        const encryptedData = await this.encryptBookData(book);
        this.shareSession.encryptedData = encryptedData;

        // Сохраняем сессию в IndexedDB
        await this.saveShareSession();
    }

    async encryptBookData(book) {
        try {
            const bookData = JSON.stringify({
                ...book,
                sharedAt: new Date().toISOString(),
                version: '2.0'
            });

            const encoder = new TextEncoder();
            const data = encoder.encode(bookData);

            // Генерируем случайный вектор инициализации
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Шифруем данные
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.encryptionKey,
                data
            );

            // Объединяем вектор инициализации с зашифрованными данными
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            // Кодируем в Base64
            return btoa(String.fromCharCode.apply(null, combined));
            
        } catch (error) {
            console.error('Ошибка шифрования:', error);
            throw new Error('Не удалось зашифровать данные');
        }
    }

    async decryptBookData(encryptedData) {
        try {
            // Декодируем из Base64
            const binary = atob(encryptedData);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            // Извлекаем вектор инициализации
            const iv = bytes.slice(0, 12);
            const data = bytes.slice(12);

            // Расшифровываем
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.encryptionKey,
                data
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
            
        } catch (error) {
            console.error('Ошибка расшифровки:', error);
            throw new Error('Не удалось расшифровать данные');
        }
    }

    generateSessionId() {
        return 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    async saveShareSession() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoyueLibrary', 4);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('shareSessions')) {
                    const sessionStore = db.createObjectStore('shareSessions', { keyPath: 'id' });
                    sessionStore.createIndex('bookId', 'bookId', { unique: false });
                    sessionStore.createIndex('createdAt', 'createdAt', { unique: false });
                    sessionStore.createIndex('isActive', 'isActive', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['shareSessions'], 'readwrite');
                const store = transaction.objectStore('shareSessions');
                store.put(this.shareSession);
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject('Ошибка сохранения сессии');
            };
        });
    }

    async generateQRCode() {
        if (!this.shareSession || !this.elements.qrContainer) return;

        // Очищаем контейнер
        this.elements.qrContainer.innerHTML = '';

        // Создаем URL для шаринга
        const shareUrl = this.createShareUrl();
        
        // Обновляем поле со ссылкой
        if (this.elements.shareLink) {
            this.elements.shareLink.value = shareUrl;
        }

        // Создаем QR-код
        try {
            this.qrCode = new QRCode(this.elements.qrContainer, {
                text: shareUrl,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // Добавляем анимацию
            setTimeout(() => {
                const qrCanvas = this.elements.qrContainer.querySelector('canvas');
                if (qrCanvas) {
                    qrCanvas.classList.add('qr-generated');
                }
            }, 100);

        } catch (error) {
            console.error('Ошибка генерации QR:', error);
            this.showError('Не удалось сгенерировать QR-код');
        }
    }

    createShareUrl() {
        const baseUrl = window.location.origin + window.location.pathname;
        const params = new URLSearchParams({
            session: this.shareSession.id,
            v: '2.0',
            t: Date.now()
        });

        if (this.shareSession.passwordProtected) {
            params.set('p', '1');
        }

        return `${baseUrl.replace('library.html', '')}import.html?${params.toString()}`;
    }

    updateShareUI() {
        if (!this.shareSession) return;

        // Обновляем информацию о сессии
        const expireDate = new Date(this.shareSession.expiresAt);
        const timeLeft = this.formatTimeLeft(expireDate);

        // Добавляем информацию о сессии
        if (this.elements.sessionLink) {
            this.elements.sessionLink.innerHTML = `
                <div class="session-info">
                    <h4>Сессия шаринга</h4>
                    <div class="session-details">
                        <p><strong>ID:</strong> ${this.shareSession.id}</p>
                        <p><strong>Срок действия:</strong> ${timeLeft}</p>
                        <p><strong>Макс. скачиваний:</strong> ${this.shareSession.maxDownloads}</p>
                        <p><strong>Защита паролем:</strong> ${this.shareSession.passwordProtected ? 'Да' : 'Нет'}</p>
                    </div>
                </div>
            `;
        }
    }

    formatTimeLeft(expireDate) {
        const now = new Date();
        const diff = expireDate - now;
        
        if (diff <= 0) return 'Истек';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}ч ${minutes}м`;
    }

    async downloadQRCode() {
        const canvas = this.elements.qrContainer.querySelector('canvas');
        if (!canvas) return;

        // Создаем улучшенный QR-код с логотипом
        const enhancedCanvas = await this.enhanceQRCode(canvas);
        
        const link = document.createElement('a');
        link.download = `qr-${this.shareSession.id}.png`;
        link.href = enhancedCanvas.toDataURL('image/png');
        link.click();
    }

    async enhanceQRCode(originalCanvas) {
        // Создаем новый canvas с улучшениями
        const canvas = document.createElement('canvas');
        canvas.width = originalCanvas.width + 100;
        canvas.height = originalCanvas.height + 150;
        const ctx = canvas.getContext('2d');

        // Фон
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // QR-код
        ctx.drawImage(originalCanvas, 50, 50, originalCanvas.width, originalCanvas.height);

        // Логотип
        ctx.fillStyle = '#90e0ef';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('墨阅', canvas.width / 2, 40);

        // Информация
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        ctx.fillText(this.shareSession.bookTitle, canvas.width / 2, canvas.height - 80);
        ctx.font = '12px Arial';
        ctx.fillText(`ID: ${this.shareSession.id}`, canvas.width / 2, canvas.height - 60);
        ctx.fillText(`Действует до: ${new Date(this.shareSession.expiresAt).toLocaleDateString()}`, 
                     canvas.width / 2, canvas.height - 40);

        // Добавляем водяной знак
        ctx.globalAlpha = 0.1;
        ctx.font = '20px Arial';
        ctx.fillText('moyue.ru', canvas.width / 2, canvas.height - 15);
        ctx.globalAlpha = 1;

        return canvas;
    }

    async copyToClipboard() {
        if (!this.elements.shareLink) return;

        const text = this.elements.shareLink.value;
        await navigator.clipboard.writeText(text);
        this.showNotification('Ссылка скопирована в буфер обмена');
    }

    async generateNewSession() {
        if (!this.currentBookId) return;

        // Деактивируем старую сессию
        if (this.shareSession) {
            this.shareSession.isActive = false;
            await this.saveShareSession();
        }

        // Создаем новую сессию
        const book = await this.getBook(this.currentBookId);
        if (book) {
            await this.createShareSession(book);
            await this.generateQRCode();
            this.updateShareUI();
            this.showNotification('Новая сессия создана');
        }
    }

    async getBook(bookId) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoyueLibrary', 3);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['books'], 'readonly');
                const store = transaction.objectStore('books');
                const getRequest = store.get(bookId);
                
                getRequest.onsuccess = (e) => resolve(e.target.result);
                getRequest.onerror = () => reject('Ошибка загрузки книги');
            };
        });
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'qr-notification';
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

    showError(message) {
        this.showNotification(`❌ ${message}`);
    }
}

// Создаем страницу импорта import.html
const importPageHTML = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>墨阅 | Импорт книги</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="color-fixes.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="import-page">
    <div class="bg-elements">
        <div class="bg-circle circle-1"></div>
        <div class="bg-circle circle-2"></div>
        <div class="bg-ripple ripple-1"></div>
    </div>

    <div class="import-container">
        <div class="import-header">
            <div class="logo">
                <div class="logo-icon">卷</div>
                <h1>墨阅</h1>
            </div>
            <h2>Импорт книги</h2>
        </div>

        <div class="import-card" id="importCard">
            <div class="import-loader" id="importLoader">
                <div class="loader-spinner"></div>
                <p>Загрузка книги...</p>
            </div>

            <div class="import-success" id="importSuccess" style="display: none;">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Книга успешно импортирована!</h3>
                <p id="importBookTitle"></p>
                <div class="import-actions">
                    <button class="btn-primary" onclick="window.location.href='library.html'">
                        <i class="fas fa-books"></i> В библиотеку
                    </button>
                    <button class="btn-secondary" onclick="window.location.href='reader.html'">
                        <i class="fas fa-book-open"></i> Начать чтение
                    </button>
                </div>
            </div>

            <div class="import-error" id="importError" style="display: none;">
                <div class="error-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <h3>Ошибка импорта</h3>
                <p id="errorMessage"></p>
                <div class="import-actions">
                    <button class="btn-secondary" onclick="window.location.href='index.html'">
                        <i class="fas fa-home"></i> На главную
                    </button>
                    <button class="btn-primary" onclick="window.location.href='library.html'">
                        <i class="fas fa-upload"></i> Загрузить книгу
                    </button>
                </div>
            </div>

            <div class="import-password" id="importPassword" style="display: none;">
                <div class="password-icon">
                    <i class="fas fa-lock"></i>
                </div>
                <h3>Требуется пароль</h3>
                <p>Эта книга защищена паролем</p>
                <input type="password" id="passwordInput" placeholder="Введите пароль">
                <div class="import-actions">
                    <button class="btn-primary" id="submitPassword">
                        <i class="fas fa-unlock"></i> Разблокировать
                    </button>
                </div>
            </div>
        </div>

        <div class="import-footer">
            <p>© 2024 墨阅 (Mò Yuè). Приватная читалка.</p>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script src="advanced-qr-share.js"></script>
    <script>
        // Обработка параметров URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session');
        const version = urlParams.get('v');
        const requiresPassword = urlParams.get('p') === '1';

        async function initImport() {
            if (!sessionId) {
                showError('Неверная ссылка импорта');
                return;
            }

            if (requiresPassword) {
                showPasswordPrompt();
                return;
            }

            await processImport(sessionId);
        }

        function showPasswordPrompt() {
            document.getElementById('importLoader').style.display = 'none';
            document.getElementById('importPassword').style.display = 'block';

            document.getElementById('submitPassword').addEventListener('click', async () => {
                const password = document.getElementById('passwordInput').value;
                if (!password) {
                    alert('Введите пароль');
                    return;
                }

                // Здесь будет проверка пароля
                await processImport(sessionId, password);
            });
        }

        async function processImport(sessionId, password = null) {
            try {
                // Загружаем сессию из IndexedDB или API
                const session = await loadShareSession(sessionId);
                
                if (!session) {
                    throw new Error('Сессия не найдена или истекла');
                }

                if (session.passwordProtected && !password) {
                    showPasswordPrompt();
                    return;
                }

                // Проверяем лимит скачиваний
                if (session.downloadCount >= session.maxDownloads) {
                    throw new Error('Лимит скачиваний исчерпан');
                }

                // Проверяем срок действия
                if (new Date(session.expiresAt) < new Date()) {
                    throw new Error('Срок действия ссылки истек');
                }

                // Дешифруем данные книги
                const qrShare = new AdvancedQRShare();
                await qrShare.initCrypto();
                const bookData = await qrShare.decryptBookData(session.encryptedData);

                // Сохраняем книгу в библиотеку
                await saveBookToLibrary(bookData);

                // Обновляем счетчик скачиваний
                await updateDownloadCount(sessionId);

                // Показываем успех
                showSuccess(bookData);

            } catch (error) {
                console.error('Ошибка импорта:', error);
                showError(error.message);
            }
        }

        async function loadShareSession(sessionId) {
            // Здесь будет загрузка сессии из IndexedDB или с сервера
            // Временная заглушка
            return null;
        }

        async function saveBookToLibrary(bookData) {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('MoyueLibrary', 3);
                
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['books'], 'readwrite');
                    const store = transaction.objectStore('books');
                    
                    // Генерируем новый ID для импортированной книги
                    bookData.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                    bookData.addedAt = new Date().toISOString();
                    bookData.progress = 0;
                    bookData.imported = true;
                    bookData.importedAt = new Date().toISOString();
                    
                    store.put(bookData);
                    
                    transaction.oncomplete = () => resolve();
                    transaction.onerror = () => reject('Ошибка сохранения книги');
                };
            });
        }

        function showSuccess(bookData) {
            document.getElementById('importLoader').style.display = 'none';
            document.getElementById('importSuccess').style.display = 'block';
            document.getElementById('importBookTitle').textContent = bookData.title;
        }

        function showError(message) {
            document.getElementById('importLoader').style.display = 'none';
            document.getElementById('importError').style.display = 'block';
            document.getElementById('errorMessage').textContent = message;
        }

        // Инициализация при загрузке
        document.addEventListener('DOMContentLoaded', initImport);
    </script>
</body>
</html>
`;

// Создаем файл import.html если его нет
function createImportPage() {
    if (!window.location.pathname.includes('import.html')) return;
    
    // Мы уже находимся на странице импорта, скрипт выше выполнится
}

// Глобальная инициализация
if (window.location.pathname.includes('import.html')) {
    createImportPage();
}

// Экспортируем для использования в других файлах
window.AdvancedQRShare = AdvancedQRShare;