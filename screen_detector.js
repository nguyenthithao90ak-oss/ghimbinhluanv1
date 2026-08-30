// ============================================================
// 📸 SCREEN STATE DETECTOR - BỘ QUÉT NHẬN DIỆN MÀN HÌNH
// Quét URL + DOM để xác định bot đang ở màn hình nào
// Gọi trước mỗi thao tác quan trọng để chống kẹt
// ============================================================

// 10 trạng thái màn hình có thể gặp trên Facebook Mobile
const SCREEN_STATES = {
    CHECKPOINT: 'CHECKPOINT',           // Nick bị khóa/hạn chế
    LOGIN_REQUIRED: 'LOGIN_REQUIRED',   // Cookie die, cần đăng nhập lại
    BLOCKING_POPUP: 'BLOCKING_POPUP',   // Popup che khuất (App banner, Cookie, Survey)
    SWITCHER_DRAWER: 'SWITCHER_DRAWER', // Popup đổi nick đang mở
    COMMENT_MODAL: 'COMMENT_MODAL',     // Bảng bình luận đang mở
    REEL_PLAYER: 'REEL_PLAYER',         // Đang xem 1 video Reel
    BOOKMARKS_MENU: 'BOOKMARKS_MENU',   // Trang Menu/Bookmarks
    REELS_GRID: 'REELS_GRID',           // Lưới video Reels trên Profile
    PROFILE_PAGE: 'PROFILE_PAGE',       // Trang cá nhân (chưa vào tab Reels)
    HOME_FEED: 'HOME_FEED',             // Trang chủ News Feed
    UNKNOWN: 'UNKNOWN'                  // Không xác định
};

/**
 * 📸 QUÉT TOÀN MÀN HÌNH - Xác định trạng thái hiện tại
 * @returns {{ state: string, canContinue: boolean, details: string }}
 */
