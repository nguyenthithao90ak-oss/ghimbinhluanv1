var delay = (ms) => {
    return new Promise((resolve, reject) => {
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

function isNameMatch(a, b) {
    if (!a || !b) return false;
    const cleanA = cleanName(a);
    const cleanB = cleanName(b);
    if (!cleanA || !cleanB) return false;
    return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
}

async function switchToAccount(targetPageName) {
    try {
        logMsg(`🚀 Đang mở danh sách tài khoản cho: "${targetPageName}"...`);
        await delay(5000);

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
                await delay(3000);
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
            await delay(2000);
        }

        if (switchBtn) {
            logMsg("👉 Đã thấy nút Mũi tên switcher! Đang bấm...");
            simulateClick(switchBtn);
        }

        // BƯỚC 2: Chờ Popup "Your Pages and profiles" mở ra
        await delay(4000);
        logMsg(`📜 Đang quét danh sách tài khoản tìm Nick: "${targetPageName}"...`);

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

            if (allLabels.length > 0) {
                foundElement = allLabels.find(el => el.getBoundingClientRect().height > 0) || allLabels[0];
                if (foundElement) break;
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
            await delay(1200);
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
            // Quét toàn bộ vùng chứa nick này để tìm dấu hiệu "đã chọn" (checked radio, aria-checked, input:checked, nút xanh)
            let isAlreadyActive = false;

            // Cách 1: Tìm input[type="radio"] bị checked
            let searchArea = clickableTarget;
            let radioInput = searchArea.querySelector('input[type="radio"]');
            if (radioInput && radioInput.checked) {
                isAlreadyActive = true;
            }

            // Cách 2: Tìm [role="radio"][aria-checked="true"]
            let radioRole = searchArea.querySelector('[role="radio"][aria-checked="true"]');
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

            // Cách 4: Kiểm tra SVG nút tròn xanh (filled circle) gần đó - có nghĩa là nút radio đã được chọn
            const nearbyCircles = searchArea.querySelectorAll('svg, circle, i');
            for (let circle of nearbyCircles) {
                const fill = circle.getAttribute('fill') || '';
                const style = (circle.getAttribute('style') || '').toLowerCase();
                if (fill.includes('#0866FF') || fill.includes('#1877f2') || style.includes('0866ff') || style.includes('1877f2')) {
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
            await delay(1000);
            simulateClick(clickableTarget);
            logMsg("✅ Đã bấm chọn nick mới! Đợi Facebook đổi tài khoản...");
        } else {
            logMsg(`❌ Không tìm thấy Nick "${targetPageName}" trong danh sách.`);
            chrome.runtime.sendMessage({
                action: "switchFailed",
                pageName: targetPageName
            });
        }

    } catch (e) {
        logMsg(`❌ Lỗi Switcher: ${e.message}`);
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "doSwitchAccount") {
        switchToAccount(request.targetPageName);
    }
});
