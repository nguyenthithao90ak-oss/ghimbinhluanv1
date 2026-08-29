// =============================================
// AUTO PIN & REELS COMMENT BOT
// =============================================
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
    const t = new Date(); const hh = t.getHours().toString().padStart(2,'0'); const mm = t.getMinutes().toString().padStart(2,'0');
    const formatted = `[${hh}:${mm}] ${msg}`;
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

// =============================================
// 🌐 TÍNH NĂNG 1: NHẬN DIỆN MẠNG LAG & ĐIỀU CHỈNH CHỜ THÔNG MINH
// =============================================
async function smartWaitForNetworkAndLoad(context = "") {
    // 1. Kiểm tra trạng thái Online của trình duyệt
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        logMsg(`⚠️ [MẠNG MẤT KẾT NỐI] Trình duyệt đang offline! Chờ 5s để mạng phục hồi... (${context})`);
        await delay(5, 7);
    }

    // 2. Quét các chỉ báo Loading/Spinner của Facebook
    let lagWaitCount = 0;
    const maxLagWait = 3; // Chờ tối đa 3 lần x 2.5s = ~7.5s

    while (lagWaitCount < maxLagWait) {
        const isBusy = Array.from(document.querySelectorAll('div[role="progressbar"], [aria-busy="true"], [aria-label*="Loading" i], [aria-label*="Đang tải" i], div[data-sigil*="loading"]')).some(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.top < window.innerHeight;
        });

        if (isBusy) {
            lagWaitCount++;
            logMsg(`⏳ [SMART LAG DETECTOR] Phát hiện Facebook đang xoay tải/mạng chậm (${context}). Tự động chờ thêm... (Lần ${lagWaitCount}/${maxLagWait})`);
            await delay(2, 3);
        } else {
            break;
        }
    }
}

// =============================================
// 🎯 TÍNH NĂNG 2: XÁC NHẬN THAO TÁC & SMART RETRY TỰ ĐỘNG
// =============================================
async function smartClickAndVerify(findFn, verifyFn, description, maxRetries = 3, waitSec = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // Tự động kiểm tra mạng lag trước khi bấm
        await smartWaitForNetworkAndLoad(description);

        const el = findFn();
        if (!el) {
            logMsg(`⏳ [Lần ${attempt}/${maxRetries}] Chưa thấy "${description}". Chờ ${waitSec}s thử lại...`);
            await delay(waitSec);
            continue;
        }

        logMsg(`🎯 [Lần ${attempt}/${maxRetries}] Đang click: ${description}...`);
        await safeClick(el);

        // Chờ phản hồi sau click
        await delay(waitSec, waitSec + 1);

        // Nếu có hàm xác nhận kết quả -> kiểm tra xem thao tác đã ăn chưa
        if (typeof verifyFn === 'function') {
            const isVerified = verifyFn();
            if (isVerified) {
                logMsg(`✅ [XÁC NHẬN THÀNH CÔNG] Đã hoàn thành: ${description}!`);
                return true;
            } else {
                logMsg(`🔄 [CHƯA PHẢN HỒI] Thao tác "${description}" chưa có kết quả (do mạng lag hoặc trượt click). Tự động bấm lại lần ${attempt + 1}/${maxRetries}...`);
                await delay(1, 2);
            }
        } else {
            logMsg(`✅ ĐÃ CLICK: ${description}`);
            return true;
        }
    }

    logMsg(`❌ [THẤT BẠI SAU ${maxRetries} LẦN] Không thể hoàn tất: ${description}`);
    return false;
}

async function retryFind(findFn, description, maxRetries = 3, waitSec = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await smartWaitForNetworkAndLoad(description);
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
    return await smartClickAndVerify(findFn, null, description, maxRetries, waitSec);
}

// XỬ LÝ 1 VIDEO REELS

