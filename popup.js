
function safeRuntimeSendMessage(msgObj, callback) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        try {
            chrome.runtime.sendMessage(msgObj, (res) => {
                if (chrome.runtime.lastError) {
                    // Suppress connection errors
                }
                if (typeof callback === 'function') callback(res);
            });
        } catch(e) {
            if (typeof callback === 'function') callback(null);
        }
    }
}


function sanitizeLogText(str) {
    if (!str) return '';
    return str
        .replace(/Ÿ¢|Ÿ\$/g, '🟢')
        .replace(/Ÿ/g, '🟢')
        .replace(/”´/g, '🔴')
        .replace(/”„/g, '🔄')
        .replace(/”’/g, '🚪')
        .replace(/”/g, '')
        .replace(/“±/g, '📱')
        .replace(/“/g, '')
        .replace(/Ž‰|Ž/g, '🎉')
        .replace(/â Œ/g, '❌')
        .replace(/â™¾️|â™¾/g, '♾️')
        .replace(/¤–|¤/g, '🤖')
        .replace(/Tá»”NG KẾT/g, 'TỔNG KẾT')
        .replace(/Tá»”NG/g, 'TỔNG')
        .replace(/Bá»Š LAG \/ Lá»–I/g, 'BỊ LAG / LỖI')
        .replace(/Bá»Š/g, 'BỊ')
        .replace(/Lá»–I/g, 'LỖI')
        .replace(/Lá»—i/g, 'Lỗi')
        .replace(/lá»—i/g, 'lỗi')
        .replace(/bá»‹/g, 'bị')
        .replace(/TỰ Đ á»˜NG/g, 'TỰ ĐỘNG')
        .replace(/CHẾ Đ á»˜/g, 'CHẾ ĐỘ')
        .replace(/chế đá»™/g, 'chế độ')
        .replace(/Chuyá»ƒn/g, 'Chuyển')
        .replace(/Nghá»‰/g, 'Nghỉ');
}

const DEFAULT_PRESET_PAGES = [
    { pageName: "Thế Giới Di Động", commentText: "em thanh lý xả hàng điện thoại tại đây https://muadore.site", imageData: "" },
    { pageName: "Nguyễn Thao Đồ Bộ", commentText: "Em xả hàng đồ bộ tại đây các chị nhấn vào chọn size luôn nhen https://muadore.site", imageData: "" },
    { pageName: "shop quần giá rẻ", commentText: "mấy chị ấn đây để đặt giúp em nha https://muadore.site", imageData: "" },
    { pageName: "Quần Đẹp Giá Rẻ", commentText: "mấy chị ấn đây để đặt giúp em nha https://muadore.site", imageData: "" },
    { pageName: "Shop Đồ Xinh", commentText: "mấy chị ấn đây để đặt giúp em nha https://muadore.site", imageData: "" },
    { pageName: "Trái Cây Miền Quê", commentText: "{Em xả hàng sầu riêng tại đây|Mình xả hàng sầu riêng tại đây nhé|Xả hàng sầu riêng tại đây ấn vào để đặt hàng|Shop xả kho sầu riêng giá rẻ tại đây nè} https://muadore.site", imageData: "" },
    { pageName: "Vựa Trái Cây Chị Năm", commentText: "{Em xả hàng sầu riêng tại đây|Mình xả hàng sầu riêng tại đây nhé|Xả hàng sầu riêng tại đây ấn vào để đặt hàng|Shop xả kho sầu riêng giá rẻ tại đây nè} https://muadore.site", imageData: "" },
    { pageName: "Shop Đồ Bộ Thao Thao", commentText: "Em xả hàng đồ bộ tại đây các chị nhấn vào chọn size luôn nhen https://muadore.site", imageData: "" },
    { pageName: "Xưởng May Đồ Bộ", commentText: "Em xả hàng đồ bộ tại đây các chị nhấn vào chọn size luôn nhen https://muadore.site", imageData: "" },
    { pageName: "Trái Cây Anh Ba", commentText: "{Em xả hàng sầu riêng tại đây|Mình xả hàng sầu riêng tại đây nhé|Xả hàng sầu riêng tại đây ấn vào để đặt hàng|Shop xả kho sầu riêng giá rẻ tại đây nè} https://muadore.site", imageData: "" }
];

// Open full dashboard tab
document.getElementById('btnOpenDashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'dashboard.html' });
});

// Nạp lại 15 Page Preset
const btnLoadPresetsPopup = document.getElementById('btnLoadPresetsPopup');
if (btnLoadPresetsPopup) {
    btnLoadPresetsPopup.addEventListener('click', () => {
        if (confirm("🎉 Bạn có muốn nạp toàn bộ 15 Page mẫu sẵn có vào hệ thống?")) {
            chrome.storage.local.set({ pageConfigs: DEFAULT_PRESET_PAGES }, () => {
                loadConfigs();
                loadRunPageOptions();
                alert("✅ Đã nạp thành công 15 Page mẫu vào cấu hình!");
            });
        }
    });
}

// Tab switching
document.getElementById('tabRunBtn').addEventListener('click', () => {
    document.getElementById('sectionRun').style.display = 'block';
    document.getElementById('sectionConfig').style.display = 'none';
    document.getElementById('sectionHistory').style.display = 'none';
    document.getElementById('tabRunBtn').classList.add('active');
    document.getElementById('tabConfigBtn').classList.remove('active');
    document.getElementById('tabHistoryBtn').classList.remove('active');
    loadRunPageOptions();
});

document.getElementById('tabConfigBtn').addEventListener('click', () => {
    document.getElementById('sectionRun').style.display = 'none';
    document.getElementById('sectionConfig').style.display = 'block';
    document.getElementById('sectionHistory').style.display = 'none';
    document.getElementById('tabConfigBtn').classList.add('active');
    document.getElementById('tabRunBtn').classList.remove('active');
    document.getElementById('tabHistoryBtn').classList.remove('active');
    loadConfigs();
});

