/**
 * GERENCIADOR DE CONTRIBUIÇÃO DE GUILDA - DDTANK
 * Lógica principal utilizando LocalStorage e JavaScript puro.
 */

// Key principal do LocalStorage
const STORAGE_KEY = 'ddtank_guild_manager_db';

// Estrutura do Estado Global
let state = {
    players: [], // Lista de objetos: { id: string, name: string }
    history: {}  // Objeto onde cada chave é uma data 'YYYY-MM-DD' contendo { playerId: valorContrib }
};

// Referência à Data Selecionada
let selectedDate = '';

// Elementos do DOM
const currentDateInput = document.getElementById('currentDate');
const statTotalPlayers = document.getElementById('statTotalPlayers');
const statTotalToday = document.getElementById('statTotalToday');
const statAverage = document.getElementById('statAverage');
const statMinMax = document.getElementById('statMinMax');

const addPlayerForm = document.getElementById('addPlayerForm');
const playerNameInput = document.getElementById('playerNameInput');
const searchPlayerInput = document.getElementById('searchPlayerInput');
const playersTableBody = document.getElementById('playersTableBody');
const rankingTableBody = document.getElementById('rankingTableBody');

const btnExport = document.getElementById('btnExport');
const importFileInput = document.getElementById('importFile');
const btnResetDay = document.getElementById('btnResetDay');

/* ==========================================================================
   INICIALIZAÇÃO DA APLICAÇÃO
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Configura a data inicial para a data local atual (Formato YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    currentDateInput.value = today;
    selectedDate = today;

    // Carrega os dados do LocalStorage
    loadFromLocalStorage();

    // Event Listeners
    currentDateInput.addEventListener('change', handleDateChange);
    addPlayerForm.addEventListener('submit', handleAddPlayer);
    searchPlayerInput.addEventListener('input', renderPlayersList);
    btnResetDay.addEventListener('click', handleResetDay);
    btnExport.addEventListener('click', exportDataToJSON);
    importFileInput.addEventListener('change', importDataFromJSON);

    // Renderização inicial
    renderApp();
});

/* ==========================================================================
   GERENCIAMENTO DE LOCALSTORAGE
   ========================================================================== */
function loadFromLocalStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            state = JSON.parse(data);
        } catch (e) {
            console.error("Erro ao carregar dados do LocalStorage", e);
            state = { players: [], history: {} };
        }
    }
}

function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ==========================================================================
   MANDOS DE ESTADO E EVENTOS DE INTERAÇÃO
   ========================================================================== */
function handleDateChange(e) {
    selectedDate = e.target.value;
    renderApp();
}

