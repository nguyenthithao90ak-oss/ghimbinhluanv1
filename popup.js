
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
    { pageName: "Thế Giới Di Động", commentText: "em thanh lý xả hàng điện thoại tại đây https://s.shopee.vn/6pzLOWcrRM", imageData: "" },
    { pageName: "Nguyễn Thao Đồ Bộ", commentText: "Em xả hàng đồ bộ tại đây các chị nhấn vào chọn size luôn nhen https://muadosale.web.app/dobogiare", imageData: "" },
    { pageName: "shop quần giá rẻ", commentText: "mấy chị ấn đây để đặt giúp em nha https://muadosale.web.app/tonghopquan", imageData: "" },
    { pageName: "Quần Đẹp Giá Rẻ", commentText: "mấy chị ấn đây để đặt giúp em nha https://muadosale.web.app/tonghopquan", imageData: "" },
    { pageName: "Shop Đồ Xinh", commentText: "mấy chị ấn đây để đặt giúp em nha https://muadosale.web.app/tonghopquan", imageData: "" },
    { pageName: "Trái Cây Miền Quê", commentText: "{Em xả hàng sầu riêng tại đây|Mình xả hàng sầu riêng tại đây nhé|Xả hàng sầu riêng tại đây ấn vào để đặt hàng|Shop xả kho sầu riêng giá rẻ tại đây nè} https://mua-do-re.web.app/saurieng", imageData: "" },
    { pageName: "Vựa Trái Cây Chị Năm", commentText: "{Em xả hàng sầu riêng tại đây|Mình xả hàng sầu riêng tại đây nhé|Xả hàng sầu riêng tại đây ấn vào để đặt hàng|Shop xả kho sầu riêng giá rẻ tại đây nè} https://mua-do-re.web.app/saurieng", imageData: "" },
    { pageName: "Shop Đồ Bộ Thao Thao", commentText: "Em xả hàng đồ bộ tại đây các chị nhấn vào chọn size luôn nhen https://muadosale.web.app/dobogiare", imageData: "" },
    { pageName: "Xưởng May Đồ Bộ", commentText: "Em xả hàng đồ bộ tại đây các chị nhấn vào chọn size luôn nhen https://muadosale.web.app/dobogiare", imageData: "" },
    { pageName: "Trái Cây Anh Ba", commentText: "{Em xả hàng sầu riêng tại đây|Mình xả hàng sầu riêng tại đây nhé|Xả hàng sầu riêng tại đây ấn vào để đặt hàng|Shop xả kho sầu riêng giá rẻ tại đây nè} https://mua-do-re.web.app/saurieng", imageData: "" }
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

// LOG MONITOR REALTIME
function renderLogs() {
    chrome.storage.local.get(['botLogs'], (result) => {
        const logs = result.botLogs || [];
        const logBox = document.getElementById('logContainer');
        if (logs.length === 0) {
            logBox.innerText = "Đang sẵn sàng... Vui lòng bấm Bắt Đầu.";
            return;
        }
        logBox.innerText = logs.join('\n');
        logBox.scrollTop = logBox.scrollHeight;
    });
}