document.getElementById('tabHistoryBtn').addEventListener('click', () => {
    document.getElementById('sectionRun').style.display = 'none';
    document.getElementById('sectionConfig').style.display = 'none';
    document.getElementById('sectionHistory').style.display = 'block';
    document.getElementById('tabHistoryBtn').classList.add('active');
    document.getElementById('tabRunBtn').classList.remove('active');
    document.getElementById('tabConfigBtn').classList.remove('active');
    renderHistoryTable();
});

// Run mode toggle
document.getElementById('runMode').addEventListener('change', (e) => {
    const singleGrp = document.getElementById('singlePageGroup');
    if (e.target.value === 'SINGLE') {
        singleGrp.style.display = 'block';
        loadRunPageOptions();
    } else {
        singleGrp.style.display = 'none';
    }
});

document.getElementById('loopStrategy').addEventListener('change', (e) => {
    const delayGrp = document.getElementById('loopDelayGroup');
    const scheduleGrp = document.getElementById('scheduleTimeGroup');
    
    delayGrp.style.display = (e.target.value === 'DELAY') ? 'block' : 'none';
    scheduleGrp.style.display = (e.target.value === 'SCHEDULE') ? 'block' : 'none';
    
    chrome.storage.local.set({ 
        loopStrategy: e.target.value 
    });
});

document.getElementById('loopDelayMin').addEventListener('input', (e) => {
    chrome.storage.local.set({ loopDelayMin: parseInt(e.target.value) || 20 });
});

document.getElementById('loopDelayMax').addEventListener('input', (e) => {
    chrome.storage.local.set({ loopDelayMax: parseInt(e.target.value) || 40 });
});

document.getElementById('scheduleTimes').addEventListener('input', (e) => {
    chrome.storage.local.set({ 
        scheduleTimes: e.target.value 
    });
});

// Phục hồi trạng thái select box khi mở popup
chrome.storage.local.get(['loopStrategy', 'loopDelayMin', 'loopDelayMax', 'scheduleTimes', 'scheduleDays', 'soundNotifyEnable', 'reelsPerPage'], (st) => {
    const reelsEl = document.getElementById('reelsPerPage');
    if (st.reelsPerPage && reelsEl) {
        reelsEl.value = st.reelsPerPage;
    }
    if (st.loopStrategy) {
        document.getElementById('loopStrategy').value = st.loopStrategy;
        document.getElementById('loopDelayGroup').style.display = (st.loopStrategy === 'DELAY') ? 'block' : 'none';
        document.getElementById('scheduleTimeGroup').style.display = (st.loopStrategy === 'SCHEDULE') ? 'block' : 'none';
    }
    if (st.loopDelayMin) {
        document.getElementById('loopDelayMin').value = st.loopDelayMin;
    }
    if (st.loopDelayMax) {
        document.getElementById('loopDelayMax').value = st.loopDelayMax;
    }
    if (st.scheduleTimes) {
        document.getElementById('scheduleTimes').value = st.scheduleTimes;
    }
    if (st.scheduleDays) {
        document.querySelectorAll('.day-check').forEach(cb => {
            cb.checked = st.scheduleDays.includes(parseInt(cb.value));
        });
    }
    if (st.soundNotifyEnable !== undefined) {
        const soundEl = document.getElementById('soundNotifyEnable');
        if (soundEl) soundEl.checked = st.soundNotifyEnable;
    }
});

