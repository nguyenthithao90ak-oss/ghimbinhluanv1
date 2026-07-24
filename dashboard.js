let currentDashImageData = null;

function compressImage(file) {
    return new Promise((resolve) => {
        if (!file || !file.type || !file.type.match('image.*')) {
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
                const MAX_SIZE = 600;
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

function showDashImgPreview(dataUrl) {
    currentDashImageData = dataUrl;
    const container = document.getElementById('dashPreviewContainer');
    const img = document.getElementById('dashPreviewImg');
    if (container && img) {
        img.src = dataUrl;
        container.style.display = 'block';
    }
}

function hideDashImgPreview() {
    currentDashImageData = null;
    const fileInput = document.getElementById('dashImageFile');
    if (fileInput) fileInput.value = '';
    const container = document.getElementById('dashPreviewContainer');
    if (container) container.style.display = 'none';
}

// Xử lý dán ảnh Ctrl + V từ bộ nhớ tạm
document.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || window.clipboardData)?.items;
    if (!items) return;
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
                const compressedData = await compressImage(blob);
                if (compressedData) {
                    showDashImgPreview(compressedData);
                }
            }
        }
    }
});

document.getElementById('dashImageFile').addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
        const compressedData = await compressImage(e.target.files[0]);
        if (compressedData) showDashImgPreview(compressedData);
    }
});

document.getElementById('btnDashRemoveImg').addEventListener('click', () => {
    hideDashImgPreview();
});

// LOAD KHUNG MẪU ĐÃ LƯU
function loadDashboardConfigs() {
    chrome.storage.local.get(['pageConfigs'], (result) => {
        const configs = result.pageConfigs || [];
        const container = document.getElementById('dashConfigList');
        document.getElementById('statTotalConfigs').innerText = configs.length;

        if (configs.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">Chưa có mẫu nào. Hãy thêm ở khung bên trên!</div>';
            return;
        }

        container.innerHTML = configs.map((c, index) => `
            <div class="config-item">
                <div class="config-item-header">
                    <span class="config-item-title">📌 ${c.pageName}</span>
                    <div>
                        <button class="btn btn-warning btn-dash-edit" data-index="${index}" style="padding:2px 8px; font-size:10px; margin-right:4px;">✏️ Sửa</button>
                        <button class="btn btn-danger btn-dash-del" data-index="${index}" style="padding:2px 8px; font-size:10px;">Xóa</button>
                    </div>
                </div>
                <div class="config-item-body"><b>Nội dung ghim:</b> ${c.commentText}</div>
                ${c.imageData ? `<img src="${c.imageData}" class="config-item-img" alt="Ảnh đính kèm">` : ''}
            </div>
        `).join('');

        container.querySelectorAll('.btn-dash-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                chrome.storage.local.get(['pageConfigs'], (res) => {
                    const cfgs = res.pageConfigs || [];
                    const item = cfgs[idx];
                    if (item) {
                        document.getElementById('dashPageName').value = item.pageName;
                        document.getElementById('dashCommentText').value = item.commentText;
                        
                        if (item.imageData) {
                            showDashImgPreview(item.imageData);
                        } else {
                            hideDashImgPreview();
                        }

                        document.getElementById('dashConfigForm').scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        });

        container.querySelectorAll('.btn-dash-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                chrome.storage.local.get(['pageConfigs'], (res) => {
                    let currentConfigs = res.pageConfigs || [];
                    currentConfigs.splice(idx, 1);
                    chrome.storage.local.set({ pageConfigs: currentConfigs }, loadDashboardConfigs);
                });
            });
        });
    });
}

// XÓA TẤT CẢ MẪU
document.getElementById('btnDashClearConfigs').addEventListener('click', () => {
    if (confirm("Anh có chắc muốn xóa sạch toàn bộ Mẫu đã lưu không?")) {
        chrome.storage.local.set({ pageConfigs: [] }, loadDashboardConfigs);
    }
});

// FORM LƯU MẪU
document.getElementById('dashConfigForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pageName = document.getElementById('dashPageName').value.trim();
    const commentText = document.getElementById('dashCommentText').value.trim();
    const fileInput = document.getElementById('dashImageFile');

    if (!pageName || !commentText) return alert("Vui lòng điền đủ Tên Page và Nội dung!");

    let imageData = currentDashImageData;
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
            alert(`✅ Đã lưu cấu hình cho Page "${pageName}"!`);
            document.getElementById('dashConfigForm').reset();
            hideDashImgPreview();
            loadDashboardConfigs();
        });
    });
});

