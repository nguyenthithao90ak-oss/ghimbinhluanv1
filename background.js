
// --------------------------------------------------------------------------------------
// 📱 THIẾT BỊ CỐ ĐỊNH CHO TỪNG PROFILE (MULTI-PROFILE HARDWARE FINGERPRINT)
// --------------------------------------------------------------------------------------
const DEVICE_DATABASE = {
    'samsung_s24': {
        name: 'Samsung Galaxy S24 Ultra',
        ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
        platform: 'Android',
        model: 'SM-S928B',
        version: '14.0.0',
        secChUa: '"Chromium";v="128", "Google Chrome";v="128", "Not;A=Brand";v="24"',
        jsPlatform: 'Linux armv8l',
        screenWidth: 412,
        screenHeight: 915,
        dpr: 3.5,
        gpuVendor: 'Qualcomm',
        gpuRenderer: 'Adreno (TM) 750'
    },
    'iphone_14_pro_max': {
        name: 'iPhone 14 Pro Max',
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        platform: 'iOS',
        model: 'iPhone15,3',
        version: '17.5.1',
        secChUa: '"Not/A)Brand";v="8", "Chromium";v="128", "Safari";v="17"',
        jsPlatform: 'iPhone',
        screenWidth: 430,
        screenHeight: 932,
        dpr: 3.0,
        gpuVendor: 'Apple Inc.',
        gpuRenderer: 'Apple A16 GPU'
    },
    'iphone_15': {
        name: 'iPhone 15 Pro Max',
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        platform: 'iOS',
        model: 'iPhone16,2',
        version: '17.5.1',
        secChUa: '"Not/A)Brand";v="8", "Chromium";v="128", "Safari";v="17"',
        jsPlatform: 'iPhone',
        screenWidth: 430,
        screenHeight: 932,
        dpr: 3.0,
        gpuVendor: 'Apple Inc.',
        gpuRenderer: 'Apple A17 GPU'
    },
    'xiaomi_14': {
        name: 'Xiaomi 14 Pro',
        ua: 'Mozilla/5.0 (Linux; Android 14; 23116PN5BC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
        platform: 'Android',
        model: '23116PN5BC',
        version: '14.0.0',
        secChUa: '"Chromium";v="128", "Google Chrome";v="128", "Not;A=Brand";v="24"',
        jsPlatform: 'Linux aarch64',
        screenWidth: 412,
        screenHeight: 915,
        dpr: 3.5,
        gpuVendor: 'Qualcomm',
        gpuRenderer: 'Adreno (TM) 750'
    }
};

function applyDeviceEmulationFromStorage() {
    if (typeof chrome === 'undefined' || !chrome.declarativeNetRequest) return;
    chrome.storage.local.get(['deviceProfileKey'], (res) => {
        const key = res.deviceProfileKey || 'samsung_s24';
        const dev = DEVICE_DATABASE[key] || DEVICE_DATABASE['samsung_s24'];
        
        try {
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [1, 2],
                addRules: [
                    {
                        id: 1,
                        priority: 1,
                        action: {
                            type: 'modifyHeaders',
                            requestHeaders: [
                                { header: 'User-Agent', operation: 'set', value: dev.ua },
                                { header: 'sec-ch-ua-mobile', operation: 'set', value: '?1' },
                                { header: 'sec-ch-ua-platform', operation: 'set', value: `"${dev.platform}"` },
                                { header: 'sec-ch-ua-model', operation: 'set', value: `"${dev.model}"` },
                                { header: 'sec-ch-ua-platform-version', operation: 'set', value: `"${dev.version}"` },
                                { header: 'sec-ch-ua', operation: 'set', value: dev.secChUa }
                            ]
                        },
                        condition: {
                            urlFilter: '||facebook.com',
                            resourceTypes: [
                                'main_frame', 'sub_frame', 'stylesheet', 'script', 'image',
                                'font', 'object', 'xmlhttprequest', 'ping', 'csp_report',
                                'media', 'websocket', 'other'
                            ]
                        }
                    }
                ]
            }, () => {
                console.log(`📱 [DEVICE ENGINE] Đã kích hoạt cố định thiết bị: ${dev.name}`);
            });
        } catch (e) {
            console.error('Lỗi nạp thiết bị:', e);
        }
    });
}
applyDeviceEmulationFromStorage();

// ======================================================================================
// CẤU HÌNH PROXY HTTP (SẴN SÀNG THÊM DANH SÁCH PROXY HTTP TẠI ĐÂY)
// Định dạng: { host: "ip", port: 1234, user: "user", pass: "pass" }
// Hoặc để mảng rỗng [] nếu muốn chạy trực tiếp bằng mạng Wi-Fi gốc
// ======================================================================================
let currentProxyIndex = 0;

const HTTP_PROXIES = [
    { host: "103.162.30.61", port: 49064, user: "user49064", pass: "Gd6O4RL1gK" }
];

// Luôn đảm bảo xóa proxy khi khởi động nếu không có HTTP proxy nào trong danh sách
if (typeof chrome !== 'undefined' && chrome.proxy) {
    if (HTTP_PROXIES.length === 0) {
        chrome.proxy.settings.clear({ scope: "regular" }, () => {
            chrome.storage.local.set({ activeProxy: "Mạng gốc (Wi-Fi)" });
            console.log("🛑 Đang sử dụng mạng gốc (Không dùng Proxy).");
        });
    }
}

chrome.webRequest.onAuthRequired.addListener(
    (details, callbackFn) => {
        if (details.isProxy) {
            chrome.storage.local.get(['proxyUser', 'proxyPass'], (st) => {
                const user = st.proxyUser || (HTTP_PROXIES.length > 0 ? HTTP_PROXIES[0].user : '');
                const pass = st.proxyPass || (HTTP_PROXIES.length > 0 ? HTTP_PROXIES[0].pass : '');
                if (user) {
                    callbackFn({ authCredentials: { username: user, password: pass || "" } });
                    return;
                }
                callbackFn({});
            });
            return;
        }
        callbackFn({});
    },
    { urls: ["<all_urls>"] },
    ["asyncBlocking"]
);

// TỰ ĐỘNG KHỞI TẠO VÀ LƯU PROXY VÀO STORAGE KHI KHỞI ĐỘNG
chrome.storage.local.get(['proxyHost', 'proxyPort', 'proxyUser', 'proxyPass', 'proxyEnable'], (st) => {
    if (!st.proxyHost || !st.proxyPort) {
        chrome.storage.local.set({
            proxyEnable: true,
            proxyScheme: 'http',
            proxyHost: '103.162.30.61',
            proxyPort: 49064,
            proxyUser: 'user49064',
            proxyPass: 'Gd6O4RL1gK'
        }, () => {
            applyProxyFromStorage();
        });
    } else {
        applyProxyFromStorage();
    }
});

