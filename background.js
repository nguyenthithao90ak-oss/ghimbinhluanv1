// --- CẤU HÌNH PROXY TỰ ĐỘNG (Sếp điền thông tin vào đây) ---
const PROXY_CONFIG = {
    enabled: true,         // Đổi thành false nếu muốn tắt proxy, dùng mạng gốc
    host: "103.162.30.61",  // BẮT BUỘC ĐỔI: Điền IP Proxy của sếp
    port: 49064,            // BẮT BUỘC ĐỔI: Điền Port (Cổng)
    username: "user49064",  // BẮT BUỘC ĐỔI: Tài khoản Proxy
    password: "Gd6O4RL1gK"   // BẮT BUỘC ĐỔI: Mật khẩu Proxy
};

if (typeof chrome !== 'undefined' && chrome.proxy) {
    try {
        if (PROXY_CONFIG.enabled && PROXY_CONFIG.host !== "123.45.67.89") {
            // 1. Cài đặt IP và Port
            const proxySettings = {
                mode: "fixed_servers",
                rules: {
                    singleProxy: { scheme: "http", host: PROXY_CONFIG.host, port: parseInt(PROXY_CONFIG.port) },
                    bypassList: ["localhost", "127.0.0.1", "api.telegram.org"] // Không qua proxy khi báo cáo Telegram
                }
            };
            chrome.proxy.settings.set({ value: proxySettings, scope: "regular" }, () => {
                console.log("✅ Đã kết nối Proxy: " + PROXY_CONFIG.host);
            });

            // 2. Tự động điền Tài khoản/Mật khẩu (Không hiện bảng hỏi người dùng)
            chrome.webRequest.onAuthRequired.addListener(
                (details, callbackFn) => {
                    if (details.isProxy) {
                        callbackFn({
                            authCredentials: {
                                username: PROXY_CONFIG.username,
                                password: PROXY_CONFIG.password
                            }
                        });
                    } else {
                        callbackFn({});
                    }
                },
                { urls: ["<all_urls>"] },
                ["asyncBlocking"] // Bắt buộc cho Manifest V3
            );
        } else {
            // Tắt proxy
            chrome.proxy.settings.clear({ scope: "regular" }, () => {
                console.log("Đã gỡ bỏ cấu hình Proxy, trở về mạng gốc.");
            });
        }
    } catch (e) {}
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

function printSessionReport() {
    chrome.storage.local.get(['sessionHistory', 'teleBotToken', 'teleChatId'], (res) => {
        const sessions = res.sessionHistory || [];
        if (sessions.length === 0) return;
        const currentSess = sessions[0];
        
        let successArr = [];
        let failArr = [];
        
        currentSess.items.forEach(item => {
            if (item.status.includes('✅') || item.status.includes('ℹ️')) {
                if (!successArr.some(p => p.name === item.pageName)) successArr.push({name: item.pageName, time: item.time});
            } else if (item.status.includes('⚠️') || item.status.includes('❌')) {
                if (!failArr.some(p => p.name === item.pageName)) failArr.push({name: item.pageName, time: item.time});
            }
        });
        
        // Lọc bỏ những page đã bị lag nhưng sau đó thử lại thành công
        failArr = failArr.filter(p => !successArr.some(sp => sp.name === p.name));
        
        // Hàm phụ tính xem là buổi Sáng/Chiều/Tối
        const getBuoi = (timeStr) => {
            let hour = 12;
            try {
                let hStr = timeStr.split(':')[0];
                if (timeStr.toLowerCase().includes('pm') && hStr !== '12') hour = parseInt(hStr) + 12;
                else if (timeStr.toLowerCase().includes('am') && hStr === '12') hour = 0;
                else hour = parseInt(hStr);
            } catch(e){}
            if (hour >= 0 && hour < 12) return 'Sáng';
            if (hour >= 12 && hour < 18) return 'Chiều';
            return 'Tối';
        };
        
        let reportStr = `\n========= 📊 BÁO CÁO TỔNG HỢP PHIÊN CHẠY =========\n`;
        reportStr += `✅ THÀNH CÔNG (${successArr.length} Page):\n`;
        if (successArr.length === 0) reportStr += `   (Không có)\n`;
        else successArr.forEach((p, i) => {
            reportStr += `   ${i+1}. Đã ghim bình luận cho TK "${p.name}" vào buổi ${getBuoi(p.time)} lúc ${p.time}\n`;
        });
        
        reportStr += `\n⚠️ BỊ LAG / LỖI (${failArr.length} Page):\n`;
        if (failArr.length === 0) reportStr += `   (Tuyệt vời! Không có lỗi)\n`;
        else failArr.forEach((p, i) => {
            reportStr += `   ${i+1}. Bị lỗi/lag tại TK "${p.name}" vào buổi ${getBuoi(p.time)} lúc ${p.time}\n`;
        });
        reportStr += `=================================================\n`;
        
        addLog(reportStr);

        // Gửi qua Telegram (Tự động cập nhật báo cáo tổng kết)
        const botToken = (res.teleBotToken && res.teleBotToken.trim()) ? res.teleBotToken.trim() : '8678529806:AAHwNim4fRvpg9GbLZytVK6glrJiL8Zvl8o';
        const chatId = (res.teleChatId && res.teleChatId.trim()) ? res.teleChatId.trim() : '6139045056';

        if (botToken && chatId) {
            const teleMsg = reportStr.replace(/=========/g, '').trim(); // Format lại cho đẹp trên điện thoại
            const teleUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
            fetch(teleUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: teleMsg
                })
            }).then(response => {
                if(response.ok) addLog('🚀 Đã bắn báo cáo qua Telegram thành công!');
                else addLog('⚠️ Lỗi bắn Telegram: Vui lòng kiểm tra lại Token / Chat ID.');
            }).catch(err => {
                addLog('⚠️ Lỗi kết nối Telegram: ' + err.message);
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

        const isLag = status.includes('Lag') || status.includes('⚠️');
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
            details: details
        });
        if (flatHistory.length > 100) flatHistory = flatHistory.slice(0, 100);

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

            const isAlreadyPinned = status.includes('ℹ️') || status.toLowerCase().includes('sẵn');
            const isLagged        = status.includes('⚠️') || status.toLowerCase().includes('lag');
            const isSuccess       = status.includes('✅');

            let msg;
            if (isAlreadyPinned) {
                msg = `ℹ️ TK "${pageName}" đã có bình luận ghim từ TRƯỚC → Bot bỏ qua`;
            } else if (isLagged) {
                msg = `⚠️ TK "${pageName}" bị LAG/LỖI → Xếp vào hàng đợi thử lại cuối vòng`;
            } else if (isSuccess) {
                msg = `✅ Đã ghim bình luận cho TK "${pageName}" lúc ${timeStr}`;
            } else {
                return;
            }

            // --- TỰ ĐỘNG CẬP NHẬT TIẾN ĐỘ VÀO TIN NHẮN (THAY THẾ CHO /CHECK) ---
            const configs = teleRes.targetConfigs || [];
            const currentIdx = teleRes.currentConfigIndex || 0;
            const retryQueue = teleRes.retryQueue || [];
            const remaining = Math.max(0, configs.length - currentIdx - 1);
            
            msg += `\n---`;
            msg += `\n📋 Còn lại: ${remaining} nick trong vòng này`;
            if (retryQueue.length > 0) {
                msg += `\n🔄 Đang xếp hàng thử lại: ${retryQueue.length} nick`;
            }

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
    chrome.storage.local.get(['isBotRunning', 'targetConfigs', 'currentConfigIndex', 'tabId', 'step'], (state) => {
        if (!state.isBotRunning) return;
        
        let { targetConfigs, currentConfigIndex, tabId, step } = state;
        
        if (step === "FINISH") {
            addLog("🎉 ĐÃ HOÀN THÀNH CHU TRÌNH CHO TẤT CẢ CÁC PAGE!");
            chrome.storage.local.set({ isBotRunning: false });
            if (tabId) {
                try {
                    chrome.tabs.remove(tabId);
                    addLog("🔒 Đã tự động đóng tab vừa hoàn thành!");
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
                addLog(`🔄 Chuyển sang Menu để đổi nick "${pageName}"...`);
            }
            chrome.tabs.update(tabId, { url: "https://m.facebook.com/bookmarks/" });
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") {
        sendResponse({ status: "alive" });
        return;
    }

    if (request.action === "stopBotProcess") {
        chrome.alarms.clearAll(() => {
            chrome.alarms.create('telegramPoll', { periodInMinutes: 0.25 });
        });
        chrome.storage.local.set({ isBotRunning: false, step: "STOPPED" });
        addLog("🛑 ĐÃ DỪNG LẠI HOÀN TOÀN TẤT CẢ TÁC VỤ & HẸN GIỜ BOT!");
        console.log("🛑 Dừng tiến trình BOT");
        return;
    }

    if (request.action === "startMultiAccountProcess") {
        const rawConfigs = request.targetConfigs || [];
        if (rawConfigs.length === 0) return;
        triggerStartProcess(rawConfigs);
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
            
            if (state.targetConfigs.length === 1) {
                addLog(`⚠️ Nick "${pageName}" bị lag bình luận! Chế độ 1 Nick: Nghỉ 30s rồi tự động lặp lại từ chỗ Reels...`);
                addHistoryRecord(pageName, "⚠️ Bị Lag (Nghỉ 30s lặp lại)", "Do Facebook lag bình luận");
                chrome.alarms.create("singleAccountRepeat", { delayInMinutes: 30 / 60 });
            } else {
                addLog(`⚠️ Nick "${pageName}" bị lag bình luận (Spinner)! Đã xếp vào hàng đợi thử lại ở phiên sau.`);
                addHistoryRecord(pageName, "⚠️ Bị Lag (Vòng sau thử lại)", "Do Spinner xoay mòng mòng");
                
                // Lưu vào danh sách chờ thử lại (Chỉ lưu nếu KHÔNG PHẢI ĐANG TRONG LÚC ĐÃ THỬ LẠI RỒI)
                chrome.storage.local.get(['retryQueue', 'isRetryPhase'], (st) => {
                    if (st.isRetryPhase) return; // Nếu đang trong lúc thử lại mà vẫn lỗi thì bỏ qua luôn (tránh lặp vô hạn)
                    
                    let queue = st.retryQueue || [];
                    if (currentCfg && !queue.some(q => q.pageName === currentCfg.pageName)) {
                        queue.push(currentCfg);
                        chrome.storage.local.set({ retryQueue: queue });
                    }
                });
                chrome.storage.local.set({ step: "SWITCHING" }, processNextStep);
            }
        }
        else if (request.action === "pageCompleted" || request.action === "switchFailed") {
            const currentCfg = state.targetConfigs[state.currentConfigIndex];
            const pName = currentCfg?.pageName || "Nick";

            // ✅ HỦY WATCHDOG ngay khi nick hoàn thành bình thường
            chrome.alarms.clear('nickSessionTimeout');

            if (request.alreadyExisted) {
                addLog(`ℹ️ Page "${pName}": ĐÃ CÓ BÀI ĐĂNG & GHIM SẴN -> Bỏ qua, chuẩn bị chuyển sang Page tiếp theo!`);
                addHistoryRecord(pName, "ℹ️ Đã có ghim sẵn", "Quét thấy Tên Nick + Nội dung mẫu đã có sẵn trên video");
            } else {
                addLog(`✅ Page "${pName}": ĐÃ ĐĂNG BÀI MỚI & GHIM THÀNH CÔNG!`);
                addHistoryRecord(pName, "✅ Đăng & Ghim mới", "Đã đăng bài mẫu + đính kèm ảnh + ghim thành công");
            }
            
            chrome.storage.local.get(['loopStrategy', 'loopDelayMin', 'loopDelayMax'], (settings) => {
                const strat = settings.loopStrategy || 'ONCE';
                const minDelay = settings.loopDelayMin || 20;
                const maxDelay = settings.loopDelayMax || 40;
                const delayMins = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

                if (state.targetConfigs.length === 1) {
                    if (strat === 'ONCE') {
                        addLog(`🎉 HOÀN TẤT CHẠY 1 LẦN CHO "${pName}" VÀ TỰ ĐỘNG DỪNG LẠI!`);
                        printSessionReport();
                        chrome.storage.local.set({ isBotRunning: false, step: "STOPPED" });
                        chrome.alarms.clearAll(() => {
                            chrome.alarms.create('telegramPoll', { periodInMinutes: 0.25 });
                        });
                    } else if (strat === 'CONTINUOUS') {
                        addLog(`⏳ CHẾ ĐỘ LIÊN TỤC: Nghỉ 30s rồi tự động lặp lại cho "${pName}"...`);
                        printSessionReport();
                        chrome.alarms.create("singleAccountRepeat", { delayInMinutes: 30 / 60 });
                    } else if (strat === 'DELAY') {
                        addLog(`⏳ CHẾ ĐỘ CÁCH KHOẢNG: Nghỉ ${delayMins} phút rồi lặp lại cho "${pName}"...`);
                        printSessionReport();
                        chrome.alarms.create("singleAccountRepeat", { delayInMinutes: delayMins });
                    }
                } else {
                    addLog(`📌 Chuẩn bị chuyển sang Page tiếp theo (Nghỉ 8-15s)...`);
                    const cooldownSecs = Math.floor(Math.random() * 7) + 8; 
                    chrome.alarms.create("nextPageCooldown", { delayInMinutes: cooldownSecs / 60 });
                }
            });
        }
    });
});

function triggerStartProcess(rawConfigs) {
    if (!rawConfigs || rawConfigs.length === 0) return;

    // Xáo trộn ngẫu nhiên thứ tự các Page (Đảm bảo mỗi Page chạy đúng 1 lần / vòng)
    const randomizedConfigs = rawConfigs.length > 1 ? shuffleArray(rawConfigs) : rawConfigs;

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
}

// Khởi tạo báo thức kiểm tra Giờ Vàng mỗi phút
chrome.alarms.create("autoScheduler", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "autoScheduler") {
        chrome.storage.local.get(['isBotRunning', 'loopStrategy', 'scheduleTimes', 'pageConfigs', 'lastScheduleRun'], (state) => {
            if (state.isBotRunning) return; // Không kích hoạt nếu bot đang chạy
            if (state.loopStrategy !== 'SCHEDULE') return; // Phải đang chọn chế độ Hẹn Giờ
            if (!state.scheduleTimes || !state.pageConfigs || state.pageConfigs.length === 0) return;
            
            const now = new Date();
            const h = now.getHours().toString().padStart(2, '0');
            const m = now.getMinutes().toString().padStart(2, '0');
            const currentTime = `${h}:${m}`;
            
            const times = state.scheduleTimes.split(',').map(t => t.trim());
            
            if (times.includes(currentTime) && state.lastScheduleRun !== currentTime) {
                chrome.storage.local.set({ lastScheduleRun: currentTime }, () => {
                    addLog(`⏰ AUTO SCHEDULER: Đã đến giờ Vàng (${currentTime})! Tự động đánh thức Bot...`);
                    triggerStartProcess(state.pageConfigs);
                });
            }
        });
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
                    addLog(`🔄 THỬ LẠI CHO ${retryQueue.length} PAGE BỊ LAG Ở VÒNG TRƯỚC...`);
                    chrome.storage.local.set({
                        targetConfigs: retryQueue,
                        retryQueue: [],
                        currentConfigIndex: 0,
                        isRetryPhase: true, // Đánh dấu đây là vòng thử lại
                        step: "SWITCHING"
                    }, processNextStep);
                } else {
                    // Đã duyệt xong 1 Vòng tất cả các Page -> Xử lý theo Chiến Lược Lặp
                    chrome.storage.local.get(['originalTargetConfigs', 'loopStrategy', 'loopDelayMin', 'loopDelayMax'], (origSt) => {
                        const origConfigs = origSt.originalTargetConfigs || state.targetConfigs;
                        const strat = origSt.loopStrategy || 'ONCE';
                        const minDelay = origSt.loopDelayMin || 20;
                        const maxDelay = origSt.loopDelayMax || 40;
                        const delayMins = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

                        if (strat === 'ONCE') {
                            addLog(`🎉 ĐÃ HOÀN TẤT CHẠY TOÀN BỘ PHIÊN CHO ${origConfigs.length} PAGE VÀ TỰ ĐỘNG DỪNG LẠI!`);
                            printSessionReport();
                            chrome.storage.local.set({ isBotRunning: false, step: "STOPPED" });
                            chrome.alarms.clearAll(() => {
                                chrome.alarms.create('telegramPoll', { periodInMinutes: 0.25 });
                            });
                        } else if (strat === 'CONTINUOUS') {
                            addLog(`🎉 HOÀN THÀNH 1 VÒNG ${origConfigs.length} PAGE! Chế độ Liên Tục: Nghỉ 45 giây rồi lặp lại VÒNG MỚI...`);
                            printSessionReport();
                            chrome.alarms.create("multiAccountLoopRepeat", { delayInMinutes: 45 / 60 });
                        } else if (strat === 'DELAY') {
                            addLog(`🎉 HOÀN THÀNH 1 VÒNG ${origConfigs.length} PAGE! Chế độ Cách Khoảng: Nghỉ ${delayMins} phút rồi lặp lại VÒNG MỚI...`);
                            printSessionReport();
                            chrome.alarms.create("multiAccountLoopRepeat", { delayInMinutes: delayMins });
                        }
                    });
                }
            } else {
                addLog(`📌 Chuyển sang Page [${nextIndex + 1}/${state.targetConfigs.length}]: "${state.targetConfigs[nextIndex].pageName}"`);
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
                                    if (it.status.includes('✅') || it.status.includes('ℹ️')) ok++;
                                    else if (it.status.includes('Timeout')) timeout++;
                                    else fail++;
                                });
                                reply += `📊 PHIÊN GẦN NHẤT (${s.startTime}):\n`
                                    + `✅ Ghim thành công: ${ok} nick\n`
                                    + `⏰ Timeout 5ph: ${timeout} nick\n`
                                    + `⚠️ Lỗi/Lag: ${fail} nick\n`
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

            addLog(`⏰ WATCHDOG: Nick "${pageName}" chạy QUÁ 5 PHÚT không xong! Có thể bị kẹt/click nhầm. Tự động chuyển sang Nick tiếp theo...`);

            // Báo Telegram
            const botToken = '8678529806:AAHwNim4fRvpg9GbLZytVK6glrJiL8Zvl8o';
            const chatId   = '6139045056';
            const msg = `⏰ TK "${pageName}" chạy quá 5 phút không xong (có thể bị kẹt) → Bot tự thoát & thử lại sau`;
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ chat_id: chatId, text: msg })
            }).catch(() => {});

            // Xử lý giống nick bị lag: xếp vào retry queue và chuyển sang nick tiếp
            addHistoryRecord(pageName, '⚠️ Bị Timeout (Watchdog 5phút)', 'Chạy quá 5 phút không xong');

            if (st.targetConfigs.length === 1) {
                addLog(`⏰ Chế độ 1 Nick: Nghỉ 30s rồi lặp lại...`);
                chrome.alarms.create('singleAccountRepeat', { delayInMinutes: 0.5 });
            } else {
                // Xếp vào retry queue
                chrome.storage.local.get(['retryQueue'], (rq) => {
                    let queue = rq.retryQueue || [];
                    if (currentCfg && !queue.some(q => q.pageName === currentCfg.pageName)) {
                        queue.push(currentCfg);
                        chrome.storage.local.set({ retryQueue: queue });
                    }
                });
                // Chuyển sang nick tiếp
                chrome.storage.local.set({ step: 'SWITCHING' }, processNextStep);
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
                                let replyText = "❌ Hệ thống chưa chạy phiên nào hoặc chưa có dữ liệu báo cáo gần nhất!";
                                
                                if (sessions.length > 0) {
                                    const currentSess = sessions[0];
                                    let successCount = 0;
                                    let failCount = 0;
                                    currentSess.items.forEach(item => {
                                        if (item.status.includes('✅') || item.status.includes('ℹ️')) successCount++;
                                        else failCount++;
                                    });
                                    replyText = `🤖 BÁO CÁO NHANH TỪ AUTO BOT:\n`;
                                    replyText += `Phiên chạy lúc: ${currentSess.startTime}\n`;
                                    replyText += `Tổng số nick đã quét: ${currentSess.items.length}\n`;
                                    replyText += `✅ Thành công: ${successCount} nick\n`;
                                    replyText += `⚠️ Lỗi/Lag: ${failCount} nick\n\n`;
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