function handleAddPlayer(e) {
    e.preventDefault();
    const name = playerNameInput.value.trim();
    if (!name) return;

    // Cria novo jogador
    const newPlayer = {
        id: 'p_' + Date.now(),
        name: name
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

    if (confirm(`Tem certeza que deseja excluir o jogador "${player.name}"? As contribuições dele no histórico também serão removidas.`)) {
        // Remove jogador do array principal
        state.players = state.players.filter(p => p.id !== id);

        // Limpa o registro do jogador em todas as datas registradas no histórico
        Object.keys(state.history).forEach(date => {
            if (state.history[date][id] !== undefined) {
                delete state.history[date][id];
            }
        });

        saveToLocalStorage();
        renderApp();
    }
}

function saveContribution(playerId, inputElement) {
    const value = parseInt(inputElement.value) || 0;

    // Garante que existe estrutura para a data selecionada
    if (!state.history[selectedDate]) {
        state.history[selectedDate] = {};
    }

    state.history[selectedDate][playerId] = value;
    saveToLocalStorage();
    renderApp();
}

function handleResetDay() {
    if (!selectedDate) return;

    if (confirm(`Atenção: Deseja zerar todas as contribuições da data ${selectedDate}?`)) {
        state.history[selectedDate] = {};
        saveToLocalStorage();
        renderApp();
    }
}

/* ==========================================================================
   FUNÇÕES DE RENDERIZAÇÃO
   ========================================================================== */
function renderApp() {
    renderPlayersList();
    renderRanking();
    renderStats();
}

function renderPlayersList() {
    playersTableBody.innerHTML = '';
    const filter = searchPlayerInput.value.toLowerCase().trim();

    const filteredPlayers = state.players.filter(p => p.name.toLowerCase().includes(filter));

    if (filteredPlayers.length === 0) {
        playersTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Nenhum jogador encontrado.</td></tr>`;
        return;
    }

    filteredPlayers.forEach(player => {
        // Pega valor da contribuição para o dia selecionado
        const dayRecords = state.history[selectedDate] || {};
        const currentContrib = dayRecords[player.id] !== undefined ? dayRecords[player.id] : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHTML(player.name)}</strong></td>
            <td>
                <div class="contrib-input-group">
                    <input type="number" min="0" placeholder="0" value="${currentContrib}" id="input_${player.id}">
                    <button class="btn btn-primary btn-sm" onclick="saveContribution('${player.id}', document.getElementById('input_${player.id}'))">
                        <i class="fa-solid fa-floppy-disk"></i>
                    </button>
                </div>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editPlayer('${player.id}')" title="Editar Nome"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deletePlayer('${player.id}')" title="Excluir Jogador"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        playersTableBody.appendChild(tr);
    });
}

function renderRanking() {
    rankingTableBody.innerHTML = '';

    const dayRecords = state.history[selectedDate] || {};

    // Mapeia jogadores para a estrutura do ranking incluindo contribuição
    const rankingData = state.players.map(player => {
        return {
            id: player.id,
            name: player.name,
            contribution: dayRecords[player.id] || 0
        };
    });

    // Ordenação do Maior para o Menor
    rankingData.sort((a, b) => b.contribution - a.contribution);

    if (rankingData.length === 0) {
        rankingTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Sem dados para o ranking.</td></tr>`;
        return;
    }

    rankingData.forEach((item, index) => {
        const tr = document.createElement('tr');
        const pos = index + 1;

        // Ícones de medalha para os 3 primeiros
        let posDisplay = pos;
        if (pos === 1) posDisplay = '<span class="medal">🥇</span>';
        else if (pos === 2) posDisplay = '<span class="medal">🥈</span>';
        else if (pos === 3) posDisplay = '<span class="medal">🥉</span>';

        tr.innerHTML = `
            <td><strong>${posDisplay}</strong></td>
            <td>${escapeHTML(item.name)}</td>
            <td style="color: var(--primary-gold); font-weight: bold;">${item.contribution.toLocaleString()}</td>
        `;
        rankingTableBody.appendChild(tr);
    });
}

function renderStats() {
    const totalPlayersCount = state.players.length;
    statTotalPlayers.textContent = totalPlayersCount;

    const dayRecords = state.history[selectedDate] || {};
    const contribValues = state.players.map(p => dayRecords[p.id] || 0);

    const totalToday = contribValues.reduce((acc, curr) => acc + curr, 0);
    statTotalToday.textContent = totalToday.toLocaleString();

    // Cálculo da média
    const avg = totalPlayersCount > 0 ? (totalToday / totalPlayersCount).toFixed(1) : 0;
    statAverage.textContent = avg;

    // Cálculo de Maior e Menor
    if (totalPlayersCount > 0) {
        const max = Math.max(...contribValues);
        const min = Math.min(...contribValues);
        statMinMax.textContent = `${max.toLocaleString()} / ${min.toLocaleString()}`;
    } else {
        statMinMax.textContent = '0 / 0';
    }
}

/* ==========================================================================
   EXPORTAÇÃO E IMPORTAÇÃO (JSON)
   ========================================================================== */
function exportDataToJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `guild_ddtank_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importDataFromJSON(e) {
    const fileReader = new FileReader();
    fileReader.onload = function (event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if (importedData && importedData.players && importedData.history) {
                if (confirm("Importar um backup substituirá todos os dados atuais. Deseja prosseguir?")) {
                    state = importedData;
                    saveToLocalStorage();
                    renderApp();
                    alert("Dados importados com sucesso!");
                }
            } else {
                alert("O arquivo fornecido possui um formato inválido.");
            }
        } catch (error) {
            alert("Erro ao ler o arquivo JSON.");
        }
    };
    if (e.target.files[0]) {
        fileReader.readAsText(e.target.files[0]);
    }
}

/* ==========================================================================
   UTILITÁRIOS DE SEGURANÇA
   ========================================================================== */
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}