function applyProxyFromStorage() {
    if (typeof chrome === 'undefined' || !chrome.proxy) return;

    chrome.storage.local.get(['proxyEnable', 'proxyScheme', 'proxyHost', 'proxyPort', 'proxyUser', 'proxyPass'], (st) => {
        const isEnabled = st.proxyEnable !== undefined ? st.proxyEnable : true;
        const scheme = st.proxyScheme || 'http';
        const host = st.proxyHost || (HTTP_PROXIES.length > 0 ? HTTP_PROXIES[0].host : '');
        const port = st.proxyPort || (HTTP_PROXIES.length > 0 ? HTTP_PROXIES[0].port : 0);

        if (!isEnabled || !host || !port) {
            chrome.proxy.settings.clear({ scope: "regular" }, () => {
                chrome.storage.local.set({ activeProxy: "Mạng gốc (Wi-Fi)" });
                console.log("🛑 Đang sử dụng mạng gốc (Không dùng Proxy).");
            });
            return;
        }

        try {
            const proxySettings = {
                mode: "fixed_servers",
                rules: {
                    singleProxy: { scheme: scheme, host: host, port: parseInt(port) },
                    bypassList: ["localhost", "127.0.0.1", "api.telegram.org"]
                }
            };
            chrome.proxy.settings.set({ value: proxySettings, scope: "regular" }, () => {
                const proxyStr = `${scheme.toUpperCase()} ${host}:${port}`;
                chrome.storage.local.set({ activeProxy: proxyStr });
                console.log(`✅ Đã BẬT Proxy: ${proxyStr}`);
                addLog(`🌐 Đã BẬT Proxy: ${proxyStr}`);
            });
        } catch (e) {
            console.error("Lỗi cấu hình Proxy:", e);
        }
    });
}

// ĐĂNG KÝ ALARM TELEGRAM POLL (thay setInterval để không bị Chrome sleep)
chrome.alarms.get('telegramPoll', (existing) => {
    if (!existing) {
        chrome.alarms.create('telegramPoll', { periodInMinutes: 0.25 }); // Poll mỗi 15 giây
    }
});

function shuffleArray(array) {
    if (!array || !Array.isArray(array)) return [];
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function addLog(msg) {
    chrome.storage.local.get(['botLogs'], (result) => {
        let logs = result.botLogs || [];
        logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
        chrome.storage.local.set({ botLogs: logs });
    });
}

function startNewSession(targetConfigs) {
    const timeStr = new Date().toLocaleTimeString();
    const dateStr = new Date().toLocaleDateString();
    const sessionId = "SESSION_" + Date.now();
    const totalPages = targetConfigs ? targetConfigs.length : 1;

    const sessionObj = {
        id: sessionId,
        startTime: `${dateStr} ${timeStr}`,
        totalPages: totalPages,
        successCount: 0,
        lagCount: 0,
        items: []
    };

    chrome.storage.local.get(['sessionHistory'], (res) => {
        let sessions = res.sessionHistory || [];
        sessions.unshift(sessionObj);
        if (sessions.length > 50) sessions = sessions.slice(0, 50);
        chrome.storage.local.set({ currentSessionId: sessionId, sessionHistory: sessions });
    });
}

function printSessionReport(repeatInfoStr = '') {
    chrome.storage.local.get(['sessionHistory', 'teleBotToken', 'teleChatId'], (res) => {
        const sessions = res.sessionHistory || [];
        if (sessions.length === 0) return;
        const currentSess = sessions[0];
        
        let successArr = [];
        let failArr = [];
        
        currentSess.items.forEach(item => {
            if (item.status.includes('✅') || item.status.includes('ℹ️')) {
                if (!successArr.some(p => p.name === item.pageName)) successArr.push({name: item.pageName, time: item.time});
            } else if (item.status.includes('⚠️') || item.status.includes('âŒ')) {
                if (!failArr.some(p => p.name === item.pageName)) failArr.push({name: item.pageName, time: item.time});
            }
        });
        
        // Lọc bỏ những page đã bị lag nhưng sau đó thử lại thành công
        failArr = failArr.filter(p => !successArr.some(sp => sp.name === p.name));
        
        let reportStr = `📊 BÁO CÁO TỔNG KẾT PHIÊN CHẠY 📊\n`;
        reportStr += `------------------------------------\n`;
        reportStr += `✅ THÀNH CÔNG: ${successArr.length} Page\n`;
        if (successArr.length === 0) {
            reportStr += `   (Không có)\n`;
        } else {
            successArr.forEach((p, i) => {
                const idx = (i + 1 < 10) ? ` ${i + 1}` : `${i + 1}`;
                reportStr += ` ${idx}. 🟢 TK "${p.name}" [${p.time}]\n`;
            });
        }
        
        reportStr += `------------------------------------\n`;
        reportStr += `⚠️ BỊ LAG / LỖI: ${failArr.length} Page\n`;
        if (failArr.length === 0) {
            reportStr += `🎉 Trạng thái: Hoàn hảo! (0 lỗi)\n`;
        } else {
            failArr.forEach((p, i) => {
                const idx = (i + 1 < 10) ? ` ${i + 1}` : `${i + 1}`;
                reportStr += ` ${idx}. 🔴 TK "${p.name}" [${p.time}]\n`;
            });
        }

        if (repeatInfoStr) {
            reportStr += `------------------------------------\n`;
            reportStr += `📌 TRẠNG THÁI TIẾP THEO:\n${repeatInfoStr}\n`;
        }
        reportStr += `------------------------------------\n`;
        
        addLog(reportStr);

        // Gửi qua Telegram (Tự động cập nhật báo cáo tổng kết)
        const botToken = (res.teleBotToken && res.teleBotToken.trim()) ? res.teleBotToken.trim() : '8678529806:AAHwNim4fRvpg9GbLZytVK6glrJiL8Zvl8o';
        const chatId = (res.teleChatId && res.teleChatId.trim()) ? res.teleChatId.trim() : '6139045056';

        if (botToken && chatId) {
            const teleMsg = reportStr.trim();
            const teleUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
            fetch(teleUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: teleMsg
                })
            }).then(response => {
                if(response.ok) addLog('🚀 Đã bắn báo cáo tổng kết phiên qua Telegram thành công!');
                else addLog('⚠️ Lỗi bắn Telegram: Vui lòng kiểm tra lại Token / Chat ID.');
            }).catch(err => {
                addLog('⚠️ Lỗi kết nối Telegram: ' + err.message);
            });
        }
    });
}