// =================== TỰ ĐỘNG THẢ TIM / LIKE ĐÚNG 1 LẦN BÌNH LUẬN CỦA MÌNH ===================
async function autoLikeOwnPinnedComment() {
    try {
        logMsg("❤️ Đang kiểm tra nút Thích cho bình luận của mình...");
        await delay(1, 2);

        // Tìm các phần tử nút Thích của bình luận trên màn hình
        const allCommentLikeElements = Array.from(document.querySelectorAll('div[role="button"], span, a, button, div.m')).filter(el => {
            const r = el.getBoundingClientRect();
            // Nút Like bình luận nằm trong khung danh sách bình luận (bỏ qua nút like bài viết ở trên cùng)
            if (r.width === 0 || r.height === 0 || r.height > 50 || r.top < 60 || r.top > window.innerHeight - 80) return false;
            
            const txt = (el.innerText || '').trim().toLowerCase();
            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
            
            const isLikeBtn = txt === 'thích' || txt === 'like' || 
                              aria.includes('nút thích') || aria === 'thích' || aria.startsWith('nút thích') ||
                              aria.includes('like button') || aria === 'like';
                              
            const isAlreadyLiked = txt === 'đã thích' || txt === 'bỏ thích' || txt === 'unlike' || 
                                   aria.includes('đã thích') || aria.includes('bỏ thích') || aria.includes('bày tỏ cảm xúc');
            
            return isLikeBtn || isAlreadyLiked;
        });

        if (allCommentLikeElements.length > 0) {
            // Lấy đúng nút Thích của bình luận đầu tiên trên cùng (bình luận đã ghim của chính mình)
            const ownLikeBtn = allCommentLikeElements[0];
            const txt = (ownLikeBtn.innerText || '').trim().toLowerCase();
            const aria = (ownLikeBtn.getAttribute('aria-label') || '').toLowerCase();
            const isAlreadyLiked = txt === 'đã thích' || txt === 'bỏ thích' || txt === 'unlike' || 
                                   aria.includes('đã thích') || aria.includes('bỏ thích') || aria.includes('bày tỏ cảm xúc');

            if (isAlreadyLiked) {
                logMsg("ℹ️ Bình luận của mình ĐÃ CÓ TRẠNG THÁI 'ĐÃ THÍCH' từ trước -> Giữ nguyên, tuyệt đối không bấm lại!");
                return;
            }

            // Click trực tiếp ĐÚNG 1 LẦN DUY NHẤT bằng click() để không bị kích hoạt 2 lần
            ownLikeBtn.style.border = "2px solid #22c55e";
            if (typeof ownLikeBtn.click === 'function') {
                ownLikeBtn.click();
            } else {
                ownLikeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            }
            logMsg("❤️ ĐÃ BẤM THÍCH THÀNH CÔNG ĐÚNG BÌNH LUẬN CỦA MÌNH (1 LẦN DUY NHẤT)!");
            await delay(2, 3);
        } else {
            logMsg("ℹ️ Không tìm thấy nút Thích của bình luận -> Tiếp tục tiến trình.");
        }
    } catch (err) {
        logMsg(`⚠️ Không thể tự động Like bình luận: ${err.message}`);
    }
}

// ⏱️ TIMEOUT AN TOÀN: Tự động skip video nếu bị kẹt quá lâu (mặc định 180 giây = 3 phút)
function withTimeout(promise, timeoutMs, fallbackValue) {
    return Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => {
            logMsg(`⏱️ TIMEOUT: Thao tác vượt quá ${Math.round(timeoutMs / 1000)} giây -> Tự động skip!`);
            resolve(fallbackValue);
        }, timeoutMs))
    ]);
}

