var delay = (ms) => new Promise(res => setTimeout(res, ms));

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

async function switchToAccount(targetPageName) {
    try {
        logMsg(`🚀 Đang mở danh sách tài khoản cho: "${targetPageName}"...`);
        await delay(5000);

        // BƯỚC 1: Tìm nút Mũi tên chỉ xuống (Switcher Arrow) để mở bảng danh sách
        logMsg(`🔍 Đang tìm nút mở danh sách tài khoản...`);
        let switchBtn = null;
        
        for (let attempt = 0; attempt < 4; attempt++) {
            const allElements = Array.from(document.querySelectorAll('div[role="button"], i, svg, a, span'));
            for (let el of allElements) {
                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                const rect = el.getBoundingClientRect();
                
                if (rect.top > 0 && rect.top < 160 && rect.left > 240 && rect.width > 0) {
                    if (aria.includes('chuyển') || aria.includes('switch') || aria.includes('profiles') || el.children.length > 0) {
                        if (!el.querySelector('img')) {
                            switchBtn = el;
                            break;
                        }
                    }
                }
            }
            if (switchBtn) break;
            await delay(2000);
        }

        if (!switchBtn) {
            const profileArea = document.querySelector('a[href*="/profile.php"], a[href*="profile"]');
            if (profileArea && profileArea.parentElement) {
                const rightBtns = Array.from(profileArea.parentElement.querySelectorAll('div[role="button"], i, svg'));
                if (rightBtns.length > 0) switchBtn = rightBtns[rightBtns.length - 1];
            }
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
            const allLabels = Array.from(dialog.querySelectorAll('span, div, label, p')).filter(el => {
                return el.innerText && el.innerText.trim().toLowerCase() === targetPageName.toLowerCase();
            });

            if (allLabels.length > 0) {
                // Đôi khi Facebook ẩn các phần tử không hiển thị, nên tìm thẻ nào đang hiện
                foundElement = allLabels.find(el => el.getBoundingClientRect().height > 0) || allLabels[0];
                if (foundElement) break;
            }

            // Scroll TẤT CẢ các vùng có thể cuộn được (đặc biệt là các thẻ div trên Facebook)
            window.scrollBy(0, 250);
            if (dialog && dialog !== document.body) {
                dialog.scrollTop += 250;
            }
            document.querySelectorAll('div').forEach(d => {
                if (d.scrollHeight > d.clientHeight) {
                    d.scrollTop += 250;
                }
            });
            await delay(1200);
        }

        if (foundElement) {
            // Đi lên tìm phần tử cha có thể click (label, li, radio, button)
            let clickableTarget = foundElement;
            let p = foundElement;
            while (p && p !== dialog) {
                if (p.tagName === 'LABEL' || p.tagName === 'LI' || p.getAttribute('role') === 'radio' || p.getAttribute('role') === 'button' || p.tagName === 'A') {
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
