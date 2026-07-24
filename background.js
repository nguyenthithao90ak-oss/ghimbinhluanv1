// Xóa cài đặt Proxy nếu có quyền và trước đó có đặt
if (typeof chrome !== 'undefined' && chrome.proxy && chrome.proxy.settings) {
    try {
        chrome.proxy.settings.clear({ scope: "regular" }, () => {
            console.log("Đã gỡ bỏ cấu hình Proxy, trở về mạng gốc.");
        });
    } catch (e) {}
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
        chrome.storage.local.set({ isBotRunning: false });
        console.log("🛑 Dừng tiến trình BOT");
        return;
    }

    if (request.action === "startMultiAccountProcess") {
        const targetConfigs = request.targetConfigs || [];
        if (targetConfigs.length === 0) return;

        console.log(`🚀 Bắt đầu chuỗi tự động cho ${targetConfigs.length} Page...`);
        startNewSession(targetConfigs);

        chrome.tabs.create({
            url: "https://m.facebook.com/profile.php",
            active: true
        }, (tab) => {
            chrome.storage.local.set({
                isBotRunning: true,
                targetConfigs: targetConfigs,
                originalTargetConfigs: targetConfigs,
                retryQueue: [],
                currentConfigIndex: 0,
                tabId: tab.id,
                step: "WAIT_PROFILE"
            }, () => {
                addLog(`🚀 Bắt đầu chạy tiến trình cho ${targetConfigs.length} Page...`);
            });
        });
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
                
                // Lưu vào danh sách chờ thử lại
                chrome.storage.local.get(['retryQueue'], (st) => {
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

            if (request.alreadyExisted) {
                addLog(`ℹ️ Page "${pName}": ĐÃ CÓ BÀI ĐĂNG & GHIM SẴN -> Bỏ qua, chuẩn bị chuyển sang Page tiếp theo!`);
                addHistoryRecord(pName, "ℹ️ Đã có ghim sẵn", "Quét thấy Tên Nick + Nội dung mẫu đã có sẵn trên video");
            } else {
                addLog(`✅ Page "${pName}": ĐÃ ĐĂNG BÀI MỚI & GHIM THÀNH CÔNG!`);
                addHistoryRecord(pName, "✅ Đăng & Ghim mới", "Đã đăng bài mẫu + đính kèm ảnh + ghim thành công");
            }
            
            if (state.targetConfigs.length === 1) {
                addLog(`⏳ CHẾ ĐỘ 1 NICK: Nghỉ 30s rồi tự động lặp lại từ chỗ Reels cho "${pName}"...`);
                chrome.alarms.create("singleAccountRepeat", { delayInMinutes: 30 / 60 });
            } else {
                addLog(`📌 Chuẩn bị chuyển sang Page tiếp theo (Nghỉ 8-15s)...`);
                const cooldownSecs = Math.floor(Math.random() * 7) + 8; 
                chrome.alarms.create("nextPageCooldown", { delayInMinutes: cooldownSecs / 60 });
            }
        }
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "singleAccountRepeat") {
        chrome.storage.local.get(['isBotRunning', 'targetConfigs'], (state) => {
            if (!state.isBotRunning) return;
            const pName = state.targetConfigs[0]?.pageName || "Nick";
            addLog(`🔄 CHẾ ĐỘ 1 NICK: Hết 30s nghỉ -> Bắt đầu lặp lại từ chỗ Reels cho "${pName}"...`);
            chrome.storage.local.set({ currentConfigIndex: 0, step: "NAVIGATING_PROFILE" }, processNextStep);
        });
    }
    else if (alarm.name === "nextPageCooldown") {
        chrome.storage.local.get(['isBotRunning', 'targetConfigs', 'currentConfigIndex', 'retryQueue'], (state) => {
            if (!state.isBotRunning) return;
            let nextIndex = state.currentConfigIndex + 1;
            if (nextIndex >= state.targetConfigs.length) {
                let retryQueue = state.retryQueue || [];
                if (retryQueue.length > 0) {
                    addLog(`🔄 THỬ LẠI CHO ${retryQueue.length} PAGE BỊ LAG Ở VÒNG TRƯỚC...`);
                    chrome.storage.local.set({
                        targetConfigs: retryQueue,
                        retryQueue: [],
                        currentConfigIndex: 0,
                        step: "WAIT_PROFILE"
                    }, processNextStep);
                } else {
                    // Đã duyệt xong 1 Vòng tất cả các Page -> Nghỉ 1 phút rồi lặp lại Vòng mới liên tục!
                    chrome.storage.local.get(['originalTargetConfigs'], (origSt) => {
                        const origConfigs = origSt.originalTargetConfigs || state.targetConfigs;
                        addLog(`🎉 HOÀN THÀNH 1 VÒNG CHO TẤT CẢ ${origConfigs.length} PAGE! Nghỉ 60 giây rồi tự động lặp lại VÒNG MỚI từ Nick đầu tiên...`);
                        chrome.alarms.create("multiAccountLoopRepeat", { delayInMinutes: 60 / 60 });
                    });
                }
            } else {
                addLog(`📌 Chuyển sang Page [${nextIndex + 1}/${state.targetConfigs.length}]: "${state.targetConfigs[nextIndex].pageName}"`);
                chrome.storage.local.set({ currentConfigIndex: nextIndex, step: "WAIT_PROFILE" }, processNextStep);
            }
        });
    }
    else if (alarm.name === "multiAccountLoopRepeat") {
        chrome.storage.local.get(['isBotRunning', 'originalTargetConfigs'], (state) => {
            if (!state.isBotRunning) return;
            const configs = state.originalTargetConfigs || [];
            if (configs.length === 0) return;
            addLog(`🔄 BẮT ĐẦU VÒNG CHẠY MỚI TỰ ĐỘNG CHO TẤT CẢ ${configs.length} PAGE...`);
            chrome.storage.local.set({
                targetConfigs: configs,
                retryQueue: [],
                currentConfigIndex: 0,
                step: "WAIT_PROFILE"
            }, processNextStep);
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