async function processSingleReel(cfg, targetPageName, videoIndex = 1) {
    // 3. BẤM NÚT BÌNH LUẬN (SELECTOR MULTI-LAYER THÔNG MINH)
    await delay(1, 3);
    logMsg(`💬 Đang mở ô bình luận cho Video Reels ${videoIndex}...`);
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
        logMsg(`ℹ️ PHÁT HIỆN VIDEO REELS ${videoIndex} ĐÃ CÓ BÀI ĐĂNG / GHIM SẴN!`);
        return "ALREADY_EXISTS";
    }

    // CHƯA GHIM -> ĐĂNG & GHIM
    logMsg(`⚠️ VIDEO REELS ${videoIndex} CHƯA CÓ BÌNH LUẬN -> Bắt đầu đăng nội dung...`);
    if (!cfg) {
        logMsg(`⚠️ Chưa cài Mẫu.`);
        return false;
    }

    // 5. ĐÍNH KÈM ẢNH (CHUẨN XÁC, AN TOÀN TUYỆT ĐỐI - KHÔNG CLICK NHẦM ẢNH CŨ)
    if (cfg.imageData) {
        logMsg("🖼️ Đang chuẩn bị đính kèm ảnh...");
        try {
            // Bước 1: Tìm đúng nút Camera/Ảnh ở thanh công cụ bình luận dưới đáy màn hình
            const bottomCameraBtn = Array.from(document.querySelectorAll('div[role="button"], button, label, span, svg, i')).find(el => {
                const r = el.getBoundingClientRect();
                // Bắt buộc: Nằm ở thanh công cụ bình luận sát đáy màn hình (cách đáy không quá 180px)
                if (r.top < window.innerHeight - 180 || r.top > window.innerHeight) return false;
                // Kích thước icon nhỏ (15px - 60px)
                if (r.width < 15 || r.width > 60 || r.height < 15 || r.height > 60) return false;
                // Tuyệt đối không phải là ảnh comment bài viết
                if (el.tagName === 'IMG' || el.querySelector('img')) return false;
                if (el.closest('a') && el.closest('a').href && el.closest('a').href.includes('photo.php')) return false;

                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                const title = (el.getAttribute('title') || '').toLowerCase();
                const cls = (el.className || '').toString().toLowerCase();

                return aria.includes('ảnh') || aria.includes('photo') || aria.includes('đính kèm') || aria.includes('camera') ||
                       title.includes('ảnh') || title.includes('photo') || cls.includes('camera') || el.querySelector('input[type="file"]');
            });

            if (bottomCameraBtn) {
                logMsg("📸 Đã tìm thấy nút Camera ở đáy màn hình -> Bấm mở...");
                bottomCameraBtn.click();
                await delay(1, 2);
            }

            // Bước 2: Tìm input file để nạp dữ liệu ảnh
            let fileInput = await retryFind(
                () => document.querySelector('input[type="file"]') || Array.from(document.querySelectorAll('input')).find(i => i.type === 'file'),
                'Input chọn file', 3, 2
            );

            if (fileInput) {
                const imageFile = dataURLtoFile(cfg.imageData, 'photo.jpg');
                const dt = new DataTransfer();
                dt.items.add(imageFile);
                fileInput.files = dt.files;
                
                // Kích hoạt chuỗi sự kiện cho Facebook nhận file
                fileInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                fileInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                if (fileInput.form) {
                    fileInput.form.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                }
                logMsg("✅ Đã nạp dữ liệu ảnh thành công!");
                await delay(2, 3);

                // Bước 3: Tìm nút xác nhận upload ảnh nếu Facebook yêu cầu (Upload photo / Tải ảnh lên)
                const uploadBtn = findClickableElement(['Upload photo', 'Tải ảnh lên', 'Upload', 'Tải lên', 'Đính kèm']);
                if (uploadBtn) {
                    const r = uploadBtn.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0 && r.top < window.innerHeight && !uploadBtn.querySelector('img')) {
                        uploadBtn.click();
                        logMsg("✅ Đã bấm nút Upload Photo!");
                    }
                }

                logMsg("⏳ Chờ 4-6s để ảnh tải lên hoàn tất...");
                await delay(4, 6);
            } else {
                logMsg("ℹ️ Không tìm thấy input nạp file -> Tiếp tục gõ nội dung.");
            }
        } catch (err) {
            logMsg(`⚠️ Lỗi đính kèm ảnh: ${err.message}`);
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
        // 🎲 RANDOM LẠI SPINTAX MỖI VIDEO ĐỂ NỘI DUNG KHÁC NHAU (CHỐNG SPAM)
        const spunText = parseSpintax(cfg.commentText);
        logMsg(`💬 [Video ${videoIndex}] Nội dung ngẫu nhiên (Spintax): "${spunText}"`);
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

    // 🧠 AI SUPERVISOR: Tự giải phóng các lớp phủ che mờ trước khi ghim
    if (window.__aiSupervisor) {
        await window.__aiSupervisor.inspectAndHeal('Tìm Nút 3 Chấm');
    }
    // 8. CHỜ BÌNH LUẬN HIỆN, BẤM 3 CHẤM, GHIM (MULTI-LAYER 5 TẦNG 3-DOTS MENU)
    logMsg("🔍 Tìm nút 3 chấm [Comment menu]...");
    const dotsOk = await retryFindAndClick(
        () => {
            // TẦNG 1: Tìm trực tiếp theo chuỗi ký tự 3 chấm (••• hoặc ... hoặc ··· hoặc … hoặc ︙ hoặc ⋮)
            const textDots = Array.from(document.querySelectorAll('div, span, button, i, a')).filter(el => {
                if (el.children.length > 2) return false;
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0 || r.top < 0 || r.top > window.innerHeight) return false;
                const txt = el.innerText ? el.innerText.trim() : '';
                return txt === '•••' || txt === '...' || txt === '···' || txt === '…' || txt === '︙' || txt === '⋮';
            });
            if (textDots.length > 0) {
                // Lấy nút 3 chấm ở bình luận mới nhất
                return textDots[textDots.length - 1];
            }

            // TẦNG 2: Khớp aria-label hoặc title cho menu bình luận
            const exactBtns = Array.from(document.querySelectorAll('[aria-label], [title], [role="button"]')).filter(el => {
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0 || r.top < 0 || r.top > window.innerHeight) return false;
                const aria = ((el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '')).toLowerCase();
                return aria.includes('comment menu') || aria.includes('menu bình luận') || aria.includes('tùy chọn bình luận') || 
                       aria.includes('comment options') || aria.includes('more options') || aria.includes('hành động cho bình luận');
            });
            if (exactBtns.length > 0) return exactBtns[exactBtns.length - 1];

            // TẦNG 3: Tìm từ vùng chứa bình luận (theo Tên Nick hoặc Nội dung Spun hoặc Link sản phẩm)
            const commentContainers = Array.from(document.querySelectorAll('div, article, span, p')).filter(el => {
                const txt = (el.innerText || '').toLowerCase();
                const hasAuthor = targetPageName && txt.includes(targetPageName.toLowerCase());
                const hasKeyword = txt.includes('dienthoaigiare') || txt.includes('dobogiare') || txt.includes('saurieng') || txt.includes('tonghopquan');
                const hasSnippet = spunText && txt.includes(spunText.substring(0, 15).toLowerCase());
                return hasAuthor || hasKeyword || hasSnippet;
            });

            for (let container of commentContainers) {
                let p = container;
                for (let d = 0; d < 6; d++) {
                    if (!p || p === document.body) break;
                    const btn = Array.from(p.querySelectorAll('div[role="button"], i, svg, span, button')).find(b => {
                        const r = b.getBoundingClientRect();
                        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                        const txt = (b.innerText || '').trim();
                        return r.width > 0 && r.height > 0 && (
                            aria.includes('menu') || aria.includes('option') || aria.includes('tùy chọn') ||
                            txt === '...' || txt === '•••' || txt === '···' || txt === '…' || txt === '︙' || txt === '⋮'
                        );
                    });
                    if (btn) return btn;
                    p = p.parentElement;
                }
            }

            // TẦNG 4: Tìm lân cận thẻ ảnh vừa tải lên (Ảnh bình luận)
            const commentImgs = Array.from(document.querySelectorAll('img')).filter(img => {
                const r = img.getBoundingClientRect();
                return r.top > 80 && r.top < window.innerHeight - 80 && r.width > 60 && r.height > 60;
            });
            for (let img of commentImgs) {
                let p = img.parentElement;
                for (let d = 0; d < 5; d++) {
                    if (!p || p === document.body) break;
                    const btn = Array.from(p.querySelectorAll('div[role="button"], span, button, i, svg')).find(b => {
                        const r = b.getBoundingClientRect();
                        const txt = (b.innerText || '').trim();
                        return r.width > 0 && r.height > 0 && (txt === '•••' || txt === '...' || txt === '…');
                    });
                    if (btn) return btn;
                    p = p.parentElement;
                }
            }

            // TẦNG 5: Tìm phía trên các nút "Thích" / "Trả lời" / "Vừa xong"
            const replyBtns = Array.from(document.querySelectorAll('span, div, a')).filter(el => {
                const txt = (el.innerText || '').trim().toLowerCase();
                return txt === 'trả lời' || txt === 'reply' || txt === 'vừa xong' || txt === 'just now';
            });
            for (let rep of replyBtns) {
                let parent = rep.parentElement;
                for (let d = 0; d < 5; d++) {
                    if (!parent || parent === document.body) break;
                    const btn = Array.from(parent.querySelectorAll('div[role="button"], span, button, i, svg')).find(b => {
                        const r = b.getBoundingClientRect();
                        const txt = (b.innerText || '').trim();
                        return r.width > 0 && r.height > 0 && (txt === '•••' || txt === '...' || txt === '…');
                    });
                    if (btn) return btn;
                    parent = parent.parentElement;
                }
            }

            return null;
        },
        'Nút 3 chấm [Comment menu] (Multi-layer 5 Tầng)', 6, 2
    );

    if (dotsOk) {
        await delay(1, 3);
        const unpinItem = findClickableElement(['Unpin comment', 'Unpin', 'Bỏ ghim bình luận', 'Bỏ ghim']);
        if (unpinItem) {
            logMsg(`✅ Đã ghim sẵn! Không gỡ.`);
            await autoLikeOwnPinnedComment();
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
                await autoLikeOwnPinnedComment();
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

// =================== TIỆN ÍCH ĐIỀU HƯỚNG 2 VIDEO REELS ===================
async function closeCommentsModal() {
    logMsg("🔙 Bấm nút 'Quay lại' để đóng bảng bình luận...");
    for (let i = 0; i < 3; i++) {
        const backBtn = Array.from(document.querySelectorAll('div[role="button"], button, a, div, span, i, svg')).find(el => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0 || r.top > 80 || r.left > 80) return false;
            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
            const title = (el.getAttribute('title') || '').toLowerCase();
            const txt = (el.innerText || '').trim();
            return aria === 'quay lại' || aria === 'back' || aria.includes('quay lại') || aria.includes('đóng') ||
                   title === 'quay lại' || title === 'back' || txt === '<' || txt === '‹' || el.classList.contains('m');
        });

        if (backBtn) {
            backBtn.click();
            logMsg("✅ Đã bấm nút 'Quay lại'!");
            await delay(1, 2);
            return true;
        }
        await delay(1, 1);
    }
    // Fallback nếu không tìm thấy nút
    window.history.back();
    await delay(1, 2);
    return true;
}