// REALTIME LOG CONSOLE
function renderDashboardLogs() {
    chrome.storage.local.get(['botLogs', 'isBotRunning'], (result) => {
        const logs = result.botLogs || [];
        const consoleBox = document.getElementById('dashLogConsole');
        if (logs.length === 0) {
            consoleBox.innerText = "Đang sẵn sàng... Vui lòng bấm Bắt Đầu Chạy Auto.";
        } else {
            consoleBox.innerText = logs.join('\n');
            consoleBox.scrollTop = consoleBox.scrollHeight;
        }

        const startBtn = document.getElementById('btnDashStart');
        const statStatus = document.getElementById('statStatus');
        if (result.isBotRunning) {
            startBtn.innerText = "🛑 DỪNG CHẠY BOT";
            startBtn.className = "btn btn-danger";
            statStatus.innerText = "🟢 Đang chạy...";
            statStatus.style.color = "#28a745";
        } else {
            startBtn.innerText = "🚀 BẮT ĐẦU CHẠY AUTO";
            startBtn.className = "btn btn-success";
            statStatus.innerText = "🔴 Đang dừng";
            statStatus.style.color = "#dc3545";
        }
    });
}

// RENDER LỊCH SỬ PHÂN THEO CÁC PHIÊN CHẠY
function renderDashboardHistory() {
    chrome.storage.local.get(['sessionHistory', 'runHistory'], (res) => {
        let sessions = res.sessionHistory || [];
        const flatHistory = res.runHistory || [];

        // TỰ ĐỘNG CHUYỂN ĐỔI LỊCH SỬ CŨ SANG DẠNG PHIÊN CHẠY NẾU CHƯA CÓ
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

        const container = document.getElementById('dashSessionList');
        
        let totalSuccess = 0;
        let totalLagged = 0;

        if (sessions.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">Chưa có phiên chạy nào. Vui lòng bấm Bắt Đầu Chạy Auto.</div>';
            document.getElementById('statSuccess').innerText = 0;
            document.getElementById('statLagged').innerText = 0;
            return;
        }

        container.innerHTML = sessions.map((sess, idx) => {
            totalSuccess += sess.successCount || 0;
            totalLagged += sess.lagCount || 0;

            const itemsHtml = (sess.items && sess.items.length > 0) ? sess.items.map((item, itemIdx) => {
                let badgeClass = "badge-success";
                let badgeText = "✅ Thành công";
                if (item.status && (item.status.includes('Lag') || item.status.includes('⚠️'))) {
                    badgeClass = "badge-warning";
                    badgeText = "⚠️ Bị Lag";
                } else if (item.status && (item.status.includes('Thất bại') || item.status.includes('❌'))) {
                    badgeClass = "badge-danger";
                    badgeText = "❌ Thất bại";
                }

                const logText = (item.logs && item.logs.length > 0) ? item.logs.join('\n') : '';

                return `
                    <tr style="border-bottom: 1px dashed #eee;">
                        <td style="font-size:11px; color:#666;">${item.time}</td>
                        <td style="font-weight:bold; color:#111;">${item.pageName}</td>
                        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                        <td style="font-size:12px; color:#444;">
                            ${item.details}
                            ${logText ? `<br><button class="btn btn-secondary btn-toggle-item-log" data-log-id="log_${idx}_${itemIdx}" style="padding:2px 6px; font-size:10px; margin-top:4px;">📜 Xem Nhật Ký Log</button>
                            <div id="log_${idx}_${itemIdx}" class="item-log-box">${logText}</div>` : ''}
                        </td>
                    </tr>
                `;
            }).join('') : '<tr><td colspan="4" style="text-align:center; padding:10px; color:#999;">Chưa có chi tiết nào trong phiên này.</td></tr>';

            return `
                <div class="session-card ${idx === 0 ? 'active' : ''}">
                    <div class="session-header" data-session-index="${idx}">
                        <div class="session-title">
                            <span>🚀 Phiên #${sessions.length - idx}</span>
                            <span style="font-size:12px; color:#666; font-weight:normal;">(${sess.startTime})</span>
                        </div>
                        <div class="session-stats">
                            <span style="color:#28a745;">✅ ${sess.successCount || 0} Thành công</span>
                            <span style="color:#ffc107;">⚠️ ${sess.lagCount || 0} Bị lag</span>
                            <span style="color:#1877f2;">👁️ Xem Chi Tiết 🔽</span>
                        </div>
                    </div>
                    <div class="session-body">
                        <table style="width:100%;">
                            <thead>
                                <tr style="background:#f0f4f9;">
                                    <th>Thời Gian</th>
                                    <th>Tên Nick / Page</th>
                                    <th>Trạng Thái</th>
                                    <th>Chi Tiết Thao Tác Đã Thực Hiện</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('statSuccess').innerText = totalSuccess;
        document.getElementById('statLagged').innerText = totalLagged;

        // Gắn sự kiện click Thu gọn / Mở rộng Thẻ Phiên
        container.querySelectorAll('.session-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const card = header.closest('.session-card');
                card.classList.toggle('active');
            });
        });

        // Gắn sự kiện ẩn/hiện log từng trang
        container.querySelectorAll('.btn-toggle-item-log').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const logId = btn.getAttribute('data-log-id');
                const logBox = document.getElementById(logId);
                if (logBox) {
                    logBox.style.display = (logBox.style.display === 'block') ? 'none' : 'block';
                }
            });
        });
    });
}

document.getElementById('btnDashClearHistory').addEventListener('click', () => {
    if (confirm("Xóa toàn bộ lịch sử chạy của tất cả các phiên?")) {
        chrome.storage.local.set({ sessionHistory: [], runHistory: [] }, renderDashboardHistory);
    }
});

// TOGGLE START / STOP BOT
document.getElementById('btnDashStart').addEventListener('click', () => {
    chrome.storage.local.get(['isBotRunning', 'pageConfigs'], (result) => {
        if (result.isBotRunning) {
            chrome.storage.local.set({ isBotRunning: false }, () => {
                chrome.runtime.sendMessage({ action: "stopBotProcess" });
                renderDashboardLogs();
            });
        } else {
            const configs = result.pageConfigs || [];
            if (configs.length === 0) return alert('Vui lòng thêm ít nhất 1 Mẫu Page trước khi chạy!');

            chrome.storage.local.set({ 
                isBotRunning: true,
                botLogs: [`[${new Date().toLocaleTimeString()}] 🚀 Bắt đầu chạy tiến trình từ Dashboard...`] 
            }, () => {
                chrome.runtime.sendMessage({
                    action: "startMultiAccountProcess",
                    targetConfigs: configs
                });
                renderDashboardLogs();
            });
        }
    });
});

// EXPORT BACKUP JSON
document.getElementById('btnDashExport').addEventListener('click', () => {
    chrome.storage.local.get(['pageConfigs', 'runHistory'], (result) => {
        const backupData = {
            exportDate: new Date().toISOString(),
            pageConfigs: result.pageConfigs || [],
            runHistory: result.runHistory || []
        };
        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AutoPin_Backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert("🎉 Đã xuất file Sao Lưu Backup JSON thành công!");
    });
});

// IMPORT RESTORE JSON
document.getElementById('btnDashImport').addEventListener('click', () => {
    document.getElementById('dashBackupFileInput').click();
});

document.getElementById('dashBackupFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target.result);
            if (!data.pageConfigs) return alert("❌ File backup không hợp lệ!");
            chrome.storage.local.set({
                pageConfigs: data.pageConfigs || [],
                runHistory: data.runHistory || []
            }, () => {
                alert(`🎉 Khôi phục dữ liệu thành công! Đã nạp ${data.pageConfigs.length} Mẫu Page.`);
                loadDashboardConfigs();
                renderDashboardHistory();
            });
        } catch(err) {
            alert("❌ Lỗi đọc file Backup JSON: " + err.message);
        }
    };
    reader.readAsText(file);
});

// INIT DASHBOARD
loadDashboardConfigs();
renderDashboardLogs();
renderDashboardHistory();
setInterval(renderDashboardLogs, 1500);
setInterval(renderDashboardHistory, 3000);