function addHistoryRecord(pageName, status, details) {
    const timeStr = new Date().toLocaleTimeString();
    const dateStr = new Date().toLocaleDateString();
    
    chrome.storage.local.get(['sessionHistory', 'currentSessionId', 'botLogs', 'runHistory'], (res) => {
        let sessions = res.sessionHistory || [];
        let currentId = res.currentSessionId;
        let session = sessions.find(s => s.id === currentId);

        if (!session) {
            session = {
                id: "SESSION_" + Date.now(),
                startTime: `${dateStr} ${timeStr}`,
                totalPages: 1,
                successCount: 0,
                lagCount: 0,
                items: []
            };
            sessions.unshift(session);
            currentId = session.id;
        }

        const isLag = status.includes('Lag') || status.includes('⚠️ ');
        if (isLag) session.lagCount++;
        else session.successCount++;

        const recentLogs = (res.botLogs || []).slice(-12);

        session.items.push({
            time: `${dateStr} ${timeStr}`,
            pageName: pageName || "Không xác định",
            status: status,
            details: details || "Đã kiểm tra / Đăng bài",
            logs: recentLogs
        });

        // Giữ tương thích phẳng cho runHistory cũ
        let flatHistory = res.runHistory || [];
        flatHistory.unshift({
            time: `${dateStr} ${timeStr}`,
            pageName: pageName || "Không xác định",
            status: status,
            details: details || "Đã kiểm tra / Đăng bài"
        });

        // AUTO-CLEAN: Giữ tối đa 30 Phiên gần nhất và 1000 bản ghi lịch sử phẳng
        if (sessions.length > 30) sessions = sessions.slice(0, 30);
        if (flatHistory.length > 1000) flatHistory = flatHistory.slice(0, 1000);

        chrome.storage.local.set({ 
            sessionHistory: sessions, 
            runHistory: flatHistory,
            currentSessionId: currentId 
        });

        // 📱 BẮN TIN TELEGRAM REALTIME mỗi khi 1 nick hoàn thành
        chrome.storage.local.get(['teleBotToken', 'teleChatId', 'targetConfigs', 'currentConfigIndex', 'retryQueue'], (teleRes) => {
            // Dùng token từ storage, hoặc fallback token cứng nếu chưa lưu
            const botToken = (teleRes.teleBotToken && teleRes.teleBotToken.trim()) 
                             ? teleRes.teleBotToken.trim() 
                             : '8678529806:AAHwNim4fRvpg9GbLZytVK6glrJiL8Zvl8o';
            const chatId   = (teleRes.teleChatId && teleRes.teleChatId.trim()) 
                             ? teleRes.teleChatId.trim() 
                             : '6139045056';

            const isAlreadyPinned = status.includes('ℹ️') || status.toLowerCase().includes('sẵn');
            const isLagged        = status.includes('⚠️') || status.toLowerCase().includes('lag');
            const isSuccess       = status.includes('✅');

            let actionText = '';
            if (isAlreadyPinned) {
                actionText = `ℹ️ Bỏ qua (Đã ghim từ trước): "${pageName}"`;
            } else if (isLagged) {
                actionText = `⚠️ Bị Lag (Sẽ thử lại): "${pageName}"`;
                playNotificationSound('warning', '⚠️ CẢNH BÁO NICK BỊ LAG', `Nick "${pageName}" bị lag bình luận, đã xếp vào hàng đợi.`);
            } else if (isSuccess) {
                actionText = `✅ Ghim thành công: "${pageName}" [${timeStr}]`;
                playNotificationSound('success', '✅ GHIM THÀNH CÔNG', `Nick "${pageName}" đã được ghim bình luận thành công!`);
            } else {
                return;
            }

            const configs = teleRes.targetConfigs || [];
            const currentIdx = teleRes.currentConfigIndex || 0;
            const retryQueue = teleRes.retryQueue || [];
            const remaining = Math.max(0, configs.length - currentIdx - 1);

            let statusLine = `📊 Còn lại: ${remaining} nick`;
            if (retryQueue.length > 0) {
                statusLine += ` | Thử lại: ${retryQueue.length}`;
            }

            msg = `${actionText}\n${statusLine}`;

            console.log(`[TELEGRAM REALTIME] Gửi tin: ${msg}`);
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ chat_id: chatId, text: msg })
            }).then(r => r.json()).then(result => {
                if (result.ok) {
                    console.log(`[TELEGRAM REALTIME] \u2705 G\u1eedi th\u00e0nh c\u00f4ng: ${msg}`);
                    addLog(`\ud83d\udcf1 Telegram: ${msg}`);
                } else {
                    console.error(`[TELEGRAM REALTIME] \u274c L\u1ed7i: ${JSON.stringify(result)}`);
                    addLog(`\ud83d\udcf1 Telegram l\u1ed7i: ${result.description}`);
                }
            }).catch(err => {
                console.error(`[TELEGRAM REALTIME] \u274c K\u1ebft n\u1ed1i th\u1ea5t b\u1ea1i: ${err.message}`);
            });
        });
    });
}

