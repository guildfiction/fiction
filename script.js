/**
 * GERENCIADOR DE CONTRIBUIÇÃO DE GUILDA - DDTANK (V3)
 * Com persistência forçada no LocalStorage e tratamento de erros.
 */

const STORAGE_KEY = 'ddtank_guild_manager_v3_db';

let state = {
    players: [],
    history: {}
};

let selectedDate = '';
let currentRankingMode = 'total'; // 'total', 'prev', 'week'

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// DOM Elements
const currentDateInput = document.getElementById('currentDate');
const statTotalPlayers = document.getElementById('statTotalPlayers');
const statTotalToday = document.getElementById('statTotalToday');
const statTotalWeek = document.getElementById('statTotalWeek');
const statAverage = document.getElementById('statAverage');
const statTopPlayer = document.getElementById('statTopPlayer');

const addPlayerForm = document.getElementById('addPlayerForm');
const playerNameInput = document.getElementById('playerNameInput');
const searchPlayerInput = document.getElementById('searchPlayerInput');

const mainTableBody = document.getElementById('mainTableBody');
const rankingTableBody = document.getElementById('rankingTableBody');

const btnExport = document.getElementById('btnExport');
const importFileInput = document.getElementById('importFile');
const btnResetDay = document.getElementById('btnResetDay');

const btnRankTotal = document.getElementById('btnRankTotal');
const btnRankPrev = document.getElementById('btnRankPrev');
const btnRankWeek = document.getElementById('btnRankWeek');

const playerModal = document.getElementById('playerModal');
const modalPlayerDetails = document.getElementById('modalPlayerDetails');
const closeModalBtn = document.querySelector('.close-modal');

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    if (currentDateInput) {
        currentDateInput.value = today;
    }
    selectedDate = today;

    // Carrega dados salvos antes de renderizar
    loadFromLocalStorage();

    if (currentDateInput) {
        currentDateInput.addEventListener('change', (e) => {
            selectedDate = e.target.value;
            renderApp();
        });
    }

    if (addPlayerForm) addPlayerForm.addEventListener('submit', handleAddPlayer);
    if (searchPlayerInput) searchPlayerInput.addEventListener('input', renderMainTable);

    if (btnExport) btnExport.addEventListener('click', exportDataToJSON);
    if (importFileInput) importFileInput.addEventListener('change', importDataFromJSON);
    if (btnResetDay) btnResetDay.addEventListener('click', handleResetDay);

    if (btnRankTotal) btnRankTotal.addEventListener('click', () => setRankingMode('total', btnRankTotal));
    if (btnRankPrev) btnRankPrev.addEventListener('click', () => setRankingMode('prev', btnRankPrev));
    if (btnRankWeek) btnRankWeek.addEventListener('click', () => setRankingMode('week', btnRankWeek));

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => playerModal.style.display = 'none');
    }
    window.addEventListener('click', (e) => {
        if (e.target === playerModal) playerModal.style.display = 'none';
    });

    renderApp();
});

function setRankingMode(mode, activeBtn) {
    currentRankingMode = mode;
    [btnRankTotal, btnRankPrev, btnRankWeek].forEach(btn => btn && btn.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
    renderRanking();
}

function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            if (parsed && Array.isArray(parsed.players)) {
                state = parsed;
            }
        }
    } catch (e) {
        console.error("Erro ao carregar dados do LocalStorage:", e);
    }
}

function saveToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Erro ao salvar no LocalStorage:", e);
        alert("Atenção: Seu navegador não permitiu salvar os dados localmente. Verifique se está em Modo Anônimo.");
    }
}

function getWeekDates(dateString) {
    const curr = new Date(dateString + 'T00:00:00');
    const dayOfWeek = curr.getDay();
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
        prevWeekHistory: {}
    };

    if (!state.players) state.players = [];
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

    if (confirm(`Excluir o jogador "${player.name}"?`)) {
        state.players = state.players.filter(p => p.id !== id);
        saveToLocalStorage();
        renderApp();
    }
}

function saveDailyInput(playerId, dateKey) {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    const inputEl = document.getElementById(`day_input_${playerId}_${dateKey}`);
    if (!inputEl) return;

    const newEnteredTotal = parseInt(inputEl.value) || 0;

    if (!player.dailyHistory) player.dailyHistory = {};
    if (!player.totalHistory) player.totalHistory = {};

    const previousTotal = player.contribTotal || 0;
    let calculatedDaily = newEnteredTotal - previousTotal;

    if (calculatedDaily < 0) calculatedDaily = 0;

    player.dailyHistory[dateKey] = calculatedDaily;
    player.totalHistory[dateKey] = newEnteredTotal;
    player.contribTotal = newEnteredTotal;

    saveToLocalStorage();
    renderApp();
}

function updateMainPlayerTotals(playerId) {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    const totEl = document.getElementById(`tot_${playerId}`);
    const prevEl = document.getElementById(`prev_${playerId}`);

    if (totEl) player.contribTotal = parseInt(totEl.value) || 0;
    if (prevEl) player.contribSemanaAnterior = parseInt(prevEl.value) || 0;

    saveToLocalStorage();
    renderApp();
}

