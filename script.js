/**
 * GERENCIADOR DE CONTRIBUIÇÃO DE GUILDA - DDTANK
 * Banco: Supabase Realtime
 * Senha Admin: fiction1234
 */

let isAdmin = false;
let adminPassword = "fiction1234";

let state = {
    players: []
};

let selectedDate = '';
let currentRankingMode = 'total'; 

// Estado de ordenação global da tabela
window.mainTableSort = {
    column: null, 
    direction: 'desc' 
};

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

let currentDateInput, statTotalPlayers, statTotalToday, statTotalWeek, statAverage, statTopPlayer;
let addPlayerForm, playerNameInput, searchPlayerInput;
let mainTableBody, rankingTableBody;
let btnResetDay, btnRankTotal, btnRankPrev, btnRankWeek, btnAdminLogin;
let playerModal, modalPlayerDetails, closeModalBtn;

document.addEventListener('DOMContentLoaded', () => {
    currentDateInput = document.getElementById('currentDate');
    statTotalPlayers = document.getElementById('statTotalPlayers');
    statTotalToday = document.getElementById('statTotalToday');
    statTotalWeek = document.getElementById('statTotalWeek');
    statAverage = document.getElementById('statAverage');
    statTopPlayer = document.getElementById('statTopPlayer');

    addPlayerForm = document.getElementById('addPlayerForm');
    playerNameInput = document.getElementById('playerNameInput');
    searchPlayerInput = document.getElementById('searchPlayerInput');

    mainTableBody = document.getElementById('mainTableBody');
    rankingTableBody = document.getElementById('rankingTableBody');

    btnResetDay = document.getElementById('btnResetDay');
    btnRankTotal = document.getElementById('btnRankTotal');
    btnRankPrev = document.getElementById('btnRankPrev');
    btnRankWeek = document.getElementById('btnRankWeek');
    btnAdminLogin = document.getElementById('btnAdminLogin');

    playerModal = document.getElementById('playerModal');
    modalPlayerDetails = document.getElementById('modalPlayerDetails');
    closeModalBtn = document.querySelector('.close-modal');

    const today = new Date().toISOString().split('T')[0];
    if (currentDateInput) currentDateInput.value = today;
    selectedDate = today;

    if (btnAdminLogin) btnAdminLogin.addEventListener('click', toggleAdminMode);

    if (currentDateInput) {
        currentDateInput.addEventListener('change', (e) => {
            selectedDate = e.target.value;
            renderApp();
        });
    }

    if (addPlayerForm) addPlayerForm.addEventListener('submit', handleAddPlayer);
    if (searchPlayerInput) searchPlayerInput.addEventListener('input', renderMainTable);

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

    // ATIVA A ORDENAÇÃO NO CLIQUE DA TABELA (DELEGAÇÃO DE EVENTO INFALÍVEL)
    const mainTableHeaderRow = document.getElementById('mainTableHeaderRow');
    if (mainTableHeaderRow) {
        mainTableHeaderRow.addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (!th || th.classList.contains('admin-only')) return;

            const weekday = th.getAttribute('data-weekday');
            const headers = Array.from(mainTableHeaderRow.children);
            const index = headers.indexOf(th);
            let colKey;

            if (weekday !== null) {
                colKey = parseInt(weekday); // 0 a 6 para os dias
            } else if (index === 0) {
                colKey = 'name';
            } else if (index === 1) {
                colKey = 'total';
            } else if (index === 2) {
                colKey = 'prev';
            } else if (th.classList.contains('col-highlight')) {
                colKey = 'weekTotal';
            }

            if (colKey !== undefined) {
                if (window.mainTableSort.column === colKey) {
                    window.mainTableSort.direction = window.mainTableSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    window.mainTableSort.column = colKey;
                    window.mainTableSort.direction = 'desc';
                }
                renderMainTable();
            }
        });
    }

    renderApp();
    initSupabase();
});

async function initSupabase() {
    try {
        await loadSettingsFromSupabase();
        await loadFromSupabase();
        setupRealtime();
    } catch (e) {
        console.error("Erro ao inicializar Supabase:", e);
    }
}

