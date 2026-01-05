// file-upload.js - Расширенная обработка файлов с поддержкой PDF

class FileUploadManager {
    constructor() {
        this.pdfjsLib = window.pdfjsLib;
        this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.supportedFormats = ['txt', 'docx', 'pdf'];
        this.init();
    }

    init() {
        this.initElements();
        this.initEvents();
    }

    initElements() {
        this.elements = {
            uploadZone: document.getElementById('uploadZone'),
            fileInput: document.getElementById('fileInput'),
            uploadProgress: document.getElementById('uploadProgress'),
            progressFill: document.getElementById('progressFill'),
            progressFiles: document.getElementById('progressFiles'),
            processedCount: document.getElementById('processedCount'),
            errorCount: document.getElementById('errorCount'),
            totalSize: document.getElementById('totalSize')
        };
    }

    initEvents() {
        if (this.elements.uploadZone) {
            this.elements.uploadZone.addEventListener('click', () => {
                this.elements.fileInput.click();
            });
        }

        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.processFiles(Array.from(e.target.files));
                    this.elements.fileInput.value = '';
                }
            });
        }

        // Drag & drop
        if (this.elements.uploadZone) {
            this.elements.uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.elements.uploadZone.classList.add('dragover');
            });
            
            this.elements.uploadZone.addEventListener('dragleave', () => {
                this.elements.uploadZone.classList.remove('dragover');
            });
            
            this.elements.uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.elements.uploadZone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    this.processFiles(Array.from(e.dataTransfer.files));
                }
            });
        }
    }

    async processFiles(files) {
        const validFiles = this.validateFiles(files);
        if (validFiles.length === 0) return;

        this.showProgress(validFiles.length);
        
        let processed = 0;
        let errors = 0;
        let totalSize = 0;

        for (const file of validFiles) {
            try {
                this.addFileToProgress(file, 'processing');
                totalSize += file.size;

                const bookData = await this.readFile(file);
                
                // Создаем объект книги
                const book = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    title: this.extractTitle(file.name, bookData.content),
                    author: this.extractAuthor(bookData.content),
                    content: bookData.content,
                    format: this.getFileFormat(file.name),
                    size: file.size,
                    addedAt: new Date().toISOString(),
                    progress: 0,
                    characters: bookData.content.length,
                    metadata: {
                        ...bookData.metadata,
                        originalFilename: file.name,
                        fileSize: file.size,
                        pages: bookData.pages || 0
                    }
                };

                // Сохраняем книгу через библиотечный менеджер
                if (window.libraryManager && typeof window.libraryManager.saveBook === 'function') {
                    await window.libraryManager.saveBook(book);
                    processed++;
                    this.updateFileStatus(file.name, 'success');
                } else {
                    throw new Error('Библиотечный менеджер не доступен');
                }

            } catch (error) {
                console.error('❌ Ошибка обработки файла:', error);
                errors++;
                this.updateFileStatus(file.name, 'error', error.message);
            }

            // Обновляем прогресс
            this.updateProgress(processed, errors, validFiles.length, totalSize);
        }

        // Показываем итоговое уведомление
        this.showCompletionNotification(processed, errors, validFiles.length);
        
        // Скрываем прогресс через 3 секунды
        setTimeout(() => {
            this.hideProgress();
        }, 3000);
    }

    validateFiles(files) {
        return files.filter(file => {
            // Проверка размера
            if (file.size > this.maxFileSize) {
                this.showError(`Файл ${file.name} превышает максимальный размер 50MB`);
                return false;
            }

            // Проверка формата
            const format = this.getFileFormat(file.name);
            if (!this.supportedFormats.includes(format.toLowerCase())) {
                this.showError(`Формат ${format} не поддерживается`);
                return false;
            }

            return true;
        });
    }

    async readFile(file) {
        const format = this.getFileFormat(file.name).toLowerCase();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                try {
                    let content = '';
                    let metadata = {};
                    let pages = 0;

                    switch (format) {
                        case 'txt':
                            content = event.target.result;
                            break;
                            
                        case 'docx':
                            if (typeof mammoth !== 'undefined') {
                                const result = await mammoth.extractRawText({ 
                                    arrayBuffer: event.target.result 
                                });
                                content = result.value;
                                metadata = result.metadata || {};
                            } else {
                                throw new Error('Mammoth.js не загружен');
                            }
                            break;
                            
                        case 'pdf':
                            const pdfData = await this.extractTextFromPDF(event.target.result);
                            content = pdfData.text;
                            metadata = pdfData.metadata;
                            pages = pdfData.pages;
                            break;
                            
                        default:
                            throw new Error(`Неподдерживаемый формат: ${format}`);
                    }
                    
                    resolve({ content, metadata, pages });
                    
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
            }
        });
    }

    async extractTextFromPDF(arrayBuffer) {
        try {
            const pdf = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = '';
            const metadata = await pdf.getMetadata();
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = content.items
                    .map(item => item.str)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                text += pageText + '\n\n';
            }
            
            return {
                text: text.trim(),
                metadata: metadata.info || {},
                pages: pdf.numPages
            };
            
        } catch (error) {
            console.error('Ошибка извлечения текста из PDF:', error);
            throw new Error('Не удалось извлечь текст из PDF файла');
        }
    }

    getFileFormat(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ext;
    }

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

    showProgress(totalFiles) {
        if (this.elements.uploadProgress) {
            this.elements.uploadProgress.style.display = 'block';
            this.elements.progressFiles.innerHTML = '';
            this.elements.processedCount.textContent = '0';
            this.elements.errorCount.textContent = '0';
            this.elements.totalSize.textContent = '0 MB';
        }
    }

    hideProgress() {
        if (this.elements.uploadProgress) {
            this.elements.uploadProgress.style.display = 'none';
            this.elements.progressFill.style.width = '0%';
        }
    }

    addFileToProgress(file, status) {
        if (!this.elements.progressFiles) return;
        
        const fileElement = document.createElement('div');
        fileElement.className = 'progress-file';
        fileElement.innerHTML = `
            <div class="progress-file-info">
                <div class="progress-file-name">${file.name}</div>
                <div class="progress-file-size">${this.formatFileSize(file.size)}</div>
            </div>
            <div class="progress-file-status ${status}">
                ${this.getStatusText(status)}
            </div>
        `;
        
        this.elements.progressFiles.appendChild(fileElement);
    }

    updateFileStatus(filename, status, errorMessage = '') {
        const files = this.elements.progressFiles.querySelectorAll('.progress-file');
        const fileElement = Array.from(files).find(el => 
            el.querySelector('.progress-file-name').textContent === filename
        );
        
        if (fileElement) {
            const statusElement = fileElement.querySelector('.progress-file-status');
            statusElement.className = `progress-file-status ${status}`;
            statusElement.textContent = this.getStatusText(status, errorMessage);
            
            // Добавляем иконку в зависимости от статуса
            const icon = this.getStatusIcon(status);
            if (icon) {
                statusElement.innerHTML = `${icon} ${statusElement.textContent}`;
            }
        }
    }

    getStatusText(status, errorMessage = '') {
        switch (status) {
            case 'processing': return 'Обработка...';
            case 'success': return 'Успешно';
            case 'error': return errorMessage || 'Ошибка';
            default: return 'Ожидание';
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'success': return '<i class="fas fa-check-circle"></i>';
            case 'error': return '<i class="fas fa-exclamation-circle"></i>';
            case 'processing': return '<i class="fas fa-spinner fa-spin"></i>';
            default: return '';
        }
    }

    updateProgress(processed, errors, total, totalSize) {
        if (this.elements.progressFill) {
            const progress = Math.round((processed + errors) / total * 100);
            this.elements.progressFill.style.width = `${progress}%`;
        }
        
        if (this.elements.processedCount) {
            this.elements.processedCount.textContent = processed;
        }
        
        if (this.elements.errorCount) {
            this.elements.errorCount.textContent = errors;
        }
        
        if (this.elements.totalSize) {
            this.elements.totalSize.textContent = this.formatFileSize(totalSize);
        }
    }

    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 Б';
        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showCompletionNotification(processed, errors, total) {
        let message = '';
        
        if (errors === 0 && processed > 0) {
            message = `Все ${processed} файлов успешно обработаны`;
        } else if (processed > 0 && errors > 0) {
            message = `Обработано ${processed} из ${total} файлов (${errors} ошибок)`;
        } else if (errors === total) {
            message = 'Все файлы не удалось обработать';
        }
        
        if (message) {
            this.showNotification(message);
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'file-upload-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-info-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showError(message) {
        this.showNotification(`❌ ${message}`);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('library.html')) {
        window.fileUploadManager = new FileUploadManager();
    }
});