function getNextScheduleTarget(scheduleTimesStr, lastScheduleRun = null) {
    if (!scheduleTimesStr) return null;
    const times = scheduleTimesStr.split(',').map(t => t.trim()).filter(t => /^\d{1,2}:\d{2}$/.test(t));
    if (times.length === 0) return null;

    const now = new Date();
    const curH = now.getHours().toString().padStart(2, '0');
    const curM = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${curH}:${curM}`;

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowSeconds = now.getSeconds();

    let candidateSlots = [];

    times.forEach(t => {
        const parts = t.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const slotMinutes = h * 60 + m;

        let diffSecs = (slotMinutes - nowMinutes) * 60 - nowSeconds;
        if (diffSecs <= 0 || (t === currentTime && lastScheduleRun === currentTime)) {
            diffSecs += 24 * 3600;
        }

        candidateSlots.push({
            timeStr: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
            diffSecs: diffSecs
        });
    });

    candidateSlots.sort((a, b) => a.diffSecs - b.diffSecs);
    return candidateSlots[0];
}

function formatCountdownText(diffSecs) {
    if (diffSecs <= 0) return "00 giờ 00 phút 00 giây (Đã đến giờ!)";
    const h = Math.floor(diffSecs / 3600);
    const m = Math.floor((diffSecs % 3600) / 60);
    const s = Math.floor(diffSecs % 60);

    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');

    return `${hStr} giờ ${mStr} phút ${sStr} giây`;
}

function updatePopupCountdown() {
    chrome.storage.local.get(['loopStrategy', 'scheduleTimes', 'scheduleDays', 'lastScheduleRun'], (st) => {
        const box = document.getElementById('scheduleCountdownBox');
        if (!box) return;

        if (st.loopStrategy === 'SCHEDULE') {
            box.style.display = 'block';
            const days = st.scheduleDays || [0, 1, 2, 3, 4, 5, 6];
            const nextTarget = getNextScheduleTarget(st.scheduleTimes, days, st.lastScheduleRun);
            if (nextTarget) {
                document.getElementById('nextScheduleTimeText').innerText = nextTarget.timeStr;
                document.getElementById('scheduleCountdownText').innerText = `⏳ Còn lại: ${formatCountdownText(nextTarget.diffSecs)}`;
            } else {
                document.getElementById('nextScheduleTimeText').innerText = '--:--';
                document.getElementById('scheduleCountdownText').innerText = 'Vui lòng chọn ngày & nhập định dạng HH:mm';
            }
        } else {
            box.style.display = 'none';
        }
    });
}

setInterval(updatePopupCountdown, 1000);
updatePopupCountdown();

function loadRunPageOptions() {
    chrome.storage.local.get(['pageConfigs'], (result) => {
        const configs = result.pageConfigs || [];
        const select = document.getElementById('singlePageSelect');
        if (configs.length === 0) {
            select.innerHTML = '<option value="">-- Chưa có mẫu nào --</option>';
        } else {
            select.innerHTML = configs.map(c => `<option value="${c.pageName}">${c.pageName}</option>`).join('');
        }
    });
}

// LOG MONITOR REALTIME (THÔNG MINH: KHÔNG TỰ NHẢY XUỐNG KHI ĐANG XEM LOG CŨ)
let lastRenderedLogsText = "";

function renderLogs() {
    chrome.storage.local.get(['botLogs'], (result) => {
        const logs = result.botLogs || [];
        const logBox = document.getElementById('logContainer');
        if (!logBox) return;

        if (logs.length === 0) {
            logBox.innerHTML = "Đang sẵn sàng... Vui lòng bấm Bắt Đầu.";
            lastRenderedLogsText = "";
            return;
        }

        const newText = logs.join('\n');
        if (newText === lastRenderedLogsText) {
            return;
        }

        const isNearBottom = (logBox.scrollHeight - logBox.scrollTop - logBox.clientHeight) < 40;
        
        lastRenderedLogsText = newText;

        // 🎨 HIGHLIGHT TÊN NICK MÀU ĐỎ + TO HƠN để dễ đọc
        const htmlLines = logs.map(line => {
            // Escape HTML
            let safe = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            // Highlight tên nick trong dấu ngoặc kép "..." -> đỏ, to, đậm
            safe = safe.replace(/&quot;([^&]+)&quot;/g, '<span style="color:#ff4444;font-size:13px;font-weight:bold;">"$1"</span>');
            safe = safe.replace(/"([^"]+)"/g, '<span style="color:#ff4444;font-size:13px;font-weight:bold;">"$1"</span>');
            return safe;
        });
        logBox.innerHTML = htmlLines.join('\n');

        if (isNearBottom) {
            logBox.scrollTop = logBox.scrollHeight;
        }
    });
}

document.getElementById('btnClearLog').addEventListener('click', () => {
    chrome.storage.local.set({ botLogs: [] }, () => {
        lastRenderedLogsText = "";
        renderLogs();
    });
});

// NÚT 1-CLICK COPY BÁO CÁO ZALO / MESSENGER
document.getElementById('btnCopyZaloReport').addEventListener('click', () => {
    chrome.storage.local.get(['sessionHistory'], (res) => {
        const sessions = res.sessionHistory || [];
        if (sessions.length === 0) return alert('Chưa có lịch sử phiên chạy nào để copy!');
        const lastSession = sessions[0];
        
        let lines = [];
        lines.push(`📊 BÁO CÁO KẾT QUẢ AUTOMATRIX PRO`);
        lines.push(`⏰ Thời gian: ${lastSession.startTime}`);
        lines.push(`---------------------------------`);
        
        (lastSession.items || []).forEach(item => {
            lines.push(`${item.status} - ${item.pageName}`);
        });

        lines.push(`---------------------------------`);
        lines.push(`🎉 Tổng cộng: ${lastSession.totalCount || lastSession.items?.length || 0} Page | ✅ ${lastSession.successCount || 0} Thành công | ⚠️ ${lastSession.lagCount || 0} Bị lag`);

        const reportText = lines.join('\n');
        navigator.clipboard.writeText(reportText).then(() => {
            alert('✅ ĐÃ COPY BÁO CÁO ZALO VÀO BỘ NHỚ TẠM!\n\nBác mở ô chat Zalo / Messenger bấm Ctrl + V (Dán) rồi ấn Gửi là xong!');
        }).catch(err => {
            alert('Lỗi copy: ' + err);
        });
    });
});

// NÚT XÓA TẤT CẢ MẪU LƯU
document.getElementById('btnClearAllConfigs').addEventListener('click', () => {
    if (confirm("Anh có chắc muốn xóa sạch toàn bộ danh sách Mẫu đã lưu không?")) {
        chrome.storage.local.set({ pageConfigs: [] }, () => {
            loadConfigs();
            loadRunPageOptions();
            alert("Đã xóa sạch toàn bộ danh sách mẫu!");
        });
    }
});

// ==========================================
// 🔗 THAY ĐỔI LIÊN KẾT GHIM HÀNG LOẠT
// ==========================================

// Hàm trích xuất tất cả domain link từ configs
function extractLinkDomains(configs) {
    const domains = new Set();
    const urlRegex = /https?:\/\/[^\s/]+/gi;
    (configs || []).forEach(cfg => {
        const matches = (cfg.commentText || '').match(urlRegex);
        if (matches) {
            matches.forEach(m => domains.add(m.replace(/\/$/, '')));
        }
    });
    return Array.from(domains);
}

// Hàm hiển thị preview các link hiện tại
function refreshLinkPreview() {
    chrome.storage.local.get(['pageConfigs'], (res) => {
        const configs = res.pageConfigs || [];
        const domains = extractLinkDomains(configs);
        const previewDiv = document.getElementById('currentLinksPreview');
        if (!previewDiv) return;
        if (domains.length === 0) {
            previewDiv.innerHTML = '<i>Chưa có link nào trong nội dung ghim.</i>';
        } else {
            previewDiv.innerHTML = '<b>Link hiện tại:</b> ' + domains.map(d => `<span style="color:#1877f2;">${d}</span>`).join(', ');
        }
    });
}

// Chạy preview khi popup mở
refreshLinkPreview();

// Nút thay thế link hàng loạt
document.getElementById('btnReplaceLinks').addEventListener('click', () => {
    const newDomain = (document.getElementById('newLinkDomain').value || '').trim().replace(/\/+$/, '');
    if (!newDomain || !newDomain.startsWith('http')) {
        return alert('⚠️ Vui lòng nhập link mới hợp lệ (bắt đầu bằng http:// hoặc https://)');
    }

    chrome.storage.local.get(['pageConfigs'], (res) => {
        const configs = res.pageConfigs || [];
        if (configs.length === 0) return alert('Chưa có mẫu nào để thay link!');

        // Regex bắt full URL (domain + path)
        const urlRegex = /https?:\/\/[^\s]+/gi;
        let totalReplaced = 0;
        let pagesAffected = 0;

        const updatedConfigs = configs.map(cfg => {
            const originalText = cfg.commentText || '';
            // Thay thế: giữ nguyên path, chỉ đổi domain
            const newText = originalText.replace(urlRegex, (matchedUrl) => {
                totalReplaced++;
                return newDomain;
            });

            if (newText !== originalText) {
                pagesAffected++;
            }

            return { ...cfg, commentText: newText };
        });

        chrome.storage.local.set({ pageConfigs: updatedConfigs }, () => {
            loadConfigs();
            refreshLinkPreview();
            alert(`✅ ĐÃ THAY ${totalReplaced} LINK trong ${pagesAffected} Page!\n\nLink mới: ${newDomain}`);
        });
    });
});

// Load configs from storage
function loadConfigs() {
    chrome.storage.local.get(['pageConfigs'], (result) => {
        let configs = result.pageConfigs || [];

        if (configs.length === 0) {
            configs = DEFAULT_PRESET_PAGES;
            chrome.storage.local.set({ pageConfigs: configs });
        } else {
            // TỰ ĐỘNG CHUYỂN TOÀN BỘ LINK CŨ SANG https://muadore.site VÀ BỎ HẾT ĐƯỜNG DẪN CON /XXXX
            const urlRegex = /https?:\/\/[^\s]+/gi;
            let needUpdate = false;
            configs = configs.map(c => {
                const orig = c.commentText || '';
                const replaced = orig.replace(urlRegex, 'https://muadore.site');
                if (replaced !== orig) {
                    needUpdate = true;
                    return { ...c, commentText: replaced };
                }
                return c;
            });
            if (needUpdate) {
                chrome.storage.local.set({ pageConfigs: configs });
            }
        }
        const container = document.getElementById('configList');
        if (configs.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#888; font-size:11px;">Chưa có mẫu nào. Hãy thêm ở trên!</div>';
            return;
        }

        container.innerHTML = configs.map((c, index) => `
            <div class="page-item" style="flex-wrap: wrap;">
                <div style="flex: 1; min-width: 0;">
                    <b>${c.pageName}</b> ${c.imageData ? '🖼️ (Có ảnh)' : ''}<br>
                    <span style="color:#666; font-size:10px;">${c.commentText.substring(0, 25)}...</span>
                </div>
                <div>
                    <button class="btn-edit" data-index="${index}" style="background:#ff9500; color:white; border:none; padding:2px 6px; border-radius:3px; font-size:10px; cursor:pointer; margin-right:3px;">✏️ Sửa</button>
                    <button class="btn-view" data-index="${index}">Xem</button>
                    <button class="btn-del" data-index="${index}">Xóa</button>
                </div>
                <div id="details-${index}" class="item-details" style="width: 100%;">
                    <div style="margin-bottom: 5px;"><b>Nội dung ghim:</b><br>${c.commentText}</div>
                    ${c.imageData ? `<img src="${c.imageData}" alt="Ảnh đính kèm">` : ''}
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                chrome.storage.local.get(['pageConfigs'], (result) => {
                    const cfgs = result.pageConfigs || [];
                    const item = cfgs[idx];
                    if (item) {
                        // Switch sang Tab Cấu hình
                        document.getElementById('tabConfigBtn').click();
                        document.getElementById('cfgPageName').value = item.pageName;
                        document.getElementById('cfgCommentText').value = item.commentText;
                        
                        if (item.imageData) {
                            currentActiveImageData = item.imageData;
                            showImagePreview(item.imageData);
                        } else {
                            hideImagePreview();
                        }
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                });
            });
        });

        container.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                const el = document.getElementById(`details-${idx}`);
                if (el) {
                    el.style.display = (el.style.display === 'block') ? 'none' : 'block';
                }
            });
        });

        container.querySelectorAll('.btn-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                chrome.storage.local.get(['pageConfigs'], (result) => {
                    let currentConfigs = result.pageConfigs || [];
                    currentConfigs.splice(idx, 1);
                    chrome.storage.local.set({ pageConfigs: currentConfigs }, () => {
                        loadConfigs();
                        loadRunPageOptions();
                    });
                });
            });
        });
    });
}

