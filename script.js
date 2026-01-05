// Базовый функционал для главной страницы
document.addEventListener('DOMContentLoaded', function() {
    // Определяем текущую страницу
    const isHomePage = window.location.pathname.includes('index.html') || 
                      window.location.pathname === '/' || 
                      window.location.pathname.endsWith('/');
    
    console.log('🏠 Инициализация главной страницы...');
    
    // Инициализация фоновых элементов
    initBackgroundElements();
    
    // Инициализация слайдера отзывов (только на главной)
    if (isHomePage) {
        initReviewsSlider();
        loadLibraryPreview();
        initHomeSettings();
        
        // Загружаем библиотеку для главной страницы
        initHomeLibrary();
    }
    
    // Инициализация навигации
    initNavigation();
    
    // Инициализация других элементов
    initOtherElements();
});

// Минимальная инициализация библиотеки для главной
async function initHomeLibrary() {
    console.log('📚 Инициализация библиотеки на главной...');
    
    try {
        const request = indexedDB.open('MoyueLibrary', 2);
        
        request.onsuccess = function(event) {
            const db = event.target.result;
            window.homeLibraryDB = db;
            console.log('✅ База данных готова на главной');
        };
        
        request.onerror = function(event) {
            console.error('❌ Ошибка инициализации библиотеки на главной:', event.target.error);
        };
    } catch (error) {
        console.error('❌ Ошибка инициализации библиотеки:', error);
    }
}

// Инициализация фоновых элементов с расширенными анимациями
function initBackgroundElements() {
    const bgElements = document.querySelector('.bg-elements');
    if (bgElements) {
        // Сразу показываем элементы
        bgElements.style.opacity = '1';
        
        // Запускаем анимации сразу
        const elements = bgElements.querySelectorAll('.bg-circle, .bg-bubble, .bg-ripple, .bg-brush, .bg-line');
        elements.forEach((el, index) => {
            el.style.animationPlayState = 'running';
            el.style.opacity = '';
            
            // Добавляем разные задержки для разнообразия
            el.style.animationDelay = `${index * 0.3}s`;
            
            // Для кругов добавляем дополнительные эффекты
            if (el.classList.contains('bg-circle')) {
                el.style.willChange = 'transform, opacity';
                el.style.backfaceVisibility = 'hidden';
            }
        });
    }
    
    // Мягкий параллакс-эффект
    window.addEventListener('scroll', updateParallax);
    updateParallax();
}

// Параллакс-эффект
function updateParallax() {
    const scrollY = window.scrollY;
    const elements = document.querySelectorAll('.bg-circle, .bg-brush, .bg-bubble');
    
    elements.forEach((element, index) => {
        const speed = 0.03 + (index * 0.005); // Еще более мягкий эффект
        const yPos = -(scrollY * speed);
        const rotate = scrollY * 0.001;
        element.style.transform = `translateY(${yPos}px) rotate(${rotate}deg)`;
    });
    
    // Обновляем opacity фоновых элементов при скролле
    const opacity = Math.max(0.5, 1 - (scrollY * 0.0005));
    const wave = document.querySelector('.bg-wave');
    if (wave) {
        wave.style.opacity = `${0.3 + (scrollY * 0.0001)}`;
    }
    
    // Анимация появления библиотеки на главной
    const librarySection = document.querySelector('.library-preview');
    if (librarySection) {
        const rect = librarySection.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.8) {
            librarySection.classList.add('visible');
        }
    }
}