function detectScreenState() {
    const url = window.location.href.toLowerCase();
    const bodyText = (document.body ? document.body.innerText : '').substring(0, 3000).toLowerCase();

    // ═══════════════════════════════════════════
    // 1. CHECKPOINT / RESTRICTION (ƯU TIÊN CAO NHẤT)
    // ═══════════════════════════════════════════
    if (url.includes('/checkpoint') || url.includes('/identity') || url.includes('/suspended')) {
        return { state: SCREEN_STATES.CHECKPOINT, canContinue: false, details: 'URL chứa /checkpoint hoặc /identity' };
    }
    const checkpointKeywords = ['tài khoản của bạn bị hạn chế', 'account has been restricted', 
        'we suspended your account', 'tài khoản bị khóa', 'account is locked',
        'xác nhận danh tính', 'confirm your identity'];
    for (const kw of checkpointKeywords) {
        if (bodyText.includes(kw)) {
            return { state: SCREEN_STATES.CHECKPOINT, canContinue: false, details: `Phát hiện text: "${kw}"` };
        }
    }

    // ═══════════════════════════════════════════
    // 2. LOGIN REQUIRED (Cookie die)
    // ═══════════════════════════════════════════
    if (url.includes('/login') || url.includes('/recover/')) {
        return { state: SCREEN_STATES.LOGIN_REQUIRED, canContinue: false, details: 'URL chứa /login' };
    }
    if (document.querySelector('input[name="email"], input[name="pass"], #login_form, button[name="login"]')) {
        return { state: SCREEN_STATES.LOGIN_REQUIRED, canContinue: false, details: 'Phát hiện form đăng nhập' };
    }

    // ═══════════════════════════════════════════
    // 3. BLOCKING POPUP (Popup che khuất)
    // ═══════════════════════════════════════════
    const blockingPopup = detectBlockingPopup();
    if (blockingPopup) {
        return { state: SCREEN_STATES.BLOCKING_POPUP, canContinue: false, details: blockingPopup.type, popupElement: blockingPopup.element };
    }

    // ═══════════════════════════════════════════
    // 4. ACCOUNT SWITCHER DRAWER (Modal đổi nick)
    // ═══════════════════════════════════════════
    const dialogs = document.querySelectorAll('div[role="dialog"], div[aria-modal="true"]');
    for (const d of dialogs) {
        const dRect = d.getBoundingClientRect();
        if (dRect.width < 100 || dRect.height < 80) continue;
        const radios = d.querySelectorAll('[role="radio"], input[type="radio"]');
        const dText = (d.innerText || '').toLowerCase();
        if (radios.length > 0 || dText.includes('trang và trang cá nhân') || dText.includes('your pages and profiles') || dText.includes('switch to')) {
            return { state: SCREEN_STATES.SWITCHER_DRAWER, canContinue: true, details: `${radios.length} nicks trong drawer` };
        }
    }

    // ═══════════════════════════════════════════
    // 5. COMMENT MODAL (Bảng bình luận đang mở)
    // ═══════════════════════════════════════════
    const commentInputs = document.querySelectorAll('textarea, div[contenteditable="true"], div[role="textbox"]');
    for (const el of commentInputs) {
        const r = el.getBoundingClientRect();
        if (r.width > 50 && r.height > 15 && r.top >= 0 && r.top < window.innerHeight) {
            const placeholder = (el.getAttribute('placeholder') || el.getAttribute('aria-label') || '').toLowerCase();
            if (placeholder.includes('bình luận') || placeholder.includes('comment') || placeholder.includes('viết') || placeholder.includes('write')) {
                return { state: SCREEN_STATES.COMMENT_MODAL, canContinue: true, details: 'Ô bình luận đang hiện' };
            }
        }
    }

    // ═══════════════════════════════════════════
    // 6. REEL PLAYER (Đang xem 1 video Reel)
    // ═══════════════════════════════════════════
    if (url.includes('/reel/') || url.includes('/watch/')) {
        const hasVideo = !!document.querySelector('video');
        return { state: SCREEN_STATES.REEL_PLAYER, canContinue: true, details: hasVideo ? 'Có video đang phát' : 'URL Reel nhưng chưa load video' };
    }

    // ═══════════════════════════════════════════
    // 7. BOOKMARKS / MENU
    // ═══════════════════════════════════════════
    if (url.includes('/bookmarks') || url.includes('/menu')) {
        return { state: SCREEN_STATES.BOOKMARKS_MENU, canContinue: true, details: 'Trang Menu/Bookmarks' };
    }

    // ═══════════════════════════════════════════
    // 8. REELS GRID (Lưới Reels trên Profile)
    // ═══════════════════════════════════════════
    if (url.includes('profile') || url.includes('/me')) {
        // Kiểm tra tab Reels đang active
        const allTabs = document.querySelectorAll('a, div[role="tab"]');
        let reelsTabActive = false;
        for (const tab of allTabs) {
            const text = (tab.innerText || '').trim();
            if (/^reels$/i.test(text)) {
                const isSelected = tab.getAttribute('aria-selected') === 'true' || 
                    tab.classList.contains('active') ||
                    (tab.style && tab.style.borderBottom && tab.style.borderBottom.includes('solid'));
                if (isSelected) reelsTabActive = true;
            }
        }
        
        // Kiểm tra có thumbnail Reels
        const reelThumbs = document.querySelectorAll('a[href*="/reel/"], a[href*="/watch/"]');
        const visibleThumbs = Array.from(reelThumbs).filter(a => {
            const r = a.getBoundingClientRect();
            return r.height > 50 && r.top < window.innerHeight;
        });

        if (url.includes('sk=reels') || reelsTabActive || visibleThumbs.length >= 1) {
            return { state: SCREEN_STATES.REELS_GRID, canContinue: true, details: `${visibleThumbs.length} thumbnail Reels hiện trên lưới` };
        }

        // ═══════════════════════════════════════════
        // 9. PROFILE PAGE (Trang cá nhân, chưa vào Reels)
        // ═══════════════════════════════════════════
        return { state: SCREEN_STATES.PROFILE_PAGE, canContinue: true, details: 'Trang cá nhân - chưa vào tab Reels' };
    }

    // ═══════════════════════════════════════════
    // 10. HOME FEED (Trang chủ)
    // ═══════════════════════════════════════════
    if (/^https?:\/\/(m|www)\.facebook\.com\/?(\?.*)?$/i.test(window.location.href) || url.includes('/home.php')) {
        return { state: SCREEN_STATES.HOME_FEED, canContinue: true, details: 'Trang chủ News Feed' };
    }

    // ═══════════════════════════════════════════
    // UNKNOWN
    // ═══════════════════════════════════════════
    return { state: SCREEN_STATES.UNKNOWN, canContinue: false, details: `URL không xác định: ${window.location.href}` };
}