// LƯU CẤU HÌNH TELEGRAM
document.getElementById('btnSaveTele').addEventListener('click', () => {
    const token = document.getElementById('teleBotToken').value.trim();
    const chatId = document.getElementById('teleChatId').value.trim();
    chrome.storage.local.set({ teleBotToken: token, teleChatId: chatId }, () => {
        alert('✅ Đã lưu cấu hình gửi báo cáo Telegram!');
    });
});

// LƯU CẤU HÌNH PROXY
// === PROXY LIST - LUU VA LOAD ===
document.getElementById('btnSaveProxyList')?.addEventListener('click', () => {
    const enabled = document.getElementById('proxyEnableNew')?.checked || false;
    const listText = document.getElementById('proxyListText')?.value || '';
    
    // Parse proxy list
    const lines = listText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const proxyList = lines.map(line => {
        const parts = line.split(':');
        return {
            host: parts[0] || '',
            port: parseInt(parts[1]) || 0,
            user: parts[2] || '',
            pass: parts[3] || '',
            type: (parts[4] || 'http').toLowerCase()
        };
    }).filter(p => p.host && p.port);
    
    chrome.storage.local.set({
        proxyEnabled: enabled,
        proxyList: proxyList,
        proxyListText: listText,
        proxyCurrentIndex: 0
    }, () => {
        if (enabled && proxyList.length > 0) {
            chrome.runtime.sendMessage({ action: 'applyProxy', proxyIndex: 0 });
            alert('\u2705 Da luu ' + proxyList.length + ' proxy va kich hoat!');
        } else if (!enabled) {
            chrome.runtime.sendMessage({ action: 'clearProxy' });
            alert('\u2705 Da tat proxy!');
        } else {
            alert('\u26a0\ufe0f Danh sach proxy trong!');
        }
        updateProxyStatusUI();
    });
});