// Инициализация слайдера отзывов
function initReviewsSlider() {
    const reviewsContainer = document.querySelector('.reviews-container');
    const prevBtn = document.querySelector('.slider-btn.prev');
    const nextBtn = document.querySelector('.slider-btn.next');
    const sliderDots = document.querySelector('.slider-dots');
    
    if (!reviewsContainer || !prevBtn || !nextBtn) return;
    
    const reviewCards = document.querySelectorAll('.review-card');
    let currentIndex = 0;
    let cardsPerView = getCardsPerView();
    
    // Создаем точки для слайдера
    if (sliderDots) {
        sliderDots.innerHTML = '';
        const totalDots = Math.max(1, reviewCards.length - cardsPerView + 1);
        for (let i = 0; i < totalDots; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot' + (i === 0 ? ' active' : '');
            dot.addEventListener('click', () => goToSlide(i));
            sliderDots.appendChild(dot);
        }
    }
    
    // Определяем количество карточек в зависимости от ширины экрана
    function getCardsPerView() {
        if (window.innerWidth <= 992 && window.innerWidth > 768) {
            return 2;
        } else if (window.innerWidth <= 768) {
            return 1;
        } else {
            return 3;
        }
    }
    
    // Функция для обновления слайдера
    function updateSlider() {
        const cardWidth = reviewCards[0]?.offsetWidth || 300;
        const gap = 32;
        const maxIndex = Math.max(0, reviewCards.length - cardsPerView);
        
        // Ограничиваем индекс
        if (currentIndex > maxIndex) currentIndex = maxIndex;
        if (currentIndex < 0) currentIndex = 0;
        
        // Рассчитываем смещение с учетом gap
        const offset = currentIndex * (cardWidth + gap);
        reviewsContainer.style.transform = `translateX(-${offset}px)`;
        
        // Обновляем состояние кнопок
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex >= maxIndex;
        
        // Обновляем точки
        if (sliderDots) {
            const dots = sliderDots.querySelectorAll('.dot');
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentIndex);
            });
        }
    }
    
    // Переход к определенному слайду
    function goToSlide(index) {
        const maxIndex = Math.max(0, reviewCards.length - cardsPerView);
        currentIndex = Math.max(0, Math.min(index, maxIndex));
        updateSlider();
    }
    
    // Обработчики кнопок
    prevBtn.addEventListener('click', function() {
        if (currentIndex > 0) {
            currentIndex--;
            updateSlider();
        }
    });
    
    nextBtn.addEventListener('click', function() {
        const maxIndex = Math.max(0, reviewCards.length - cardsPerView);
        if (currentIndex < maxIndex) {
            currentIndex++;
            updateSlider();
        }
    });
    
    // Обновляем при изменении размера окна
    function handleResize() {
        cardsPerView = getCardsPerView();
        
        // Обновляем точки
        if (sliderDots) {
            sliderDots.innerHTML = '';
            const totalDots = Math.max(1, reviewCards.length - cardsPerView + 1);
            for (let i = 0; i < totalDots; i++) {
                const dot = document.createElement('div');
                dot.className = 'dot' + (i === 0 ? ' active' : '');
                dot.addEventListener('click', () => goToSlide(i));
                sliderDots.appendChild(dot);
            }
        }
        
        updateSlider();
    }
    
    window.addEventListener('resize', handleResize);
    
    // Инициализация
    updateSlider();
}

// Инициализация навигации
function initNavigation() {
    // Плавная прокрутка для якорных ссылок
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '#!') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                // Обновляем активную ссылку
                updateActiveNavLink(targetId);
            }
        });
    });
    
    // Активное состояние навигации при прокрутке
    if (document.querySelector('.nav-menu')) {
        window.addEventListener('scroll', updateActiveNavLinkOnScroll);
        updateActiveNavLinkOnScroll();
    }
}

// Обновление активной навигации при скролле
function updateActiveNavLinkOnScroll() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let currentSectionId = '';
    const scrollPosition = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 120;
        const sectionHeight = section.clientHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            currentSectionId = sectionId;
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        
        // Для главной страницы
        if (href === '#' && (scrollPosition < 200 || currentSectionId === '')) {
            link.classList.add('active');
        }
        
        // Для остальных секций
        if (href === `#${currentSectionId}` && currentSectionId) {
            link.classList.add('active');
        }
    });
}

// Обновление активной навигации при клике
function updateActiveNavLink(targetId) {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        
        if (href === targetId) {
            link.classList.add('active');
        }
    });
}

// Загрузка библиотеки на главной странице
async function loadLibraryPreview() {
    const libraryPreview = document.getElementById('libraryPreview');
    if (!libraryPreview) return;
    
    console.log('🔄 Загрузка превью библиотеки...');
    
    try {
        // Открываем базу данных
        const request = indexedDB.open('MoyueLibrary', 2);
        
        request.onerror = function(event) {
            console.error('❌ Ошибка загрузки библиотеки:', event.target.error);
            showEmptyLibrary(libraryPreview);
        };
        
        request.onsuccess = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('books')) {
                showEmptyLibrary(libraryPreview);
                return;
            }
            
            const transaction = db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = function() {
                const books = getAllRequest.result || [];
                if (books.length === 0) {
                    showEmptyLibrary(libraryPreview);
                } else {
                    showBooksPreview(books, libraryPreview);
                }
            };
            
            getAllRequest.onerror = function() {
                showEmptyLibrary(libraryPreview);
            };
        };
        
    } catch (error) {
        console.error('❌ Ошибка загрузки превью:', error);
        showEmptyLibrary(libraryPreview);
    }
}

