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

function cleanName(str) {
    if (!str) return '';
    return str.toString()
        .normalize('NFC')
        .toLowerCase()
        .replace(/[\u00a0\u200b\r\n\t]+/g, ' ')
        .replace(/[.,\-_/\\]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseSpintax(text) {
    if (!text) return text;
    let match;
    const regex = /{([^{}]*)}/g;
    while ((match = regex.exec(text)) !== null) {
        const options = match[1].split('|');
        const randomOption = options[Math.floor(Math.random() * options.length)];
        text = text.substring(0, match.index) + randomOption + text.substring(match.index + match[0].length);
        regex.lastIndex = 0; // Reset index to search from beginning after replacement
    }
    return text;
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
    
    if (maxLen > 10 && dist <= 3) return 60;
    if (maxLen > 5 && dist <= 2) return 70;
    if (maxLen <= 5 && dist === 1) return 50;

    return 0;
}

function isNameMatch(profileName, targetName) {
    return nameMatchScore(profileName, targetName) > 0;
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
        logMsg(`🎯 Đang click: ${description}...`);
        await safeClick(el);
        logMsg(`✅ ĐÃ THỰC SỰ CLICK: ${description}`);
        return true;
    }
    // Nếu không tìm thấy, retryFind đã log "Không thấy" rồi, nên ở đây không cần log thêm log ảo nữa.
    return false;
}

// XỬ LÝ 1 VIDEO REELS
async function processSingleReel(cfg, targetPageName) {
    // 3. BẤM NÚT BÌNH LUẬN
    await delay(1, 3);
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

    // ⏳ ĐỢI BẮT BUỘC 5 GIÂY sau khi click nút Bình Luận
    // Cho Facebook mở ô nhập liệu, tránh vội vào thao tác khi trang chưa sẵn sàng
    logMsg("⏳ Đợi bắt buộc 5 giây sau khi click nút Bình Luận...");
    await delay(5, 6);

    // 3.5. KIỂM TRA BÌNH LUẬN CÓ BỊ LAG / SPINNER XOAY TRÒN KHÔNG
    logMsg("🔍 Kiểm tra xem ô bình luận có bị lag (Spinner xoay) không...");
    let isLagging = false;
    
    for (let attempt = 0; attempt < 4; attempt++) {
        // Kiểm tra xem ô nhập bình luận thực sự có xuất hiện trên màn hình không
        const visibleInput = Array.from(document.querySelectorAll('textarea, div[contenteditable="true"]')).find(el => {
            const r = el.getBoundingClientRect();
            return r.width > 50 && r.height > 15 && r.top > 0 && r.top < window.innerHeight;
        });

        // Nhận diện Spinner (vòng xoay loading)
        // Mở rộng selector để bắt được nhiều loại spinner của Facebook mobile
        const spinner = Array.from(document.querySelectorAll('div[role="progressbar"], svg circle, img[src*="spinner"], img[src*="loading"], [aria-label*="Loading"], [aria-label*="Đang tải"]')).some(el => {
            const target = el.tagName.toLowerCase() === 'circle' ? el.closest('svg') : el;
            if (target) {
                const r = target.getBoundingClientRect();
                // Spinner thường nằm lơ lửng ở giữa màn hình, hoặc kích thước nhỏ gọn
                return r.width >= 15 && r.width <= 120 && r.height >= 15 && r.height <= 120 && r.top > 50 && r.top < window.innerHeight - 50;
            }
            return false;
        });

        let hasComments = Array.from(document.querySelectorAll('div[role="article"], div[data-sigil="comment"]')).some(el => {
            const r = el.getBoundingClientRect();
            return r.width > 50 && r.top < window.innerHeight - 50;
        });

        // Fallback: Tìm các chữ đặc trưng của bình luận (Nếu Facebook đổi cấu trúc HTML)
        if (!hasComments) {
            hasComments = Array.from(document.querySelectorAll('div, span, a')).some(el => {
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0 || r.top < 50 || r.top > window.innerHeight - 50) return false;
                const txt = (el.innerText || '').trim().toLowerCase();
                // Nếu trên màn hình có những chữ này thì chắc chắn là trang đã load comment xong
                return txt === 'phản hồi' || txt === 'reply' || txt.includes('view previous') || txt.includes('xem bình luận trước');
            });
        }

        // Bắt chữ "Chưa có bình luận nào" (như sếp miêu tả: nếu có chữ này thì là load xong, bình thường)
        const hasNoCommentsText = Array.from(document.querySelectorAll('div, span')).some(el => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            const txt = (el.innerText || '').toLowerCase().trim();
            return txt.includes('chưa có bình luận nào') || 
                   txt.includes('no comments yet') || 
                   txt.includes('hãy là người đầu tiên') || 
                   txt.includes('be the first to comment');
        });

        // Trang ĐÃ TẢI XONG nếu: Có ít nhất 1 bình luận, HOẶC có chữ "Chưa có..."
        const isContentLoaded = hasComments || hasNoCommentsText;

        // Ưu tiên 1: Thấy vòng xoay (nếu bắt được)
        if (spinner) {
            isLagging = true;
            logMsg(`⏳ Phát hiện vòng xoay Loading (Spinner)... (thử lần ${attempt + 1})`);
        } 
        // Ưu tiên 2: Trắng tinh, không có cmt, KHÔNG CÓ chữ "Chưa có bình luận nào" -> ĐANG LOAD!
        else if (!isContentLoaded) {
            isLagging = true;
            logMsg(`⏳ Trang TRẮNG (không có bình luận, không có chữ "Chưa có..."). Chắc chắn đang kẹt Loading! (thử lần ${attempt + 1})`);
        } 
        // Ưu tiên 3: Đã tải xong nội dung (isContentLoaded = true) VÀ có ô nhập liệu -> HOÀN TOÀN BÌNH THƯỜNG
        else if (visibleInput && isContentLoaded) {
            isLagging = false;
            break;
        }
        await delay(1, 3);
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
        if (!document.body) return { foundName: false, foundContent: false, foundPin: false };
        
        // 0. KIỂM TRA BÀI VIẾT CHƯA CÓ BÌNH LUẬN NÀO ("No comments yet" / "Chưa có bình luận nào")
        const rawTextLower = (document.body.innerText || '').toLowerCase();
        if (rawTextLower.includes('no comments yet') || 
            rawTextLower.includes('chưa có bình luận nào') || 
            rawTextLower.includes('be the first to comment') || 
            rawTextLower.includes('hãy là người đầu tiên bình luận')) {
            return { foundName: false, foundContent: false, foundPin: false, isEmpty: true };
        }

        // Xóa tạm các ô nhập liệu (input, placeholder "Comment as...") để không soi nhầm tên Nick nằm trong ô nhập
        const bodyClone = document.body.cloneNode(true);
        const inputs = bodyClone.querySelectorAll('input, textarea, [contenteditable="true"], [placeholder], form, [role="textbox"]');
        inputs.forEach(el => el.remove());

        const fullPageText = cleanText(bodyClone.innerText || '');
        const targetNameClean = cleanText(targetPageName);
        
        // Lấy 8 ký tự đầu của nội dung mẫu để so khớp (lọc bỏ ký tự spintax nếu có)
        let cleanPattern = (cfg && cfg.commentText) ? cfg.commentText.replace(/\{.*?\}/g, '') : '';
        const commentSnippet = cleanText(cleanPattern).substring(0, 8);

        // 1. So khớp Tên Nick trên phần danh sách bình luận (đã loại bỏ ô nhập)
        let foundName = targetNameClean.length > 0 && fullPageText.includes(targetNameClean);

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

        return { foundName, foundContent, foundPin, isEmpty: false };
    }

    // Chờ 5 lần cho Facebook nạp đầy đủ bình luận (tránh trường hợp mạng lag load chậm)
    for (let attempt = 1; attempt <= 5; attempt++) {
        await delay(2, 3);

        const { foundName, foundContent, foundPin, isEmpty } = scanFullPageForExistingComment();

        if (isEmpty) {
            logMsg(`💡 [Lần ${attempt}/5] XÁC NHẬN: Bài viết hoàn toàn CHƯA CÓ BÌNH LUẬN NÀO (No comments yet) -> Tiến hành bình luận mới!`);
            isAlreadyDone = false;
            break;
        }
        
        if (foundName && (foundContent || foundPin)) {
            logMsg(`ℹ️ [Lần ${attempt}/5] XÁC NHẬN: Đã thấy nội dung ghim của Nick "${targetPageName}" trên màn hình! -> Bỏ qua video này!`);
            isAlreadyDone = true;
            break;
        } else {
            logMsg(`🔎 [Lần ${attempt}/5] Quét chưa thấy nội dung cũ, chờ trang load thêm...`);
        }
    }

    if (isAlreadyDone) {
        logMsg(`ℹ️ PHÁT HIỆN VIDEO NÀY ĐÃ CÓ BÀI ĐĂNG & GHIM SẴN! (Chuyển sang Page tiếp theo...)`);
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
        await delay(1, 3);

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
                await delay(1, 3);

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
    await delay(1, 3);
    logMsg("⌨️ Gõ bình luận...");
    const input = await retryFind(
        () => document.querySelector('textarea, div[contenteditable="true"], div[aria-label*="bình luận"], div[aria-label*="comment"]'),
        'Ô nhập bình luận', 3, 2
    );
    if (input) {
        const spunText = parseSpintax(cfg.commentText);
        logMsg(`💬 Nội dung ngẫu nhiên (Spintax): "${spunText}"`);
        await typeHumanText(input, spunText);
        await delay(1, 3);
    }

    // 7. BẤM GỬI
    await delay(1, 3);
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

    // ⏳ ĐỢI BẮT BUỘC 5 GIÂY sau khi gửi - cho Facebook xử lý bình luận
    logMsg("⏳ Đợi bắt buộc 5 giây sau khi gửi bình luận (để Facebook xử lý)...");
    await delay(5, 7);

    // 8. CHỜ BÌNH LUẬN HIỆN, BẤM 3 CHẤM, GHIM
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
        await delay(1, 3);
        const unpinItem = findClickableElement('Unpin comment') || findClickableElement('Unpin') || findClickableElement('Bỏ ghim bình luận') || findClickableElement('Bỏ ghim');
        if (unpinItem) {
            logMsg(`✅ Đã ghim sẵn! Không gỡ.`);
        } else {
            const pinOk = await retryFindAndClick(
                () => findClickableElement('Pin comment') || findClickableElement('Pin') || findClickableElement('Ghim bình luận') || findClickableElement('Ghim'),
                'Nút Pin comment', 3, 2
            );
            if (pinOk) {
                logMsg(`✅ ĐÃ BẤM GHIM! Đợi thêm 5 giây để Facebook ghi nhận...`);
                await delay(5, 6);
                logMsg(`🎉 HOÀN TẤT! Bình luận đã được ghim thành công cho Nick này!`);
            }
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
        await delay(1, 3);
        
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
        await delay(1, 3);
        const reelsOk = await retryFindAndClick(
            () => findClickableElement('Reels'),
            'Tab Reels', 3, 2
        );
        if (!reelsOk) {
            chrome.runtime.sendMessage({ action: "pageCompleted" });
            return;
        }

        // 2. LẤY DANH SÁCH VIDEO REELS ĐẦU TIÊN ĐỂ XỬ LÝ
        await delay(1, 3);
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

        // ĐỌC CẤU HÌNH SỐ VIDEO REELS CẦN XỬ LÝ MỖI PAGE (Mặc định = 2)
        let reelsPerPageSetting = 2;
        try {
            const st = await new Promise(resolve => chrome.storage.local.get(['reelsPerPage'], resolve));
            if (st && st.reelsPerPage) reelsPerPageSetting = parseInt(st.reelsPerPage) || 2;
        } catch (e) {}

        const maxVideos = Math.min(reelsPerPageSetting, reelLinks.length);
        logMsg(`🎯 Tìm thấy các Reels, tiến hành xử lý ${maxVideos} VIDEO REELS cho Page "${targetPageName}"...`);

        for (let i = 0; i < maxVideos; i++) {
            logMsg(`▶️▶️ [PAGE: ${targetPageName}] ĐANG MỞ VÀ XỬ LÝ VIDEO REELS THỨ ${i + 1}/${maxVideos}...`);
            
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
                logMsg(`ℹ️ [Video ${i + 1}/${maxVideos}] Đã có bài đăng/ghim sẵn trên video này!`);
            } else if (resSingle) {
                logMsg(`✅ [Video ${i + 1}/${maxVideos}] Đã đăng bài mới & ghim thành công!`);
            } else {
                logMsg(`⚠️ [Video ${i + 1}/${maxVideos}] Không thể hoàn tất ghim bài này.`);
            }

            logMsg(`✅ HOÀN THÀNH VIDEO THỨ ${i + 1}/${maxVideos}!`);

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
                await delay(1, 3);

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
                await delay(1, 3);
                
                // Cuộn xuống một chút để thấy video tiếp theo rõ hơn
                window.scrollBy({ top: 150, behavior: 'smooth' });
                await delay(1, 3);
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
