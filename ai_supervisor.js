// --------------------------------------------------------------------------------------
// 🧠 AI SUPERVISOR CORE ENGINE (HỆ THỐNG AI GIÁM SÁT TOÀN DIỆN & TỰ PHỤC HỒI)
// --------------------------------------------------------------------------------------

class AISupervisorEngine {
    constructor() {
        this.version = "2.0.0-AI";
        this.healingCount = 0;
        this.lastAnomaly = null;
    }

    // 1. AI TỰ PHÁT HIỆN & ĐÓNG POPUP CẢN TRỞ (SELF-HEALING RESOLVER)
    async inspectAndHeal(context = "Chung") {
        try {
            const blockers = this.detectBlockers();
            if (blockers.length > 0) {
                for (const blocker of blockers) {
                    const dismissBtn = this.findDismissButton(blocker.element);
                    if (dismissBtn) {
                        this.healingCount++;
                        this.log(`🤖 [AI TỰ PHỤC HỒI] Phát hiện popup "${blocker.type}" cản trở bước [${context}]. Đang tự động đóng...`);
                        
                        try {
                            dismissBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            dismissBtn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                            dismissBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                            dismissBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                            dismissBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                            if (typeof dismissBtn.click === 'function') dismissBtn.click();
                        } catch(e) {}

                        await new Promise(r => setTimeout(r, 1200));
                        this.log(`✅ [AI TỰ PHỤC HỒI] Đã giải tỏa thành công popup "${blocker.type}"! Tiếp tục tiến trình...`);
                        return true;
                    }
                }
            }
        } catch (err) {
            console.warn("AI Self-Healing warning:", err);
        }
        return false;
    }

    // Phát hiện các hộp thoại, lớp phủ che mờ màn hình
    detectBlockers() {
        const results = [];
        const dialogs = Array.from(document.querySelectorAll('div[role="dialog"], div[aria-modal="true"], div[data-sigil="touchable dialog"], div.modal, div[id*="modal"], div[class*="dialog"]'));

        for (const d of dialogs) {
            const r = d.getBoundingClientRect();
            if (r.width > 120 && r.height > 80 && r.top >= 0 && r.top < window.innerHeight) {
                const text = (d.innerText || '').toLowerCase();
                
                // Bỏ qua nếu đây là khung bình luận hoặc danh sách account switcher
                if (text.includes('viết bình luận') || text.includes('bình luận về') || text.includes('tài khoản của bạn') || text.includes('your pages')) {
                    continue;
                }

                let type = "Popup Thông Báo";
                if (text.includes('khảo sát') || text.includes('survey')) type = "Khảo sát ý kiến";
                else if (text.includes('bảo mật') || text.includes('security') || text.includes('xác minh')) type = "Cảnh báo bảo mật";
                else if (text.includes('cookie') || text.includes('quyền riêng tư')) type = "Chính sách Cookie";
                else if (text.includes('dùng ứng dụng') || text.includes('use app') || text.includes('mở trong app')) type = "Gợi ý mở App";
                else if (text.includes('thông báo') || text.includes('bật thông báo')) type = "Nhắc bật thông báo";

                results.push({ element: d, type });
            }
        }
        return results;
    }

    // Tìm nút Đóng / Bỏ qua trong Popup
    findDismissButton(container) {
        if (!container) return null;

        // 1. Tìm theo aria-label hoặc title (Đóng, Close, Bỏ qua, Dismiss)
        const ariaBtns = Array.from(container.querySelectorAll('button, div[role="button"], a, i, svg, span')).filter(el => {
            const a = ((el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '')).toLowerCase();
            return a.includes('đóng') || a.includes('close') || a.includes('bỏ qua') || a.includes('dismiss') || a.includes('cancel') || a.includes('hủy') || a.includes('không phải bây giờ') || a.includes('not now');
        });
        if (ariaBtns.length > 0) return ariaBtns[0];

        // 2. Tìm theo text bên trong
        const textBtns = Array.from(container.querySelectorAll('button, div[role="button"], a, span')).filter(el => {
            const t = (el.innerText || '').trim().toLowerCase();
            return t === 'đóng' || t === 'close' || t === 'không phải bây giờ' || t === 'bỏ qua' || t === 'để sau' || t === 'hủy' || t === 'not now' || t === 'dismiss' || t === '✕' || t === '×';
        });
        if (textBtns.length > 0) return textBtns[0];

        // 3. Tìm icon dấu X ở góc trên bên phải của modal
        const closeIcons = Array.from(container.querySelectorAll('svg, i, span')).filter(el => {
            const r = el.getBoundingClientRect();
            const parentR = container.getBoundingClientRect();
            return r.width > 10 && r.width < 45 && r.top < parentR.top + 80 && r.left > parentR.right - 80;
        });
        if (closeIcons.length > 0) return closeIcons[0];

        return null;
    }