// ────────────────────────────────────────────────
// 🛡️ PHÁT HIỆN POPUP CHE KHUẤT (BLOCKING POPUP)
// ────────────────────────────────────────────────
function detectBlockingPopup() {
    const blockerKeywords = ['khảo sát', 'survey', 'cookie', 'dùng ứng dụng', 'use app', 'mở trong app',
        'open in app', 'bật thông báo', 'turn on notifications', 'enable notifications',
        'chấp nhận cookie', 'accept cookies', 'quyền riêng tư', 'privacy'];
    
    // Loại trừ: popup bình luận và popup đổi nick
    const safeKeywords = ['viết bình luận', 'bình luận về', 'write a comment', 'comment on',
        'tài khoản của bạn', 'your pages', 'trang và trang cá nhân'];

    const dialogs = document.querySelectorAll('div[role="dialog"], div[aria-modal="true"], div[data-sigil="touchable dialog"]');
    
    for (const d of dialogs) {
        const r = d.getBoundingClientRect();
        if (r.width < 120 || r.height < 80 || r.top < 0 || r.top >= window.innerHeight) continue;
        
        const text = (d.innerText || '').toLowerCase();
        
        // Bỏ qua dialog an toàn (bình luận, đổi nick)
        if (safeKeywords.some(kw => text.includes(kw))) continue;
        
        // Kiểm tra có phải popup cản trở
        for (const kw of blockerKeywords) {
            if (text.includes(kw)) {
                let type = 'Popup cản trở';
                if (kw.includes('app')) type = 'Gợi ý mở App';
                else if (kw.includes('cookie')) type = 'Chính sách Cookie';
                else if (kw.includes('khảo sát') || kw.includes('survey')) type = 'Khảo sát ý kiến';
                else if (kw.includes('thông báo') || kw.includes('notification')) type = 'Nhắc bật thông báo';
                
                return { element: d, type };
            }
        }
    }
    return null;
}

// ────────────────────────────────────────────────
// ✕ TỰ ĐÓNG POPUP CẢN TRỞ
// ────────────────────────────────────────────────
function dismissBlockingPopup(popupElement) {
    if (!popupElement) return false;
    
    // Tìm nút đóng theo aria-label
    const ariaBtns = Array.from(popupElement.querySelectorAll('button, div[role="button"], a, i, svg, span')).filter(el => {
        const a = ((el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '')).toLowerCase();
        return a.includes('đóng') || a.includes('close') || a.includes('bỏ qua') || a.includes('dismiss') || 
               a.includes('cancel') || a.includes('hủy') || a.includes('không phải bây giờ') || a.includes('not now');
    });
    if (ariaBtns.length > 0) {
        ariaBtns[0].click();
        return true;
    }

    // Tìm nút đóng theo text
    const textBtns = Array.from(popupElement.querySelectorAll('button, div[role="button"], a, span')).filter(el => {
        const t = (el.innerText || '').trim().toLowerCase();
        return t === 'đóng' || t === 'close' || t === 'không phải bây giờ' || t === 'bỏ qua' || 
               t === 'để sau' || t === 'hủy' || t === 'not now' || t === 'dismiss' || t === '✕' || t === '×';
    });
    if (textBtns.length > 0) {
        textBtns[0].click();
        return true;
    }

    // Tìm icon đóng (X) ở góc trên bên phải
    const closeIcons = Array.from(popupElement.querySelectorAll('svg, i, span')).filter(el => {
        const r = el.getBoundingClientRect();
        const pr = popupElement.getBoundingClientRect();
        return r.width > 10 && r.width < 45 && r.top < pr.top + 80 && r.left > pr.right - 80;
    });
    if (closeIcons.length > 0) {
        closeIcons[0].click();
        return true;
    }

    return false;
}

