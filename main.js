class AsciiEditor {
    constructor() {
        this.width = 30;
        this.height = 20;
        this.grid = [];
        this.currentTool = 'brush';
        this.currentChar = '#';
        this.isDrawing = false;
        this.history = [];
        this.historyIndex = -1;
        this.cellElements = []; // 셀 엘리먼트 캐시
        this.editingTileIndex = null; // 현재 편집 중인 타일 인덱스 (null이면 추가)

        this.defaultPalette = [
            { char: '#', label: '벽 (Wall)' },
            { char: '.', label: '바닥 (Floor)' },
            { char: '@', label: '플레이어 (Player)' },
            { char: 'T', label: '나무 (Tree)' },
            { char: '~', label: '물 (Water)' },
            { char: '^', label: '산 (Mountain)' },
            { char: '*', label: '아이템 (Item)' },
            { char: '+', label: '문 (Door)' },
            { char: '=', label: '다리 (Bridge)' },
            { char: '-', label: '수평 벽 (H-Wall)' },
            { char: '|', label: '수직 벽 (V-Wall)' }
        ];

        this.paletteChars = [...this.defaultPalette];
        this.emojiList = [
            // 지형/자연
            '🧱', '⬜', '⬛', '🟫', '🟦', '🟩', '🟨', '🟧', '🟥', '🟪', '🌳', '🌲', '🌴', '🌵', '🌿', '🍀', '🍂', '🍃', '🍄',
            '🌊', '🌋', '🗻', '🏜️', '🏝️', '🏞️', '🛤️', '🛣️', '🌑', '🌕', '🌙', '☀️', '⭐', '☁️', '🌧️', '❄️', '🔥', '⚡', '🌌',
            // 건물/공간
            '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '🕌', '🕍', '⛩️', '🏟️', '⛺',
            '🚪', '🪟', '🛗', '🚽', '🚿', '🛀', '🛌', '🛋️', '🪑', '🕯️', '💡', '🔦', '🏮', '🪞',
            // 인물/생물
            '🚶', '🏃', '👤', '👥', '👮', '💂', '🕵️', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '👹', '👺', '🤡', '👾', '👽', '👻', '💀',
            '🐈', '🐕', '🐎', '🐂', '🐑', '🐘', '🐉', '🐍', '🦅', '🦈', '🦀', '🐜', '🕷️', '🦋',
            // 사물/아이템
            '🗝️', '🔑', '💎', '💰', '🪙', '🛡️', '⚔️', '🏹', '🔫', '💣', '🧪', '💊', '🩹', '🩺', '🔭', '🔬', '📡', '🔋',
            '⏰', '⌛', '⏳', '📜', '📖', '✉️', '📦', '🎁', '🎈',
            // 교통/이동
            '🚗', '🚑', '🚓', '🚕', '🚌', '🚒', '🚚', '🚜', '🚲', '🛵', '🚂', '🚆', '🚀', '🛸', '🚁', '✈️', '🚢', '⚓', '🏁',
            // 심볼/화살표
            '⚠️', '🚫', '⛔', '⭕', '❌', '❓', '❗', '🛑', '🎯', '🚩', '📍', '📌', '🔗', '📎', '⚙️', '🛠️', '⛏️', '⚒️', '🔩',
            '⬅️', '➡️', '⬆️', '⬇️', '↖️', '↗️', '↙️', '↘️', '↔️', '↕️', '↩️', '↪️', '⤴️', '⤵️', '🔄', '🔃'
        ];
        this.loadPalette();

        this.init();
    }

    init() {
        // 1. 기본 크기로 그리드 구조를 먼저 생성
        this.createGrid(this.width, this.height);

        // 2. 로컬 스토리지에서 데이터 로드 시도
        const savedData = localStorage.getItem('ascii-studio-save');
        if (savedData) {
            try {
                this.restoreState(savedData);
            } catch (e) {
                console.error("저장된 데이터를 불러오는 중 오류 발생:", e);
                localStorage.removeItem('ascii-studio-save');
            }
        }
        
        this.renderPalette();
        this.setupEventListeners();
        this.saveToHistory(false); 
        this.onConfirmAction = null;
    }

    showConfirm(title, message, okText, action) {
        this.onConfirmAction = action;
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('confirm-ok').textContent = okText;
        document.getElementById('confirm-modal').style.display = 'flex';
        lucide.createIcons();
    }

    createGrid(w, h) {
        this.width = w;
        this.height = h;
        const gridElement = document.getElementById('map-grid');
        gridElement.style.gridTemplateColumns = `repeat(${w}, 24px)`;
        gridElement.style.gridTemplateRows = `repeat(${h}, 24px)`;
        gridElement.innerHTML = '';

        this.grid = Array(h).fill().map(() => Array(w).fill(' '));
        this.cellElements = Array(h).fill().map(() => Array(w).fill(null));

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.textContent = ' ';

                cell.addEventListener('mousedown', (e) => this.handleCellDown(e, x, y));
                cell.addEventListener('mouseenter', (e) => this.handleCellEnter(e, x, y));

                gridElement.appendChild(cell);
                this.cellElements[y][x] = cell;
            }
        }
    }

    renderPalette() {
        const palette = document.getElementById('char-palette');
        palette.innerHTML = '';
        this.paletteChars.forEach((item, index) => {
            const tile = document.createElement('div');
            tile.className = `palette-item ${item.char === this.currentChar ? 'active' : ''}`;

            tile.innerHTML = `
                <div class="char-info" style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <div class="emoji-preview">${item.emoji || ''}</div>
                    <div class="char-preview">${item.char}</div>
                    <div class="char-label">${item.label}</div>
                </div>
                <div class="item-actions">
                    <button class="btn-item-action edit" title="수정"><i data-lucide="edit-2"></i></button>
                    <button class="btn-item-action delete" title="삭제"><i data-lucide="trash-2"></i></button>
                </div>
            `;

            // 타일 선택
            tile.querySelector('.char-info').addEventListener('click', () => {
                document.querySelectorAll('.palette-item').forEach(t => t.classList.remove('active'));
                tile.classList.add('active');
                this.currentChar = item.char;
                this.setTool('brush');
            });

            // 수정 버튼
            tile.querySelector('.edit').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditModal(index);
            });

            // 삭제 버튼
            tile.querySelector('.delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deletePaletteTile(index);
            });

            palette.appendChild(tile);
        });

        if (!this.paletteChars.find(p => p.char === this.currentChar) && this.paletteChars.length > 0) {
            this.currentChar = this.paletteChars[0].char;
        }

        lucide.createIcons();
    }

    loadPalette() {
        const saved = localStorage.getItem('ascii-palette');
        if (saved) {
            try {
                this.paletteChars = JSON.parse(saved);
            } catch (e) {
                this.paletteChars = [...this.defaultPalette];
            }
        }
    }

    savePalette() {
        localStorage.setItem('ascii-palette', JSON.stringify(this.paletteChars));
        this.renderPalette();
    }

    openEditModal(index = null) {
        this.editingTileIndex = index;
        const title = document.getElementById('tile-modal-title');
        const charInput = document.getElementById('edit-tile-char');
        const labelInput = document.getElementById('edit-tile-label');
        const useEmojiCheck = document.getElementById('use-emoji-check');
        const emojiArea = document.getElementById('emoji-selection-area');
        const selectedEmojiInput = document.getElementById('selected-emoji');

        // 이모지 피커 초기화
        this.renderEmojiPicker();

        if (index !== null) {
            const tile = this.paletteChars[index];
            title.textContent = '타일 수정';
            charInput.value = tile.char;
            labelInput.value = tile.label;
            charInput.dataset.originalChar = tile.char; // 전역 변환을 위해 보관

            if (tile.emoji) {
                useEmojiCheck.checked = true;
                emojiArea.style.display = 'flex';
                selectedEmojiInput.value = tile.emoji;
                this.highlightSelectedEmoji(tile.emoji);
            } else {
                useEmojiCheck.checked = false;
                emojiArea.style.display = 'none';
                selectedEmojiInput.value = '';
            }
        } else {
            title.textContent = '새 타일 추가';
            charInput.value = '';
            labelInput.value = '';
            delete charInput.dataset.originalChar;
            useEmojiCheck.checked = false;
            emojiArea.style.display = 'none';
            selectedEmojiInput.value = '';
        }

        document.getElementById('palette-modal').style.display = 'flex';
        charInput.focus();
    }

    renderEmojiPicker() {
        const picker = document.getElementById('emoji-picker-list');
        picker.innerHTML = '';
        const selectedEmojiInput = document.getElementById('selected-emoji');

        this.emojiList.forEach(emoji => {
            const btn = document.createElement('div');
            btn.className = 'emoji-btn';
            btn.textContent = emoji;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedEmojiInput.value = emoji;
            });
            picker.appendChild(btn);
        });
    }

    highlightSelectedEmoji(emoji) {
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            if (btn.textContent === emoji) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    showAlert(message) {
        document.getElementById('alert-message').textContent = message;
        document.getElementById('alert-modal').style.display = 'flex';
        lucide.createIcons();
    }

    saveTileChanges() {
        const charInput = document.getElementById('edit-tile-char');
        const labelInput = document.getElementById('edit-tile-label');
        const useEmojiCheck = document.getElementById('use-emoji-check');
        const selectedEmojiInput = document.getElementById('selected-emoji');

        const newChar = charInput.value || ' ';
        const newLabel = labelInput.value || 'Unnamed';
        const newEmoji = useEmojiCheck.checked ? selectedEmojiInput.value : null;

        if (useEmojiCheck.checked && !newEmoji) {
            this.showAlert('사용할 이모지를 선택해 주세요.');
            return;
        }

        // 중복 체크
        const isDuplicate = this.paletteChars.some((p, i) => p.char === newChar && i !== this.editingTileIndex);
        if (isDuplicate) {
            this.showAlert(`이미 '${newChar}' 문자를 사용하는 타일이 존재합니다. 다른 문자를 사용해 주세요.`);
            return;
        }

        const tileData = { char: newChar, label: newLabel, emoji: newEmoji };

        if (this.editingTileIndex !== null) {
            const oldChar = charInput.dataset.originalChar;

            // 그리드 일괄 변환 (문자가 바뀐 경우)
            if (oldChar && oldChar !== newChar) {
                this.replaceCharOnGrid(oldChar, newChar);
            }

            this.paletteChars[this.editingTileIndex] = tileData;
            this.refreshGridDisplay();
        } else {
            this.paletteChars.push(tileData);
        }

        this.savePalette();
        document.getElementById('palette-modal').style.display = 'none';
    }

    refreshGridDisplay() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.updateCell(x, y, this.grid[y][x]);
            }
        }
    }

    deletePaletteTile(index) {
        if (this.paletteChars.length <= 1) {
            this.showAlert('최소 하나 이상의 타일이 필요합니다.');
            return;
        }

        const tile = this.paletteChars[index];
        this.showConfirm(
            '타일 삭제',
            `'${tile.label}' 타일을 삭제하시겠습니까?\n(맵에 그려진 데이터는 유지됩니다)`,
            '삭제 실행',
            () => {
                this.paletteChars.splice(index, 1);
                this.savePalette();
            }
        );
    }

    replaceCharOnGrid(oldChar, newChar) {
        let gridChanged = false;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === oldChar) {
                    this.updateCell(x, y, newChar);
                    gridChanged = true;
                }
            }
        }
        if (gridChanged) {
            this.saveToHistory();
        }
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    }

    handleCellDown(e, x, y) {
        this.isDrawing = true;
        this.applyTool(x, y);
    }

    handleCellEnter(e, x, y) {
        if (this.isDrawing && (this.currentTool === 'brush' || this.currentTool === 'eraser')) {
            this.applyTool(x, y);
        }
    }

    applyTool(x, y) {
        if (this.currentTool === 'brush') {
            this.updateCell(x, y, this.currentChar);
        } else if (this.currentTool === 'eraser') {
            this.updateCell(x, y, ' ');
        } else if (this.currentTool === 'fill') {
            this.floodFill(x, y, this.grid[y][x], this.currentChar);
            this.saveToHistory();
        }
    }

    updateCell(x, y, char) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

        this.grid[y][x] = char;
        const cell = this.cellElements[y][x];

        // 이모지 매핑 확인
        const tileInfo = this.paletteChars.find(p => p.char === char);
        if (tileInfo && tileInfo.emoji) {
            cell.textContent = tileInfo.emoji;
            cell.classList.add('active-val');
        } else {
            cell.textContent = char;
            if (char !== ' ') {
                cell.classList.add('active-val');
            } else {
                cell.classList.remove('active-val');
            }
        }
    }

    floodFill(x, y, targetVal, newVal) {
        if (targetVal === newVal) return;
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        if (this.grid[y][x] !== targetVal) return;

        this.updateCell(x, y, newVal);

        this.floodFill(x + 1, y, targetVal, newVal);
        this.floodFill(x - 1, y, targetVal, newVal);
        this.floodFill(x, y + 1, targetVal, newVal);
        this.floodFill(x, y - 1, targetVal, newVal);
    }

    saveToHistory(shouldSaveStorage = true) {
        const state = JSON.stringify(this.grid);
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(state);
        
        if (this.history.length > 50) this.history.shift();
        else this.historyIndex++;

        // 로컬 스토리지에 자동 저장
        if (shouldSaveStorage) {
            localStorage.setItem('ascii-studio-save', state);
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    restoreState(stateStr) {
        const state = JSON.parse(stateStr);
        if (state.length !== this.height || state[0].length !== this.width) {
            this.createGrid(state[0].length, state.length);
        }
        this.grid = state;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.updateCell(x, y, this.grid[y][x]);
            }
        }
    }

    exportToAscii() {
        // 각 줄을 합치기 전에 원본 너비만큼 공백을 채워 넣음 (트리밍 방지)
        const mapLines = this.grid.map(row => row.join(''));
        const asciiMap = mapLines.join('\n');

        // 사용된 캐릭터 추출 (공백 제외)
        const usedChars = new Set();
        this.grid.forEach(row => row.forEach(char => {
            if (char !== ' ') usedChars.add(char);
        }));

        // 범례(Legend) 생성
        let legend = "/* TILE Editor\n";
        usedChars.forEach(char => {
            const info = this.paletteChars.find(p => p.char === char);
            const label = info ? info.label : 'Unknown';
            const emojiStr = (info && info.emoji) ? `(${info.emoji}) ` : '';
            legend += `${char} : ${emojiStr}${label}\n`;
        });
        legend += "*/\n\n";

        return legend + asciiMap;
    }

    importFromAscii(text) {
        if (!text) return;

        // 1. /* */ 블록 주석 제거
        let cleanText = text.replace(/\/\*[\s\S]*?\*\//g, '');

        // 2. 줄 단위 분리 및 // 주석 제거
        let rawLines = cleanText.split('\n')
            .map(line => line.replace(/\r/g, '')) // Windows 개행 처리
            .filter(line => !line.trim().startsWith('//'));

        // 3. 상단/하단 의미 없는 빈 줄만 제거 (데이터 사이의 빈 줄은 유지)
        while (rawLines.length > 0 && rawLines[0].trim() === '') rawLines.shift();
        while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') rawLines.pop();

        if (rawLines.length === 0) return;

        // 4. 최대 너비 계산
        const h = rawLines.length;
        const w = Math.max(...rawLines.map(l => l.length));

        // 5. 그리드 재생성 및 데이터 삽입
        this.createGrid(w, h);

        // 입력값 적용 시 너비 동기화 (짧은 줄은 공백 처리)
        for (let y = 0; y < h; y++) {
            const line = rawLines[y];
            for (let x = 0; x < w; x++) {
                const char = line[x] || ' ';
                this.updateCell(x, y, char);
            }
        }

        // 설정 입력창 값 업데이트
        document.getElementById('grid-w').value = w;
        document.getElementById('grid-h').value = h;

        this.saveToHistory();
    }

    setupEventListeners() {
        window.addEventListener('mouseup', () => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.saveToHistory();
            }
        });

        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => this.setTool(btn.dataset.tool));
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.showConfirm(
                '맵 초기화',
                '작성 중인 모든 맵 데이터가 사라집니다.\n정말 초기화할까요?',
                '초기화',
                () => {
                    for (let y = 0; y < this.height; y++) {
                        for (let x = 0; x < this.width; x++) {
                            this.updateCell(x, y, ' ');
                        }
                    }
                    this.saveToHistory();
                }
            );
        });

        document.getElementById('resize-btn').addEventListener('click', () => {
            const w = parseInt(document.getElementById('grid-w').value);
            const h = parseInt(document.getElementById('grid-h').value);

            if (w > 0 && h > 0) {
                this.showConfirm(
                    '그리드 크기 변경',
                    '크기를 변경하면 작성 중인 맵 데이터가 모두 초기화됩니다.\n정말 변경하시겠습니까?',
                    '변경 실행',
                    () => {
                        this.createGrid(w, h);
                        this.saveToHistory();
                        this.checkResizeDisabled(); // 변경 후 다시 체크
                    }
                );
            }
        });

        // 입력 값 변경 시 버튼 활성/비활성 체크
        const inputs = [document.getElementById('grid-w'), document.getElementById('grid-h')];
        inputs.forEach(input => {
            input.addEventListener('input', () => this.checkResizeDisabled());
        });

        // 초기 상태 체크
        this.checkResizeDisabled();

        document.getElementById('export-btn').addEventListener('click', () => {
            const modal = document.getElementById('export-modal');
            const area = document.getElementById('export-area');
            area.value = this.exportToAscii();
            modal.style.display = 'flex';
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            const modal = document.getElementById('import-modal');
            document.getElementById('import-area').value = '';
            modal.style.display = 'flex';
        });

        document.getElementById('import-exec-btn').addEventListener('click', () => {
            const text = document.getElementById('import-area').value;
            if (text) {
                this.importFromAscii(text);
                document.getElementById('import-modal').style.display = 'none';
            }
        });

        document.getElementById('close-export-modal').addEventListener('click', () => {
            document.getElementById('export-modal').style.display = 'none';
        });

        document.getElementById('close-import-modal').addEventListener('click', () => {
            document.getElementById('import-modal').style.display = 'none';
        });

        document.getElementById('copy-btn').addEventListener('click', () => {
            const area = document.getElementById('export-area');
            area.select();
            document.execCommand('copy');
            const btn = document.getElementById('copy-btn');
            const originalText = btn.textContent;
            btn.textContent = '복사 완료!';
            setTimeout(() => btn.textContent = originalText, 2000);
        });

        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.redo());

        // Palette Modal
        document.getElementById('sidebar-add-tile-btn').addEventListener('click', () => this.openEditModal(null));
        document.getElementById('close-palette-modal').addEventListener('click', () => {
            document.getElementById('palette-modal').style.display = 'none';
        });
        document.getElementById('save-tile-btn').addEventListener('click', () => this.saveTileChanges());

        // Emoji Checkbox
        document.getElementById('use-emoji-check').addEventListener('change', (e) => {
            document.getElementById('emoji-selection-area').style.display = e.target.checked ? 'flex' : 'none';
        });

        // Alert Modal
        document.getElementById('alert-ok').addEventListener('click', () => {
            document.getElementById('alert-modal').style.display = 'none';
        });

        // Confirm Modal Handlers
        document.getElementById('confirm-ok').addEventListener('click', () => {
            if (this.onConfirmAction) this.onConfirmAction();
            document.getElementById('confirm-modal').style.display = 'none';
        });

        document.getElementById('confirm-cancel').addEventListener('click', () => {
            document.getElementById('confirm-modal').style.display = 'none';
        });

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
            if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
        });
    }

    checkResizeDisabled() {
        const wInput = document.getElementById('grid-w');
        const hInput = document.getElementById('grid-h');
        const btn = document.getElementById('resize-btn');
        if (!wInput || !hInput || !btn) return;

        const newW = parseInt(wInput.value);
        const newH = parseInt(hInput.value);

        if (newW === this.width && newH === this.height) {
            btn.disabled = true;
        } else {
            btn.disabled = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.editor = new AsciiEditor();
});