// Показать пустую библиотеку
function showEmptyLibrary(container) {
    container.innerHTML = `
        <div class="book-card placeholder">
            <div class="book-cover">
                <span class="empty-icon">?</span>
                <div class="placeholder-text">Здесь будет ваша история</div>
            </div>
            <div class="book-info">
                <h4>Библиотека пуста</h4>
                <p>Загрузите свою первую книгу</p>
                <div class="book-actions">
                    <button class="btn-small" onclick="window.location.href='library.html'">В библиотеку</button>
                </div>
            </div>
        </div>
        <div class="upload-zone expanded" id="uploadZoneDemo">
            <div class="upload-content">
                <i class="fas fa-cloud-upload-alt"></i>
                <h3>Перетащите книгу сюда</h3>
                <p>DOCX, TXT или PDF файлы поддерживаются</p>
                <p class="upload-hint">Перейдите в библиотеку для загрузки</p>
            </div>
        </div>
    `;
    
    // Добавляем перенаправление в библиотеку
    const uploadZone = document.getElementById('uploadZoneDemo');
    if (uploadZone) {
        uploadZone.addEventListener('click', function() {
            window.location.href = 'library.html';
        });
    }
}

// Показать превью книг
function showBooksPreview(books, container) {
    // Показываем последние 3 книги
    const booksToShow = books.slice(-3).reverse();
    
    let booksHTML = booksToShow.map(book => `
        <div class="book-card" style="flex: 0 0 300px;">
            <div class="book-cover">
                <div class="book-cover-content">
                    <div class="book-cover-text">${getCoverText(book)}</div>
                    <div class="book-cover-title">${truncateText(book.title, 40)}</div>
                </div>
                <div class="book-format">.${book.format}</div>
            </div>
            <div class="book-info">
                <h3 class="book-title">${truncateText(book.title, 50)}</h3>
                <p class="book-author">${book.author || 'Неизвестный автор'}</p>
                <div class="book-meta">
                    <span><i class="far fa-calendar"></i> ${formatDate(book.addedAt)}</span>
                    <span><i class="fas fa-weight-hanging"></i> ${formatFileSize(book.size)}</span>
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
                    <button class="btn-small read-btn-home" data-book-id="${book.id}">
                        <i class="fas fa-book-open"></i> Читать
                    </button>
                    <button class="btn-small share-btn-home" data-book-id="${book.id}">
                        <i class="fas fa-share-alt"></i> Поделиться
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Добавляем кнопку для перехода в библиотеку
    booksHTML += `
        <div class="book-card all-books-card" style="flex: 0 0 300px; display: flex; align-items: center; justify-content: center; text-align: center;">
            <div class="all-books-content">
                <div class="all-books-icon" style="font-size: 64px; color: var(--softer-blue); margin-bottom: 20px;">
                    <i class="fas fa-books"></i>
                </div>
                <h3 style="color: var(--soft-white); margin-bottom: 10px;">Все книги</h3>
                <p style="color: var(--soft-gray); margin-bottom: 20px;">Перейти в полную библиотеку</p>
                <button class="btn-primary" onclick="window.location.href='library.html'" style="padding: 12px 30px;">
                    Открыть библиотеку
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = booksHTML;
    
    // Добавляем обработчики для кнопок "Читать"
    document.querySelectorAll('.read-btn-home').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const bookId = this.dataset.bookId;
            console.log('📖 Чтение книги с главной:', bookId);
            readBook(bookId);
        });
    });
    
    // Добавляем обработчики для кнопок "Поделиться"
    document.querySelectorAll('.share-btn-home').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const bookId = this.dataset.bookId;
            console.log('🔗 Шаринг книги с главной:', bookId);
            
            // Пробуем открыть прямо на главной
            if (window.homeLibraryDB) {
                try {
                    const transaction = window.homeLibraryDB.transaction(['books'], 'readonly');
                    const store = transaction.objectStore('books');
                    const request = store.get(bookId);
                    
                    request.onsuccess = async (e) => {
                        const book = e.target.result;
                        if (book) {
                            // Перенаправляем в библиотеку для шаринга
                            sessionStorage.setItem('shareBookId', bookId);
                            window.location.href = 'library.html';
                        } else {
                            alert('Книга не найдена');
                        }
                    };
                } catch (error) {
                    console.error('❌ Ошибка доступа к книге:', error);
                    sessionStorage.setItem('shareBookId', bookId);
                    window.location.href = 'library.html';
                }
            } else {
                // Перенаправляем в библиотеку
                sessionStorage.setItem('shareBookId', bookId);
                window.location.href = 'library.html';
            }
        });
    });
}

// Вспомогательные функции
function getCoverText(book) {
    if (book.title) {
        const firstChar = book.title.charAt(0).toUpperCase();
        if (/[A-ZА-ЯЁ]/.test(firstChar)) {
            return firstChar;
        }
    }
    return '書';
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    } catch {
        return 'Неизвестно';
    }
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Чтение книги
function readBook(bookId) {
    sessionStorage.setItem('currentBookId', bookId);
    window.location.href = 'reader.html';
}

