var delay = (minSec, maxSec = minSec) => {
    return new Promise((resolve, reject) => {
        const sec = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
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
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(msgObj, () => {
                if (chrome.runtime.lastError) {
                    // Handle lastError safely
                    const err = chrome.runtime.lastError.message;
                }
            });
        }
    } catch(e) {}
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
                chrome.storage.local.set({ botLogs: logs });
            });
        }
    } catch (e) {}
}

function isNameMatch(profileName, targetName) {
    if (!profileName || !targetName) return false;
    let a = profileName.toLowerCase().replace(/\.\.\./g, '').replace(/…/g, '').trim();
    let b = targetName.toLowerCase().trim();
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    const minLen = Math.min(a.length, b.length, 10);
    if (minLen >= 5 && a.substring(0, minLen) === b.substring(0, minLen)) return true;
    return false;
}

function dataURLtoFile(dataurl, filename) {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], filename, {type:mime});
}

async function typeHumanText(inputElement, text) {
    inputElement.focus();
    for (let char of text) {
        document.execCommand('insertText', false, char);
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 110) + 40));
    }
}

async function humanScrollJitter() {
    const scrollAmount = Math.floor(Math.random() * 60) + 20;
    window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    await new Promise(r => setTimeout(r, 400));
    window.scrollBy({ top: -Math.floor(scrollAmount / 2), behavior: 'smooth' });
}

async function safeClick(element) {
    element.style.border = "4px solid red";
    await humanScrollJitter();
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const opts = { bubbles: true, cancelable: true, view: window };
    element.dispatchEvent(new MouseEvent('mouseover', opts));
    element.dispatchEvent(new MouseEvent('mousedown', opts));
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 150) + 50));
    element.dispatchEvent(new MouseEvent('mouseup', opts));
    element.dispatchEvent(new MouseEvent('click', opts));
    element.click();
}

function findClickableElement(text) {
    for (let el of document.querySelectorAll('*')) {
        if (['SCRIPT','STYLE','NOSCRIPT','HTML','BODY'].includes(el.tagName)) continue;
        if (el.children.length === 0 && el.innerText && el.innerText.trim().toLowerCase() === text.toLowerCase()) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                let p = el;
                while (p && p !== document.body) {
                    if (p.tagName === 'BUTTON' || p.tagName === 'A' || p.getAttribute('role') === 'button' || p.onclick) return p;
                    p = p.parentElement;
                }
                return el;
            }
        }
    }
    return null;
}

async function retryFind(findFn, description, maxRetries = 3, waitSec = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const el = findFn();
        if (el) {
            logMsg(`✅ [Lần ${attempt}] Tìm thấy: ${description}`);
            return el;
        }
        logMsg(`⏳ [Lần ${attempt}/${maxRetries}] Chưa thấy "${description}". Chờ ${waitSec}s thử lại...`);
        await delay(waitSec);
    }
    logMsg(`❌ Không thấy: ${description}`);
    return null;
}

async function retryFindAndClick(findFn, description, maxRetries = 3, waitSec = 3) {
    const el = await retryFind(findFn, description, maxRetries, waitSec);
    if (el) {
        await safeClick(el);
        logMsg(`👉 Đã click: ${description}`);
        return true;
    }
    return false;
}

