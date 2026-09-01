
// ======================================================================================
// ACCOUNT SWITCHER CONTROLLER (WINDOWS EMULATION SYNCED WITH BACKGROUND.JS)
// ======================================================================================

var delay = (minMs, maxMs = minMs) => {
    return new Promise((resolve, reject) => {
        const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        const sec = ms / 1000;
        let elapsed = 0;
        const interval = setInterval(() => {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get(['isBotRunning'], (state) => {
                        if (state && state.isBotRunning === false) {
                            clearInterval(interval);
                            reject(new Error("BOT_STOPPED_BY_USER"));
                            return;
                        }
                    });
                }
            } catch(e) {}
            elapsed += 0.5;
            if (elapsed >= sec) {
                clearInterval(interval);
                resolve();
            }
        }, 500);
    });
};


function safeSendMessage(msgObj) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        try {
            chrome.runtime.sendMessage(msgObj, () => {
                if (chrome.runtime.lastError) {
                    // Suppress connection errors during page reloads
                }
            });
        } catch(e) {}
    }
}

function logMsg(msg) {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${msg}`;
    console.log(formatted);
    try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['botLogs'], (result) => {
                if (chrome.runtime.lastError) return;
                let logs = (result && result.botLogs) || [];
                logs.push(formatted);
                logs = logs.slice(-25);
                chrome.storage.local.set({ botLogs: logs });
            });
        }
    } catch (e) {}
}

var simulateClick = (element) => {
    element.style.border = "3px solid red";
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const eventOpts = { bubbles: true, cancelable: true, view: window };
    element.dispatchEvent(new MouseEvent('mouseover', eventOpts));
    element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
    element.dispatchEvent(new MouseEvent('mouseup', eventOpts));
    element.dispatchEvent(new MouseEvent('click', eventOpts));
    element.click();
};

// =============================================
// 🌐 TÍNH NĂNG 1: NHẬN DIỆN MẠNG LAG & ĐIỀU CHỈNH CHỜ THÔNG MINH
// =============================================
async function smartWaitForNetworkAndLoad(context = "") {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        logMsg(`⚠️ [MẠNG MẤT KẾT NỐI] Trình duyệt đang offline! Chờ 5s để mạng phục hồi... (${context})`);
        await delay(5000, 7000);
    }

    let lagWaitCount = 0;
    const maxLagWait = 3;

    while (lagWaitCount < maxLagWait) {
        const isBusy = Array.from(document.querySelectorAll('div[role="progressbar"], [aria-busy="true"], [aria-label*="Loading" i], [aria-label*="Đang tải" i], div[data-sigil*="loading"]')).some(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.top < window.innerHeight;
        });

        if (isBusy) {
            lagWaitCount++;
            logMsg(`⏳ [SMART LAG DETECTOR] Phát hiện Facebook đang tải/mạng lag (${context}). Tự động chờ thêm... (Lần ${lagWaitCount}/${maxLagWait})`);
            await delay(2000, 3000);
        } else {
            break;
        }
    }
}

// =============================================
// 🎯 TÍNH NĂNG 2: XÁC NHẬN THAO TÁC & SMART RETRY TỰ ĐỘNG
// =============================================
async function smartClickAndVerify(findFn, verifyFn, description, maxRetries = 3, waitMs = 2500) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await smartWaitForNetworkAndLoad(description);
        const el = findFn();
        if (!el) {
            logMsg(`⏳ [Lần ${attempt}/${maxRetries}] Chưa thấy "${description}". Chờ ${waitMs/1000}s thử lại...`);
            await delay(waitMs, waitMs + 1000);
            continue;
        }

        logMsg(`🎯 [Lần ${attempt}/${maxRetries}] Đang click: ${description}...`);
        simulateClick(el);
        await delay(waitMs, waitMs + 1000);

        if (typeof verifyFn === 'function') {
            const isVerified = verifyFn();
            if (isVerified) {
                logMsg(`✅ [XÁC NHẬN THÀNH CÔNG] Đã hoàn thành: ${description}!`);
                return true;
            } else {
                logMsg(`🔄 [CHƯA PHẢN HỒI] Thao tác "${description}" chưa có kết quả (do mạng lag hoặc trượt click). Tự động bấm lại lần ${attempt + 1}/${maxRetries}...`);
                await delay(1500, 2500);
            }
        } else {
            logMsg(`✅ ĐÃ CLICK: ${description}`);
            return true;
        }
    }
    logMsg(`❌ [THẤT BẠI SAU ${maxRetries} LẦN] Không thể hoàn tất: ${description}`);
    return false;
}

function cleanName(str) {
    if (!str) return '';
    return str.toString()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

// Hàm tính điểm khớp tên (Cho phép sai chính tả - Typo tolerance)
function nameMatchScore(a, b) {
    if (!a || !b) return 0;
    const cleanA = cleanName(a);
    const cleanB = cleanName(b);
    if (!cleanA || !cleanB) return 0;
    
    // Khớp hoàn toàn: điểm cao nhất
    if (cleanA === cleanB) return 100;
    
    // Khớp bao hàm (chuỗi dài chứa chuỗi ngắn)
    const shorter = cleanA.length < cleanB.length ? cleanA : cleanB;
    const longer  = cleanA.length < cleanB.length ? cleanB : cleanA;
    if (longer.includes(shorter) && (shorter.length / longer.length >= 0.8)) {
        return 80; 
    }

    // Thuật toán Levenshtein Distance (Chấp nhận gõ sai 1-2 chữ)
    // Ví dụ: traicauconam vs traicayconam (sai 1 ký tự y/u)
    let matrix = [];
    for (let i = 0; i <= cleanB.length; i++) matrix[i] = [i];
    for (let j = 0; j <= cleanA.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= cleanB.length; i++) {
        for (let j = 1; j <= cleanA.length; j++) {
            if (cleanB.charAt(i-1) === cleanA.charAt(j-1)) {
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
            }
        }
    }
    const dist = matrix[cleanB.length][cleanA.length];
    const maxLen = Math.max(cleanA.length, cleanB.length);
    
    // Chuỗi dài thì cho phép sai nhiều hơn một tí
    if (maxLen > 10 && dist <= 3) return 60;
    if (maxLen > 5 && dist <= 2) return 70;
    if (maxLen <= 5 && dist === 1) return 50;

    return 0;
}

function isNameMatch(a, b) {
    return nameMatchScore(a, b) > 0;
}

// Hàm timeout thông minh
function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`TIMEOUT_${label}`));
        }, ms);
        promise.then((val) => { clearTimeout(timer); resolve(val); })
               .catch((err) => { clearTimeout(timer); reject(err); });
    });
}

async function switchToAccount(targetPageName) {
    // 🔒 SINGLE-INSTANCE LOCK: Chặn nhiều tiến trình đổi nick chạy song song
    if (window.__switcherRunning) {
        console.log(`[Switcher] ⚠️ Đã có tiến trình đổi nick đang chạy! Bỏ qua lần gọi thừa này.`);
        return;
    }
    window.__switcherRunning = true;

    const SWITCH_TIMEOUT_MS = 90000; // Tối đa 90 giây cho toàn bộ quá trình đổi nick (tăng từ 60s do chờ danh sách TK load lâu hơn)
    const startTime = Date.now();
    
    // Hàm kiểm tra còn thời gian không
    const timeLeft = () => SWITCH_TIMEOUT_MS - (Date.now() - startTime);
    const isTimedOut = () => timeLeft() <= 0;
    
    try {
        logMsg(`🚀 Đang mở danh sách tài khoản cho: "${targetPageName}"... (Timeout: 60s)`);
        await delay(4000, 6000); // Đợi menu mờ hiện ra

        // BƯỚC 0: Nếu ở trang Home (m.facebook.com), bấm nút Menu 3 sọc (☰) ở góc trên bên phải để mở Menu
        if (!window.location.href.includes('/bookmarks/') && !window.location.href.includes('/menu/')) {
            const menuTopBtn = Array.from(document.querySelectorAll('div[role="button"], a, i, svg')).find(el => {
                const r = el.getBoundingClientRect();
                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                return r.top > 0 && r.top < 65 && r.left > (window.innerWidth - 100) && r.width > 0 && r.height > 0 &&
                       (aria.includes('menu') || aria.includes('bảng') || aria.includes('chuyển') || el.tagName === 'A' || el.tagName === 'DIV');
            });
            if (menuTopBtn) {
                logMsg("👉 Đã thấy nút Menu 3 sọc (☰)! Đang bấm mở Menu...");
                simulateClick(menuTopBtn);
                await delay(2500, 4000); // Lướt và tìm trang
            }
        }

        // BƯỚC 1: Tìm nút Mũi tên chỉ xuống (Switcher Arrow) để mở bảng danh sách
        logMsg(`🔍 Đang tìm nút mở danh sách tài khoản...`);
        let switchBtn = null;
        
        for (let attempt = 0; attempt < 5; attempt++) {
            // Cách 1: Tìm bằng chuẩn Accessibility theo đúng ảnh DevTools (aria-label="Switch profile", role="button")
            const ariaSelectors = [
                '[aria-label*="Switch profile" i]', 
                '[aria-label*="switch profile" i]',
                '[aria-label*="Chuyển" i]', 
                '[aria-label*="chuyển" i]',
                '[aria-label*="Đổi" i]'
            ];
            
            for (let sel of ariaSelectors) {
                const elements = Array.from(document.querySelectorAll(sel));
                for (let el of elements) {
                    const rect = el.getBoundingClientRect();
                    // Nút chuẩn thường nằm ở nửa trên màn hình (top < 300) và không chứa avatar (img)
                    if (rect.top > 0 && rect.top < 300 && rect.width > 10 && rect.width < 100 && !el.querySelector('img')) {
                        switchBtn = el;
                        break;
                    }
                }
                if (switchBtn) break;
            }

            // Cách 2: Tìm theo class, role="button" kích thước 31x32 (như trong ảnh DevTools)
            if (!switchBtn) {
                const buttons = Array.from(document.querySelectorAll('div[role="button"], button'));
                for (let el of buttons) {
                    const rect = el.getBoundingClientRect();
                    // Nút switch profile nằm ở y: 50-250, kích thước khoảng 31x32
                    if (rect.top > 40 && rect.top < 250 && rect.width >= 25 && rect.width <= 45 && rect.height >= 25 && rect.height <= 45) {
                        // Nằm cách lề trái một đoạn và không chứa ảnh
                        if (!el.querySelector('img') && rect.left > 150) {
                            switchBtn = el;
                            break;
                        }
                    }
                }
            }

            // Cách 3: Quét theo vùng của khối Profile
            if (!switchBtn) {
                const profileLink = document.querySelector('a[href*="/profile.php"], a[href*="profile"]');
                if (profileLink && profileLink.parentElement) {
                    let container = profileLink.parentElement;
                    // Lùi lên tìm hộp chứa bự bao cả hàng
                    for (let i = 0; i < 4; i++) {
                        if (container && container.getBoundingClientRect().width > 150) break;
                        if (container) container = container.parentElement;
                    }
                    if (container) {
                        const rightElements = Array.from(container.querySelectorAll('div[role="button"], div, span')).filter(el => {
                            const r = el.getBoundingClientRect();
                            return r.width >= 20 && r.width <= 50 && r.height >= 20 && r.height <= 50 && r.left > profileLink.getBoundingClientRect().right + 20;
                        });
                        if (rightElements.length > 0) {
                            // Lấy phần tử nằm xa nhất về bên phải trong khối hộp đó
                            rightElements.sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left);
                            switchBtn = rightElements[0];
                        }
                    }
                }
            }

            if (switchBtn) break;
            
            // Kiểm tra timeout
            if (isTimedOut()) {
                logMsg(`⏰ QUÁ THỜI GIAN 60s khi tìm nút Switcher! Nick "${targetPageName}" -> Xếp vào hàng đợi thử lại cuối vòng!`);
                safeSendMessage({ action: "accountLagged", pageName: targetPageName });
                return;
            }
            await delay(1800, 2500);
        }

        if (switchBtn) {
            logMsg("👉 Đã thấy nút Mũi tên switcher! Đang bấm...");
            simulateClick(switchBtn);
        } else {
            logMsg(`⏰ QUÁ THỜI GIAN hoặc không tìm thấy nút Switcher! Nick "${targetPageName}" -> Xếp vào hàng đợi thử lại cuối vòng!`);
            safeSendMessage({ action: "accountLagged", pageName: targetPageName });
            return;
        }

        // BƯỚC 2: Chờ danh sách "Trang và trang cá nhân của bạn" mở ra
        // Tăng delay lên 8-10s để chờ Facebook load xong
        await delay(8000, 10000);

        // KIỂM TRA: Danh sách tài khoản đã thực sự mở chưa?
        // Nếu chưa (bị lag), thử bấm lại mũi tên lần nữa
        function isAccountListOpen() {
            // Cách 1: Tìm dialog popup chứa danh sách nick
            const dialog = document.querySelector('div[role="dialog"]');
            if (dialog) {
                const hasNames = dialog.querySelectorAll('span, div, label').length > 5;
                if (hasNames) return true;
            }
            // Cách 2: Tìm danh sách nick có radio buttons
            const radios = document.querySelectorAll('[role="radio"], input[type="radio"]');
            if (radios.length > 0) return true;
            // Cách 3: Tìm dòng chứa tên nick trong vùng hiển thị (có nhiều avatar/tên trang)
            const nickItems = Array.from(document.querySelectorAll('span')).filter(el => {
                const txt = (el.innerText || '').trim();
                const r = el.getBoundingClientRect();
                return txt.length > 2 && txt.length < 100 && r.top > 100 && r.height > 10 && r.height < 50;
            });
            // Nếu tìm thấy > 3 dòng text giống tên nick/trang thì coi như đã mở
            if (nickItems.length > 3) return true;
            return false;
        }

        // Thử kiểm tra tối đa 3 lần, nếu chưa mở thì bấm lại mũi tên
        for (let retryClick = 0; retryClick < 3; retryClick++) {
            if (isAccountListOpen()) {
                logMsg("✅ Danh sách tài khoản ĐÃ MỞ! Tiếp tục tìm nick...");
                break;
            }
            if (isTimedOut()) break;

            logMsg(`⏳ [Lần ${retryClick + 1}/3] Danh sách chưa mở (có thể bị lag). Thử bấm lại mũi tên...`);
            // Tìm lại nút mũi tên và bấm lại
            const retryBtn = document.querySelector('[aria-label*="Switch" i], [aria-label*="Chuyển" i], [aria-label*="Đổi" i]') || switchBtn;
            if (retryBtn) {
                simulateClick(retryBtn);
            }
            await delay(5000, 7000); // Chờ thêm 5-7s
        }
        
        // Kiểm tra timeout trước khi vào vòng scroll dài
        if (isTimedOut()) {
            logMsg(`⏰ QUÁ THỜI GIAN 60s trước khi quét danh sách nick! Nick "${targetPageName}" -> Xếp vào hàng đợi thử lại cuối vòng!`);
            safeSendMessage({ action: "accountLagged", pageName: targetPageName });
            return;
        }
        
        logMsg(`📜 Đang quét danh sách tài khoản tìm Nick: "${targetPageName}"... (Còn ${Math.round(timeLeft()/1000)}s)`);

        let dialog = document.querySelector('div[role="dialog"]') || document.body;
        let foundElement = null;
        let maxScrolls = 30;
        
        for (let i = 0; i < maxScrolls; i++) {
            const allLabels = Array.from(dialog.querySelectorAll('span, div, label, p, a, strong')).filter(el => {
                const txt = el.innerText ? el.innerText.trim() : '';
                if (txt.length < 2 || txt.length > 120) return false;
                const line1 = txt.split('\n')[0].trim();
                return isNameMatch(line1, targetPageName);
            });

            // Sắp xếp theo điểm khớp - nhựng phần tử khớp CHÍNH XÁC sẽ được ưu tiên
            if (allLabels.length > 0) {
                // Tính điểm cho từng ứng viên và lấy cái có điểm cao nhất
                const scoredLabels = allLabels
                    .filter(el => el.getBoundingClientRect().height > 0)
                    .map(el => ({
                        el,
                        score: nameMatchScore(el.innerText.split('\n')[0].trim(), targetPageName)
                    }))
                    .sort((a, b) => b.score - a.score);
                
                if (scoredLabels.length > 0) {
                    logMsg(`🎯 Khớp tốt nhất: "${scoredLabels[0].el.innerText.split('\n')[0].trim()}" (điểm: ${scoredLabels[0].score}/100)`);
                    foundElement = scoredLabels[0].el;
                    if (foundElement) break;
                }
            }

            // Timeout giữa chừng khi scroll
            if (isTimedOut()) {
                logMsg(`⏰ QUÁ THỜI GIAN 60s khi đang cuộn tìm Nick! "${targetPageName}" -> Xếp vào hàng đợi thử lại cuối vòng!`);
                safeSendMessage({ action: "accountLagged", pageName: targetPageName });
                return;
            }

            // Scroll TẤT CẢ các vùng có thể cuộn được (đặc biệt là bảng Your Pages and profiles)
            window.scrollBy(0, 300);
            if (dialog && dialog !== document.body) {
                dialog.scrollTop += 300;
            }
            document.querySelectorAll('div').forEach(d => {
                if (d.scrollHeight > d.clientHeight) {
                    d.scrollTop += 300;
                }
            });
            await delay(1000, 1500);
        }

        if (foundElement) {
            // Đi lên tìm phần tử hàng chứa Nick (thẻ div hàng có height từ 30px đến 100px, label, li, button)
            let clickableTarget = foundElement;
            let p = foundElement;
            while (p && p !== dialog && p !== document.body) {
                const r = p.getBoundingClientRect();
                if (p.tagName === 'LABEL' || p.tagName === 'LI' || p.getAttribute('role') === 'radio' || p.getAttribute('role') === 'button' || p.tagName === 'A' || (p.tagName === 'DIV' && r.height >= 30 && r.height <= 100 && r.width > 150)) {
                    clickableTarget = p;
                    break;
                }
                p = p.parentElement;
            }

            // *** KIỂM TRA QUAN TRỌNG: NICK NÀY ĐÃ CÓ NÚT XANH (ĐÃ ĐƯỢC CHỌN SẴN) HAY CHƯA? ***
            let isAlreadyActive = false;
            
            // Mở rộng vùng tìm kiếm ra toàn bộ "dòng" (row) chứa nick này, vì đôi khi nút xanh nằm ở sibling
            let searchArea = clickableTarget;
            if (clickableTarget.parentElement) searchArea = clickableTarget.parentElement;
            if (clickableTarget.parentElement && clickableTarget.parentElement.parentElement) searchArea = clickableTarget.parentElement.parentElement;

            // Cách 1: Tìm input[type="radio"] bị checked
            let radioInput = searchArea.querySelector('input[type="radio"]');
            if (radioInput && radioInput.checked) {
                isAlreadyActive = true;
            }

            // Cách 2: Tìm [role="radio"][aria-checked="true"] hoặc [aria-selected="true"]
            let radioRole = searchArea.querySelector('[role="radio"][aria-checked="true"], [aria-checked="true"], [aria-selected="true"]');
            if (radioRole) {
                isAlreadyActive = true;
            }

            // Cách 3: Tìm thẻ cha có aria-checked="true"
            let ancestor = foundElement;
            for (let depth = 0; depth < 8; depth++) {
                if (!ancestor || ancestor === document.body) break;
                if (ancestor.getAttribute('aria-checked') === 'true' || ancestor.getAttribute('aria-selected') === 'true') {
                    isAlreadyActive = true;
                    break;
                }
                ancestor = ancestor.parentElement;
            }

            // Cách 4: Kiểm tra SVG nút tròn xanh (filled circle) gần đó
            // Bắt màu #0866FF (Xanh FB mới), #1877f2 (Xanh FB cũ) hoặc RGB
            const nearbyCircles = searchArea.querySelectorAll('svg, circle, i, path');
            for (let circle of nearbyCircles) {
                const fill = (circle.getAttribute('fill') || '').toLowerCase();
                const color = (circle.getAttribute('color') || '').toLowerCase();
                const style = (circle.getAttribute('style') || '').toLowerCase();
                if (fill.includes('#0866ff') || fill.includes('#1877f2') || 
                    style.includes('0866ff') || style.includes('1877f2') ||
                    color.includes('#0866ff') || color.includes('#1877f2')) {
                    isAlreadyActive = true;
                    break;
                }
            }

            if (isAlreadyActive) {
                logMsg(`✅ Nick "${targetPageName}" ĐÃ CÓ NÚT XANH (Đang active)! KHÔNG BẤM CHỌN LẠI -> Gửi lệnh về Profile...`);
                safeSendMessage({
                    action: "alreadyTargetAccount",
                    pageName: targetPageName
                });
                // KHÔNG gọi window.location.href ở đây - để background.js xử lý chuyển hướng duy nhất
                return; // DỪNG NGAY! KHÔNG BẤM CHỌN LẠI!
            }

            // Nếu chưa active -> Bấm đổi nick
            logMsg(`🎯 Bấm chọn đổi sang Nick "${targetPageName}"...`);
            await delay(800, 1500);
            simulateClick(clickableTarget);
            logMsg("✅ Đã bấm chọn nick mới! Đợi Facebook đổi tài khoản...");
            
            // --- CƠ CHẾ CHỐNG KẸT (FALLBACK TỐI THƯỢNG) ---
            // Đôi khi Facebook cập nhật mã màu khiến thuật toán soi nút xanh bị xịt.
            // Nếu nick ĐÃ ACTIVE mà ta vẫn click vào, Facebook sẽ KHÔNG tải lại trang (URL không đổi).
            // Ta chờ 4.5 giây, nếu trang vẫn không chuyển đi đâu thì 99% là nick này đã active từ trước!
            await delay(4500);
            if (window.location.href.includes('/bookmarks/')) {
                 logMsg(`✅ Nick "${targetPageName}" CÓ THỂ ĐÃ ACTIVE TỪ TRƯỚC (Vì click xong trang không đổi)! Gửi lệnh về Profile...`);
                 safeSendMessage({
                     action: "alreadyTargetAccount",
                     pageName: targetPageName
                 });
                 // KHÔNG gọi window.location.href ở đây - để background.js xử lý chuyển hướng duy nhất
                 return;
            }
        } else {
            logMsg(`❌ Không tìm thấy Nick "${targetPageName}" trong danh sách.`);
            safeSendMessage({
                action: "switchFailed",
                pageName: targetPageName
            });
        }

    } catch (e) {
        if (e.message && e.message.startsWith('TIMEOUT_')) {
            logMsg(`⏰ TOÀN BỘ QUÁ TRÌNH ĐỔI NICK "${targetPageName}" ĐÃ QUÁ THỜI GIAN 60S! Xếp vào hàng đợi thử lại cuối vòng...`);
        } else {
            logMsg(`❌ Lỗi Switcher: ${e.message}`);
        }
        // Dù lỗi gì cũng xếp nick này vào retry queue, không được bỏ qua vĩnh viễn
        try { safeSendMessage({ action: "accountLagged", pageName: targetPageName }); } catch(ex) {}
    } finally {
        window.__switcherRunning = false;
    }
}

if (!window.__switcherListenerAdded) {
    window.__switcherListenerAdded = true;
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "doSwitchAccount") {
            switchToAccount(request.targetPageName);
        }
    });
}