// Настройки для главной страницы
function initHomeSettings() {
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsModal = document.getElementById('settingsModal');
    const settingsClose = document.getElementById('settingsClose');
    const resetSettings = document.getElementById('resetSettings');
    const saveSettings = document.getElementById('saveSettings');
    
    if (!settingsToggle || !settingsModal) return;
    
    console.log('⚙️ Инициализация настроек главной...');
    
    // Открытие настроек
    settingsToggle.addEventListener('click', function() {
        loadHomeSettings();
        settingsModal.classList.add('active');
    });
    
    // Закрытие настроек
    if (settingsClose) {
        settingsClose.addEventListener('click', function() {
            settingsModal.classList.remove('active');
        });
    }
    
    // Сброс настроек
    if (resetSettings) {
        resetSettings.addEventListener('click', function() {
            resetHomeSettings();
            showNotification('Настройки сброшены к значениям по умолчанию');
        });
    }
    
    // Сохранение настроек
    if (saveSettings) {
        saveSettings.addEventListener('click', function() {
            saveHomeSettings();
            settingsModal.classList.remove('active');
            showNotification('Настройки сохранены');
        });
    }
    
    // Закрытие по клику на фон
    settingsModal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
    
    // Управление темами
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Загрузка настроек главной страницы
function loadHomeSettings() {
    const settings = JSON.parse(localStorage.getItem('homeSettings') || '{}');
    
    // Тема
    const theme = settings.theme || 'dark';
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    
    // Язык
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.value = settings.language || 'ru';
    }
    
    // Другие настройки
    const autoBackup = document.getElementById('autoBackup');
    if (autoBackup) autoBackup.checked = settings.autoBackup || false;
    
    const notifications = document.getElementById('notifications');
    if (notifications) notifications.checked = settings.notifications !== false;
}

// Сохранение настроек главной страницы
function saveHomeSettings() {
    const settings = {};
    
    // Тема
    const activeTheme = document.querySelector('.theme-btn.active');
    if (activeTheme) {
        settings.theme = activeTheme.dataset.theme;
    }
    
    // Язык
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        settings.language = languageSelect.value;
    }
    
    // Другие настройки
    const autoBackup = document.getElementById('autoBackup');
    if (autoBackup) settings.autoBackup = autoBackup.checked;
    
    const notifications = document.getElementById('notifications');
    if (notifications) settings.notifications = notifications.checked;
    
    localStorage.setItem('homeSettings', JSON.stringify(settings));
    applyHomeSettings(settings);
}

// Функция применения настроек
function applyHomeSettings(settings) {
    if (settings.theme === 'light') {
        document.body.classList.add('theme-light');
        document.body.classList.remove('theme-dark', 'theme-sepia');
    } else if (settings.theme === 'sepia') {
        document.body.classList.add('theme-sepia');
        document.body.classList.remove('theme-dark', 'theme-light');
    } else {
        document.body.classList.add('theme-dark');
        document.body.classList.remove('theme-light', 'theme-sepia');
    }
    
    // Применение языка
    if (settings.language === 'en') {
        // Здесь можно добавить перевод интерфейса
    }
}

// Сброс настроек главной страницы
function resetHomeSettings() {
    const defaultSettings = {
        theme: 'dark',
        language: 'ru',
        autoBackup: false,
        notifications: true
    };
    
    // Устанавливаем значения в форму
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === defaultSettings.theme);
    });
    
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) languageSelect.value = defaultSettings.language;
    
    const autoBackup = document.getElementById('autoBackup');
    if (autoBackup) autoBackup.checked = defaultSettings.autoBackup;
    
    const notifications = document.getElementById('notifications');
    if (notifications) notifications.checked = defaultSettings.notifications;
    
    localStorage.setItem('homeSettings', JSON.stringify(defaultSettings));
    applyHomeSettings(defaultSettings);
}

// Инициализация других элементов
function initOtherElements() {
    // Улучшенный observer для плавного появления
    const observerOptions = {
        root: null,
        rootMargin: '-50px 0px -50px 0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
            }
        });
    }, observerOptions);
    
    // Наблюдаем за секциями
    document.querySelectorAll('section').forEach(section => {
        if (section.id !== 'library') { // Библиотеку анимируем отдельно
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px)';
            section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            observer.observe(section);
        }
    });
    
    // Наблюдаем за карточками features
    const featureObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        featureObserver.observe(card);
    });
    
    // Наблюдаем за отзывами
    const reviewObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 150);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.review-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        reviewObserver.observe(card);
    });
    
    // Обновляем при ресайзе
    window.addEventListener('resize', function() {
        if (document.querySelector('.nav-menu')) {
            updateActiveNavLinkOnScroll();
        }
        updateParallax();
    });
}

// Уведомление
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #90e0ef;
        color: #0a1a2d;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
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

// Добавляем CSS для анимаций уведомлений
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
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
}

// Глобальная функция для обновления превью
window.refreshLibraryPreview = function() {
    loadLibraryPreview();
};