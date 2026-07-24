// Xóa cài đặt Proxy nếu có quyền và trước đó có đặt
if (typeof chrome !== 'undefined' && chrome.proxy && chrome.proxy.settings) {
    try {
        chrome.proxy.settings.clear({ scope: "regular" }, () => {
            console.log("Đã gỡ bỏ cấu hình Proxy, trở về mạng gốc.");
        });
    } catch (e) {}
}

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

        // Gửi qua Telegram nếu có cấu hình
        if (res.teleBotToken && res.teleChatId) {
            const teleMsg = reportStr.replace(/=========/g, '').trim(); // Format lại cho đẹp trên điện thoại
            const teleUrl = `https://api.telegram.org/bot${res.teleBotToken}/sendMessage`;
            fetch(teleUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: res.teleChatId,
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
        chrome.alarms.clearAll();
        chrome.storage.local.set({ isBotRunning: false, step: "STOPPED" });
        addLog("🛑 ĐÃ DỪNG LẠI HOÀN TOÀN TẤT CẢ TÁC VỤ & HẸN GIỜ BOT!");
        console.log("🛑 Dừng tiến trình BOT");
        return;
    }

    if (request.action === "startMultiAccountProcess") {
        const rawConfigs = request.targetConfigs || [];
        if (rawConfigs.length === 0) return;

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
                tabId: tab.id,
                step: "SWITCHING"
            }, () => {
                addLog(`🚀 Bắt đầu chạy tiến trình cho ${randomizedConfigs.length} Page (Nick ngẫu nhiên đầu tiên: "${randomizedConfigs[0].pageName}")...`);
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
            
            chrome.storage.local.get(['loopStrategy', 'loopDelayMinutes'], (settings) => {
                const strat = settings.loopStrategy || 'ONCE';
                const delayMins = settings.loopDelayMinutes || 30;

                if (state.targetConfigs.length === 1) {
                    if (strat === 'ONCE') {
                        addLog(`🎉 HOÀN TẤT CHẠY 1 LẦN CHO "${pName}" VÀ TỰ ĐỘNG DỪNG LẠI!`);
                        printSessionReport();
                        chrome.storage.local.set({ isBotRunning: false, step: "STOPPED" });
                        chrome.alarms.clearAll();
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

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "singleAccountRepeat") {
        chrome.storage.local.get(['isBotRunning', 'targetConfigs', 'loopStrategy', 'loopDelayMinutes'], (state) => {
            if (!state.isBotRunning) return;
            const pName = state.targetConfigs[0]?.pageName || "Nick";
            const stratStr = state.loopStrategy === 'DELAY' ? `Sau ${state.loopDelayMinutes} phút nghỉ` : `Hết thời gian nghỉ`;
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
                if (retryQueue.length > 0) {
                    addLog(`🔄 THỬ LẠI CHO ${retryQueue.length} PAGE BỊ LAG Ở VÒNG TRƯỚC...`);
                    chrome.storage.local.set({
                        targetConfigs: retryQueue,
                        retryQueue: [],
                        currentConfigIndex: 0,
                        step: "SWITCHING"
                    }, processNextStep);
                } else {
                    // Đã duyệt xong 1 Vòng tất cả các Page -> Xử lý theo Chiến Lược Lặp
                    chrome.storage.local.get(['originalTargetConfigs', 'loopStrategy', 'loopDelayMinutes'], (origSt) => {
                        const origConfigs = origSt.originalTargetConfigs || state.targetConfigs;
                        const strat = origSt.loopStrategy || 'ONCE';
                        const delayMins = origSt.loopDelayMinutes || 30;

                        if (strat === 'ONCE') {
                            addLog(`🎉 ĐÃ HOÀN TẤT CHẠY TOÀN BỘ PHIÊN CHO ${origConfigs.length} PAGE VÀ TỰ ĐỘNG DỪNG LẠI!`);
                            printSessionReport();
                            chrome.storage.local.set({ isBotRunning: false, step: "STOPPED" });
                            chrome.alarms.clearAll();
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