document.getElementById('btnClearLog').addEventListener('click', () => {
    chrome.storage.local.set({ botLogs: [] }, () => {
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

// Load configs from storage
function loadConfigs() {
    chrome.storage.local.get(['pageConfigs'], (result) => {
        let configs = result.pageConfigs || [];

        if (configs.length === 0) {
            configs = DEFAULT_PRESET_PAGES;
            chrome.storage.local.set({ pageConfigs: configs });
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
document.getElementById('btnSaveProxy').addEventListener('click', () => {
    const enabled = document.getElementById('proxyEnable').checked;
    const host = document.getElementById('proxyHost').value.trim();
    const port = parseInt(document.getElementById('proxyPort').value.trim()) || 49064;
    const username = document.getElementById('proxyUser').value.trim();
    const password = document.getElementById('proxyPass').value.trim();

    chrome.storage.local.set({
        proxyEnable: enabled,
        proxyHost: host,
        proxyPort: port,
        proxyUser: username,
        proxyPass: password
    }, () => {
        chrome.runtime.sendMessage({ action: "updateProxySettings" });
        alert(enabled ? `✅ ĐÃ BẬT PROXY (${host}:${port})!` : '🛑 ĐÃ TẮT PROXY (DÙNG MẠNG GỐC WI-FI)!');
    });
});

function loadTeleConfig() {
    chrome.storage.local.get(['teleBotToken', 'teleChatId'], (st) => {
        if (st.teleBotToken) document.getElementById('teleBotToken').value = st.teleBotToken;
        if (st.teleChatId) document.getElementById('teleChatId').value = st.teleChatId;
    });
}

function loadProxyConfig() {
    chrome.storage.local.get(['proxyEnable', 'proxyHost', 'proxyPort', 'proxyUser', 'proxyPass'], (st) => {
        const enabled = st.proxyEnable !== undefined ? st.proxyEnable : true;
        document.getElementById('proxyEnable').checked = enabled;
        document.getElementById('proxyHost').value = st.proxyHost || "103.162.30.61";
        document.getElementById('proxyPort').value = st.proxyPort || 49064;
        document.getElementById('proxyUser').value = st.proxyUser || "user49064";
        document.getElementById('proxyPass').value = st.proxyPass || "Gd6O4RL1gK";
    });
}

// KHÔI PHỤC CẤU HÌNH KHI MỞ TAB
document.getElementById('tabConfigBtn').addEventListener('click', () => {
    loadTeleConfig();
    loadProxyConfig();
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
                chrome.runtime.sendMessage({ action: "stopBotProcess" });
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
            chrome.runtime.sendMessage({
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
    chrome.storage.local.get(['activeProxy'], (res) => {
        const el = document.getElementById('activeProxyStatus');
        if (el) {
            if (res.activeProxy) {
                el.innerText = 'Đang dùng Proxy: ' + res.activeProxy;
                el.style.color = '#fff';
                el.style.background = '#28a745';
                el.style.borderColor = '#28a745';
            } else {
                el.innerText = 'Đang dùng mạng gốc (Wi-Fi)';
                el.style.color = '#1877f2';
                el.style.background = '#e7f3ff';
                el.style.borderColor = '#1877f2';
            }
        }
    });
}
setInterval(updateProxyDisplay, 1000);
updateProxyDisplay();
loadDeviceProfileUI();



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
        chrome.runtime.sendMessage({ action: 'applyDeviceEmulation', deviceKey: val });
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
document.getElementById('btnTestProxy')?.addEventListener('click', async () => {
    const statusBox = document.getElementById('activeProxyStatus');
    if (statusBox) {
        statusBox.innerText = '⏳ Đang kiểm tra kết nối IP thực tế...';
        statusBox.style.background = '#fff3cd';
        statusBox.style.color = '#856404';
        statusBox.style.borderColor = '#ffeeba';
    }

    try {
        const res = await fetch('http://ip-api.com/json/?nocache=' + Date.now());
        const data = await res.json();
        if (data && data.query) {
            const isProxy = data.query === '103.162.30.61' || data.org?.includes('BKNS') || data.city === 'Hanoi';
            if (statusBox) {
                statusBox.innerText = `🌐 IP Hiện Tại: ${data.query} (${data.city}, ${data.country})`;
                statusBox.style.background = '#d4edda';
                statusBox.style.color = '#155724';
                statusBox.style.borderColor = '#c3e6cb';
            }
            alert(`✅ KẾT QUẢ KIỂM TRA IP:\n- Địa chỉ IP: ${data.query}\n- Nhà mạng/Vùng: ${data.isp || data.org} (${data.city})\n\n${isProxy ? '👉 ĐANG CHẠY QUA PROXY CHUẨN XÁC!' : '👉 Lưu ý: Đang nhận diện IP mạng gốc (Do Proxy hết hạn hoặc chưa kích hoạt).'}`);
        } else {
            throw new Error('Không nhận được dữ liệu IP');
        }
    } catch (e) {
        if (statusBox) {
            statusBox.innerText = '⚠️ Proxy không phản hồi (502 / Hết hạn)';
            statusBox.style.background = '#f8d7da';
            statusBox.style.color = '#721c24';
            statusBox.style.borderColor = '#f5c6cb';
        }
        alert('⚠️ Không thể kết nối qua Proxy:\n- Mã lỗi: ' + e.message + '\n\n👉 Khuyên dùng: Kiểm tra lại gói Proxy xem có bị hết hạn hoặc thay IP mới nhé sếp!');
    }
});