function processNextStep() {
    chrome.storage.local.get(['isBotRunning', 'isScheduleWaiting', 'targetConfigs', 'currentConfigIndex', 'tabId', 'step'], (state) => {
        if (!state.isBotRunning) return;
        if (state.isScheduleWaiting || state.step === "SCHEDULE_WAITING") return; // Tuyệt đối KHÔNG chạy tab khi đang đếm ngược chờ Giờ Vàng!
        
        let { targetConfigs, currentConfigIndex, tabId, step } = state;
        
        if (step === "FINISH") {
            addLog("🎉 ĐÃ HOÀN THÀNH CHU TRÌNH CHO TẤT CẢ CÁC PAGE!");
            chrome.storage.local.set({ isBotRunning: false });
            if (typeof chrome !== 'undefined' && chrome.proxy) {
                chrome.proxy.settings.clear({ scope: "regular" });
                chrome.storage.local.set({ activeProxy: "" });
            }
            if (tabId) {
                try {
                    chrome.tabs.remove(tabId);
                    addLog("🚪 Đã tự động đóng tab vừa hoàn thành!");
                } catch(e) {}
            }
            return;
        }

        if (step === "WAIT_PROFILE") {
            chrome.tabs.update(tabId, { url: "https://m.facebook.com/profile.php" });
        } else if (step === "NAVIGATING_PROFILE") {
            chrome.tabs.update(tabId, { url: "https://m.facebook.com/profile.php" });
        } else if (step === "SWITCHING") {
            const pageName = targetConfigs[currentConfigIndex]?.pageName;
            if (pageName) {
                if (state.isRetryPhase) {
                    addLog(`🔄 [THỬ LẠI HÀNG CHỜ LỖI] Đang thử lại tài khoản bị lỗi: "${pageName}"...`);
                } else {
                    addLog(`🔄 Chuyển sang Menu để đổi nick "${pageName}"...`);
                }
            }
            chrome.tabs.update(tabId, { url: "https://m.facebook.com/bookmarks/" });
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "applyDeviceEmulation") {
            applyDeviceEmulationFromStorage();
            return;
        }
        if (request.action === "reloadProxy") {
            applyProxyFromStorage();
            return;
        }
    if(request.action === 'updateProxySettings') { return; }

    if (request.action === "ping") {
        sendResponse({ status: "alive" });
        return;
    }



    if (request.action === "stopBotProcess") {
        chrome.alarms.clearAll(() => {
            chrome.alarms.create('telegramPoll', { periodInMinutes: 0.25 });
        });
        chrome.storage.local.set({ isBotRunning: false, isScheduleWaiting: false, step: "STOPPED" });
        if (typeof chrome !== 'undefined' && chrome.proxy) {
            chrome.proxy.settings.clear({ scope: "regular" }, () => {
                chrome.storage.local.set({ activeProxy: "" });
                addLog("🛑 Đã gỡ bỏ Proxy, trở về mạng gốc.");
            });
        }
        addLog("🛑 ĐÃ DỪNG LẠI HOÀN TOÀN TẤT CẢ TÁC VỤ & HẸN GIỜ BOT!");
        console.log("🛑 Dừng tiến trình BOT");
        return;
    }

        if (request.action === "startMultiAccountProcess") {
        const rawConfigs = request.targetConfigs || [];
        if (rawConfigs.length === 0) return;
        
        // Nếu có cấu hình HTTP_PROXIES thì áp dụng xoay vòng Proxy HTTP
        if (HTTP_PROXIES.length > 0 && typeof chrome !== 'undefined' && chrome.proxy) {
            const p = HTTP_PROXIES[currentProxyIndex];
            currentProxyIndex = (currentProxyIndex + 1) % HTTP_PROXIES.length;
            const proxyConfig = {
                mode: "fixed_servers",
                rules: {
                    singleProxy: { scheme: "http", host: p.host, port: parseInt(p.port) },
                    bypassList: ["localhost", "127.0.0.1"]
                }
            };
            chrome.proxy.settings.set({ value: proxyConfig, scope: "regular" }, () => {
                chrome.storage.local.set({ activeProxy: `HTTP ${p.host}:${p.port}` });
                addLog(`🌐 Đã đổi IP sang Proxy HTTP: ${p.host}:${p.port}`);
                triggerStartProcess(rawConfigs);
            });
        } else {
            // Không dùng proxy -> đảm bảo chạy thẳng mạng gốc mượt mà
            if (typeof chrome !== 'undefined' && chrome.proxy) {
                chrome.proxy.settings.clear({ scope: "regular" });
            }
            triggerStartProcess(rawConfigs);
        }
        return;
    }

    // Handle messages from content scripts
    chrome.storage.local.get(['isBotRunning', 'targetConfigs', 'currentConfigIndex', 'tabId', 'step'], (state) => {
        if (!state.isBotRunning) return;
        
        if (request.action === "alreadyTargetAccount") {
            addLog(`✅ Nick "${request.pageName}" ĐÃ ĐÚNG! Quay về Profile đăng & ghim luôn...`);
            chrome.storage.local.set({ step: "NAVIGATING_PROFILE" }, processNextStep);
        }
        else if (request.action === "needAccountSwitch") {
            chrome.storage.local.set({ step: "SWITCHING" }, processNextStep);
        }
        else if (request.action === "accountLagged") {
            const currentCfg = state.targetConfigs[state.currentConfigIndex];
            const pageName = request.pageName || currentCfg?.pageName || "Nick";
            
            // ✅ HỦY WATCHDOG 5 phút ngay khi nhận tin báo lag
            chrome.alarms.clear('nickSessionTimeout');

            if (state.targetConfigs.length === 1) {
                addLog(`⚠️ Nick "${pageName}" bị lag bình luận! Chế độ 1 Nick: Nghỉ 30s rồi tự động lặp lại từ chỗ Reels...`);
                addHistoryRecord(pageName, "⚠️ Bị Lag (Nghỉ 30s lặp lại)", "Do Facebook lag bình luận");
                chrome.alarms.create("singleAccountRepeat", { delayInMinutes: 30 / 60 });
            } else {
                addLog(`⚠️ Nick "${pageName}" bị lag bình luận (Spinner)! Đã chuyển ngay sang Nick tiếp theo, xếp "${pageName}" vào hàng chờ thử lại sau.`);
                addHistoryRecord(pageName, "⚠️ Bị Lag (Cuối phiên thử lại)", "Do Spinner xoay mòng mòng");
                
                // Lưu vào danh sách chờ thử lại & chuyển sang Nick tiếp theo
                chrome.storage.local.get(['retryQueue', 'isRetryPhase'], (st) => {
                    let queue = st.retryQueue || [];
                    if (!st.isRetryPhase && currentCfg && !queue.some(q => q.pageName === currentCfg.pageName)) {
                        queue.push(currentCfg);
                    }
                    
                    let nextIdx = state.currentConfigIndex + 1;
                    if (nextIdx >= state.targetConfigs.length) {
                        chrome.storage.local.set({ retryQueue: queue }, () => {
                            chrome.alarms.create("nextPageCooldown", { delayInMinutes: 0.1 / 60 });
                        });
                    } else {
                        chrome.storage.local.set({ retryQueue: queue, currentConfigIndex: nextIdx, step: "SWITCHING" }, processNextStep);
                    }
                });
            }
        }
        else if (request.action === "accountRestrictedAlert") {
            const currentCfg = state.targetConfigs[state.currentConfigIndex];
            const pName = request.pageName || currentCfg?.pageName || "Nick";
            chrome.alarms.clear('nickSessionTimeout');

            addLog(`🚨 [KHẨN CẤP] Nick "${pName}" BỊ HẠN CHẾ TÍNH NĂNG / CHECKPOINT! Đã bắn cảnh báo đỏ về Telegram!`);
            addHistoryRecord(pName, "🚨 Bị Hạn Chế / Block", request.reason || "Facebook chặn tính năng bình luận/ghim");

            const cooldownSecs = Math.floor(Math.random() * 7) + 4;
            addLog(`📌 Tự động bỏ qua nick bị lỗi. Nghỉ ${cooldownSecs}s trước khi chuyển sang Nick tiếp theo...`);
            chrome.alarms.create("nextPageCooldown", { delayInMinutes: cooldownSecs / 60 });
        }
        else if (request.action === "pageCompleted" || request.action === "switchFailed") {
            const currentCfg = state.targetConfigs[state.currentConfigIndex];
            const pName = currentCfg?.pageName || "Nick";

            // ✅ HỦY WATCHDOG ngay khi nick hoàn thành bình thường
            chrome.alarms.clear('nickSessionTimeout');

            if (request.alreadyExisted) {
                addLog(`ℹ️ Page "${pName}": ĐÃ CÓ BÀI ĐĂNG & GHIM SẴN -> Bỏ qua, chuẩn bị chuyển sang Page tiếp theo!`);
                addHistoryRecord(pName, "ℹ️ Đã có ghim sẵn", "Quét thấy Tên Nick + Nội dung mẫu đã có sẵn trên video");
            } else if (request.newlyPosted) {
                addLog(`✅ Page "${pName}": ĐÃ ĐĂNG BÀI MỚI & GHIM THÀNH CÔNG!`);
                addHistoryRecord(pName, "✅ Đăng & Ghim mới", "Đã đăng bài mẫu + đính kèm ảnh + ghim thành công");
            } else {
                addLog(`⚠️ Page "${pName}": Thao tác không thành công -> Bỏ qua, chuẩn bị chuyển sang Page tiếp theo.`);
                addHistoryRecord(pName, "⚠️ Thao tác không thành công", "Không thể tìm thấy phần tử hoặc Facebook không phản hồi");
            }
            
            chrome.storage.local.get(['loopStrategy', 'loopDelayMin', 'loopDelayMax'], (settings) => {
                const strat = settings.loopStrategy || 'ONCE';
                const minDelay = settings.loopDelayMin || 20;
                const maxDelay = settings.loopDelayMax || 40;
                const delayMins = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

                if (state.targetConfigs.length === 1) {
                    if (strat === 'ONCE') {
                        addLog(`🎉 HOÀN TẤT CHẠY 1 LẦN CHO "${pName}" VÀ TỰ ĐỘNG DỪNG LẠI!`);
                        printSessionReport('🛑 Đã hoàn thành chạy 1 lần và tự động dừng.');
                        chrome.storage.local.set({ isBotRunning: false, step: "STOPPED" });
                        chrome.alarms.clearAll(() => {
                            chrome.alarms.create('telegramPoll', { periodInMinutes: 0.25 });
                        });
                    } else if (strat === 'CONTINUOUS') {
                        addLog(`⏳ CHẾ ĐỘ LIÊN TỤC: Nghỉ 30s rồi tự động lặp lại cho "${pName}"...`);
                        printSessionReport('♾️ Nghỉ 30 giây rồi tự động lặp lại cho Nick này...');
                        chrome.alarms.create("singleAccountRepeat", { delayInMinutes: 30 / 60 });
                    } else if (strat === 'DELAY') {
                        addLog(`⏳ CHẾ ĐỘ CÁCH KHOẢNG: Nghỉ ${delayMins} phút rồi lặp lại cho "${pName}"...`);
                        printSessionReport(`⏳ Nghỉ ${delayMins} phút rồi tự động lặp lại cho Nick này...`);
                        chrome.alarms.create("singleAccountRepeat", { delayInMinutes: delayMins });
                    }
                } else {
                    
                    const cooldownSecs = Math.floor(Math.random() * 7) + 4; // Random từ 4 đến 10 giây
                    addLog(`📌 Đã hoàn tất Nick "${pName}". Nghỉ ngơi tự nhiên ${cooldownSecs} giây trước khi chuyển sang Nick tiếp theo...`);
                    chrome.alarms.create("nextPageCooldown", { delayInMinutes: cooldownSecs / 60 });
                }
            });
        }
    });
});

function playNotificationSound(type, title, message) {
    chrome.storage.local.get(['soundNotifyEnable'], (st) => {
        const enabled = st.soundNotifyEnable !== undefined ? st.soundNotifyEnable : true;
        if (!enabled) return;

        try {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon128.png',
                title: title || '🤖 AutoPinBot Thông Báo',
                message: message || 'Tiến trình vừa hoàn thành!',
                priority: 2
            });
        } catch(e) {}
    });
}