// ────────────────────────────────────────────────
// 🧹 ĐẢM BẢO MÀN HÌNH SẠCH (Quét + Dọn popup)
// Gọi trước mỗi thao tác quan trọng
// ────────────────────────────────────────────────
async function ensureCleanScreen(logFn) {
    const log = logFn || ((msg) => console.log(msg));
    
    for (let attempt = 0; attempt < 3; attempt++) {
        const screen = detectScreenState();
        log(`📸 [QUÉT MÀN HÌNH] Trạng thái: ${screen.state} | ${screen.details}`);
        
        // Checkpoint / Login → không thể tiếp tục
        if (screen.state === SCREEN_STATES.CHECKPOINT) {
            log(`🚨 [CHECKPOINT] Nick bị khóa/hạn chế! Không thể tiếp tục.`);
            return { ok: false, state: screen.state, reason: 'checkpoint' };
        }
        if (screen.state === SCREEN_STATES.LOGIN_REQUIRED) {
            log(`🚨 [LOGIN] Cookie die / hết phiên! Không thể tiếp tục.`);
            return { ok: false, state: screen.state, reason: 'login_required' };
        }
        
        // Popup cản trở → tự đóng rồi quét lại
        if (screen.state === SCREEN_STATES.BLOCKING_POPUP) {
            log(`🛡️ [TỰ ĐÓNG POPUP] Loại: "${screen.details}" → Đang tự bấm nút Đóng...`);
            const dismissed = dismissBlockingPopup(screen.popupElement);
            if (dismissed) {
                log(`✅ [TỰ ĐÓNG POPUP] Đã giải tỏa popup thành công!`);
            } else {
                log(`⚠️ [TỰ ĐÓNG POPUP] Không tìm thấy nút đóng, thử bấm Escape...`);
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            }
            await new Promise(r => setTimeout(r, 1500));
            continue; // Quét lại
        }
        
        // Nếu đang ở Home Feed → cảnh báo (background.js sẽ redirect)
        if (screen.state === SCREEN_STATES.HOME_FEED) {
            log(`⚠️ [SAI MÀN HÌNH] Đang ở Trang Chủ → Chờ background.js redirect về Profile...`);
            return { ok: false, state: screen.state, reason: 'wrong_screen_home' };
        }
        
        // Màn hình OK
        return { ok: true, state: screen.state };
    }
    
    // Sau 3 lần vẫn có popup
    return { ok: false, state: 'BLOCKING_POPUP', reason: 'popup_persist' };
}

// ────────────────────────────────────────────────
// 🔍 XÁC NHẬN ĐANG Ở ĐÚNG MÀN HÌNH MONG MUỐN
// ────────────────────────────────────────────────
async function confirmScreenState(expectedState, logFn, maxWait = 8000) {
    const log = logFn || ((msg) => console.log(msg));
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
        const screen = detectScreenState();
        if (screen.state === expectedState) {
            log(`📸 [XÁC NHẬN] Đúng màn hình: ${expectedState} ✅`);
            return true;
        }
        
        // Nếu gặp trạng thái nghiêm trọng → thoát sớm
        if (screen.state === SCREEN_STATES.CHECKPOINT || screen.state === SCREEN_STATES.LOGIN_REQUIRED) {
            log(`🚨 [XÁC NHẬN] Gặp ${screen.state} thay vì ${expectedState}!`);
            return false;
        }
        
        // Popup → tự dọn
        if (screen.state === SCREEN_STATES.BLOCKING_POPUP && screen.popupElement) {
            dismissBlockingPopup(screen.popupElement);
            await new Promise(r => setTimeout(r, 1500));
            continue;
        }
        
        await new Promise(r => setTimeout(r, 1000));
    }
    
    const finalScreen = detectScreenState();
    log(`⚠️ [XÁC NHẬN] Timeout! Mong đợi ${expectedState} nhưng đang ở ${finalScreen.state}`);
    return false;
}
