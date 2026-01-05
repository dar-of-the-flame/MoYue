// Быстрые исправления для всех страниц
(function() {
    'use strict';
    
    console.log('🔧 Применяем горячие исправления...');
    
    // ========== ОСНОВНЫЕ НАСТРОЙКИ ==========
    const HOTFIX_CONFIG = {
        colors: {
            textLight: '#f8f9fa',
            textGray: '#adb5bd',
            skyBlue: '#90e0ef',
            primaryDark: '#0a1a2d'
        },
        delays: {
            libraryRefresh: 300,
            qrInit: 500,
            colorFix: 100
        }
    };
    
    // ========== ЦВЕТОВЫЕ ИСПРАВЛЕНИЯ ==========
    function applyColorFixes() {
        // Устанавливаем CSS переменные
        document.documentElement.style.setProperty('--text-light', HOTFIX_CONFIG.colors.textLight);
        document.documentElement.style.setProperty('--text-gray', HOTFIX_CONFIG.colors.textGray);
        document.documentElement.style.setProperty('--sky-blue', HOTFIX_CONFIG.colors.skyBlue);
        
        // Исправляем слишком яркий белый текст
        setTimeout(() => {
            const elements = document.querySelectorAll('body, h1, h2, h3, h4, h5, h6, p, span, li, td, th, .text-light, .book-title, .review-text');
            elements.forEach(el => {
                const style = window.getComputedStyle(el);
                const color = style.color;
                
                // Если цвет слишком белый (#ffffff или rgb(255,255,255))
                if (color === 'rgb(255, 255, 255)' || 
                    color === '#ffffff' ||
                    color === 'white') {
                    el.style.color = HOTFIX_CONFIG.colors.textLight;
                    el.style.transition = 'color 0.3s ease';
                }
            });
            
            // Исправляем фон карточек
            document.querySelectorAll('.book-card, .modal-content, .review-card').forEach(card => {
                const bgColor = window.getComputedStyle(card).backgroundColor;
                if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
                    card.style.backgroundColor = 'rgba(30, 58, 95, 0.4)';
                }
            });
        }, HOTFIX_CONFIG.delays.colorFix);
    }
    
    // ========== БИБЛИОТЕЧНЫЕ ИСПРАВЛЕНИЯ ==========
    function applyLibraryFixes() {
        // Автоматическое обновление библиотеки после загрузки
        if (typeof libraryManager !== 'undefined' && libraryManager) {
            console.log('🔄 Обновление библиотеки...');
            
            // Загружаем и рендерим книги с задержкой
            setTimeout(() => {
                libraryManager.loadBooks().then(() => {
                    libraryManager.renderBooks();
                    libraryManager.updateStats();
                    console.log('✅ Библиотека обновлена');
                    
                    // Исправление: проверяем, есть ли книги, но не отображаются
                    const libraryGrid = document.getElementById('libraryGrid');
                    const emptyLibrary = document.getElementById('emptyLibrary');
                    
                    if (libraryGrid && emptyLibrary && libraryManager.books.length > 0) {
                        if (emptyLibrary.style.display !== 'none') {
                            emptyLibrary.style.display = 'none';
                        }
                    }
                }).catch(error => {
                    console.error('❌ Ошибка обновления библиотеки:', error);
                });
            }, HOTFIX_CONFIG.delays.libraryRefresh);
        }
        
        // Исправление поиска
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            console.log('🔍 Исправление поиска...');
            
            // Удаляем старые обработчики
            searchInput.removeEventListener('input', libraryManager.searchBooks);
            
            // Добавляем новый обработчик
            searchInput.addEventListener('input', function(e) {
                if (libraryManager && typeof libraryManager.searchBooks === 'function') {
                    libraryManager.searchBooks(e.target.value);
                }
            });
        }
        
        // Исправление сортировки
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            console.log('📊 Исправление сортировки...');
            
            sortSelect.addEventListener('change', function() {
                if (libraryManager && typeof libraryManager.renderBooks === 'function') {
                    libraryManager.renderBooks();
                }
            });
        }
    }
    
    // ========== QR-КОД ИСПРАВЛЕНИЯ ==========
    function applyQRFixes() {
        // Загружаем библиотеку QRCode если её нет
        if (typeof QRCode === 'undefined') {
            console.log('📱 Загрузка QRCode библиотеки...');
            
            const existingScript = document.querySelector('script[src*="qrcode"]');
            if (!existingScript) {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
                script.onload = () => {
                    console.log('✅ QRCode библиотека загружена');
                    
                    // Переинициализируем QRShare если он существует
                    if (typeof qrShare !== 'undefined' && qrShare) {
                        console.log('🔄 Переинициализация QRShare...');
                        // Можно добавить переинициализацию здесь при необходимости
                    }
                };
                script.onerror = () => {
                    console.error('❌ Не удалось загрузить QRCode библиотеку');
                };
                document.head.appendChild(script);
            }
        }
        
        // Исправление генерации QR кода
        if (typeof qrShare !== 'undefined' && qrShare.generateQRCode) {
            const originalGenerateQRCode = qrShare.generateQRCode;
            
            qrShare.generateQRCode = function(bookId) {
                console.log('🎯 Генерация QR кода для книги:', bookId);
                
                // Проверяем наличие библиотеки QRCode
                if (typeof QRCode === 'undefined') {
                    console.error('❌ QRCode библиотека не загружена');
                    this.showError('Библиотека QR-кодов не загружена. Пожалуйста, обновите страницу.');
                    return;
                }
                
                // Проверяем контейнер
                if (!this.elements.qrContainer) {
                    console.error('❌ Контейнер QR не найден');
                    return;
                }
                
                // Очищаем контейнер
                this.elements.qrContainer.innerHTML = '';
                
                // Используем задержку для гарантии отрисовки
                setTimeout(async () => {
                    try {
                        const book = await this.getBook(bookId);
                        if (!book) {
                            console.error('❌ Книга не найдена:', bookId);
                            return;
                        }
                        
                        // Подготовка данных
                        const shareData = await this.prepareShareData(book);
                        this.shareData = shareData;
                        
                        // Создание ссылки
                        const shareUrl = this.createShareUrl(shareData);
                        
                        // Обновляем поле со ссылкой
                        if (this.elements.shareLink) {
                            this.elements.shareLink.value = shareUrl;
                        }
                        
                        // Генерация QR-кода
                        try {
                            this.qrCode = new QRCode(this.elements.qrContainer, {
                                text: shareUrl,
                                width: 200,
                                height: 200,
                                colorDark: "#000000",
                                colorLight: "#ffffff",
                                correctLevel: QRCode.CorrectLevel.Q
                            });
                            
                            // Добавляем анимацию
                            setTimeout(() => {
                                const qrCanvas = this.elements.qrContainer.querySelector('canvas');
                                if (qrCanvas) {
                                    qrCanvas.classList.add('qr-generated');
                                    console.log('✅ QR код сгенерирован');
                                }
                            }, 100);
                            
                        } catch (qrError) {
                            console.error('❌ Ошибка генерации QR:', qrError);
                            this.showError('Ошибка генерации QR-кода');
                        }
                        
                    } catch (error) {
                        console.error('❌ Ошибка подготовки QR:', error);
                        this.showError('Не удалось сгенерировать QR-код');
                    }
                }, HOTFIX_CONFIG.delays.qrInit);
            };
        }
    }
    
    // ========== ГЛАВНАЯ СТРАНИЦА ИСПРАВЛЕНИЯ ==========
    function applyHomePageFixes() {
        if (window.location.pathname.includes('index.html') || 
            window.location.pathname === '/' || 
            window.location.pathname.endsWith('/')) {
            
            console.log('🏠 Применение исправлений для главной страницы...');
            
            // Исправляем кнопки "Читать" и "Поделиться" на главной
            setTimeout(() => {
                // Кнопки "Читать"
                document.querySelectorAll('.read-btn').forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const bookId = this.dataset.bookId;
                        if (bookId) {
                            console.log('📖 Чтение книги:', bookId);
                            sessionStorage.setItem('currentBookId', bookId);
                            window.location.href = 'reader.html';
                        }
                    });
                });
                
                // Кнопки "Поделиться"
                document.querySelectorAll('.share-btn').forEach(btn => {
                    btn.addEventListener('click', async function(e) {
                        e.stopPropagation();
                        const bookId = this.dataset.bookId;
                        if (bookId) {
                            console.log('🔗 Шаринг книги:', bookId);
                            
                            // Проверяем наличие библиотечного менеджера
                            if (typeof libraryManager !== 'undefined' && libraryManager.shareBook) {
                                try {
                                    await libraryManager.shareBook(bookId);
                                } catch (error) {
                                    console.error('❌ Ошибка шаринга:', error);
                                    // Fallback: перенаправляем в библиотеку
                                    sessionStorage.setItem('shareBookId', bookId);
                                    window.location.href = 'library.html';
                                }
                            } else {
                                // Перенаправляем в библиотеку
                                sessionStorage.setItem('shareBookId', bookId);
                                window.location.href = 'library.html';
                            }
                        }
                    });
                });
                
                // Загрузка первой книги
                const uploadFirstBook = document.getElementById('uploadFirstBook');
                if (uploadFirstBook) {
                    uploadFirstBook.addEventListener('click', function() {
                        window.location.href = 'library.html';
                    });
                }
                
                // Переход в библиотеку
                const goToLibrary = document.getElementById('goToLibrary');
                if (goToLibrary) {
                    goToLibrary.addEventListener('click', function() {
                        window.location.href = 'library.html';
                    });
                }
                
            }, 1000);
            
            // Загружаем превью библиотеки
            setTimeout(() => {
                if (typeof loadLibraryPreview === 'function') {
                    loadLibraryPreview();
                }
            }, 1500);
        }
    }
    
    // ========== ЧИТАЛКА ИСПРАВЛЕНИЯ ==========
    function applyReaderFixes() {
        if (window.location.pathname.includes('reader.html')) {
            console.log('📚 Применение исправлений для читалки...');
            
            // Улучшаем цвет текста в читалке
            setTimeout(() => {
                const readerContent = document.getElementById('readerContent');
                if (readerContent) {
                    readerContent.style.color = '#f0f0f0';
                    readerContent.style.lineHeight = '1.8';
                    readerContent.style.textShadow = '0 1px 1px rgba(0, 0, 0, 0.1)';
                }
                
                // Добавляем кнопку быстрой настройки цвета
                const readingControls = document.querySelector('.reading-controls');
                if (readingControls && !document.getElementById('quickColorBtn')) {
                    const quickColorBtn = document.createElement('button');
                    quickColorBtn.id = 'quickColorBtn';
                    quickColorBtn.className = 'tool-btn';
                    quickColorBtn.title = 'Быстрая настройка цвета';
                    quickColorBtn.innerHTML = '<i class="fas fa-palette"></i>';
                    quickColorBtn.style.marginLeft = '10px';
                    
                    quickColorBtn.addEventListener('click', function() {
                        const currentTheme = document.body.className.match(/reader-theme-(\w+)/);
                        const themes = ['dark', 'light', 'sepia'];
                        const currentIndex = currentTheme ? themes.indexOf(currentTheme[1]) : 0;
                        const nextIndex = (currentIndex + 1) % themes.length;
                        const nextTheme = themes[nextIndex];
                        
                        document.body.classList.remove('reader-theme-dark', 'reader-theme-light', 'reader-theme-sepia');
                        document.body.classList.add(`reader-theme-${nextTheme}`);
                        
                        // Сохраняем настройку
                        if (typeof Reader !== 'undefined') {
                            localStorage.setItem('reader_theme', nextTheme);
                        }
                        
                        showQuickNotification(`Тема изменена: ${nextTheme === 'dark' ? 'Темная' : nextTheme === 'light' ? 'Светлая' : 'Сепия'}`);
                    });
                    
                    const readerTools = document.querySelector('.reader-tools');
                    if (readerTools) {
                        readerTools.appendChild(quickColorBtn);
                    }
                }
            }, 500);
        }
    }
    
    // ========== УТИЛИТЫ ==========
    function showQuickNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'hotfix-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: var(--sky-blue);
            color: var(--dark-bg);
            padding: 10px 20px;
            border-radius: 8px;
            z-index: 9999;
            font-size: 14px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        `;
        
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
    
    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    function initHotfixes() {
        console.log('🚀 Инициализация горячих исправлений...');
        
        // Добавляем CSS для анимаций
        if (!document.querySelector('#hotfix-animations')) {
            const style = document.createElement('style');
            style.id = 'hotfix-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                .hotfix-notification {
                    animation: slideIn 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Применяем все исправления
        applyColorFixes();
        
        // Ждем загрузки DOM
        setTimeout(() => {
            applyLibraryFixes();
            applyQRFixes();
            applyHomePageFixes();
            applyReaderFixes();
            
            console.log('✅ Все горячие исправления применены');
            
            // Глобальная функция для принудительного обновления библиотеки
            window.forceRefreshLibrary = function() {
                if (typeof libraryManager !== 'undefined') {
                    libraryManager.loadBooks().then(() => {
                        libraryManager.renderBooks();
                        libraryManager.updateStats();
                        showQuickNotification('Библиотека обновлена');
                    });
                }
            };
            
        }, 100);
    }
    
    // Запускаем при полной загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHotfixes);
    } else {
        initHotfixes();
    }
})();