function getNextScheduleTarget(scheduleTimesStr, scheduleDays = [0, 1, 2, 3, 4, 5, 6], lastScheduleRun = null) {
    if (!scheduleTimesStr) return null;
    const times = scheduleTimesStr.split(',').map(t => t.trim()).filter(t => /^\d{1,2}:\d{2}$/.test(t));
    if (times.length === 0) return null;
    if (!scheduleDays || scheduleDays.length === 0) scheduleDays = [0, 1, 2, 3, 4, 5, 6];

    const now = new Date();
    const curH = now.getHours().toString().padStart(2, '0');
    const curM = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${curH}:${curM}`;
    const todayDay = now.getDay();

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowSeconds = now.getSeconds();

    let candidateSlots = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDay = (todayDay + dayOffset) % 7;
        if (!scheduleDays.includes(targetDay)) continue;

        times.forEach(t => {
            const parts = t.split(':');
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const slotMinutes = h * 60 + m;

            let diffSecs = (dayOffset * 86400) + (slotMinutes - nowMinutes) * 60 - nowSeconds;
            
            // Nếu là hôm nay (dayOffset === 0) và thời gian đã qua HOẶC vừa mới chạy xong ở phút này
            if (dayOffset === 0 && (diffSecs <= 0 || (t === currentTime && lastScheduleRun === currentTime))) {
                return;
            }

            if (diffSecs > 0) {
                const dayNames = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
                const dayLabel = dayOffset === 0 ? "Hôm nay" : (dayOffset === 1 ? "Ngày mai" : dayNames[targetDay]);
                candidateSlots.push({
                    timeStr: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} (${dayLabel})`,
                    diffSecs: diffSecs
                });
            }
        });

        if (candidateSlots.length > 0) break;
    }

    if (candidateSlots.length === 0) {
        const firstSlot = times[0];
        return { timeStr: `${firstSlot} (Tuần sau)`, diffSecs: 7 * 86400 };
    }

    candidateSlots.sort((a, b) => a.diffSecs - b.diffSecs);
    return candidateSlots[0];
}


// --------------------------------------------------------------------------------------
// SMART PRIORITY QUEUE ALGORITHM
// --------------------------------------------------------------------------------------
function smartSortConfigs(configs, sessions = []) {
    if (!configs || configs.length <= 1) return configs;
    
    // TỰ ĐỘNG LỌC: Chỉ lấy các phiên trong vòng 3 ngày (72 giờ) gần nhất
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const validSessions = (sessions || []).filter(s => {
        const sTime = s.createdAt || (s.id && s.id.startsWith('SESSION_') ? parseInt(s.id.replace('SESSION_', '')) : 0);
        return !sTime || (now - sTime < THREE_DAYS_MS);
    });

    const recentSessions = validSessions.slice(0, 3);
    
    const scoredConfigs = configs.map(config => {
        let successCount = 0;
        recentSessions.forEach(session => {
            if (!session.items) return;
            const item = session.items.find(i => i.pageName === config.pageName);
            // ✅ Ghim thành công hoặc ℹ️ Đã có ghim
            if (item && (item.status.includes('✅') || item.status.includes('ℹ️'))) {
                successCount++;
            }
        });
        return { config, score: successCount };
    });

    const groups = { 0: [], 1: [], 2: [], 3: [] };
    scoredConfigs.forEach(item => {
        const s = Math.min(item.score, 3);
        groups[s].push(item.config);
    });

    let result = [];
    result = result.concat(shuffleArray(groups[0]));
    result = result.concat(shuffleArray(groups[1]));
    result = result.concat(shuffleArray(groups[2]));
    result = result.concat(shuffleArray(groups[3]));
    
    return result;
}