function handleResetDay() {
    if (confirm(`Deseja zerar os registros da data ${selectedDate}?`)) {
        (state.players || []).forEach(p => {
            if (p.dailyHistory) delete p.dailyHistory[selectedDate];
        });
        saveToLocalStorage();
        renderApp();
    }
}

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
        mainTableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; color:var(--text-muted);">Nenhum jogador cadastrado. Clique em "Importar JSON".</td></tr>`;
        return;
    }

    filtered.forEach(player => {
        let weekTotalSum = 0;

        const weekInputsCells = weekDates.map(dateKey => {
            const dailyVal = player.dailyHistory ? (player.dailyHistory[dateKey] || 0) : 0;
            weekTotalSum += dailyVal;

            return `
                <td>
                    <div style="display:flex; flex-direction:column; gap:2px; align-items:center;">
                        <input type="number" class="input-sm" id="day_input_${player.id}_${dateKey}" placeholder="Novo Tot." style="width:75px;">
                        <button class="btn btn-primary btn-sm" onclick="saveDailyInput('${player.id}', '${dateKey}')" title="Calcular Dia">
                            <i class="fa-solid fa-check"></i>
                        </button>
                        <small style="color:var(--primary-gold); font-size:0.75rem;">+${dailyVal.toLocaleString()}</small>
                    </div>
                </td>
            `;
        }).join('');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="player-link" onclick="openPlayerSummary('${player.id}')">${escapeHTML(player.name)}</span>
            </td>
            <td>
                <input type="number" class="input-sm" id="tot_${player.id}" value="${player.contribTotal || 0}" onchange="updateMainPlayerTotals('${player.id}')">
            </td>
            <td>
                <input type="number" class="input-sm" id="prev_${player.id}" value="${player.contribSemanaAnterior || 0}" onchange="updateMainPlayerTotals('${player.id}')">
            </td>
            ${weekInputsCells}
            <td class="col-highlight"><strong>${weekTotalSum.toLocaleString()}</strong></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editPlayer('${player.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deletePlayer('${player.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        mainTableBody.appendChild(tr);
    });
}

function renderRanking() {
    if (!rankingTableBody) return;
    rankingTableBody.innerHTML = '';
    const weekDates = getWeekDates(selectedDate);

    const rankingData = (state.players || []).map(player => {
        let rankValue = 0;

        if (currentRankingMode === 'total') {
            rankValue = player.contribTotal || 0;
        } else if (currentRankingMode === 'prev') {
            rankValue = player.contribSemanaAnterior || 0;
        } else if (currentRankingMode === 'week') {
            rankValue = weekDates.reduce((acc, d) => acc + (player.dailyHistory ? (player.dailyHistory[d] || 0) : 0), 0);
        }

        return {
            id: player.id,
            name: player.name,
            total: player.contribTotal || 0,
            prevWeek: player.contribSemanaAnterior || 0,
            rankValue: rankValue
        };
    });

    rankingData.sort((a, b) => b.rankValue - a.rankValue);

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
            <td style="color:var(--primary-gold); font-weight:bold;">${item.rankValue.toLocaleString()}</td>
        `;
        rankingTableBody.appendChild(tr);
    });
}

function renderStats() {
    const playersList = state.players || [];
    if (statTotalPlayers) statTotalPlayers.textContent = playersList.length;

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
    if (statAverage) statAverage.textContent = playersList.length > 0 ? (totalToday / playersList.length).toFixed(1) : 0;
    if (statTopPlayer) statTopPlayer.textContent = topPlayerWeek.score > 0 ? `${topPlayerWeek.name} (${topPlayerWeek.score.toLocaleString()})` : '-';
}

function openPlayerSummary(playerId) {
    const player = (state.players || []).find(p => p.id === playerId);
    if (!player) return;

    const weekDates = getWeekDates(selectedDate);
    let weekSum = 0;

    const historyItems = weekDates.map(dateKey => {
        const val = player.dailyHistory ? (player.dailyHistory[dateKey] || 0) : 0;
        weekSum += val;
        const dayName = WEEKDAYS[new Date(dateKey + 'T00:00:00').getDay()];
        return `<li><span>${dayName} (${dateKey}):</span> <strong>+${val.toLocaleString()}</strong></li>`;
    }).join('');

    modalPlayerDetails.innerHTML = `
        <h3 class="modal-player-title">${escapeHTML(player.name)}</h3>
        <ul class="modal-summary-list">
            <li><span>Contribuição Total:</span> <strong>${(player.contribTotal || 0).toLocaleString()}</strong></li>
            <li><span>Semana Anterior:</span> <strong>${(player.contribSemanaAnterior || 0).toLocaleString()}</strong></li>
            <li><span>Acumulado da Semana:</span> <strong style="color:var(--primary-gold);">${weekSum.toLocaleString()}</strong></li>
        </ul>
        <h4 style="color:var(--accent-blue); margin-bottom:0.5rem;">Histórico da Semana</h4>
        <ul class="modal-summary-list">${historyItems}</ul>
    `;

    playerModal.style.display = 'flex';
}

function exportDataToJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ddtank_guild_v3_backup_${selectedDate}.json`);
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
            let playersToImport = Array.isArray(importedData) ? importedData : (importedData.players || []);

            if (playersToImport.length > 0) {
                if (confirm(`Importar ${playersToImport.length} jogadores?`)) {
                    state = {
                        players: playersToImport,
                        history: importedData.history || {}
                    };
                    saveToLocalStorage(); // Salva IMEDIATAMENTE no navegador
                    renderApp();
                    alert("Dados importados e salvos no navegador com sucesso!");
                }
            } else {
                alert("Nenhum jogador encontrado no arquivo.");
            }
        } catch (error) {
            alert("Erro ao ler o arquivo JSON.");
        }
        // Limpa o input do arquivo para permitir reimportações
        e.target.value = '';
    };
    fileReader.readAsText(file);
}

function escapeHTML(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}