// XỬ LÝ 1 VIDEO REELS
async function processSingleReel(cfg, targetPageName) {
    // 3. BẤM NÚT BÌNH LUẬN
    await delay(2, 3);
    const cmtOk = await retryFindAndClick(
        () => {
            for (let el of document.querySelectorAll('*')) {
                const aria = el.getAttribute('aria-label');
                if (aria && (aria.toLowerCase().includes('bình luận') || aria.toLowerCase().includes('comment'))) return el;
            }
            return null;
        },
        'Nút Bình luận', 3, 2
    );
    if (!cmtOk) return false;

    // 3.5. KIỂM TRA BÌNH LUẬN CÓ BỊ LAG / SPINNER XOAY TRÒN KHÔNG
    await delay(2, 3);
    logMsg("🔍 Kiểm tra xem ô bình luận có bị lag (Spinner xoay) không...");
    let isLagging = false;
    
    for (let attempt = 0; attempt < 3; attempt++) {
        // Kiểm tra xem ô nhập bình luận thực sự có xuất hiện trên màn hình không
        const visibleInput = Array.from(document.querySelectorAll('textarea, div[contenteditable="true"]')).find(el => {
            const r = el.getBoundingClientRect();
            return r.width > 50 && r.height > 15 && r.top > 0 && r.top < window.innerHeight;
        });

        // Kiểm tra xem có icon spinner xoay tròn đang xoay không
        const spinner = Array.from(document.querySelectorAll('div[role="progressbar"], svg[aria-label*="loading"], svg[aria-label*="Đang tải"], [class*="spinner"], [class*="loading"]')).find(el => {
            const r = el.getBoundingClientRect();
            return r.width > 10 && r.height > 10 && r.top > 50 && r.top < window.innerHeight - 50;
        });

        const hasComments = Array.from(document.querySelectorAll('div[role="article"]')).some(el => {
            const r = el.getBoundingClientRect();
            return r.width > 50 && r.top < window.innerHeight - 100;
        });

        if (spinner || (!visibleInput && !hasComments)) {
            isLagging = true;
        } else if (visibleInput || hasComments) {
            isLagging = false;
            break;
        }
        await delay(1, 2);
    }

    if (isLagging) {
        logMsg(`⚠️ PHÁT HIỆN BÌNH LUẬN BỊ LAG (Không hiện ô nhập/Spinner)! Bỏ qua Nick "${targetPageName}", sẽ thử lại ở phiên sau.`);
        safeSendMessage({ action: "accountLagged", pageName: targetPageName });
        return false;
    }

    // 4. QUÉT TOÀN MÀN HÌNH KIỂM TRA ĐÃ CÓ BÀI ĐĂNG / GHIM CHƯA
    logMsg("🔍 Quét TOÀN MÀN HÌNH kiểm tra (Tên Nick + Nội dung mẫu + Nút ghim)...");
    let isAlreadyDone = false;

    // Hàm nắn chuẩn hóa Tiếng Việt (chuyển chữ thường, xóa khoảng trắng thừa, xóa unicode khác biệt)
    function cleanText(str) {
        if (!str) return '';
        return str.toString()
            .normalize('NFC')
            .toLowerCase()
            .replace(/[\u00a0\u200b\r\n\t]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function scanFullPageForExistingComment() {
        const fullPageText = cleanText(document.body ? document.body.innerText : '');
        const targetNameClean = cleanText(targetPageName);
        
        // Lấy 8 ký tự đầu của nội dung mẫu để so khớp
        const commentSnippet = (cfg && cfg.commentText) ? cleanText(cfg.commentText).substring(0, 8) : '';

        // 1. So khớp Tên Nick trên toàn bộ document.body.innerText đã gộp
        let foundName = targetNameClean.length > 0 && fullPageText.includes(targetNameClean);

        // Nâng cấp: So khớp mờ 75% từ nếu Tên Nick có từ nhỏ khác biệt
        if (!foundName && targetNameClean.length > 3) {
            const words = targetNameClean.split(' ').filter(w => w.length >= 2);
            if (words.length >= 2) {
                const matchedWords = words.filter(w => fullPageText.includes(w));
                if (matchedWords.length / words.length >= 0.75) {
                    foundName = true;
                }
            }
        }

        // 2. So khớp Nội dung comment mẫu trên màn hình
        const foundContent = commentSnippet.length >= 4 && fullPageText.includes(commentSnippet);

        // 3. So khớp Biểu tượng ghim 📌 hoặc chữ "đã ghim"
        const foundPin = fullPageText.includes('📌') || fullPageText.includes('đã ghim') || fullPageText.includes('pinned') ||
                         document.querySelector('svg[aria-label*="ghim"], i[aria-label*="ghim"], [title*="ghim"]') !== null;

        return { foundName, foundContent, foundPin };
    }

    // Chờ 3 lần cho Facebook nạp đầy đủ bình luận
    for (let attempt = 1; attempt <= 3; attempt++) {
        await delay(2, 2);

        const { foundName, foundContent, foundPin } = scanFullPageForExistingComment();
        logMsg(`🔎 [Lần ${attempt}/3] Tên Nick="${foundName}", Nội dung mẫu="${foundContent}", Nút Ghim="${foundPin}"`);

        if (foundName && (foundContent || foundPin)) {
            logMsg(`ℹ️ XÁC NHẬN: Nick "${targetPageName}" đã có bài đăng/ghim trên video này! -> Bỏ qua, chuyển Page tiếp!`);
            isAlreadyDone = true;
            break;
        }
    }

    if (isAlreadyDone) {
        logMsg(`ℹ️ PHÁT HIỆN VIDEO NÀY ĐÃ CÓ BÀI ĐĂNG & GHIM SẴN! (Bỏ qua bài này, chuẩn bị chuyển sang Page khác...)`);
        return "ALREADY_EXISTS";
    }

    // CHƯA GHIM -> ĐĂNG & GHIM
    logMsg(`⚠️ CHƯA GHIM -> Đăng nội dung & Ghim...`);
    if (!cfg) {
        logMsg(`⚠️ Chưa cài Mẫu.`);
        return false;
    }

    // 5. ĐÍNH KÈM ẢNH
    if (cfg.imageData) {
        logMsg("🖼️ Đính kèm ảnh...");
        await retryFindAndClick(
            () => Array.from(document.querySelectorAll('div, span, svg, i')).find(el => {
                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                return aria.includes('ảnh') || aria.includes('photo') || aria.includes('đính kèm');
            }),
            'Nút Camera/Ảnh', 3, 2
        );
        await delay(1, 2);

        let fileInput = await retryFind(
            () => document.querySelector('input[type="file"]') || Array.from(document.querySelectorAll('input')).find(i => i.type === 'file'),
            'Input chọn file', 3, 2
        );
        if (fileInput) {
            try {
                const imageFile = dataURLtoFile(cfg.imageData, 'photo.jpg');
                const dt = new DataTransfer();
                dt.items.add(imageFile);
                fileInput.files = dt.files;
                fileInput.dispatchEvent(new Event('input', { bubbles: true }));
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                logMsg("✅ Đã nạp ảnh!");
                await delay(2, 3);

                await retryFindAndClick(
                    () => findClickableElement('Upload photo') || findClickableElement('Tải ảnh lên') || findClickableElement('Upload') || findClickableElement('Tải lên'),
                    'Nút Upload Photo', 3, 2
                );
                logMsg("⏳ Chờ 4-6s upload ảnh...");
                await delay(4, 6);
            } catch (err) {
                logMsg(`⚠️ Lỗi ảnh: ${err.message}`);
            }
        }
    }

    // 6. GÕ TEXT
    await delay(1, 2);
    logMsg("⌨️ Gõ bình luận...");
    const input = await retryFind(
        () => document.querySelector('textarea, div[contenteditable="true"], div[aria-label*="bình luận"], div[aria-label*="comment"]'),
        'Ô nhập bình luận', 3, 2
    );
    if (input) {
        await typeHumanText(input, cfg.commentText);
        await delay(1, 2);
    }

    // 7. BẤM GỬI
    await delay(1, 2);
    logMsg("👉 Bấm Gửi...");
    const sendOk = await retryFindAndClick(
        () => {
            let btn = document.querySelector('div[aria-label*="Gửi"], div[aria-label*="Send"], div[aria-label*="Đăng"], div[aria-label*="Post"]');
            if (!btn) {
                const btns = Array.from(document.querySelectorAll('div[role="button"], svg')).filter(el => {
                    const r = el.getBoundingClientRect();
                    return r.width > 15 && r.height > 15 && r.top > window.innerHeight - 150;
                });
                if (btns.length > 0) btn = btns[btns.length - 1];
            }
            if (!btn) btn = findClickableElement('Đăng') || findClickableElement('Post') || findClickableElement('Gửi');
            return btn;
        },
        'Nút Gửi bình luận', 3, 2
    );
    if (sendOk) logMsg("🚀 ĐÃ GỬI BÌNH LUẬN!");

    // 8. CHỜ BÌNH LUẬN HIỆN, BẤM 3 CHẤM, GHIM
    logMsg("⏳ Chờ 5-7s bình luận xuất hiện...");
    await delay(5, 7);

    logMsg("🔍 Tìm nút 3 chấm [Comment menu]...");
    const dotsOk = await retryFindAndClick(
        () => {
            const exactBtns = Array.from(document.querySelectorAll('div[role="button"][aria-label="Comment menu"]'));
            if (exactBtns.length > 0) return exactBtns[0];

            const fuzzyBtns = Array.from(document.querySelectorAll('div[role="button"]')).filter(el => {
                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                return aria.includes('comment menu') || aria.includes('menu bình luận') || aria.includes('tùy chọn bình luận');
            });
            if (fuzzyBtns.length > 0) return fuzzyBtns[0];

            const myText = Array.from(document.querySelectorAll('span, div, p')).find(el =>
                el.innerText && el.innerText.trim().toLowerCase().includes(cfg.commentText.substring(0, 10).toLowerCase())
            );
            if (myText) {
                let parent = myText;
                for (let d = 0; d < 6; d++) {
                    if (!parent || parent === document.body) break;
                    const btn = Array.from(parent.querySelectorAll('div[role="button"], i, svg, span')).find(b => {
                        const r = b.getBoundingClientRect();
                        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                        const txt = (b.innerText || '').trim();
                        return r.width > 0 && r.height > 0 && (aria.includes('menu') || txt === '...' || txt === '•••');
                    });
                    if (btn) return btn;
                    parent = parent.parentElement;
                }
            }
            return null;
        },
        'Nút [Comment menu]', 3, 2
    );

    if (dotsOk) {
        await delay(1, 2);
        const unpinItem = findClickableElement('Unpin comment') || findClickableElement('Unpin') || findClickableElement('Bỏ ghim bình luận') || findClickableElement('Bỏ ghim');
        if (unpinItem) {
            logMsg(`✅ Đã ghim sẵn! Không gỡ.`);
        } else {
            const pinOk = await retryFindAndClick(
                () => findClickableElement('Pin comment') || findClickableElement('Pin') || findClickableElement('Ghim bình luận') || findClickableElement('Ghim'),
                'Nút Pin comment', 3, 2
            );
            if (pinOk) logMsg(`🎉 THÀNH CÔNG! Đã Pin comment!`);
        }
    }
    return true;
}

// =================== MAIN FLOW ===================
function getFacebookProfileNameStrict() {
    const checkedRadio = document.querySelector('input[type="radio"][checked], [aria-checked="true"], div[role="radio"][aria-checked="true"]');
    if (checkedRadio) {
        let parent = checkedRadio.closest('li, label, div[role="button"], div');
        if (parent && parent.innerText) {
            const txt = parent.innerText.trim().split('\n')[0].trim();
            if (txt.length > 2) return txt;
        }
    }

    const headers = Array.from(document.querySelectorAll('h1, h2, h3, div, span, strong')).filter(el => {
        const r = el.getBoundingClientRect();
        const txt = (el.innerText || '').trim();
        const tl = txt.toLowerCase();
        return r.top > 80 && r.top < 380 && r.left < 280 && r.width > 50 && r.height > 15 && txt.length > 2 &&
               !tl.includes('followers') && !tl.includes('following') && !tl.includes('posts') &&
               !tl.includes('dashboard') && !tl.includes('facebook') && !tl.includes('menu') &&
               !tl.includes('notifications') && !tl.includes('professional') && !tl.includes('add to story');
    });

    if (headers.length > 0) {
        return headers[0].innerText.split('\n')[0].trim();
    }
    return "";
}

async function runChecking(pageConfigs, targetPageName) {
    try {
        logMsg("🚀 Bắt đầu kiểm tra Profile...");
        await delay(2, 3);
        
        // 0. ĐỌC TÊN NICK CHUẨN XÁC VÙNG HEADER
        let currentPageName = getFacebookProfileNameStrict();

        logMsg(`📌 Profile nhận diện: "${currentPageName}" | Mục tiêu: "${targetPageName}"`);

        if (currentPageName && isNameMatch(currentPageName, targetPageName)) {
            logMsg(`✅ ĐÚNG NICK "${targetPageName}"! Vào Reels luôn...`);
        } else {
            logMsg(`🔄 KHÁC NICK (Hiện tại: "${currentPageName}" ≠ Mục tiêu: "${targetPageName}"). Cần chuyển sang Nick "${targetPageName}"...`);
            chrome.runtime.sendMessage({ action: "needAccountSwitch", targetPageName });
            return;
        }

        // 1. BẤM TAB REELS
        await delay(2, 3);
        const reelsOk = await retryFindAndClick(
            () => findClickableElement('Reels'),
            'Tab Reels', 3, 2
        );
        if (!reelsOk) {
            chrome.runtime.sendMessage({ action: "pageCompleted" });
            return;
        }

        // 2. LẤY DANH SÁCH VIDEO REELS ĐẦU TIÊN ĐỂ XỬ LÝ
        await delay(2, 3);
        logMsg("🔍 Đang lấy danh sách Video Reels...");
        
        let reelLinks = [];
        await retryFind(() => {
            let links = Array.from(document.querySelectorAll('a')).filter(a => 
                a.href.includes('/reel/') || a.href.includes('/video/') || a.href.includes('/watch/')
            );
            if (links.length > 0) {
                reelLinks = links;
                return true;
            }
            return false;
        }, 'Danh sách Reels', 3, 5);

        if (reelLinks.length === 0) {
            let imgs = Array.from(document.querySelectorAll('img')).filter(img => {
                const r = img.getBoundingClientRect();
                return r.width > 100 && r.height > 150;
            });
            if (imgs.length > 0) reelLinks = imgs; // Fallback click img
        }

        if (reelLinks.length === 0) {
            logMsg("⚠️ Không thấy Reels nào.");
            chrome.runtime.sendMessage({ action: "pageCompleted" });
            return;
        }

        // CHỈ XỬ LÝ ĐÚNG 1 VIDEO ĐẦU TIÊN
        const maxVideos = Math.min(1, reelLinks.length);
        logMsg(`🎯 Tìm thấy các Reels, chỉ làm ĐÚNG 1 VIDEO ĐẦU TIÊN rồi chuyển Nick luôn.`);

        for (let i = 0; i < maxVideos; i++) {
            logMsg(`▶️▶️ ĐANG MỞ VÀ XỬ LÝ VIDEO THỨ ${i + 1}/${maxVideos}...`);
            
            // Tìm lại list links vì sau khi back từ video trước DOM có thể bị reset
            let currentList = [];
            await retryFind(() => {
                let links = Array.from(document.querySelectorAll('a')).filter(a => 
                    a.href.includes('/reel/') || a.href.includes('/video/') || a.href.includes('/watch/')
                );
                if (links.length > 0) { currentList = links; return true; }
                let imgs = Array.from(document.querySelectorAll('img')).filter(img => {
                    const r = img.getBoundingClientRect();
                    return r.width > 100 && r.height > 150;
                });
                if (imgs.length > 0) { currentList = imgs; return true; }
                return false;
            }, `Video Reels thứ ${i + 1}`, 3, 4);

            if (currentList.length > i) {
                await safeClick(currentList[i]);
            } else if (currentList.length > 0) {
                await safeClick(currentList[0]);
            } else {
                logMsg(`⚠️ Không thể mở video thứ ${i + 1}. Bỏ qua.`);
                continue;
            }

            // Gọi hàm xử lý 1 video
            let cfg = (pageConfigs && pageConfigs.length > 0) ? pageConfigs[0] : null;
            const resSingle = await processSingleReel(cfg, targetPageName);

            if (resSingle === "ALREADY_EXISTS") {
                logMsg(`ℹ️ ĐÃ CÓ BÀI ĐĂNG/GHIM SẴN TRÊN VIDEO NÀY! Chuẩn bị chuyển sang Page khác...`);
                safeSendMessage({ action: "pageCompleted", alreadyExisted: true });
                return;
            } else {
                logMsg(`✅ ĐÃ ĐĂNG BÀI MỚI & GHIM THÀNH CÔNG CHO PAGE NÀY! Chuẩn bị chuyển sang Page khác...`);
                safeSendMessage({ action: "pageCompleted", newlyPosted: true });
                return;
            }

            logMsg(`✅ XONG VIDEO THỨ ${i + 1}!`);

            // NẾU CÒN VIDEO TIẾP THEO -> THOÁT RA LƯỚI REELS (BACK)
            if (i < maxVideos - 1) {
                logMsg("🔙 Thoát video 1, quay lại lưới Reels để làm video 2...");
                
                // BƯỚC 1: Thoát khỏi khung Bình luận
                logMsg("Đang đóng khung bình luận...");
                let backBtn1 = Array.from(document.querySelectorAll('div[role="button"], i, svg, a, span, button')).find(el => {
                    const rect = el.getBoundingClientRect();
                    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                    return (rect.top > 0 && rect.top < 65 && rect.left >= 0 && rect.left < 70) ||
                           aria.includes('back') || aria.includes('quay lại') || aria.includes('đóng') || aria.includes('close');
                });
                
                if (backBtn1) {
                    await safeClick(backBtn1);
                } else {
                    const topCornerEl = document.elementFromPoint(25, 25);
                    if (topCornerEl) await safeClick(topCornerEl);
                }
                await delay(3, 4);

                // BƯỚC 2: Thoát khỏi Video Reels để ra ngoài lưới
                logMsg("Đang thoát Video Reels để ra ngoài...");
                let backBtn2 = Array.from(document.querySelectorAll('div[role="button"], i, svg, a, span, button')).find(el => {
                    const rect = el.getBoundingClientRect();
                    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                    return (rect.top > 0 && rect.top < 65 && rect.left >= 0 && rect.left < 70) ||
                           aria.includes('back') || aria.includes('quay lại') || aria.includes('đóng') || aria.includes('close');
                });

                if (backBtn2) {
                    await safeClick(backBtn2);
                } else {
                    const topCornerEl = document.elementFromPoint(25, 25);
                    if (topCornerEl) await safeClick(topCornerEl);
                }
                
                logMsg("⏳ Chờ 6-8s cho lưới Reels load lại...");
                await delay(6, 8);
                
                // Cuộn xuống một chút để thấy video tiếp theo rõ hơn
                window.scrollBy({ top: 150, behavior: 'smooth' });
                await delay(2, 3);
            }
        }
        
        logMsg(`🎉 ĐÃ XỬ LÝ XONG ${maxVideos} VIDEO CHO PAGE NÀY. CHUYỂN PAGE TIẾP THEO!`);
        safeSendMessage({ action: "pageCompleted" });

    } catch (e) {
        logMsg(`❌ Lỗi: ${e.message}`);
        safeSendMessage({ action: "pageCompleted" });
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "runChecking") {
        runChecking(request.pageConfigs, request.targetPageName);
    }
});
