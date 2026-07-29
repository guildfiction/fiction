/**
 * GERENCIADOR DE CONTRIBUIÇÃO DE GUILDA - DDTANK (V2)
 * Controle automatizado de Contribuição Total, Semana Anterior e Histórico Semanal.
 */

const STORAGE_KEY = 'ddtank_guild_manager_v2_db';

// Estrutura de Estado Global
let state = {
    players: []
};

let selectedDate = '';
let currentRankingMode = 'day'; // 'day' ou 'week'

// Mapeamento dos dias da semana em português
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Elementos do DOM
const currentDateInput = document.getElementById('currentDate');
const statTotalPlayers = document.getElementById('statTotalPlayers');
const statTotalToday = document.getElementById('statTotalToday');
const statTotalWeek = document.getElementById('statTotalWeek');
const statAverage = document.getElementById('statAverage');
const statMinMax = document.getElementById('statMinMax');
const statTopPlayer = document.getElementById('statTopPlayer');

const addPlayerForm = document.getElementById('addPlayerForm');
const playerNameInput = document.getElementById('playerNameInput');
const searchPlayerInput = document.getElementById('searchPlayerInput');

const mainTableBody = document.getElementById('mainTableBody');
const rankingTableBody = document.getElementById('rankingTableBody');

const btnExport = document.getElementById('btnExport');
const importFileInput = document.getElementById('importFile');
const btnResetDay = document.getElementById('btnResetDay');

const btnRankDay = document.getElementById('btnRankDay');
const btnRankWeek = document.getElementById('btnRankWeek');

const playerModal = document.getElementById('playerModal');
const modalPlayerDetails = document.getElementById('modalPlayerDetails');
const closeModalBtn = document.querySelector('.close-modal');

/* ==========================================================================
   INICIALIZAÇÃO DA APLICAÇÃO
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    currentDateInput.value = today;
    selectedDate = today;

    loadFromLocalStorage();

    // Event Listeners
    currentDateInput.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        renderApp();
    });

    addPlayerForm.addEventListener('submit', handleAddPlayer);
    searchPlayerInput.addEventListener('input', renderMainTable);

    btnExport.addEventListener('click', exportDataToJSON);
    importFileInput.addEventListener('change', importDataFromJSON);
    btnResetDay.addEventListener('click', handleResetDay);

    btnRankDay.addEventListener('click', () => {
        currentRankingMode = 'day';
        btnRankDay.classList.add('active');
        btnRankWeek.classList.remove('active');
        renderRanking();
    });

    btnRankWeek.addEventListener('click', () => {
        currentRankingMode = 'week';
        btnRankWeek.classList.add('active');
        btnRankDay.classList.remove('active');
        renderRanking();
    });

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            playerModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === playerModal) playerModal.style.display = 'none';
    });

    renderApp();
});

/* ==========================================================================
   PERSISTÊNCIA (LOCALSTORAGE)
   ========================================================================== */
function loadFromLocalStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            state = JSON.parse(data);
        } catch (e) {
            console.error("Erro ao carregar dados:", e);
            state = { players: [] };
        }
    } else {
        // Tenta migrar da versão 1 se existir
        const oldData = localStorage.getItem('ddtank_guild_manager_db');
        if (oldData) {
            try {
                const parsedOld = JSON.parse(oldData);
                if (parsedOld.players) {
                    state.players = parsedOld.players.map(p => ({
                        id: p.id,
                        name: p.name,
                        contribTotal: 0,
                        contribSemanaAnterior: 0,
                        dailyHistory: {},
                        totalHistory: {},
                        prevWeekHistory: {},
                        lastUpdated: new Date().toISOString()
                    }));
                }
            } catch (err) {
                state = { players: [] };
            }
        }
    }
}

function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ==========================================================================
   CÁLCULOS E MANIPULAÇÃO DE DATAS
   ========================================================================== */

// Retorna os 7 dias da semana corrente (Segunda a Domingo) da data selecionada
function getWeekDates(dateString) {
    const curr = new Date(dateString + 'T00:00:00');
    const dayOfWeek = curr.getDay(); // 0: Dom, 1: Seg...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(d.toISOString().split('T')[0]);
    }
    return weekDates;
}