    // 2. AI TẠO BÌNH LUẬN BÁN HÀNG SÁNG TẠO (DYNAMIC AI COPYWRITER)
    generateDynamicComment(category = "DOBO", targetPageName = "") {
        const DOMAIN = "https://muadogiare.web.app";
        
        const AI_DICTIONARY = {
            QUAN: {
                openers: ["Chị em ơi", "Mấy chị ơi", "Cả nhà ơi", "Các nàng ơi", "Khách yêu ơi", "Mọi người ơi", "Các bác ơi"],
                intents: [
                    "em xả kho quần ống rộng giá xưởng siêu đẹp nè",
                    "shop thanh lý lô quần ống rộng tôn dáng chuẩn đét ở đây",
                    "xả hàng quần chất lượng cao form siêu hack dáng tại đây",
                    "thanh lý xả kho sập sàn toàn mẫu quần hót nhất năm",
                    "em gom đơn xả nhanh lô quần giá tận xưởng bao đẹp bao chất",
                    "xả nốt lô quần đẹp chuẩn form cho các chị em diện xinh"
                ],
                calls: [
                    "chị em ấn vào chọn size chọn màu luôn nhen",
                    "các nàng bấm vào xem bảng mẫu và đặt liền tay nhé",
                    "mọi người ấn xem mẫu và đặt ngay kẻo hết size",
                    "các chị nhanh tay nhấn vào đặt để em giữ size đẹp nha",
                    "bấm vào xem ngay để săn giá ưu đãi tận xưởng nhé"
                ]
            },
            DOBO: {
                openers: ["Các chị ơi", "Chị em ơi", "Khách yêu ơi", "Mấy chị em ơi", "Cả nhà ơi", "Mọi người ơi"],
                intents: [
                    "em xả kho đồ bộ mặc nhà mát mịn cao cấp ở đây nè",
                    "shop thanh lý lô đồ bộ đẹp giá rẻ tận gốc bao mềm mát",
                    "thanh lý xả hàng đồ bộ mặc nhà form rộng rãi thoải mái cực xinh",
                    "em xả hàng đồ bộ cao cấp bao giặt máy không nhăn không xù",
                    "xả kho đồ bộ mẫu mới nhất giá hạt dẻ tại đây nha",
                    "gom đơn thanh lý lô đồ bộ hot hit cho các chị em diện nhà diện phố"
                ],
                calls: [
                    "các chị ấn vào chọn size chọn mẫu đặt luôn nhen",
                    "chị em bấm vào xem ảnh thật và đặt giữ mẫu nhé",
                    "nhanh tay ấn vào để chọn màu ưng ý nha mọi người",
                    "bấm vào đây để chọn size và nhận giá xả kho ưu đãi nhé",
                    "các nàng nhấn vào đặt ngay để bên em đóng hàng sớm nhen"
                ]
            },
            SAURIENG: {
                openers: ["Anh chị ơi", "Cả nhà ơi", "Các bác ơi", "Khách quý ơi", "Mọi người ơi", "Cô chú bác ơi"],
                intents: [
                    "nhà em xả vườn sầu riêng cơm vàng hạt lép thơm béo ngậy tại đây",
                    "vựa em xả kho sầu riêng chín cây bao ăn bao ngọt tận vườn",
                    "thanh lý lô sầu riêng sạch loại 1 bao 1 đổi 1 tận tay",
                    "xả hàng sầu riêng sạch giá tận gốc cho mọi người thưởng thức",
                    "em cắt vườn xả nhanh lô sầu riêng múi dẻo ngọt lịm ở đây nè",
                    "sầu riêng tươi ngon rụng cây bao ăn từng múi tại đây"
                ],
                calls: [
                    "mọi người nhấn vào đây để đặt hàng giao nhanh tận nhà nhen",
                    "các anh chị bấm vào xem và đặt ngay để em ship liền nhé",
                    "ấn vào đây để đặt sầu riêng ngon bao ngọt bao đổi trả nha",
                    "nhanh tay bấm vào để chọn size trái theo ý thích nhé cả nhà"
                ]
            },
            DIENTHOAI: {
                openers: ["Cả nhà ơi", "Mọi người ơi", "Anh em ơi", "Khách yêu ơi", "Các bác ơi"],
                intents: [
                    "em thanh lý xả kho điện thoại và gia dụng giá cực sốc tại đây",
                    "shop xả hàng tồn kho điện thoại chính hãng giá rẻ có bảo hành",
                    "thanh lý lô điện thoại giá rẻ chỉ từ 179K xài cực bền mượt",
                    "em xả kho điện thoại uy tín bao test đổi mới tận tay ở đây",
                    "xả hàng điện thoại giá tốt nhất thị trường kèm quà tặng tại đây",
                    "thanh lý nhanh lô điện thoại lướt đẹp zin keng cho mọi người"
                ],
                calls: [
                    "mọi người ấn vào đây để xem mẫu và đặt hàng nhanh nhé",
                    "bấm vào đây để đặt máy và nhận bảo hành đầy đủ nha",
                    "các bác nhấn vào để xem chi tiết và đặt hàng sớm nhé",
                    "nhanh tay bấm vào để săn ưu đãi giá xả kho hôm nay nhen"
                ]
            }
        };

        const dict = AI_DICTIONARY[category] || AI_DICTIONARY.DOBO;
        const op = dict.openers[Math.floor(Math.random() * dict.openers.length)];
        const it = dict.intents[Math.floor(Math.random() * dict.intents.length)];
        const ca = dict.calls[Math.floor(Math.random() * dict.calls.length)];

        return `${op}, ${it}, ${ca} ${DOMAIN}`;
    }

    log(msg) {
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
        } catch(e) {}
    }
}

// Khởi tạo Singleton Instance
if (!window.__aiSupervisor) {
    window.__aiSupervisor = new AISupervisorEngine();
}