async function switchToNextReel(targetReelNum, reelLinks) {
    logMsg(`👇 Đang lướt/chuyển sang Video Reels ${targetReelNum}...`);
    
    // 1. Thao tác lướt xuống trong Reels Player
    window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: window.innerHeight, bubbles: true }));
    await delay(2, 3);

    // 2. Nếu đang ở màn hình lưới Reels và có link video thứ 2
    if (reelLinks && reelLinks.length >= targetReelNum) {
        const nextEl = reelLinks[targetReelNum - 1];
        if (nextEl) {
            const r = nextEl.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                logMsg(`🎯 Bấm trực tiếp vào Video Reels ${targetReelNum} từ danh sách...`);
                await safeClick(nextEl);
                await delay(2, 3);
            }
        }
    }

    // 3. Giả lập xem video tự nhiên
    const watchSecs = Math.floor(Math.random() * 5) + 3;
    logMsg(`🎬 Giả lập xem Video Reels ${targetReelNum} tự nhiên (${watchSecs} giây)...`);
    await delay(watchSecs);
    await humanScrollJitter();
}

async function runChecking(pageConfigs, targetPageName) {
    try {
        logMsg("🚀 Bắt đầu kiểm tra Profile...");
        await delay(1, 2);
        
        // 0. BỎ QUA KIỂM TRA TÊN NICK (Luôn tin tưởng account_switcher đã làm đúng)
        let currentPageName = targetPageName; // Giả định luôn đúng
        setupBlockDetector(targetPageName);
        
        logMsg(`✅ Bỏ qua kiểm tra tên Nick. Giả định ĐÚNG NICK "${targetPageName}"! Vào Reels luôn...`);

        // 1. BẤM TAB REELS TRÊN TRANG CÁ NHÂN (KHÔNG BẤM WATCH TRANG CHỦ)
        await delay(1, 3);
        function findProfileReelsTab() {
            const elements = Array.from(document.querySelectorAll('a, div[role="tab"], div[role="button"], span, div')).filter(el => {
                const r = el.getBoundingClientRect();
                if (r.top < 70 || r.top > window.innerHeight || r.width === 0 || r.height === 0) return false;
                const txt = (el.innerText || '').trim();
                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                const href = (el.getAttribute('href') || '').toLowerCase();
                return /^Reels$/i.test(txt) || aria === 'reels' || aria === 'tab reels' || aria.includes('xem reels') || href.includes('sk=reels') || href.includes('/reels');
            });
            if (elements.length > 0) {
                const tabEl = elements.find(e => e.tagName === 'A' || e.getAttribute('role') === 'tab');
                return tabEl || elements[0];
            }
            return null;
        }

        const reelsOk = await retryFindAndClick(
            findProfileReelsTab,
            'Tab Reels trên Trang Cá Nhân', 4, 2
        );
        if (!reelsOk) {
            safeSendMessage({ action: "pageCompleted" });
            return;
        }

        // 2. LẤY DANH SÁCH VIDEO REELS ĐỂ XỬ LÝ
        await delay(2, 4);
        logMsg("🔍 Đang lấy danh sách Video Reels...");

        function getReelsGridTopY() {
            const tabs = Array.from(document.querySelectorAll('a, div, span')).filter(el => {
                const txt = (el.innerText || '').trim();
                return /^Reels$/i.test(txt);
            });
            if (tabs.length > 0) {
                const r = tabs[0].getBoundingClientRect();
                return r.bottom + 20;
            }
            return 350;
        }

        function findReelLinks() {
            const minY = getReelsGridTopY();
            let links = Array.from(document.querySelectorAll('a')).filter(a => {
                const r = a.getBoundingClientRect();
                return (a.href.includes('/reel/') || a.href.includes('/video/') || a.href.includes('/watch/'))
                    && r.top >= minY && r.height > 50 && r.height < 500;
            });
            if (links.length > 0) return links;

            let imgs = Array.from(document.querySelectorAll('img')).filter(img => {
                const r = img.getBoundingClientRect();
                return r.top >= minY && r.width > 80 && r.width < 400 && r.height > 100 && r.height < 400;
            });
            if (imgs.length > 0) return imgs;

            links = Array.from(document.querySelectorAll('a')).filter(a =>
                a.href.includes('/reel/') || a.href.includes('/video/') || a.href.includes('/watch/')
            );
            return links;
        }
        
        let reelLinks = [];
        await retryFind(() => {
            reelLinks = findReelLinks();
            return reelLinks.length > 0;
        }, 'Danh sách Reels', 2, 5);

        if (reelLinks.length === 0) {
            logMsg("⚠️ Không thấy Reels nào.");
            safeSendMessage({ action: "pageCompleted" });
            return;
        }

        let cfg = (pageConfigs && pageConfigs.length > 0) ? pageConfigs[0] : null;

        // ==========================================
        // 🎬 TIẾN TRÌNH XỬ LÝ 2 VIDEO REELS
        // ==========================================
        logMsg(`🎯 Tìm thấy ${reelLinks.length} Reels -> Bắt đầu quy trình xử lý 3 VIDEO REELS cho "${targetPageName}"...`);

        // --- VIDEO REELS 1 ---
        logMsg(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎬 [1/3] BẮT ĐẦU XỬ LÝ VIDEO REELS 1 cho "${targetPageName}"...\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        const firstEl = reelLinks[0];
        const firstRect = firstEl.getBoundingClientRect();
        if (firstRect.top > window.innerHeight * 0.7) {
            window.scrollBy(0, firstRect.top - window.innerHeight * 0.4);
            await delay(1, 2);
        }

        await safeClick(firstEl);
        const watchSecs1 = Math.floor(Math.random() * 5) + 4;
        logMsg("🎬 Giả lập xem Video Reels 1 tự nhiên (" + watchSecs1 + " giây)...");
        await delay(watchSecs1);
        await humanScrollJitter();

        const res1 = await withTimeout(processSingleReel(cfg, targetPageName, 1), 180000, false);
        let statusV1 = "";
        if (res1 === "ALREADY_EXISTS") {
            statusV1 = "V1: Đã ghim sẵn từ trước";
            logMsg(`ℹ️ Video Reels 1: ĐÃ GHIM/BÌNH LUẬN TỪ TRƯỚC!`);
        } else if (res1 === true || res1 === "POSTED") {
            statusV1 = "V1: Đã đăng mới & ghim";
            logMsg(`✅ Video Reels 1: ĐÃ ĐĂNG BÌNH LUẬN & GHIM THÀNH CÔNG!`);
        } else {
            statusV1 = "V1: Thao tác lỗi";
            logMsg(`⚠️ Video Reels 1: Thao tác không thành công.`);
        }

        // ============================================================
        // 🔙 QUAY LẠI TRANG PROFILE RỒI CLICK VIDEO THỨ 2 TRỰC TIẾP
        // ============================================================
        // --- VIDEO REELS 2 ---
        logMsg(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎬 [2/3] BẮT ĐẦU XỬ LÝ VIDEO REELS 2 cho "${targetPageName}"...\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        // BƯỚC 1: QUAY LẠI TRANG PROFILE (REELS TAB)
        logMsg(`🔙 Dùng history.back() để quay về trang Profile...`);
        window.history.back();
        await delay(2, 3);
        // Nếu vẫn ở trang Reel, back thêm
        if (window.location.href.includes('/reel/') || window.location.href.includes('/watch/')) {
            logMsg(`🔙 Vẫn ở trang Reel, back thêm 1 lần...`);
            window.history.back();
            await delay(2, 3);
        }
        logMsg(`📍 Đang ở: ${window.location.href}`);
        await delay(2, 3);

        // BƯỚC 2: TÌM LẠI DANH SÁCH VIDEO REELS TRÊN TRANG PROFILE
        logMsg(`🔍 Tìm lại danh sách Video Reels trên trang Profile...`);
        let reelLinks2 = [];
        for (let findAttempt = 0; findAttempt < 5; findAttempt++) {
            reelLinks2 = findReelLinks();
            if (reelLinks2.length >= 2) break;
            logMsg(`🔍 [Lần ${findAttempt + 1}/5] Tìm thấy ${reelLinks2.length} Reels, chờ thêm...`);
            await delay(1, 2);
        }

        // BƯỚC 3: CLICK THẲNG VÀO VIDEO THỨ 2 TRONG LƯỚI
        if (reelLinks2.length >= 2) {
            const secondEl = reelLinks2[1];
            const sr = secondEl.getBoundingClientRect();
            logMsg(`🎯 Tìm thấy ${reelLinks2.length} Reels. Click thẳng vào Video thứ 2 (top=${Math.round(sr.top)}, left=${Math.round(sr.left)})...`);
            if (sr.top > window.innerHeight * 0.7) {
                window.scrollBy(0, sr.top - window.innerHeight * 0.4);
                await delay(1, 2);
            }
            await safeClick(secondEl);
        } else if (reelLinks2.length === 1) {
            logMsg(`⚠️ Chỉ thấy 1 Reel, click vào nó rồi thử lướt xuống...`);
            await safeClick(reelLinks2[0]);
            await delay(3, 4);
            window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
        } else {
            logMsg(`⚠️ Không tìm thấy Reels nào trên Profile!`);
        }

        // ĐỢI VIDEO 2 LOAD
        await delay(3, 4);

        // GIẢ LẬP XEM VIDEO 2 TỰ NHIÊN
        const watchSecs2 = Math.floor(Math.random() * 5) + 3;
        logMsg(`🎬 Giả lập xem Video Reels 2 tự nhiên (${watchSecs2} giây)...`);
        await delay(watchSecs2);
        await humanScrollJitter();

        const res2 = await withTimeout(processSingleReel(cfg, targetPageName, 2), 180000, false);
        let statusV2 = "";
        if (res2 === "ALREADY_EXISTS") {
            statusV2 = "V2: Đã ghim sẵn từ trước";
            logMsg(`ℹ️ Video Reels 2: ĐÃ GHIM/BÌNH LUẬN TỪ TRƯỚC!`);
        } else if (res2 === true || res2 === "POSTED") {
            statusV2 = "V2: Đã đăng mới & ghim";
            logMsg(`✅ Video Reels 2: ĐÃ ĐĂNG BÌNH LUẬN & GHIM THÀNH CÔNG!`);
        } else {
            statusV2 = "V2: Thao tác lỗi";
            logMsg(`⚠️ Video Reels 2: Thao tác không thành công.`);
        }

        // ============================================================
        // 🔙 QUAY LẠI TRANG PROFILE RỒI CLICK VIDEO THỨ 3 TRỰC TIẾP
        // ============================================================
        // --- VIDEO REELS 3 ---
        logMsg(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎬 [3/3] BẮT ĐẦU XỬ LÝ VIDEO REELS 3 cho "${targetPageName}"...\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        // BƯỚC 1: QUAY LẠI TRANG PROFILE (REELS TAB)
        logMsg(`🔙 Dùng history.back() để quay về trang Profile...`);
        window.history.back();
        await delay(2, 3);
        if (window.location.href.includes('/reel/') || window.location.href.includes('/watch/')) {
            logMsg(`🔙 Vẫn ở trang Reel, back thêm 1 lần...`);
            window.history.back();
            await delay(2, 3);
        }
        logMsg(`📍 Đang ở: ${window.location.href}`);
        await delay(2, 3);

        // BƯỚC 2: TÌM LẠI DANH SÁCH VIDEO REELS TRÊN TRANG PROFILE
        logMsg(`🔍 Tìm lại danh sách Video Reels trên trang Profile...`);
        let reelLinks3 = [];
        for (let findAttempt = 0; findAttempt < 5; findAttempt++) {
            reelLinks3 = findReelLinks();
            if (reelLinks3.length >= 3) break;
            logMsg(`🔍 [Lần ${findAttempt + 1}/5] Tìm thấy ${reelLinks3.length} Reels, chờ thêm...`);
            await delay(1, 2);
        }

        // BƯỚC 3: CLICK THẲNG VÀO VIDEO THỨ 3 TRONG LƯỚI
        if (reelLinks3.length >= 3) {
            const thirdEl = reelLinks3[2];
            const tr = thirdEl.getBoundingClientRect();
            logMsg(`🎯 Tìm thấy ${reelLinks3.length} Reels. Click thẳng vào Video thứ 3 (top=${Math.round(tr.top)}, left=${Math.round(tr.left)})...`);
            if (tr.top > window.innerHeight * 0.7) {
                window.scrollBy(0, tr.top - window.innerHeight * 0.4);
                await delay(1, 2);
            }
            await safeClick(thirdEl);
        } else {
            logMsg(`⚠️ Chỉ thấy ${reelLinks3.length} Reels, không đủ 3 video!`);
        }

        // ĐỢI VIDEO 3 LOAD
        await delay(3, 4);

        // GIẢ LẬP XEM VIDEO 3 TỰ NHIÊN
        const watchSecs3 = Math.floor(Math.random() * 5) + 3;
        logMsg(`🎬 Giả lập xem Video Reels 3 tự nhiên (${watchSecs3} giây)...`);
        await delay(watchSecs3);
        await humanScrollJitter();

        const res3 = await withTimeout(processSingleReel(cfg, targetPageName, 3), 180000, false);
        let statusV3 = "";
        if (res3 === "ALREADY_EXISTS") {
            statusV3 = "V3: Đã ghim sẵn từ trước";
            logMsg(`ℹ️ Video Reels 3: ĐÃ GHIM/BÌNH LUẬN TỪ TRƯỚC!`);
        } else if (res3 === true || res3 === "POSTED") {
            statusV3 = "V3: Đã đăng mới & ghim";
            logMsg(`✅ Video Reels 3: ĐÃ ĐĂNG BÌNH LUẬN & GHIM THÀNH CÔNG!`);
        } else {
            statusV3 = "V3: Thao tác lỗi";
            logMsg(`⚠️ Video Reels 3: Thao tác không thành công.`);
        }

        // ==========================================
        // 🎉 TỔNG KẾT VÀ CHUYỂN NICK TIẾP THEO
        // ==========================================
        logMsg(`\n🎉 HOÀN TẤT 3 VIDEO CHO "${targetPageName}": [${statusV1}] | [${statusV2}] | [${statusV3}]`);
        
        const allAlready = (res1 === "ALREADY_EXISTS" && res2 === "ALREADY_EXISTS" && res3 === "ALREADY_EXISTS");
        const anyPosted = (res1 === true || res1 === "POSTED" || res2 === true || res2 === "POSTED" || res3 === true || res3 === "POSTED");

        if (allAlready) {
            safeSendMessage({ 
                action: "pageCompleted", 
                alreadyExisted: true,
                summaryStatus: "ℹ️ Cả 3 Reels đã ghim sẵn",
                summaryDetails: `${statusV1} | ${statusV2} | ${statusV3}`
            });
        } else if (anyPosted) {
            safeSendMessage({ 
                action: "pageCompleted", 
                newlyPosted: true,
                summaryStatus: "✅ Hoàn tất 3 Reels",
                summaryDetails: `${statusV1} | ${statusV2} | ${statusV3}`
            });
        } else {
            safeSendMessage({ 
                action: "pageCompleted", 
                failed: true,
                summaryStatus: "⚠️ Xong 3 Reels (có lỗi)",
                summaryDetails: `${statusV1} | ${statusV2} | ${statusV3}`
            });
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
