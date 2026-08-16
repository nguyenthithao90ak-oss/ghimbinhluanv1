// removed duplicate var (minSec, maxSec = minSec) => {
// =============================================
// CORE UTILITIES
// =============================================
const delay = (minSec, maxSec = minSec) => {
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
                    // Suppress chrome extension lastError silently
                }
            });
        }
    } catch(e) {}
}

// --------------------------------------------------------------------------------------
// DETECT CHECKPOINT / ACCOUNT RESTRICTION
// --------------------------------------------------------------------------------------
function setupBlockDetector(targetPageName) {
    const checkBlock = () => {
        const text = (document.body.innerText || '').toLowerCase();
        if (text.includes('tài khoản của bạn bị hạn chế') ||
            text.includes('account has been restricted') ||
            text.includes('checkpoint') ||
            text.includes('security check') ||
            text.includes('we suspended your account')) {
            logMsg('🚨 NGHIÊM TRỌNG: Phát hiện Nick bị CHECKPOINT/HẠN CHẾ! Thoát ngay!');
            safeSendMessage({ action: 'accountLagged', pageName: targetPageName });
            return true;
        }
        return false;
    };
    if (checkBlock()) return true;
    setInterval(checkBlock, 3000);
    return false;
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


// Hàm phân tích số lượt xem (View Parser)
function parseViewCount(text) {
    if (!text) return 0;
    const clean = text.toString().toLowerCase().trim().replace(/,/g, '.');
    const mMatch = clean.match(/([\d\.]+)\s*(m|triệu|tr)/);
    if (mMatch) return parseFloat(mMatch[1]) * 1000000;
    const kMatch = clean.match(/([\d\.]+)\s*(k|nghìn|ngàn)/);
    if (kMatch) return parseFloat(kMatch[1]) * 1000;
    const numMatch = clean.match(/([\d\.]+)/);
    if (numMatch) return parseFloat(numMatch[1]) || 0;
    return 0;
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

function findClickableElement(textOrArray) {
    let targets = [];
    if (typeof textOrArray === 'string') targets = [textOrArray.toLowerCase()];
    else if (Array.isArray(textOrArray)) targets = textOrArray.map(t => t.toLowerCase());

    const isMatch = (str) => {
        if (!str) return false;
        str = str.toLowerCase().trim();
        return targets.some(t => str === t || str.includes(t));
    };

    for (let el of document.querySelectorAll('*')) {
        if (['SCRIPT','STYLE','NOSCRIPT','HTML','BODY','HEAD'].includes(el.tagName)) continue;
        
        // Match InnerText (exact or includes if the word is long enough)
        let textMatch = false;
        if (el.children.length === 0 && el.innerText) {
            textMatch = isMatch(el.innerText);
        }

        // Match Aria-Label / Title (often used by FB for icon buttons)
        let attrMatch = false;
        if (!textMatch && (el.tagName === 'DIV' || el.tagName === 'SPAN' || el.tagName === 'I' || el.tagName === 'SVG' || el.tagName === 'A' || el.tagName === 'BUTTON')) {
            attrMatch = isMatch(el.getAttribute('aria-label')) || isMatch(el.getAttribute('title'));
        }

        if (textMatch || attrMatch) {
            const r = el.getBoundingClientRect();
            // Check if element is visible and in viewport
            if (r.width > 0 && r.height > 0 && r.top >= 0 && r.top <= window.innerHeight) {
                let p = el;
                // Traverse up to find the actionable wrapper
                while (p && p !== document.body) {
                    if (p.tagName === 'BUTTON' || p.tagName === 'A' || p.getAttribute('role') === 'button' || p.getAttribute('role') === 'link' || p.onclick) return p;
                    p = p.parentElement;
                }
                // If no button wrapper found, return the element itself
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

// =================== TỰ ĐỘNG THẢ TIM / LIKE 3 - 4 BÌNH LUẬN ĐẦU TIÊN ===================
async function autoLikeTopComments() {
    try {
        logMsg("❤️ Đang quét các bình luận để tự động Thả Tim tương tác...");
        await delay(1, 2);

        // Tìm tất cả các nút Thích (Like) của bình luận trên màn hình (theo chuẩn DevTools aria-label="Nút Thích...")
        const likeButtons = Array.from(document.querySelectorAll('div[role="button"], span, a, button, div.m')).filter(el => {
            const r = el.getBoundingClientRect();
            // Nút Like bình luận nằm trong khung bình luận (không phải nút like video ở header)
            if (r.width === 0 || r.height === 0 || r.height > 50 || r.top < 60 || r.top > window.innerHeight - 80) return false;
            
            const txt = (el.innerText || '').trim().toLowerCase();
            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
            
            // Khớp chính xác aria-label theo DevTools: "Nút Thích. Nhấn đúp và giữ..." hoặc chữ "Thích"
            const isLikeBtn = txt === 'thích' || txt === 'like' || 
                              aria.includes('nút thích') || aria === 'thích' || aria.startsWith('nút thích') ||
                              aria.includes('like button') || aria === 'like';
                              
            // Bỏ qua nếu đã Like rồi (chữ "Đã thích", "Bỏ thích", "Unlike" hoặc aria chứa "bỏ thích" / "đã thích")
            const isAlreadyLiked = txt === 'đã thích' || txt === 'bỏ thích' || txt === 'unlike' || 
                                   aria.includes('đã thích') || aria.includes('bỏ thích') || aria.includes('bày tỏ cảm xúc');
            
            return isLikeBtn && !isAlreadyLiked;
        });

        if (likeButtons.length > 0) {
            // Lựa chọn bấm Like đủ 3 đến 4 bình luận đầu tiên
            const targetLikes = Math.min(likeButtons.length, Math.floor(Math.random() * 2) + 3); // 3 hoặc 4 cái
            logMsg(`❤️ Tìm thấy ${likeButtons.length} bình luận chưa Like. Bắt đầu bấm Like cho ${targetLikes} bình luận đầu tiên...`);
            
            let count = 0;
            for (let i = 0; i < likeButtons.length && count < targetLikes; i++) {
                const btn = likeButtons[i];
                await safeClick(btn);
                count++;
                logMsg(`❤️ [${count}/${targetLikes}] Đã Like bình luận thành công!`);
                await delay(1, 3); // Nghỉ 1-3s giữa mỗi lần bấm like để tự nhiên như người thật
            }
            logMsg(`🎉 ĐÃ LIKE XONG ĐỦ ${count} BÌNH LUẬN ĐẦU TIÊN ĐỂ TĂNG TƯƠNG TÁC!`);
        } else {
            logMsg("ℹ️ Các bình luận đã được Like sẵn hoặc không có thêm bình luận mới.");
        }
    } catch (err) {
        logMsg(`⚠️ Không thể tự động Like bình luận: ${err.message}`);
    }
}

async function processSingleReel(cfg, targetPageName) {
    // 3. BẤM NÚT BÌNH LUẬN (SELECTOR MULTI-LAYER THÔNG MINH)
    await delay(1, 3);
    const cmtOk = await retryFindAndClick(
        () => {
            // Lớp 1: Element hiển thị thực tế có aria-label / title chứa 'bình luận' hoặc 'comment'
            const visibleBtns = Array.from(document.querySelectorAll('button, a, div[role="button"], i, svg, span, div')).filter(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.top > window.innerHeight) return false;
                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                const title = (el.getAttribute('title') || '').toLowerCase();
                return aria.includes('bình luận') || aria.includes('comment') || title.includes('bình luận') || title.includes('comment');
            });

            if (visibleBtns.length > 0) {
                // Ưu tiên phần tử nhỏ nhất (leaf node) hoặc role="button"
                visibleBtns.sort((a, b) => (a.clientWidth * a.clientHeight) - (b.clientWidth * b.clientHeight));
                const exactRoleBtn = visibleBtns.find(b => b.getAttribute('role') === 'button' || b.tagName === 'BUTTON');
                return exactRoleBtn || visibleBtns[0];
            }

            // Lớp 2: Quét các nút có icon comment SVG hoặc chữ 'Bình luận' / 'Comment'
            return findClickableElement(['Bình luận', 'Comment', 'Viết bình luận', 'Write a comment', 'Reply', 'Trả lời']);
        },
        'Nút Bình luận (Multi-layer Selector)', 4, 2
    );
    if (!cmtOk) return false;

    // ⏳ ĐỢI BẮT BUỘC 5 GIÂY sau khi click nút Bình Luận
    // Cho Facebook mở ô nhập liệu, tránh vội vào thao tác khi trang chưa sẵn sàng
    logMsg("⏳ Đợi bắt buộc 5 giây sau khi click nút Bình Luận...");
    await delay(5, 6);

    // 3.5. KIỂM TRA BÌNH LUẬN CÓ BỊ LAG / SPINNER XOAY TRÒN KHÔNG
    logMsg("🔍 Kiểm tra xem ô bình luận có bị lag (Spinner xoay) không...");
    let isLagging = false;
    
    for (let attempt = 0; attempt < 1; attempt++) {
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

        // Nhận diện bình luận: Facebook Mobile dùng nhiều cấu trúc khác nhau
        // Ưu tiên: kiểm tra chữ "Thích", "Trả lời", "Reply" đặc trưng dưới bình luận
        let hasComments = false;

        // Cách 1: Selector truyền thống
        hasComments = Array.from(document.querySelectorAll('div[role="article"], div[data-sigil="comment"]')).some(el => {
            const r = el.getBoundingClientRect();
            return r.width > 50 && r.top < window.innerHeight - 50;
        });

        // Cách 2: Nhận dạng chữ đặc trưng dưới mỗi bình luận (Facebook Mobile luôn có)
        if (!hasComments) {
            const allText = (document.body.innerText || '').toLowerCase();
            // Nếu có chữ "Thích · Trả lời" hoặc "Like · Reply" = có bình luận thật
            hasComments = allText.includes('phản hồi') || 
                          allText.includes('trả lời') ||
                          allText.includes('reply') || 
                          allText.includes('like · reply') ||
                          allText.includes('view previous') || 
                          allText.includes('xem bình luận trước') ||
                          allText.includes('view more comments') ||
                          allText.includes('xem thêm bình luận') ||
                          allText.includes('16 phút') || // timestamp kiểu "X phút" chứng tỏ có bình luận
                          allText.includes('phút trước') ||
                          allText.includes('giờ trước') ||
                          allText.includes('ngày trước');
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
            logMsg("⏳ Phát hiện vòng xoay Loading (Spinner)...");
        } 
        // Ưu tiên 2: Trắng tinh, không có cmt, KHÔNG CÓ chữ "Chưa có bình luận nào" -> ĐANG LOAD!
        else if (!isContentLoaded) {
            isLagging = true;
            logMsg("⏳ Trang TRẮNG/Loading (chờ 1 lần rồi tiến hành quét và ghim luôn)...");
        } 
        // Ưu tiên 3: Đã tải xong nội dung (isContentLoaded = true) VÀ có ô nhập liệu -> HOÀN TOÀN BÌNH THƯỜNG
        else if (visibleInput && isContentLoaded) {
            isLagging = false;
            break;
        }
        await delay(1, 3);
    }

    if (isLagging) {
        logMsg(`⚠️ CẢNH BÁO: Máy chấm bị Lag (Trắng trang/Spinner). Đã VÔ HIỆU HÓA bỏ qua, sẽ cố ép ghi bình luận!`);
        // Bỏ qua logic tính là lag theo yêu cầu sếp
        // safeSendMessage({ action: "accountLagged", pageName: targetPageName });
        // return "LAGGED";
    }

    // 4. QUÉT TOÀN MÀN HÌNH KIỂM TRA ĐÃ CÓ BÀI ĐĂNG / GHIM CHƯA
    logMsg("🔍 Quét TOÀN MÀN HÌNH kiểm tra (Tên Nick + Nội dung mẫu + Nút ghim)...");
    let isAlreadyDone = false;

    // Hàm nắn chuẩn hóa Tiếng Việt (chuyển chữ thường, xóa khoảng trắng thừa, xóa unicode khác biệt & OBJ)
    function cleanText(str) {
        if (!str) return '';
        return str.toString()
            .normalize('NFC')
            .toLowerCase()
            .replace(/[\u00a0\u200b\r\n\t\uFFFC\uFFFD]+/g, ' ')
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function scanFullPageForExistingComment() {
        if (!document.body) return { foundName: false, foundContent: false, foundPin: false, isEmpty: false };
        
        // 0. KIỂM TRA BÀI VIẾT CHƯA CÓ BÌNH LUẬN NÀO ("No comments yet" / "Chưa có bình luận nào")
        const rawTextLower = (document.body.innerText || '').toLowerCase();
        if (rawTextLower.includes('no comments yet') || 
            rawTextLower.includes('chưa có bình luận nào') || 
            rawTextLower.includes('be the first to comment') || 
            rawTextLower.includes('hãy là người đầu tiên bình luận')) {
            return { foundName: false, foundContent: false, foundPin: false, isEmpty: true };
        }

        // Lấy text của toàn màn hình nhưng LOẠI TRỪ text nằm trong ô nhập liệu (textarea, contenteditable)
        // Tuyệt đối KHÔNG xóa thẻ 'form' hay 'div' container vì sẽ làm mất luôn nội dung bình luận!
        const bodyClone = document.body.cloneNode(true);
        const inputElements = bodyClone.querySelectorAll('textarea, input[type="text"], div[contenteditable="true"]');
        inputElements.forEach(el => el.remove());
        const fullPageText = cleanText(bodyClone.innerText || '');

        const targetNameClean = cleanText(targetPageName);
        
        // 1. So khớp Tên Nick trên danh sách bình luận
        let foundName = false;
        if (targetNameClean.length > 0) {
            if (fullPageText.includes(targetNameClean)) {
                foundName = true;
            } else if (targetNameClean.length > 3) {
                const words = targetNameClean.split(' ').filter(w => w.length >= 2);
                if (words.length >= 2) {
                    const matchedWords = words.filter(w => fullPageText.includes(w));
                    if (matchedWords.length / words.length >= 0.75) {
                        foundName = true;
                    }
                }
            }
        }

        // 2. So khớp Nội dung comment mẫu (link URL hoặc từ khóa chính trong cfg.commentText)
        let foundContent = false;
        if (cfg && cfg.commentText) {
            // Lấy tất cả đường link (https://...) trong commentText
            const urlMatches = cfg.commentText.match(/https?:\/\/[^\s{}|]+/g);
            if (urlMatches && urlMatches.length > 0) {
                for (const url of urlMatches) {
                    const cleanUrl = cleanText(url);
                    if (cleanUrl.length >= 6 && fullPageText.includes(cleanUrl)) {
                        foundContent = true;
                        break;
                    }
                }
            }

            // Nếu chưa thấy link, trích xuất các từ khóa đặc trưng (dài >= 3 ký tự, không chứa ký tự spintax)
            if (!foundContent) {
                const textWithoutSpintax = cfg.commentText.replace(/\{[^{}]*\}/g, '').replace(/[|{}]/g, ' ');
                const cleanCfg = cleanText(textWithoutSpintax);
                // Tìm kiếm một chuỗi dài hơn (thông minh hơn) thay vì từng chữ rời rạc
                const phrases = cleanCfg.split(/\s+/).filter(w => w.length >= 3);
                if (phrases.length >= 3) {
                    // Ghép 3 từ liên tiếp để tìm kiếm cho chính xác
                    const samplePhrase = phrases.slice(0, 3).join(' ');
                    if (fullPageText.includes(samplePhrase)) {
                        foundContent = true;
                    }
                } else if (phrases.length > 0) {
                    const matched = phrases.filter(w => fullPageText.includes(w));
                    if (matched.length / phrases.length >= 0.8) {
                        foundContent = true;
                    }
                }
            }
        }

        // 3. So khớp Biểu tượng ghim 📌, chữ "đã ghim", hoặc nút menu [Comment menu] đã ghim
        let foundPin = fullPageText.includes('đã ghim') || fullPageText.includes('pinned') || fullPageText.includes('📌');
        if (!foundPin) {
            const hasPinnedAria = Array.from(document.querySelectorAll('[aria-label], [title]')).some(el => {
                const attr = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
                return attr.includes('đã ghim') || attr.includes('pinned comment') || attr.includes('bỏ ghim');
            });
            if (hasPinnedAria) foundPin = true;
        }

        return { foundName, foundContent, foundPin, isEmpty: false };
    }

    // Chờ 2 lần cho Facebook nạp đầy đủ bình luận (Quét thông minh và nhanh hơn)
    for (let attempt = 1; attempt <= 2; attempt++) {
        await delay(2, 3);

        const { foundName, foundContent, foundPin, isEmpty } = scanFullPageForExistingComment();

        if (isEmpty) {
            logMsg(`💡 [Lần ${attempt}/2] XÁC NHẬN: Bài viết hoàn toàn CHƯA CÓ BÌNH LUẬN NÀO (No comments yet) -> Tiến hành bình luận mới!`);
            isAlreadyDone = false;
            break;
        }
        
        if (foundContent || foundPin || (foundName && (foundContent || foundPin))) {
            logMsg(`ℹ️ [Lần ${attempt}/2] XÁC NHẬN: Đã thấy bình luận/ghim cũ trên màn hình (Tên Nick=${foundName}, Nội dung=${foundContent}, Ghim=${foundPin})! -> Bỏ qua video này!`);
            isAlreadyDone = true;
            break;
        } else {
            logMsg(`🔎 [Lần ${attempt}/2] Quét chưa thấy nội dung cũ, chờ trang load thêm...`);
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
                    () => findClickableElement(['Upload photo', 'Tải ảnh lên', 'Upload', 'Tải lên', 'Đính kèm']),
                    'Nút Upload Photo', 3, 2
                );
                logMsg("⏳ Chờ 4-6s upload ảnh...");
                await delay(4, 6);
            } catch (err) {
                logMsg(`⚠️ Lỗi ảnh: ${err.message}`);
            }
        }
    }

    // 6. GÕ TEXT (MULTI-LAYER INPUT FINDER)
    await delay(1, 3);
    logMsg("⌨️ Gõ bình luận...");
    const input = await retryFind(
        () => {
            // Lớp 1: Tìm ô nhập hiển thị thực tế
            const visibleInputs = Array.from(document.querySelectorAll('textarea, div[contenteditable="true"]')).filter(el => {
                const r = el.getBoundingClientRect();
                return r.width > 50 && r.height > 15 && r.top >= 0 && r.top < window.innerHeight;
            });
            if (visibleInputs.length > 0) return visibleInputs[0];

            // Lớp 2: Tìm theo aria-label hoặc placeholder chứa 'bình luận' / 'comment'
            const ariaInputs = Array.from(document.querySelectorAll('div[role="textbox"], input, div')).filter(el => {
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) return false;
                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                const ph = (el.getAttribute('placeholder') || '').toLowerCase();
                return aria.includes('bình luận') || aria.includes('comment') || ph.includes('bình luận') || ph.includes('comment');
            });
            return ariaInputs.length > 0 ? ariaInputs[0] : null;
        },
        'Ô nhập bình luận (Multi-layer)', 4, 2
    );

    if (input) {
        const spunText = parseSpintax(cfg.commentText);
        logMsg(`💬 Nội dung ngẫu nhiên (Spintax): "${spunText}"`);
        await typeHumanText(input, spunText);
        await delay(1, 3);
    }

    // 7. BẤM GỬI (MULTI-LAYER SEND BUTTON)
    await delay(1, 3);
    logMsg("👉 Bấm Gửi...");
    const sendOk = await retryFindAndClick(
        () => {
            // Lớp 1: Nút có aria-label hoặc title chứa Gửi / Send / Đăng / Post
            const ariaBtns = Array.from(document.querySelectorAll('div, button, a, svg, span')).filter(el => {
                const r = el.getBoundingClientRect();
                if (r.width < 10 || r.height < 10 || r.top > window.innerHeight) return false;
                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                const title = (el.getAttribute('title') || '').toLowerCase();
                return aria.includes('gửi') || aria.includes('send') || aria.includes('đăng') || aria.includes('post') || title.includes('gửi') || title.includes('send');
            });
            if (ariaBtns.length > 0) return ariaBtns[ariaBtns.length - 1];

            // Lớp 2: Icon mũi tên gửi ở góc dưới bên phải màn hình
            const cornerBtns = Array.from(document.querySelectorAll('div[role="button"], svg, button')).filter(el => {
                const r = el.getBoundingClientRect();
                return r.width > 15 && r.height > 15 && r.top > window.innerHeight - 150 && r.left > window.innerWidth - 120;
            });
            if (cornerBtns.length > 0) return cornerBtns[cornerBtns.length - 1];

            // Lớp 3: Tìm theo chữ
            return findClickableElement(['Đăng', 'Post', 'Gửi', 'Send', 'Bình luận']);
        },
        'Nút Gửi bình luận (Multi-layer)', 4, 2
    );
    if (sendOk) logMsg("🚀 ĐÃ GỬI BÌNH LUẬN!");

    // ⏳ ĐỢI BẮT BUỘC 5 GIÂY sau khi gửi - cho Facebook xử lý bình luận
    logMsg("⏳ Đợi bắt buộc 5 giây sau khi gửi bình luận (để Facebook xử lý)...");
    await delay(5, 7);

    // 8. CHỜ BÌNH LUẬN HIỆN, BẤM 3 CHẤM, GHIM (MULTI-LAYER 3-DOTS MENU)
    logMsg("🔍 Tìm nút 3 chấm [Comment menu]...");
    const dotsOk = await retryFindAndClick(
        () => {
            // Lớp 1: Khớp chính xác aria-label
            const exactBtns = Array.from(document.querySelectorAll('div[role="button"][aria-label="Comment menu"], [aria-label*="menu bình luận"], [aria-label*="tùy chọn"]'));
            if (exactBtns.length > 0) return exactBtns[0];

            // Lớp 2: Tìm xung quanh đoạn text comment mới đăng
            const myText = Array.from(document.querySelectorAll('span, div, p')).find(el =>
                el.innerText && el.innerText.trim().toLowerCase().includes(cfg.commentText.substring(0, 10).toLowerCase())
            );
            if (myText) {
                let parent = myText;
                for (let d = 0; d < 6; d++) {
                    if (!parent || parent === document.body) break;
                    const btn = Array.from(parent.querySelectorAll('div[role="button"], i, svg, span, button')).find(b => {
                        const r = b.getBoundingClientRect();
                        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                        const txt = (b.innerText || '').trim();
                        return r.width > 0 && r.height > 0 && (aria.includes('menu') || aria.includes('option') || txt === '...' || txt === '•••');
                    });
                    if (btn) return btn;
                    parent = parent.parentElement;
                }
            }
            return null;
        },
        'Nút [Comment menu] (Multi-layer)', 4, 2
    );

    if (dotsOk) {
        await delay(1, 3);
        const unpinItem = findClickableElement(['Unpin comment', 'Unpin', 'Bỏ ghim bình luận', 'Bỏ ghim']);
        if (unpinItem) {
            logMsg(`✅ Đã ghim sẵn! Không gỡ.`);
            await autoLikeTopComments();
        } else {
            const pinOk = await retryFindAndClick(
                () => findClickableElement('Pin comment') || 
                       findClickableElement('Pin') || 
                       findClickableElement('Ghim bình luận') || 
                       findClickableElement('Ghim') ||
                       Array.from(document.querySelectorAll('div, span, button')).find(el => {
                           const txt = (el.innerText || '').trim().toLowerCase();
                           return txt === 'ghim bình luận' || txt === 'pin comment' || txt === 'ghim';
                       }),
                'Nút Pin comment (Multi-layer)', 4, 2
            );
            if (pinOk) {
                logMsg(`✅ ĐÃ BẤM GHIM! Đợi thêm 5 giây để Facebook ghi nhận...`);
                await delay(5, 6);
                logMsg(`🎉 HOÀN TẤT! Bình luận đã được ghim thành công cho Nick này!`);
                await autoLikeTopComments();
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
            () => findClickableElement(['Reels', 'Video', 'Watch']),
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
        }, 'Danh sách Reels', 1, 5);

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
        logMsg(`🎯 Tìm thấy các Reels, tiến hành làm ĐÚNG 1 VIDEO ĐẦU TIÊN cho Page "${targetPageName}"...`);

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
        }, `Video Reels đầu tiên`, 3, 4);

        if (currentList.length > 0) {
            await safeClick(currentList[0]);
            // 🎬 TÍNH NĂNG 1: GIẢ LẬP XEM VIDEO TỰ NHIÊN (RANDOM 4 - 10 GIÂY)
            const watchSecs = Math.floor(Math.random() * 7) + 4;
            logMsg("🎬 Giả lập người thật: Đang dừng xem Video Reels tự nhiên (" + watchSecs + " giây)...");
            await delay(watchSecs);
            await humanScrollJitter();
        } else {
            logMsg(`⚠️ Không thể mở video đầu tiên. Bỏ qua Page này.`);
            safeSendMessage({ action: "pageCompleted" });
            return;
        }

        // Gọi hàm xử lý 1 video
        let cfg = (pageConfigs && pageConfigs.length > 0) ? pageConfigs[0] : null;
        const resSingle = await processSingleReel(cfg, targetPageName);

        if (resSingle === "ALREADY_EXISTS") {
            logMsg(`ℹ️ Đã có bài đăng/ghim sẵn trên video này! Chuẩn bị chuyển Page tiếp theo...`);
            safeSendMessage({ action: "pageCompleted", alreadyExisted: true });
        } else if (resSingle === "LAGGED") {
            logMsg(`⚠️ Nick bị lag bình luận. Đã gửi thông báo accountLagged, không gửi pageCompleted trùng lặp.`);
        } else if (resSingle === true) {
            logMsg(`✅ Đã đăng bài mới & ghim thành công cho Page này! Chuẩn bị chuyển Page tiếp theo...`);
            safeSendMessage({ action: "pageCompleted", newlyPosted: true });
        } else {
            logMsg(`⚠️ Không thể hoàn tất ghim bài này. Chuẩn bị chuyển Page tiếp theo...`);
            safeSendMessage({ action: "pageCompleted", failed: true });
        }

    } catch (e) {
        logMsg(`❌ Lỗi: ${e.message}`);
        safeSendMessage({ action: "pageCompleted", failed: true });
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "runChecking") {
        runChecking(request.pageConfigs, request.targetPageName);
    }
});