function toggleAdminMode() {
    const btn = document.getElementById('btnAdminLogin');
    
    if (isAdmin) {
        isAdmin = false;
        document.body.classList.remove('is-admin');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-lock"></i> Modo Leitor';
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-warning');
        }
        alert("Você saiu do Modo Administrador.");
        renderApp();
    } else {
        const passwordInput = prompt("Digite a senha de Administrador para editar:");
        if (passwordInput === adminPassword) {
            isAdmin = true;
            document.body.classList.add('is-admin');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-unlock"></i> Modo Admin (Sair)';
                btn.classList.remove('btn-warning');
                btn.classList.add('btn-danger');
            }
            alert("Modo Administrador ativado!");
            renderApp();
        } else if (passwordInput !== null) {
            alert("Senha incorreta!");
        }
    }
}

window.toggleAdminMode = toggleAdminMode;

async function loadSettingsFromSupabase() {
    try {
        if (typeof window.supabaseClient === 'undefined') return;
        const { data, error } = await window.supabaseClient.from('guild_settings').select('*');
        if (!error && data) {
            const passSetting = data.find(s => s.setting_key === 'admin_password');
            if (passSetting && passSetting.setting_value) {
                adminPassword = passSetting.setting_value;
            }

            const nameSetting = data.find(s => s.setting_key === 'guild_name');
            if (nameSetting && nameSetting.setting_value) {
                const el = document.getElementById('guildName');
                if (el) el.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Guilda ${nameSetting.setting_value}`;
            }
        }
    } catch (e) {
        console.error("Erro ao carregar configurações:", e);
    }
}

async function loadFromSupabase() {
    try {
        if (typeof window.supabaseClient === 'undefined') return;
        
        const { data: playersData, error: pErr } = await window.supabaseClient.from('players').select('*').order('name', { ascending: true });
        if (pErr) throw pErr;

        const { data: contribsData, error: cErr } = await window.supabaseClient.from('contributions').select('*');
        if (cErr) throw cErr;

        state.players = (playersData || []).map(p => {
            const playerContribs = (contribsData || []).filter(c => c.player_id === p.id);
            const dailyHistory = {};
            const totalHistory = {};

            playerContribs.forEach(c => {
                const val = Number(c.daily_value ?? c.daily_contribution ?? 0);
                dailyHistory[c.date_key] = val;
                totalHistory[c.date_key] = Number(c.entered_total ?? 0);
            });

            return {
                id: p.id,
                name: p.name,
                contribTotal: Number(p.contrib_total ?? p.contribTotal ?? 0),
                contribSemanaAnterior: Number(p.contrib_semana_anterior ?? p.contribSemanaAnterior ?? 0),
                dailyHistory,
                totalHistory
            };
        });

        renderApp();
    } catch (e) {
        console.error("Erro ao carregar do Supabase:", e);
    }
}

function setupRealtime() {
    if (typeof window.supabaseClient === 'undefined') return;
    window.supabaseClient
        .channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => loadFromSupabase())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions' }, () => loadFromSupabase())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guild_settings' }, () => {
            loadSettingsFromSupabase();
            loadFromSupabase();
        })
        .subscribe();
}

function setRankingMode(mode, activeBtn) {
    currentRankingMode = mode;
    [btnRankTotal, btnRankPrev, btnRankWeek].forEach(btn => btn && btn.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
    renderRanking();
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

function updateSortIcons() {
    const headers = document.querySelectorAll('#mainTableHeaderRow th');

    headers.forEach((th, index) => {
        if (th.classList.contains('admin-only')) return;
        th.style.cursor = 'pointer';

        const weekday = th.getAttribute('data-weekday');
        let key;

        if (weekday !== null) key = parseInt(weekday);
        else if (index === 0) key = 'name';
        else if (index === 1) key = 'total';
        else if (index === 2) key = 'prev';
        else if (th.classList.contains('col-highlight')) key = 'weekTotal';

        const oldIcon = th.querySelector('.sort-icon');
        if (oldIcon) oldIcon.remove();

        if (window.mainTableSort.column === key) {
            const icon = document.createElement('span');
            icon.className = 'sort-icon';
            icon.style.marginLeft = '4px';
            icon.style.color = '#f1c40f';
            icon.innerHTML = window.mainTableSort.direction === 'asc' ? ' ▲' : ' ▼';
            th.appendChild(icon);
        }
    });
}

async function handleAddPlayer(e) {
    e.preventDefault();
    if (!isAdmin) return;

    const name = playerNameInput.value.trim();
    if (!name) return;

    const { error } = await window.supabaseClient.from('players').insert([
        { name, contrib_total: 0, contrib_semana_anterior: 0 }
    ]);

    if (error) {
        alert("Erro ao adicionar jogador no banco.");
        console.error(error);
    } else {
        playerNameInput.value = '';
        await loadFromSupabase();
    }
}

async function editPlayer(id) {
    if (!isAdmin) return;
    const player = state.players.find(p => p.id === id);
    if (!player) return;

    const newName = prompt("Edite o nome do jogador:", player.name);
    if (newName && newName.trim() !== "") {
        const { error } = await window.supabaseClient.from('players').update({ name: newName.trim() }).eq('id', id);
        if (error) console.error("Erro ao editar nome:", error);
        else await loadFromSupabase();
    }
}

async function deletePlayer(id) {
    if (!isAdmin) return;
    const player = state.players.find(p => p.id === id);
    if (!player) return;

    if (confirm(`Excluir o jogador "${player.name}"?`)) {
        const { error } = await window.supabaseClient.from('players').delete().eq('id', id);
        if (error) console.error("Erro ao excluir jogador:", error);
        else await loadFromSupabase();
    }
}

async function saveDailyInput(playerId, dateKey) {
    if (!isAdmin) return;
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    const inputEl = document.getElementById(`day_input_${playerId}_${dateKey}`);
    if (!inputEl) return;

    const newEnteredTotal = parseInt(inputEl.value) || 0;
    const previousTotal = player.contribTotal || 0;
    let calculatedDaily = newEnteredTotal - previousTotal;
    if (calculatedDaily < 0) calculatedDaily = 0;

    const { error: cErr } = await window.supabaseClient.from('contributions').upsert({
        player_id: playerId,
        date_key: dateKey,
        entered_total: newEnteredTotal,
        daily_value: calculatedDaily
    }, { onConflict: 'player_id, date_key' });

    if (cErr) console.error("Erro ao salvar contribuição:", cErr);

    const { error: pErr } = await window.supabaseClient.from('players').update({
        contrib_total: newEnteredTotal
    }).eq('id', playerId);

    if (pErr) console.error("Erro ao atualizar total:", pErr);

    await loadFromSupabase();
}

async function updateMainPlayerTotals(playerId) {
    if (!isAdmin) return;
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    const totEl = document.getElementById(`tot_${playerId}`);
    const prevEl = document.getElementById(`prev_${playerId}`);

    const newTotal = totEl ? (parseInt(totEl.value) || 0) : player.contribTotal;
    const newPrev = prevEl ? (parseInt(prevEl.value) || 0) : player.contribSemanaAnterior;

    const { error } = await window.supabaseClient.from('players').update({
        contrib_total: newTotal,
        contrib_semana_anterior: newPrev
    }).eq('id', playerId);

    if (error) console.error("Erro ao atualizar totais do jogador:", error);
    else await loadFromSupabase();
}

async function handleResetDay() {
    if (!isAdmin) return;
    if (confirm(`Deseja zerar os registros da data ${selectedDate}?`)) {
        const { error } = await window.supabaseClient.from('contributions').delete().eq('date_key', selectedDate);
        if (error) console.error("Erro ao zerar o dia:", error);
        else await loadFromSupabase();
    }
}

function renderApp() {
    renderMainTable();
    renderRanking();
    renderStats();
    updateHeaderColors();
}

function updateHeaderColors() {
    const weekDates = getWeekDates(selectedDate);
    const headerCells = document.querySelectorAll('#mainTableHeaderRow th[data-weekday]');

    headerCells.forEach(cell => {
        const weekdayIndex = parseInt(cell.getAttribute('data-weekday'));
        const dateKey = weekDates[weekdayIndex];

        const hasPositiveContrib = (state.players || []).some(p => {
            const val = p.dailyHistory ? (p.dailyHistory[dateKey] || 0) : 0;
            return val > 0;
        });

        if (hasPositiveContrib) {
            cell.style.color = '#2ecc71';
            cell.style.fontWeight = 'bold';
        } else {
            cell.style.color = '#e74c3c';
            cell.style.fontWeight = 'normal';
        }
    });
}

function renderMainTable() {
    if (!mainTableBody) return;
    mainTableBody.innerHTML = '';
    const filter = searchPlayerInput ? searchPlayerInput.value.toLowerCase().trim() : '';
    const weekDates = getWeekDates(selectedDate);

    let filtered = (state.players || []).filter(p => p.name.toLowerCase().includes(filter));

    // LÓGICA DE ORDENAÇÃO
    if (window.mainTableSort.column !== null) {
        filtered.sort((a, b) => {
            let valA, valB;

            if (typeof window.mainTableSort.column === 'number') {
                const dateKey = weekDates[window.mainTableSort.column];
                valA = a.dailyHistory ? (a.dailyHistory[dateKey] || 0) : 0;
                valB = b.dailyHistory ? (b.dailyHistory[dateKey] || 0) : 0;
            } else if (window.mainTableSort.column === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (window.mainTableSort.column === 'total') {
                valA = a.contribTotal || 0;
                valB = b.contribTotal || 0;
            } else if (window.mainTableSort.column === 'prev') {
                valA = a.contribSemanaAnterior || 0;
                valB = b.contribSemanaAnterior || 0;
            } else if (window.mainTableSort.column === 'weekTotal') {
                valA = weekDates.reduce((acc, d) => acc + (a.dailyHistory ? (a.dailyHistory[d] || 0) : 0), 0);
                valB = weekDates.reduce((acc, d) => acc + (b.dailyHistory ? (b.dailyHistory[d] || 0) : 0), 0);
            }

            if (valA < valB) return window.mainTableSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return window.mainTableSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    updateSortIcons();

    if (filtered.length === 0) {
        mainTableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; color:var(--text-muted);">Nenhum jogador cadastrado.</td></tr>`;
        return;
    }

    filtered.forEach(player => {
        let weekTotalSum = 0;

        const weekInputsCells = weekDates.map(dateKey => {
            const dailyVal = player.dailyHistory ? (player.dailyHistory[dateKey] || 0) : 0;
            weekTotalSum += dailyVal;

            if (isAdmin) {
                return `
                    <td>
                        <div style="display:flex; flex-direction:column; gap:2px; align-items:center;">
                            <input type="number" class="input-sm" id="day_input_${player.id}_${dateKey}" placeholder="Novo Tot." style="width:75px;">
                            <button class="btn btn-primary btn-sm" onclick="saveDailyInput('${player.id}', '${dateKey}')" title="Calcular e Salvar">
                                <i class="fa-solid fa-check"></i>
                            </button>
                            <small style="color:${dailyVal > 0 ? '#2ecc71' : 'var(--primary-gold)'}; font-size:0.75rem;">+${dailyVal.toLocaleString()}</small>
                        </div>
                    </td>
                `;
            } else {
                return `<td style="color:${dailyVal > 0 ? '#2ecc71' : 'inherit'};">+${dailyVal.toLocaleString()}</td>`;
            }
        }).join('');

        const tr = document.createElement('tr');

        const totalCellHtml = isAdmin 
            ? `<input type="number" class="input-sm" id="tot_${player.id}" value="${player.contribTotal || 0}" onchange="updateMainPlayerTotals('${player.id}')">`
            : `${(player.contribTotal || 0).toLocaleString()}`;

        const prevCellHtml = isAdmin 
            ? `<input type="number" class="input-sm" id="prev_${player.id}" value="${player.contribSemanaAnterior || 0}" onchange="updateMainPlayerTotals('${player.id}')">`
            : `${(player.contribSemanaAnterior || 0).toLocaleString()}`;

        const actionsCellHtml = isAdmin ? `
            <td class="admin-only">
                <button class="btn btn-secondary btn-sm" onclick="editPlayer('${player.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deletePlayer('${player.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        ` : '';

        tr.innerHTML = `
            <td>
                <span class="player-link" onclick="openPlayerSummary('${player.id}')">${escapeHTML(player.name)}</span>
            </td>
            <td>${totalCellHtml}</td>
            <td>${prevCellHtml}</td>
            ${weekInputsCells}
            <td class="col-highlight"><strong>${weekTotalSum.toLocaleString()}</strong></td>
            ${actionsCellHtml}
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
        rankingTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Sem dados.</td></tr>`;
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

function escapeHTML(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}