function triggerStartProcess(rawConfigs, isForcedByScheduler = false) {
    if (!rawConfigs || rawConfigs.length === 0) return;

    chrome.storage.local.get(['loopStrategy', 'scheduleTimes', 'scheduleDays', 'lastScheduleRun', 'sessionHistory'], (st) => {
        const isScheduleMode = st.loopStrategy === 'SCHEDULE';
        const now = new Date();
        const curH = now.getHours().toString().padStart(2, '0');
        const curM = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${curH}:${curM}`;
        const currentDay = now.getDay();
        const days = st.scheduleDays || [0, 1, 2, 3, 4, 5, 6];
        const times = (st.scheduleTimes || '').split(',').map(t => t.trim());

        const isExactScheduledTime = days.includes(currentDay) && times.includes(currentTime) && st.lastScheduleRun !== currentTime;

        if (isScheduleMode && !isExactScheduledTime && !isForcedByScheduler) {
            const nextTarget = getNextScheduleTarget(st.scheduleTimes, st.scheduleDays, st.lastScheduleRun);
            const nextStr = nextTarget ? nextTarget.timeStr : 'khung giờ đã chọn';
            addLog(`⏰ CHẾ ĐỘ HẸN GIỜ (GIỜ VÀNG): Đã bật chế độ chờ! Bot chỉ chạy đúng các khung giờ đã cài.`);
            addLog(`⏳ Hiện tại (${currentTime}) chưa đúng giờ Vàng. Đang chờ khung giờ tiếp theo (${nextStr})...`);

            chrome.storage.local.set({
                isBotRunning: true,
                isScheduleWaiting: true,
                targetConfigs: rawConfigs,
                originalTargetConfigs: rawConfigs,
                step: "SCHEDULE_WAITING"
            });
            return;
        }

        // Đã đến đúng khung giờ hoặc được kích hoạt từ Scheduler -> Lưu lại phút này đã chạy
        if (isScheduleMode) {
            chrome.storage.local.set({ lastScheduleRun: currentTime });
        }

        // Xáo trộn ngẫu nhiên thứ tự các Page (Đảm bảo mỗi Page chạy đúng 1 lần / vòng)
        const randomizedConfigs = rawConfigs.length > 1 ? smartSortConfigs(rawConfigs, st.sessionHistory || []) : rawConfigs;

        console.log(`🚀 Bắt đầu chuỗi tự động cho ${randomizedConfigs.length} Page...`);
        startNewSession(randomizedConfigs);

        const orderNames = randomizedConfigs.map((c, i) => `[${i + 1}] ${c.pageName}`).join(' ➔ ');
        addLog(`🎲 CHẾ ĐỘ THỨ TỰ NGẪU NHIÊN: Đã xáo trộn thứ tự chạy cho ${randomizedConfigs.length} Page (Mỗi Page chạy đúng 1 lần/vòng).`);
        addLog(`📋 Thứ tự ngẫu nhiên vòng này: ${orderNames}`);

        chrome.tabs.create({
            url: "https://m.facebook.com/bookmarks/",
            active: true
        }, (tab) => {
            chrome.storage.local.set({
                isBotRunning: true,
                isScheduleWaiting: false,
                targetConfigs: randomizedConfigs,
                originalTargetConfigs: rawConfigs,
                retryQueue: [],
                currentConfigIndex: 0,
                isRetryPhase: false,
                tabId: tab.id,
                step: "SWITCHING"
            }, () => {
                addLog(`🚀 Bắt đầu chạy tiến trình cho ${randomizedConfigs.length} Page (Nick ngẫu nhiên đầu tiên: "${randomizedConfigs[0].pageName}")...`);
            });
        });
    });
}

function checkAndTriggerGoldenHour() {
    chrome.storage.local.get(['isBotRunning', 'isScheduleWaiting', 'loopStrategy', 'scheduleTimes', 'scheduleDays', 'pageConfigs', 'lastScheduleRun', 'step'], (state) => {
        if (state.loopStrategy !== 'SCHEDULE') return;
        if (!state.scheduleTimes || !state.pageConfigs || state.pageConfigs.length === 0) return;
        
        const now = new Date();
        const currentDay = now.getDay();
        const days = state.scheduleDays || [0, 1, 2, 3, 4, 5, 6];
        if (!days.includes(currentDay)) return;

        // Nếu bot đang bận xử lý 1 nick trong session (isBotRunning = true, isScheduleWaiting = false), không ngắt quãng
        if (state.isBotRunning && !state.isScheduleWaiting && state.step !== "SCHEDULE_WAITING") return;

        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${h}:${m}`;
        
        const times = state.scheduleTimes.split(',').map(t => t.trim()).filter(t => /^\d{1,2}:\d{2}$/.test(t));
        
        if (times.includes(currentTime) && state.lastScheduleRun !== currentTime) {
            chrome.storage.local.set({ lastScheduleRun: currentTime }, () => {
                addLog(`⏰ AUTO SCHEDULER: ĐÃ ĐẾN GIỜ VÀNG (${currentTime})! Tự động đánh thức và khởi chạy Bot...`);
                triggerStartProcess(state.pageConfigs, true);
            });
        }
    });
}

// Chạy kiểm tra Giờ Vàng liên tục mỗi 2 giây trong Background
setInterval(checkAndTriggerGoldenHour, 2000);