// Load proxy settings
function loadProxySettings() {
    chrome.storage.local.get(['proxyEnabled', 'proxyListText', 'proxyCurrentIndex', 'proxyList'], (st) => {
        const chk = document.getElementById('proxyEnableNew');
        const txt = document.getElementById('proxyListText');
        if (chk) chk.checked = st.proxyEnabled || false;
        if (txt) txt.value = st.proxyListText || '';
        updateProxyStatusUI();
    });
}

function updateProxyStatusUI() {
    chrome.storage.local.get(['proxyEnabled', 'proxyList', 'proxyCurrentIndex'], (st) => {
        const el = document.getElementById('activeProxyStatus');
        if (!el) return;
        if (st.proxyEnabled && st.proxyList && st.proxyList.length > 0) {
            const idx = st.proxyCurrentIndex || 0;
            const current = st.proxyList[idx % st.proxyList.length];
            el.innerText = '\ud83d\udfe2 Proxy ' + (idx + 1) + '/' + st.proxyList.length + ': ' + current.host + ':' + current.port + ' (' + current.type + ')';
            el.style.background = '#d4edda';
            el.style.color = '#155724';
            el.style.borderColor = '#28a745';
        } else {
            el.innerText = '\ud83d\udd34 Proxy TAT';
            el.style.background = '#f8d7da';
            el.style.color = '#721c24';
            el.style.borderColor = '#dc3545';
        }
    });
}

loadProxySettings();

// KHÔI PHỤC CẤU HÌNH KHI MỞ TAB
document.getElementById('tabConfigBtn').addEventListener('click', () => {
    loadProxySettings();
});

// Hàm nén ảnh tự động trước khi lưu
function compressImage(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.match('image.*')) {
            alert('Vui lòng chọn file hình ảnh hợp lệ!');
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 600; // Giảm xuống 600px để nén siêu nhẹ
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Giảm chất lượng xuống 0.7 để lưu được 30-50 Page cùng lúc
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
            img.onerror = () => {
                alert('Lỗi đọc hình ảnh!');
                resolve(null);
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            alert('Lỗi đọc file!');
            resolve(null);
        };
        reader.readAsDataURL(file);
    });
}

let currentActiveImageData = null;

function showImagePreview(dataUrl) {
    const container = document.getElementById('imagePreviewContainer');
    const img = document.getElementById('imagePreview');
    if (container && img) {
        img.src = dataUrl;
        container.style.display = 'block';
    }
}

function hideImagePreview() {
    currentActiveImageData = null;
    const fileInput = document.getElementById('cfgImageFile');
    if (fileInput) fileInput.value = '';
    const container = document.getElementById('imagePreviewContainer');
    if (container) container.style.display = 'none';
}

// Xử lý sự kiện DÁN ÁNH Ctrl + V từ bộ nhớ tạm
document.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || window.clipboardData)?.items;
    if (!items) return;
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
                const compressedData = await compressImage(blob);
                if (compressedData) {
                    currentActiveImageData = compressedData;
                    showImagePreview(compressedData);
                }
            }
        }
    }
});

// Xử lý chọn File từ máy tính
document.getElementById('cfgImageFile').addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
        const compressedData = await compressImage(e.target.files[0]);
        if (compressedData) {
            currentActiveImageData = compressedData;
            showImagePreview(compressedData);
        }
    }
});

// Xử lý nút xóa ảnh
document.getElementById('btnRemoveImage').addEventListener('click', () => {
    hideImagePreview();
});

document.getElementById('configForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pageName = document.getElementById('cfgPageName').value.trim();
    const commentText = document.getElementById('cfgCommentText').value.trim();
    const fileInput = document.getElementById('cfgImageFile');
    
    if (!pageName) {
        alert("Vui lòng nhập Tên Fanpage!");
        return;
    }

    if (!commentText) {
        alert("Vui lòng nhập Nội dung Comment!");
        return;
    }

    const saveBtn = document.querySelector('#configForm button[type="submit"]');
    if (saveBtn) saveBtn.innerText = "Đang xử lý và lưu...";

    let imageData = currentActiveImageData;
    if (!imageData && fileInput.files && fileInput.files[0]) {
        imageData = await compressImage(fileInput.files[0]);
    }

    chrome.storage.local.get(['pageConfigs'], (result) => {
        let configs = result.pageConfigs || [];
        const existingIdx = configs.findIndex(c => c.pageName.toLowerCase() === pageName.toLowerCase());
        if (existingIdx >= 0) {
            configs[existingIdx] = { pageName, commentText, imageData };
        } else {
            configs.push({ pageName, commentText, imageData });
        }

        chrome.storage.local.set({ pageConfigs: configs }, () => {
            if (saveBtn) saveBtn.innerText = "LƯU MẪU PAGE NÀY";
            
            if (chrome.runtime.lastError) {
                alert("❌ Lỗi bộ nhớ: " + chrome.runtime.lastError.message + "\n\nVui lòng Xóa Tắt Cả Mẫu cũ hoặc bớt ảnh lại!");
                return;
            }
            alert(`✅ Đã lưu cấu hình cho Page "${pageName}"!`);
            document.getElementById('configForm').reset();
            hideImagePreview();
            loadConfigs();
            loadRunPageOptions();
        });
    });
});

