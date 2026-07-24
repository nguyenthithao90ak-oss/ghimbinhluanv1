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
    const SWITCH_TIMEOUT_MS = 60000; // Tối đa 60 giây cho toàn bộ quá trình đổi nick
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
                chrome.runtime.sendMessage({ action: "accountLagged", pageName: targetPageName });
                return;
            }
            await delay(1800, 2500);
        }

        if (switchBtn) {
            logMsg("👉 Đã thấy nút Mũi tên switcher! Đang bấm...");
            simulateClick(switchBtn);
        } else {
            logMsg(`⏰ QUÁ THỜI GIAN hoặc không tìm thấy nút Switcher! Nick "${targetPageName}" -> Xếp vào hàng đợi thử lại cuối vòng!`);
            chrome.runtime.sendMessage({ action: "accountLagged", pageName: targetPageName });
            return;
        }

        // BƯỚC 2: Chờ Popup "Your Pages and profiles" mở ra
        await delay(3500, 5000); // Chờ trang load xong sau khi đổi nick
        
        // Kiểm tra timeout trước khi vào vòng scroll dài
        if (isTimedOut()) {
            logMsg(`⏰ QUÁ THỜI GIAN 60s trước khi quét danh sách nick! Nick "${targetPageName}" -> Xếp vào hàng đợi thử lại cuối vòng!`);
            chrome.runtime.sendMessage({ action: "accountLagged", pageName: targetPageName });
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
                chrome.runtime.sendMessage({ action: "accountLagged", pageName: targetPageName });
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
                logMsg(`✅ Nick "${targetPageName}" ĐÃ CÓ NÚT XANH (Đang active)! KHÔNG BẤM CHỌN LẠI -> Quay về Profile đăng & ghim luôn!`);
                chrome.runtime.sendMessage({
                    action: "alreadyTargetAccount",
                    pageName: targetPageName
                });
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
                 logMsg(`✅ Nick "${targetPageName}" CÓ THỂ ĐÃ ACTIVE TỪ TRƯỚC (Vì click xong trang không đổi)! Ép quay về Profile luôn để chống kẹt!`);
                 chrome.runtime.sendMessage({
                     action: "alreadyTargetAccount",
                     pageName: targetPageName
                 });
                 return;
            }
        } else {
            logMsg(`❌ Không tìm thấy Nick "${targetPageName}" trong danh sách.`);
            chrome.runtime.sendMessage({
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
        try { chrome.runtime.sendMessage({ action: "accountLagged", pageName: targetPageName }); } catch(ex) {}
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
