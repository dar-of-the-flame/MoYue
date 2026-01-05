// session-manager.js - Управление сессиями шаринга

class SessionManager {
    constructor() {
        this.sessions = [];
        this.init();
    }

    async init() {
        await this.loadSessions();
        this.initEvents();
        this.renderActiveSessions();
    }

    async loadSessions() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoyueLibrary', 4);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                // Создаем хранилище для сессий, если его нет
                if (!db.objectStoreNames.contains('shareSessions')) {
                    const sessionStore = db.createObjectStore('shareSessions', { keyPath: 'id' });
                    sessionStore.createIndex('bookId', 'bookId', { unique: false });
                    sessionStore.createIndex('createdAt', 'createdAt', { unique: false });
                    sessionStore.createIndex('isActive', 'isActive', { unique: false });
                }
                
                const transaction = db.transaction(['shareSessions'], 'readonly');
                const store = transaction.objectStore('shareSessions');
                const getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = (e) => {
                    this.sessions = e.target.result || [];
                    this.cleanupExpiredSessions();
                    resolve();
                };
                
                getAllRequest.onerror = () => reject('Ошибка загрузки сессий');
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создаем хранилище для сессий
                if (!db.objectStoreNames.contains('shareSessions')) {
                    const sessionStore = db.createObjectStore('shareSessions', { keyPath: 'id' });
                    sessionStore.createIndex('bookId', 'bookId', { unique: false });
                    sessionStore.createIndex('createdAt', 'createdAt', { unique: false });
                    sessionStore.createIndex('isActive', 'isActive', { unique: false });
                }
            };
        });
    }

    cleanupExpiredSessions() {
        const now = new Date();
        const expiredSessions = this.sessions.filter(session => 
            (session.expiresAt && new Date(session.expiresAt) < now) || !session.isActive
        );

        if (expiredSessions.length > 0) {
            // Помечаем как неактивные
            expiredSessions.forEach(session => {
                session.isActive = false;
            });

            this.saveSessions(expiredSessions);
        }
    }

    async saveSessions(sessions) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MoyueLibrary', 4);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['shareSessions'], 'readwrite');
                const store = transaction.objectStore('shareSessions');
                
                sessions.forEach(session => {
                    store.put(session);
                });
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject('Ошибка сохранения сессий');
            };
        });
    }

    initEvents() {
        // Кнопка просмотра сессий
        const viewSessionsBtn = document.getElementById('viewSessions');
        if (viewSessionsBtn) {
            viewSessionsBtn.addEventListener('click', () => this.showSessionsModal());
        }

        // Кнопка отзыва доступа
        const revokeSessionBtn = document.getElementById('revokeSession');
        if (revokeSessionBtn) {
            revokeSessionBtn.addEventListener('click', () => this.revokeCurrentSession());
        }
    }

    renderActiveSessions() {
        const activeSessions = this.sessions.filter(s => s.isActive);
        
        if (activeSessions.length === 0) return;
        
        // Можно добавить индикатор активных сессий в интерфейс
        const indicator = document.createElement('div');
        indicator.className = 'sessions-indicator';
        indicator.innerHTML = `
            <i class="fas fa-share-alt"></i>
            <span class="sessions-count">${activeSessions.length}</span>
        `;
        
        const header = document.querySelector('.header');
        if (header) {
            header.appendChild(indicator);
            
            indicator.addEventListener('click', () => this.showSessionsModal());
        }
    }

    async showSessionsModal() {
        await this.loadSessions();
        
        const modalId = 'sessionsModal';
        if (!document.getElementById(modalId)) {
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        const modal = document.getElementById(modalId);
        const activeSessions = this.sessions.filter(s => s.isActive);
        const inactiveSessions = this.sessions.filter(s => !s.isActive);
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Сессии шаринга</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="sessions-tabs">
                        <button class="session-tab active" data-tab="active">Активные (${activeSessions.length})</button>
                        <button class="session-tab" data-tab="inactive">История (${inactiveSessions.length})</button>
                    </div>
                    
                    <div class="sessions-content">
                        <div class="session-tab-content active" id="activeSessions">
                            ${this.renderSessionsList(activeSessions, true)}
                        </div>
                        <div class="session-tab-content" id="inactiveSessions">
                            ${this.renderSessionsList(inactiveSessions, false)}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="this.closest('.modal').remove()">Закрыть</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        this.bindSessionEvents();
    }

    renderSessionsList(sessions, isActive) {
        if (sessions.length === 0) {
            return `<div class="no-sessions">Нет сессий</div>`;
        }
        
        return sessions.map(session => `
            <div class="session-item" data-id="${session.id}">
                <div class="session-info">
                    <div class="session-book">
                        <strong>${session.bookTitle}</strong>
                        <span class="session-meta">${session.bookAuthor || 'Неизвестный автор'} • ${session.format}</span>
                    </div>
                    <div class="session-details">
                        <span><i class="far fa-calendar"></i> ${new Date(session.createdAt).toLocaleDateString()}</span>
                        <span><i class="fas fa-download"></i> ${session.downloadCount || 0}/${session.maxDownloads || '∞'}</span>
                        <span><i class="fas fa-clock"></i> ${this.formatTimeLeft(new Date(session.expiresAt))}</span>
                    </div>
                </div>
                <div class="session-actions">
                    ${isActive ? `
                        <button class="session-action-btn copy-link" title="Копировать ссылку">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="session-action-btn revoke" title="Отозвать доступ">
                            <i class="fas fa-ban"></i>
                        </button>
                    ` : `
                        <button class="session-action-btn delete" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    `}
                </div>
            </div>
        `).join('');
    }

    bindSessionEvents() {
        // Переключение вкладок
        document.querySelectorAll('.session-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                
                // Обновляем активные вкладки
                document.querySelectorAll('.session-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Показываем соответствующий контент
                document.querySelectorAll('.session-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${tabName}Sessions`).classList.add('active');
            });
        });

        // Действия с сессиями
        document.querySelectorAll('.session-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sessionItem = e.currentTarget.closest('.session-item');
                const sessionId = sessionItem.dataset.id;
                const action = e.currentTarget.classList.contains('copy-link') ? 'copy' :
                              e.currentTarget.classList.contains('revoke') ? 'revoke' :
                              e.currentTarget.classList.contains('delete') ? 'delete' : null;
                
                if (action === 'copy') {
                    this.copySessionLink(sessionId);
                } else if (action === 'revoke') {
                    this.revokeSession(sessionId);
                } else if (action === 'delete') {
                    this.deleteSession(sessionId);
                }
            });
        });
    }

    async copySessionLink(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/library.html?session=${sessionId}&v=2.0`;
        
        await navigator.clipboard.writeText(shareUrl);
        this.showNotification('Ссылка скопирована');
    }

    async revokeSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        if (confirm('Вы уверены, что хотите отозвать доступ к этой книге?')) {
            session.isActive = false;
            session.revokedAt = new Date().toISOString();
            
            await this.saveSessions([session]);
            await this.loadSessions();
            
            this.showNotification('Доступ отозван');
            this.showSessionsModal(); // Обновляем модальное окно
        }
    }

    async deleteSession(sessionId) {
        if (confirm('Вы уверены, что хотите удалить эту сессию?')) {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('MoyueLibrary', 4);
                
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['shareSessions'], 'readwrite');
                    const store = transaction.objectStore('shareSessions');
                    store.delete(sessionId);
                    
                    transaction.oncomplete = async () => {
                        await this.loadSessions();
                        this.showNotification('Сессия удалена');
                        this.showSessionsModal(); // Обновляем модальное окно
                        resolve();
                    };
                    
                    transaction.onerror = () => reject('Ошибка удаления сессии');
                };
            });
        }
    }

    async revokeCurrentSession() {
        if (window.qrShare && window.qrShare.shareSession) {
            await this.revokeSession(window.qrShare.shareSession.id);
            window.qrShare.shareSession.isActive = false;
            this.showNotification('Текущая сессия отозвана');
        }
    }

    formatTimeLeft(expireDate) {
        if (!expireDate) return 'Без ограничений';
        
        const now = new Date();
        const diff = new Date(expireDate) - now;
        
        if (diff <= 0) return 'Истек';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) return `${days}д ${hours}ч`;
        return `${hours}ч`;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'session-notification';
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
}

// Глобальная инициализация
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('library.html')) {
        window.sessionManager = new SessionManager();
    }
});