function updateStartButtonUI() {
    chrome.storage.local.get(['isBotRunning', 'isScheduleWaiting', 'loopStrategy', 'scheduleTimes'], (result) => {
        const btn = document.getElementById('btnStartCheck');
        if (!btn) return;
        if (result.isBotRunning) {
            if (result.isScheduleWaiting) {
                const nextTarget = getNextScheduleTarget(result.scheduleTimes);
                const nextStr = nextTarget ? nextTarget.timeStr : '--:--';
                btn.innerText = `🛑 DỪNG HẸN GIỜ (ĐANG CHỜ ${nextStr}...)`;
                btn.style.background = "#ff9800";
            } else {
                btn.innerText = "🛑 DỪNG LẠI (ĐANG CHẠY...)";
                btn.style.background = "#ff3b30";
            }
        } else {
            btn.innerText = "🚀 BẮT ĐẦU CHUYỂN NICK & CHẠY";
            btn.style.background = "#42b72a";
        }
    });
}

document.getElementById('btnStartCheck').addEventListener('click', () => {
    chrome.storage.local.get(['isBotRunning', 'pageConfigs'], (result) => {
        if (result.isBotRunning) {
            // STOP BOT
            chrome.storage.local.set({ isBotRunning: false, isScheduleWaiting: false, step: "STOPPED" }, () => {
                safeRuntimeSendMessage({ action: "stopBotProcess" });
                chrome.storage.local.get(['botLogs'], (res) => {
                    let logs = res.botLogs || [];
                    logs.push(`[${new Date().toLocaleTimeString()}] 🛑 Đã gửi lệnh DỪNG BOT!`);
                    chrome.storage.local.set({ botLogs: logs });
                });
                updateStartButtonUI();
            });
            return;
        }

        const configs = result.pageConfigs || [];
        if (configs.length === 0) return alert('Vui lòng thêm ít nhất 1 Mẫu Page ở Tab Cấu Hình trước!');

        const mode = document.getElementById('runMode').value;
        const strategy = document.getElementById('loopStrategy').value;
        const schedTimes = document.getElementById('scheduleTimes').value.trim();
        const dayChecks = Array.from(document.querySelectorAll('.day-check:checked')).map(cb => parseInt(cb.value));
        const soundEl = document.getElementById('soundNotifyEnable');
        const soundEnable = soundEl ? soundEl.checked : true;
        let targetConfigs = configs;

        if (mode === 'SINGLE') {
            const selectedName = document.getElementById('singlePageSelect').value;
            targetConfigs = configs.filter(c => c.pageName === selectedName);
        }

        if (targetConfigs.length > 1) {
            const shuffled = [...targetConfigs];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            targetConfigs = shuffled;
        }

        // Lưu trước loopStrategy, scheduleTimes, scheduleDays, soundNotifyEnable vào Storage
        chrome.storage.local.set({ 
            loopStrategy: strategy,
            scheduleTimes: schedTimes,
            scheduleDays: dayChecks,
            soundNotifyEnable: soundEnable
        }, () => {
            safeRuntimeSendMessage({
                action: "startMultiAccountProcess",
                targetConfigs: targetConfigs
            });
            renderLogs();
            setTimeout(updateStartButtonUI, 300);
        });
    });
});