// Đồng thời giữ Alarm mỗi phút để backup nếu Service Worker ngủ
chrome.alarms.create("autoScheduler", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "autoScheduler") {
        checkAndTriggerGoldenHour();
    }
    else if (alarm.name === "singleAccountRepeat") {
        chrome.storage.local.get(['isBotRunning', 'targetConfigs', 'loopStrategy'], (state) => {
            if (!state.isBotRunning) return;
            const pName = state.targetConfigs[0]?.pageName || "Nick";
            const stratStr = state.loopStrategy === 'DELAY' ? `Hết thời gian nghỉ ngẫu nhiên` : `Hết thời gian nghỉ`;
            addLog(`🔄 ${stratStr} -> Bắt đầu lặp lại từ chỗ Reels cho "${pName}"...`);
            chrome.storage.local.set({ currentConfigIndex: 0, step: "NAVIGATING_PROFILE" }, processNextStep);
        });
    }
    else if (alarm.name === "nextPageCooldown") {
        chrome.storage.local.get(['isBotRunning', 'targetConfigs', 'currentConfigIndex', 'retryQueue'], (state) => {
            if (!state.isBotRunning) return;
            let nextIndex = state.currentConfigIndex + 1;
            if (nextIndex >= state.targetConfigs.length) {
                let retryQueue = state.retryQueue || [];
                if (retryQueue.length > 0 && !state.isRetryPhase) { // Bắt đầu Retry Phase
                    const retryNames = retryQueue.map(q => `"${q.pageName}"`).join(', ');
                    const firstRetryName = retryQueue[0]?.pageName || 'Nick';
                    addLog(`🔄 BẮT ĐẦU VÒNG THỬ LẠI CHO ${retryQueue.length} TÀI KHOẢN BỊ LỖI/LAG VÒNG TRƯỚC: ${retryNames}`);
                    addLog(`🔄 Đang thử lại tài khoản bị lỗi [1/${retryQueue.length}]: "${firstRetryName}"...`);
                    chrome.storage.local.set({
                        targetConfigs: retryQueue,
                        retryQueue: [],
                        currentConfigIndex: 0,
                        isRetryPhase: true, // Đánh dấu đây là vòng thử lại
                        step: "SWITCHING"
                    }, processNextStep);
                } else {
                    // Đã duyệt xong 1 Vòng tất cả các Page -> Xử lý theo Chiến Lược Lặp
                    chrome.storage.local.get(['originalTargetConfigs', 'loopStrategy', 'loopDelayMin', 'loopDelayMax', 'scheduleTimes'], (origSt) => {
                        const origConfigs = origSt.originalTargetConfigs || state.targetConfigs;
                        const strat = origSt.loopStrategy || 'ONCE';
                        const minDelay = origSt.loopDelayMin || 20;
                        const maxDelay = origSt.loopDelayMax || 40;
                        const delayMins = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

                        if (strat === 'ONCE') {
                            addLog(`🎉 ĐÃ HOÀN TẤT CHẠY TOÀN BỘ PHIÊN CHO ${origConfigs.length} PAGE VÀ TỰ ĐỘNG DỪNG LẠI!`);
                            printSessionReport('🛑 Đã hoàn thành phiên chạy 1 lần và tự động dừng.');
                            chrome.storage.local.set({ isBotRunning: false, step: "STOPPED" });
                            chrome.alarms.clearAll(() => {
                                chrome.alarms.create('telegramPoll', { periodInMinutes: 0.25 });
                            });
                        } else if (strat === 'CONTINUOUS') {
                            addLog(`🎉 HOÀN THÀNH 1 VÒNG ${origConfigs.length} PAGE! Chế độ Liên Tục: Nghỉ 45 giây rồi lặp lại VÒNG MỚI...`);
                            printSessionReport('♾️ Đã hoàn thành 1 vòng! Nghỉ 45 giây rồi lặp lại vòng mới...');
                            chrome.alarms.create("multiAccountLoopRepeat", { delayInMinutes: 45 / 60 });
                        } else if (strat === 'DELAY') {
                            addLog(`🎉 HOÀN THÀNH 1 VÒNG ${origConfigs.length} PAGE! Chế độ Cách Khoảng: Nghỉ ${delayMins} phút rồi lặp lại VÒNG MỚI...`);
                            printSessionReport(`⏳ Đã hoàn thành 1 vòng! Nghỉ ${delayMins} phút rồi tự động lặp lại vòng mới...`);
                            chrome.alarms.create("multiAccountLoopRepeat", { delayInMinutes: delayMins });
                        } else if (strat === 'SCHEDULE') {
                            const nextTarget = getNextScheduleTarget(origSt.scheduleTimes, origSt.scheduleDays, origSt.lastScheduleRun);
                            const nextStr = nextTarget ? nextTarget.timeStr : '--:--';
                            addLog(`🎉 HOÀN THÀNH PHIÊN CHẠY GIỜ VÀNG CHO ${origConfigs.length} PAGE! Bot tự động quay lại chế độ chờ cho khung giờ tiếp theo (${nextStr})...`);
                            printSessionReport(`⏰ Đã hoàn thành phiên Giờ Vàng! Tự động quay về chế độ chờ cho khung giờ tiếp theo (${nextStr})...`);
                            chrome.storage.local.set({ isBotRunning: true, isScheduleWaiting: true, step: "SCHEDULE_WAITING" });
                        }
                    });
                }
            } else {
                const nextCfg = state.targetConfigs[nextIndex];
                if (state.isRetryPhase) {
                    addLog(`🔄 Đang thử lại tài khoản bị lỗi [${nextIndex + 1}/${state.targetConfigs.length}]: "${nextCfg?.pageName}"...`);
                } else {
                    addLog(`📌 Chuyển sang Page [${nextIndex + 1}/${state.targetConfigs.length}]: "${nextCfg?.pageName}"`);
                }
                chrome.storage.local.set({ currentConfigIndex: nextIndex, step: "SWITCHING" }, processNextStep);
            }
        });
    }
    else if (alarm.name === "multiAccountLoopRepeat") {
        chrome.storage.local.get(['isBotRunning', 'originalTargetConfigs'], (state) => {
            if (!state.isBotRunning) return;
            const rawConfigs = state.originalTargetConfigs || [];
            if (rawConfigs.length === 0) return;

            const newShuffledConfigs = rawConfigs.length > 1 ? shuffleArray(rawConfigs) : rawConfigs;
            const newOrderNames = newShuffledConfigs.map((c, i) => `[${i + 1}] ${c.pageName}`).join(' ➔ ');

            addLog(`🎲 VÒNG MỚI: Đã xáo trộn ngẫu nhiên thứ tự cho ${newShuffledConfigs.length} Page (Đảm bảo mỗi Page chạy đúng 1 lần/vòng)...`);
            addLog(`📋 Thứ tự ngẫu nhiên vòng mới: ${newOrderNames}`);

            chrome.storage.local.set({
                targetConfigs: newShuffledConfigs,
                retryQueue: [],
                currentConfigIndex: 0,
                step: "SWITCHING"
            }, processNextStep);
        });
    }
    else if (alarm.name === 'telegramPoll') {
        chrome.storage.local.get(['teleBotToken', 'teleChatId', 'teleLastUpdateId', 'sessionHistory', 'isBotRunning', 'targetConfigs', 'currentConfigIndex', 'retryQueue'], (res) => {
            // LUÔN dùng fallback token cứng nếu storage chưa có
            const botToken = (res.teleBotToken && res.teleBotToken.trim()) ? res.teleBotToken.trim() : '8678529806:AAHwNim4fRvpg9GbLZytVK6glrJiL8Zvl8o';
            const offset = res.teleLastUpdateId || 0;

            fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=5`)
                .then(r => r.json())
                .then(data => {
                    if (!data.ok || data.result.length === 0) return;
                    let nextOffset = offset;
                    data.result.forEach(update => {
                        nextOffset = update.update_id + 1;
                        if (!update.message || !update.message.text) return;
                        const text = update.message.text.toLowerCase();
                        const replyTo = update.message.chat.id;

                        if (text.includes('hon hac thao') || text.includes('/check') || text.includes('bao cao') || text.includes('báo cáo') || text.includes('kiểm tra')) {
                            const sessions = res.sessionHistory || [];
                            const retryQueue = res.retryQueue || [];
                            const configs = res.targetConfigs || [];
                            const currentIdx = res.currentConfigIndex || 0;
                            const isRunning = res.isBotRunning;
                            const currentNick = (isRunning && configs[currentIdx]) ? configs[currentIdx].pageName : null;

                            let reply = '';

                            // Trạng thái bot đang chạy
                            if (isRunning && currentNick) {
                                reply += `🟢 BOT ĐANG CHẠY: "${currentNick}"\n`;
                                reply += `📋 Còn lại: ${configs.length - currentIdx - 1} nick trong vòng này\n`;
                            } else {
                                reply += `🔴 BOT ĐANG DỪNG\n`;
                            }

                            // Hàng đợi retry
                            if (retryQueue.length > 0) {
                                reply += `🔄 Hàng đợi thử lại: ${retryQueue.map(q => q.pageName).join(', ')}\n`;
                            }

                            reply += `\n`;

                            // Báo cáo phiên
                            if (sessions.length === 0) {
                                reply += '📊 Chưa có dữ liệu phiên chạy!';
                            } else {
                                const s = sessions[0];
                                let ok = 0, fail = 0, timeout = 0;
                                (s.items || []).forEach(it => {
                                    if (it.status.includes('✅') || it.status.includes('ℹ️')) ok++;
                                    else if (it.status.includes('Timeout')) timeout++;
                                    else fail++;
                                });
                                reply += `📊 PHIÊN GẦN NHẤT (${s.startTime}):\n`
                                    + `✅ Ghim thành công: ${ok} nick\n`
                                    + `⏰ Timeout 5ph: ${timeout} nick\n`
                                    + `⚠️ Lỗi/Lag: ${fail} nick\n`
                                    + `📌 Tổng đã xử lý: ${(s.items||[]).length}/${s.totalPages || '?'} nick\n`
                                    + `\n(Gõ /check bất cứ lúc nào để cập nhật sếp!)`;
                            }

                            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                                body: JSON.stringify({ chat_id: replyTo, text: reply })
                            }).catch(() => {});
                        }
                    });
                    chrome.storage.local.set({ teleLastUpdateId: nextOffset });
                })
                .catch(() => {});
        });
    }

    else if (alarm.name === 'nickSessionTimeout') {
        // Nick chạy quá 5 phút - có thể bị click nhầm hoặc kẹt đâu đó
        chrome.storage.local.get(['isBotRunning', 'targetConfigs', 'currentConfigIndex', 'tabId'], (st) => {
            if (!st.isBotRunning) return;
            const currentCfg = st.targetConfigs && st.targetConfigs[st.currentConfigIndex];
            const pageName = currentCfg?.pageName || 'Nick không xác định';

            addLog(`⏰ WATCHDOG: Nick "${pageName}" chạy QUÁ 5 PHÚT không xong! Tự động chuyển ngay sang Nick tiếp theo, xếp "${pageName}" vào hàng chờ thử lại sau...`);

            // Báo Telegram
            const botToken = '8678529806:AAHwNim4fRvpg9GbLZytVK6glrJiL8Zvl8o';
            const chatId   = '6139045056';
            const msg = `⏰ TK "${pageName}" chạy quá 5 phút không xong (bị kẹt) ➔ Tự động chuyển nick tiếp theo & xếp vào hàng chờ thử lại sau!`;
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ chat_id: chatId, text: msg })
            }).catch(() => {});

            // Ghi nhận lịch sử
            addHistoryRecord(pageName, '⚠️ Bị Timeout (Watchdog 5phút)', 'Chạy quá 5 phút không xong');

            if (st.targetConfigs.length === 1) {
                addLog(`⏰ Chế độ 1 Nick: Nghỉ 30s rồi lặp lại...`);
                chrome.alarms.create('singleAccountRepeat', { delayInMinutes: 0.5 });
            } else {
                // Xếp vào retry queue nếu chưa phải retry phase & chuyển sang Nick tiếp theo
                chrome.storage.local.get(['retryQueue', 'isRetryPhase'], (rq) => {
                    let queue = rq.retryQueue || [];
                    if (!rq.isRetryPhase && currentCfg && !queue.some(q => q.pageName === currentCfg.pageName)) {
                        queue.push(currentCfg);
                    }
                    let nextIdx = st.currentConfigIndex + 1;
                    if (nextIdx >= st.targetConfigs.length) {
                        chrome.storage.local.set({ retryQueue: queue }, () => {
                            chrome.alarms.create("nextPageCooldown", { delayInMinutes: 0.1 / 60 });
                        });
                    } else {
                        chrome.storage.local.set({ retryQueue: queue, currentConfigIndex: nextIdx, step: 'SWITCHING' }, processNextStep);
                    }
                });
            }
        });
    }
});

chrome.tabs.onUpdated.addListener((tId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;

    chrome.storage.local.get(['isBotRunning', 'tabId', 'step', 'targetConfigs', 'currentConfigIndex'], (state) => {
        if (!state.isBotRunning || tId !== state.tabId) return;

        if (state.step === "WAIT_PROFILE" && tab.url.includes('profile')) {
            chrome.storage.local.set({ step: "PINNING" });
            setTimeout(() => {
                const config = state.targetConfigs[state.currentConfigIndex];
                addLog(`🎯 Inject auto_pin.js cho Page "${config.pageName}"...`);
                // ⏰ ĐẶT WATCHDOG 5 PHÚT: nếu nick không xong trong 5 phút sẽ tự động bỏ qua
                chrome.alarms.clear('nickSessionTimeout', () => {
                    chrome.alarms.create('nickSessionTimeout', { delayInMinutes: 5 });
                    addLog(`⏱️ Watchdog 5 phút bắt đầu đếm cho Nick "${config.pageName}"`);
                });
                chrome.scripting.executeScript({
                    target: { tabId: tId },
                    files: ['auto_pin.js']
                }, () => {
                    chrome.tabs.sendMessage(tId, { action: "runChecking", pageConfigs: [config], targetPageName: config.pageName });
                });
            }, 3000);
        }
        else if (state.step === "NAVIGATING_PROFILE" && tab.url.includes('profile')) {
            chrome.storage.local.set({ step: "PINNING" });
            setTimeout(() => {
                const config = state.targetConfigs[state.currentConfigIndex];
                addLog(`🎯 Inject auto_pin.js cho Page "${config.pageName}"...`);
                // ⏰ ĐẶT WATCHDOG 5 PHÚT: nếu nick không xong trong 5 phút sẽ tự động bỏ qua
                chrome.alarms.clear('nickSessionTimeout', () => {
                    chrome.alarms.create('nickSessionTimeout', { delayInMinutes: 5 });
                    addLog(`⏱️ Watchdog 5 phút bắt đầu đếm cho Nick "${config.pageName}"`);
                });
                chrome.scripting.executeScript({
                    target: { tabId: tId },
                    files: ['auto_pin.js']
                }, () => {
                    chrome.tabs.sendMessage(tId, { action: "runChecking", pageConfigs: [config], targetPageName: config.pageName });
                });
            }, 3000);
        }
        else if (state.step === "SWITCHING" && tab.url.includes('/bookmarks/')) {
            setTimeout(() => {
                chrome.scripting.executeScript({
                    target: { tabId: tId },
                    files: ['account_switcher.js']
                }, () => {
                    chrome.tabs.sendMessage(tId, { action: "doSwitchAccount", targetPageName: state.targetConfigs[state.currentConfigIndex].pageName });
                });
            }, 2000);
        }
        else if (state.step === "SWITCHING" && !tab.url.includes('/bookmarks/') && !tab.url.includes('profile')) {
            chrome.storage.local.set({ step: "NAVIGATING_PROFILE" });
            setTimeout(() => {
                chrome.tabs.update(tId, { url: "https://m.facebook.com/profile.php" });
            }, 2000);
        }
    });
});

// ==========================================
// TELEGRAM BOT POLLING (NHẬN LỆNH TỪ ĐIỆN THOẠI)
// ==========================================
setInterval(() => {
    chrome.storage.local.get(['teleBotToken', 'teleLastUpdateId', 'sessionHistory'], (res) => {
        if (!res.teleBotToken) return;
        
        let offset = res.teleLastUpdateId || 0;
        fetch(`https://api.telegram.org/bot${res.teleBotToken}/getUpdates?offset=${offset}&timeout=5`)
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.result.length > 0) {
                    let nextOffset = offset;
                    data.result.forEach(update => {
                        nextOffset = update.update_id + 1;
                        if (update.message && update.message.text) {
                            const text = update.message.text.toLowerCase();
                            // Nhận diện lệnh "hon hac thao" và các lệnh kiểm tra khác
                            if (text.includes('hon hac thao') || text.includes('/check') || text.includes('báo cáo') || text.includes('bao cao') || text.includes('hỏi hệ thống') || text.includes('kiểm tra')) {
                                
                                const sessions = res.sessionHistory || [];
                                let replyText = "âŒ Hệ thống chưa chạy phiên nào hoặc chưa có dữ liệu báo cáo gần nhất!";
                                
                                if (sessions.length > 0) {
                                    const currentSess = sessions[0];
                                    let successCount = 0;
                                    let failCount = 0;
                                    currentSess.items.forEach(item => {
                                        if (item.status.includes('✅') || item.status.includes('ℹ️')) successCount++;
                                        else failCount++;
                                    });
                                    replyText = `🤖 BÁO CÁO NHANH TỪ AUTO BOT:\n`;
                                    replyText += `Phiên chạy lúc: ${currentSess.startTime}\n`;
                                    replyText += `Tổng số nick đã quét: ${currentSess.items.length}\n`;
                                    replyText += `✅ Thành công: ${successCount} nick\n`;
                                    replyText += `⚠️ Lỗi/Lag: ${failCount} nick\n\n`;
            replyText += `(Để xem chi tiết, hãy chờ hệ thống chạy xong vòng hiện tại nhé sếp!)`;
                                }

                                fetch(`https://api.telegram.org/bot${res.teleBotToken}/sendMessage`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ chat_id: update.message.chat.id, text: replyText })
                                }).catch(e => {});
                            }
                        }
                    });
                    chrome.storage.local.set({ teleLastUpdateId: nextOffset });
                }
            })
            .catch(e => {});
    });
}, 5000);