function getPreviousDateString(dateString) {
    const d = new Date(dateString + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

/* ==========================================================================
   AÇÕES DO USUÁRIO
   ========================================================================== */
function handleAddPlayer(e) {
    e.preventDefault();
    const name = playerNameInput.value.trim();
    if (!name) return;

    const newPlayer = {
        id: 'p_' + Date.now(),
        name: name,
        contribTotal: 0,
        contribSemanaAnterior: 0,
        dailyHistory: {},
        totalHistory: {},
        prevWeekHistory: {},
        lastUpdated: new Date().toISOString()
    };

    state.players.push(newPlayer);
    saveToLocalStorage();

    playerNameInput.value = '';
    renderApp();
}

function editPlayer(id) {
    const player = state.players.find(p => p.id === id);
    if (!player) return;

    const newName = prompt("Edite o nome do jogador:", player.name);
    if (newName && newName.trim() !== "") {
        player.name = newName.trim();
        saveToLocalStorage();
        renderApp();
    }
}

function deletePlayer(id) {
    const player = state.players.find(p => p.id === id);
    if (!player) return;

    if (confirm(`Tem certeza que deseja excluir o jogador "${player.name}"?`)) {
        state.players = state.players.filter(p => p.id !== id);
        saveToLocalStorage();
        renderApp();
    }
}

function updatePlayerValues(playerId, newTotalInput, newPrevWeekInput) {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    const newTotal = parseInt(newTotalInput.value) || 0;
    const newPrevWeek = parseInt(newPrevWeekInput.value) || 0;

    if (!player.totalHistory) player.totalHistory = {};
    if (!player.dailyHistory) player.dailyHistory = {};
    if (!player.prevWeekHistory) player.prevWeekHistory = {};

    player.contribTotal = newTotal;
    player.contribSemanaAnterior = newPrevWeek;
    player.totalHistory[selectedDate] = newTotal;
    player.prevWeekHistory[selectedDate] = newPrevWeek;

    // CÁLCULO DA CONTRIBUIÇÃO DIÁRIA
    const prevDate = getPreviousDateString(selectedDate);
    const prevTotal = player.totalHistory[prevDate];

    let dailyValue = 0;
    if (prevTotal !== undefined) {
        dailyValue = newTotal - prevTotal;
        if (dailyValue < 0) dailyValue = 0;
    } else {
        dailyValue = newTotal;
    }

    player.dailyHistory[selectedDate] = dailyValue;
    player.lastUpdated = new Date().toISOString();

    saveToLocalStorage();
    renderApp();
}

function handleResetDay() {
    if (confirm(`Deseja apagar os registros da data ${selectedDate}?`)) {
        state.players.forEach(p => {
            if (p.dailyHistory) delete p.dailyHistory[selectedDate];
            if (p.totalHistory) delete p.totalHistory[selectedDate];
            if (p.prevWeekHistory) delete p.prevWeekHistory[selectedDate];
        });
        saveToLocalStorage();
        renderApp();
    }
}

/* ==========================================================================
   RENDERIZAÇÃO
   ========================================================================== */
function renderApp() {
    renderMainTable();
    renderRanking();
    renderStats();
}

function renderMainTable() {
    if (!mainTableBody) return;
    mainTableBody.innerHTML = '';
    const filter = searchPlayerInput ? searchPlayerInput.value.toLowerCase().trim() : '';
    const weekDates = getWeekDates(selectedDate);

    const filtered = (state.players || []).filter(p => p.name.toLowerCase().includes(filter));

    if (filtered.length === 0) {
        mainTableBody.innerHTML = `<tr><td colspan="13" style="text-align:center; color:var(--text-muted);">Nenhum jogador encontrado.</td></tr>`;
        return;
    }

    filtered.forEach(player => {
        const totalToday = player.totalHistory ? (player.totalHistory[selectedDate] ?? '') : (player.contribTotal ?? '');
        const prevWeek = player.prevWeekHistory ? (player.prevWeekHistory[selectedDate] ?? '') : (player.contribSemanaAnterior ?? '');
        const dailyToday = player.dailyHistory ? (player.dailyHistory[selectedDate] ?? 0) : 0;

        let weekTotalSum = 0;
        const weekCells = weekDates.map(dateKey => {
            const val = player.dailyHistory ? (player.dailyHistory[dateKey] || 0) : 0;
            weekTotalSum += val;
            return `<td>${val > 0 ? val.toLocaleString() : '-'}</td>`;
        }).join('');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="player-link" onclick="openPlayerSummary('${player.id}')">${escapeHTML(player.name)}</span>
            </td>
            <td>
                <input type="number" class="input-sm" id="tot_${player.id}" value="${totalToday}" placeholder="Total">
            </td>
            <td>
                <input type="number" class="input-sm" id="prev_${player.id}" value="${prevWeek}" placeholder="Sem. Ant.">
            </td>
            <td class="col-highlight">
                <strong>${dailyToday.toLocaleString()}</strong>
                <button class="btn btn-primary btn-sm" onclick="saveRow('${player.id}')" title="Salvar e Calcular">
                    <i class="fa-solid fa-floppy-disk"></i>
                </button>
            </td>
            ${weekCells}
            <td class="col-highlight"><strong>${weekTotalSum.toLocaleString()}</strong></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editPlayer('${player.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deletePlayer('${player.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        mainTableBody.appendChild(tr);
    });
}

function saveRow(playerId) {
    const totalEl = document.getElementById(`tot_${playerId}`);
    const prevEl = document.getElementById(`prev_${playerId}`);
    updatePlayerValues(playerId, totalEl, prevEl);
}

function renderRanking() {
    if (!rankingTableBody) return;
    rankingTableBody.innerHTML = '';
    const weekDates = getWeekDates(selectedDate);

    const rankingData = (state.players || []).map(player => {
        let contrib = 0;
        if (currentRankingMode === 'day') {
            contrib = player.dailyHistory ? (player.dailyHistory[selectedDate] || 0) : 0;
        } else {
            contrib = weekDates.reduce((acc, d) => acc + (player.dailyHistory ? (player.dailyHistory[d] || 0) : 0), 0);
        }

        return {
            id: player.id,
            name: player.name,
            total: player.contribTotal || 0,
            prevWeek: player.contribSemanaAnterior || 0,
            filteredContrib: contrib
        };
    });

    rankingData.sort((a, b) => b.filteredContrib - a.filteredContrib);

    if (rankingData.length === 0) {
        rankingTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Sem dados para o ranking.</td></tr>`;
        return;
    }

    rankingData.forEach((item, index) => {
        const pos = index + 1;
        let posDisplay = pos;
        if (pos === 1) posDisplay = '<span class="medal">🥇</span>';
        else if (pos === 2) posDisplay = '<span class="medal">🥈</span>';
        else if (pos === 3) posDisplay = '<span class="medal">🥉</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${posDisplay}</strong></td>
            <td><span class="player-link" onclick="openPlayerSummary('${item.id}')">${escapeHTML(item.name)}</span></td>
            <td>${item.total.toLocaleString()}</td>
            <td>${item.prevWeek.toLocaleString()}</td>
            <td style="color:var(--primary-gold); font-weight:bold;">${item.filteredContrib.toLocaleString()}</td>
        `;
        rankingTableBody.appendChild(tr);
    });
}

function renderStats() {
    const playersList = state.players || [];
    const totalPlayers = playersList.length;
    if (statTotalPlayers) statTotalPlayers.textContent = totalPlayers;

    const weekDates = getWeekDates(selectedDate);

    const todayDailyValues = playersList.map(p => p.dailyHistory ? (p.dailyHistory[selectedDate] || 0) : 0);
    const totalToday = todayDailyValues.reduce((a, b) => a + b, 0);
    if (statTotalToday) statTotalToday.textContent = totalToday.toLocaleString();

    let weekTotalSum = 0;
    let topPlayerWeek = { name: '-', score: -1 };

    playersList.forEach(p => {
        const pWeekSum = weekDates.reduce((acc, d) => acc + (p.dailyHistory ? (p.dailyHistory[d] || 0) : 0), 0);
        weekTotalSum += pWeekSum;

        if (pWeekSum > topPlayerWeek.score) {
            topPlayerWeek = { name: p.name, score: pWeekSum };
        }
    });

    if (statTotalWeek) statTotalWeek.textContent = weekTotalSum.toLocaleString();

    const avg = totalPlayers > 0 ? (totalToday / totalPlayers).toFixed(1) : 0;
    if (statAverage) statAverage.textContent = avg;

    if (totalPlayers > 0) {
        const max = Math.max(...todayDailyValues);
        const min = Math.min(...todayDailyValues);
        if (statMinMax) statMinMax.textContent = `${max.toLocaleString()} / ${min.toLocaleString()}`;
    } else {
        if (statMinMax) statMinMax.textContent = '0 / 0';
    }

    if (statTopPlayer) {
        statTopPlayer.textContent = topPlayerWeek.score > 0 ? `${topPlayerWeek.name} (${topPlayerWeek.score.toLocaleString()})` : '-';
    }
}

/* ==========================================================================
   RESUMO E MODAL DO JOGADOR
   ========================================================================== */
function openPlayerSummary(playerId) {
    const player = (state.players || []).find(p => p.id === playerId);
    if (!player) return;

    const weekDates = getWeekDates(selectedDate);
    let weekSum = 0;

    const historyItems = weekDates.map(dateKey => {
        const val = player.dailyHistory ? (player.dailyHistory[dateKey] || 0) : 0;
        weekSum += val;

        const dateObj = new Date(dateKey + 'T00:00:00');
        const dayName = WEEKDAYS[dateObj.getDay()];

        return `<li><span>${dayName} (${dateKey}):</span> <strong>${val.toLocaleString()}</strong></li>`;
    }).join('');

    modalPlayerDetails.innerHTML = `
        <h3 class="modal-player-title">${escapeHTML(player.name)}</h3>
        <ul class="modal-summary-list">
            <li><span>Contribuição Total:</span> <strong>${(player.contribTotal || 0).toLocaleString()}</strong></li>
            <li><span>Semana Anterior:</span> <strong>${(player.contribSemanaAnterior || 0).toLocaleString()}</strong></li>
            <li><span>Acumulado da Semana:</span> <strong style="color:var(--primary-gold);">${weekSum.toLocaleString()}</strong></li>
        </ul>
        <h4 style="color:var(--accent-blue); margin-bottom:0.5rem;">Histórico da Semana</h4>
        <ul class="modal-summary-list">
            ${historyItems}
        </ul>
    `;

    playerModal.style.display = 'flex';
}

/* ==========================================================================
   BACKUP (EXPORTAR / IMPORTAR COM SUPORTE DIVERSOS FORMATOS)
   ========================================================================== */
function exportDataToJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ddtank_guild_v2_backup_${selectedDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importDataFromJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = function (event) {
        try {
            const importedData = JSON.parse(event.target.result);
            let playersToImport = [];

            if (Array.isArray(importedData)) {
                playersToImport = importedData;
            } else if (importedData && Array.isArray(importedData.players)) {
                playersToImport = importedData.players;
            }

            if (playersToImport.length > 0) {
                if (confirm(`Deseja importar ${playersToImport.length} jogadores? Isso atualizará o banco de dados atual.`)) {
                    state = {
                        players: playersToImport,
                        history: importedData.history || {}
                    };
                    saveToLocalStorage();
                    renderApp();
                    alert("Dados importados com sucesso!");
                }
            } else {
                alert("Nenhum dado válido de jogadores foi encontrado no arquivo.");
            }
        } catch (error) {
            console.error("Erro ao importar JSON:", error);
            alert("Ocorreu um erro ao ler o arquivo JSON.");
        }
    };
    fileReader.readAsText(file);
}

/* ==========================================================================
   UTILITÁRIOS
   ========================================================================== */
function escapeHTML(str) {
    return (str || '').replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