// Render history table phân theo Phiên Chạy
function renderHistoryTable() {
    chrome.storage.local.get(['sessionHistory', 'runHistory'], (res) => {
        let sessions = res.sessionHistory || [];
        const flatHistory = res.runHistory || [];

        if (sessions.length === 0 && flatHistory.length > 0) {
            sessions = [{
                id: "SESSION_LEGACY",
                startTime: flatHistory[flatHistory.length - 1]?.time || new Date().toLocaleString(),
                totalPages: flatHistory.length,
                successCount: flatHistory.filter(h => !(h.status && (h.status.includes('Lag') || h.status.includes('⚠️')))).length,
                lagCount: flatHistory.filter(h => h.status && (h.status.includes('Lag') || h.status.includes('⚠️'))).length,
                items: flatHistory
            }];
            chrome.storage.local.set({ sessionHistory: sessions });
        }

        const tbody = document.getElementById('historyTableBody');
        
        if (sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:10px; color:#888;">Chưa có phiên chạy nào.</td></tr>';
            return;
        }

        let html = '';
        sessions.forEach((sess, idx) => {
            html += `
                <tr style="background:#e7f3ff; font-weight:bold; border-top:1px solid #1877f2;">
                    <td colspan="3" style="padding:4px; font-size:10px; color:#1877f2;">
                        🚀 Phiên #${sessions.length - idx} (${sess.startTime}) — ✅ ${sess.successCount||0} / ⚠️ ${sess.lagCount||0}
                    </td>
                </tr>
            `;
            if (sess.items && sess.items.length > 0) {
                sess.items.forEach(item => {
                    let statusBadge = '<span style="color:#28a745; font-weight:bold;">✅ Thành công</span>';
                    if (item.status && (item.status.includes('Lag') || item.status.includes('⚠️'))) {
                        statusBadge = '<span style="color:#ff9500; font-weight:bold;">⚠️ Bị Lag</span>';
                    } else if (item.status && (item.status.includes('Lỗi') || item.status.includes('❌'))) {
                        statusBadge = '<span style="color:#ff3b30; font-weight:bold;">❌ Thất bại</span>';
                    }
                    html += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding:4px; font-size:9px; color:#666;">${item.time}</td>
                            <td style="padding:4px; font-weight:bold;">${item.pageName}</td>
                            <td style="padding:4px;">${statusBadge}</td>
                        </tr>
                    `;
                });
            }
        });
        tbody.innerHTML = html;
    });
}

document.getElementById('btnClearHistory').addEventListener('click', () => {
    if (confirm("Xóa sạch toàn bộ lịch sử chạy của tất cả phiên?")) {
        chrome.storage.local.set({ sessionHistory: [], runHistory: [] }, renderHistoryTable);
    }
});

// EXPORT BACKUP JSON
document.getElementById('btnExportBackup').addEventListener('click', () => {
    chrome.storage.local.get(['pageConfigs', 'runHistory', 'loopStrategy', 'scheduleTimes', 'scheduleDays', 'soundNotifyEnable', 'teleBotToken', 'teleChatId', 'proxyEnable', 'proxyHost', 'proxyPort', 'proxyUser', 'proxyPass'], (result) => {
        const backupData = {
            exportDate: new Date().toISOString(),
            pageConfigs: result.pageConfigs || [],
            runHistory: result.runHistory || [],
            settings: {
                loopStrategy: result.loopStrategy,
                scheduleTimes: result.scheduleTimes,
                scheduleDays: result.scheduleDays,
                soundNotifyEnable: result.soundNotifyEnable,
                teleBotToken: result.teleBotToken,
                teleChatId: result.teleChatId,
                proxyEnable: result.proxyEnable,
                proxyHost: result.proxyHost,
                proxyPort: result.proxyPort,
                proxyUser: result.proxyUser,
                proxyPass: result.proxyPass
            }
        };
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AutoPin_Backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert("🎉 Đã xuất file Sao Lưu (Backup JSON) thành công!");
    });
});

// IMPORT RESTORE JSON
document.getElementById('btnImportBackup').addEventListener('click', () => {
    document.getElementById('fileBackupInput').click();
});

document.getElementById('fileBackupInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target.result);
            if (!data.pageConfigs) {
                return alert("❌ File backup không hợp lệ!");
            }
            const st = {
                pageConfigs: data.pageConfigs || [],
                runHistory: data.runHistory || []
            };
            if (data.settings) {
                Object.assign(st, data.settings);
            }
            chrome.storage.local.set(st, () => {
                alert(`🎉 Phục hồi dữ liệu thành công! Đã khôi phục ${data.pageConfigs.length} Mẫu Page và toàn bộ cài đặt.`);
                loadConfigs();
                loadRunPageOptions();
                renderHistoryTable();
            });
        } catch(err) {
            alert("❌ Lỗi đọc file Backup JSON: " + err.message);
        }
    };
    reader.readAsText(file);
});

setInterval(renderLogs, 2000);
loadRunPageOptions();
renderLogs();
updateStartButtonUI();

// BẢNG TRẠNG THÁI PROXY AUTO
function updateProxyDisplay() {
    updateProxyStatusUI();
}
setInterval(updateProxyDisplay, 1000);
updateProxyDisplay();
loadDeviceProfileUI();
    loadGeminiUI();



// XỬ LÝ LỰA CHỌN THIẾT BỊ CỐ ĐỊNH CHO PROFILE
function loadDeviceProfileUI() {
    chrome.storage.local.get(['deviceProfileKey'], (res) => {
        const key = res.deviceProfileKey || 'samsung_s24';
        const s1 = document.getElementById('selectDeviceProfile');
        const s2 = document.getElementById('selectDeviceProfile2');
        const l1 = document.getElementById('deviceActiveLabel');
        const l2 = document.getElementById('deviceActiveLabel2');

        if (s1) s1.value = key;
        if (s2) s2.value = key;

        const mapNames = {
            'samsung_s24': 'Samsung S24 Ultra',
            'iphone_14_pro_max': 'iPhone 14 Pro Max',
            'iphone_15': 'iPhone 15 Pro Max',
            'xiaomi_14': 'Xiaomi 14 Pro',
            'pixel_8': 'Pixel 8 Pro'
        };
        const text = mapNames[key] || 'Samsung S24 Ultra';
        if (l1) l1.innerText = text;
        if (l2) l2.innerText = text;
    });
}

function saveDeviceChoice(val) {
    chrome.storage.local.set({ deviceProfileKey: val }, () => {
        safeRuntimeSendMessage({ action: 'applyDeviceEmulation', deviceKey: val });
        loadDeviceProfileUI();
        alert('✅ ĐÃ LƯU THÀNH CÔNG: Profile này từ nay cố định là ' + val.toUpperCase() + '!');
    });
}

document.getElementById('btnSaveDeviceProfile')?.addEventListener('click', () => {
    saveDeviceChoice(document.getElementById('selectDeviceProfile').value);
});
document.getElementById('btnSaveDeviceProfile2')?.addEventListener('click', () => {
    saveDeviceChoice(document.getElementById('selectDeviceProfile2').value);
});



// NÚT TEST KIỂM TRA IP PROXY THỰC TẾ
// 🌐 NÚT TEST IP - KIỂM TRA QUA TAB WEB (TRAFFIC ĐI QUA PROXY)
document.getElementById('btnTestProxy')?.addEventListener('click', async () => {
    const statusBox = document.getElementById('activeProxyStatus');
    const btn = document.getElementById('btnTestProxy');
    if (btn) btn.innerText = '⏳ Đang test...';
    if (statusBox) {
        statusBox.innerText = '⏳ Đang kiểm tra IP qua proxy (trong tab web)...';
        statusBox.style.background = '#fff3cd';
        statusBox.style.color = '#856404';
        statusBox.style.borderColor = '#ffc107';
    }

    const startTime = Date.now();

    // Gọi background để inject script vào tab web -> traffic đi qua proxy
    chrome.runtime.sendMessage({ action: 'testProxyIP' }, (response) => {
        const responseTime = Date.now() - startTime;
        if (btn) btn.innerText = '⚡ TEST IP';

        if (response && response.success && response.ip) {
            const detectedIP = response.ip;
            chrome.storage.local.get(['proxyEnabled', 'proxyList', 'proxyCurrentIndex'], (st) => {
                if (st.proxyEnabled && st.proxyList && st.proxyList.length > 0) {
                    const idx = st.proxyCurrentIndex || 0;
                    const p = st.proxyList[idx % st.proxyList.length];
                    if (statusBox) {
                        statusBox.innerText = `✅ PROXY SỐNG | IP: ${detectedIP} | ${responseTime}ms`;
                        statusBox.style.background = '#d4edda';
                        statusBox.style.color = '#155724';
                        statusBox.style.borderColor = '#28a745';
                    }
                    const speed = responseTime < 2000 ? '🟢 TỐT' : responseTime < 5000 ? '🟡 TRUNG BÌNH' : '🔴 CHẬM';
                    alert(`✅ PROXY ĐANG HOẠT ĐỘNG!\n\n🌐 IP: ${detectedIP}\n📡 Proxy: ${p.host}:${p.port} (${p.type})\n⚡ Tốc độ: ${responseTime}ms ${speed}`);
                } else {
                    if (statusBox) {
                        statusBox.innerText = `🌐 IP thật: ${detectedIP} | ${responseTime}ms`;
                        statusBox.style.background = '#e7f3ff';
                        statusBox.style.color = '#1877f2';
                        statusBox.style.borderColor = '#1877f2';
                    }
                    alert(`🌐 IP THẬT: ${detectedIP}\n⚡ ${responseTime}ms\n\n⚠️ Chưa bật proxy.`);
                }
            });
        } else {
            const errMsg = response?.error || 'Không kết nối được';
            chrome.storage.local.get(['proxyEnabled', 'proxyList', 'proxyCurrentIndex'], (st) => {
                if (st.proxyEnabled && st.proxyList && st.proxyList.length > 0) {
                    const idx = st.proxyCurrentIndex || 0;
                    const p = st.proxyList[idx % st.proxyList.length];
                    if (statusBox) {
                        statusBox.innerText = `❌ PROXY CHẾT! ${p.host}:${p.port} (${responseTime}ms)`;
                        statusBox.style.background = '#f8d7da';
                        statusBox.style.color = '#721c24';
                        statusBox.style.borderColor = '#dc3545';
                    }
                    alert(`❌ PROXY CHẾT!\n\n📡 ${p.host}:${p.port} (${p.type})\n⏱️ ${responseTime}ms\n\n${errMsg}\n\n👉 Thay proxy khác hoặc kiểm tra lại!`);
                } else {
                    if (statusBox) {
                        statusBox.innerText = `❌ Lỗi: ${errMsg}`;
                        statusBox.style.background = '#f8d7da';
                        statusBox.style.color = '#721c24';
                        statusBox.style.borderColor = '#dc3545';
                    }
                    alert(`❌ ${errMsg}`);
                }
            });
        }
    });
});

// ==========================================
// GOOGLE GEMINI AI REAL INTEGRATION
// ==========================================
function loadGeminiUI() {
    chrome.storage.local.get(['geminiApiKey', 'geminiModel'], (res) => {
        const input = document.getElementById('geminiApiKeyInput');
        const select = document.getElementById('geminiModelSelect');
        const badge = document.getElementById('geminiStatusLabel');

        if (input && res.geminiApiKey) input.value = res.geminiApiKey;
        if (select && res.geminiModel) select.value = res.geminiModel;

        if (badge) {
            if (res.geminiApiKey && res.geminiApiKey.startsWith('AIzaSy')) {
                badge.innerText = '🟢 ĐÃ KÍCH HOẠT AI THẬT';
                badge.style.background = '#28a745';
                badge.style.color = '#fff';
            } else {
                badge.innerText = 'Chưa có Key';
                badge.style.background = '#e0e0e0';
                badge.style.color = '#333';
            }
        }
    });
}

document.getElementById('btnSaveGeminiKey')?.addEventListener('click', () => {
    const key = (document.getElementById('geminiApiKeyInput')?.value || '').trim();
    const model = document.getElementById('geminiModelSelect')?.value || 'gemini-2.0-flash';

    chrome.storage.local.set({ geminiApiKey: key, geminiModel: model }, () => {
        loadGeminiUI();
        alert('✅ ĐÃ LƯU CẤU HÌNH GOOGLE GEMINI AI THÀNH CÔNG!');
    });
});

document.getElementById('btnTestGeminiKey')?.addEventListener('click', async () => {
    const key = (document.getElementById('geminiApiKeyInput')?.value || '').trim();
    const model = document.getElementById('geminiModelSelect')?.value || 'gemini-2.0-flash';

    if (!key) return alert('Vui lòng điền mã Gemini API Key trước khi test!');

    const btn = document.getElementById('btnTestGeminiKey');
    if (btn) btn.innerText = '⏳ Đang test...';

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Viết 1 câu chào bán hàng đồ bộ cực ngắn gọn' }] }]
            })
        });
        const data = await res.json();
        if (data && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const answer = data.candidates[0].content.parts[0].text.trim();
            alert(`🎉 TEST KẾT NỐI GEMINI AI THÀNH CÔNG 100%!\n\n🤖 Gemini trả lời: "${answer}"\n\n👉 Bot hiện đã có TRÍ TUỆ NHÂN TẠO THẬT 100%!`);
        } else if (data.error) {
            alert(`⚠️ Lỗi từ Google API:\n- Mã lỗi: ${data.error.code}\n- Chi tiết: ${data.error.message}\n\n👉 Lưu ý: Nếu dự án Firebase chưa bật Generative Language API, sếp vào Google AI Studio lấy 1 Key mới miễn phí là xong ngay!`);
        } else {
            alert('⚠️ Không nhận được phản hồi từ AI.');
        }
    } catch(e) {
        alert('❌ Lỗi kết nối máy chủ Google: ' + e.message);
    } finally {
        if (btn) btn.innerText = '⚡ TEST AI';
    }
});
