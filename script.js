const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQytne2tRE77Jievx8F595fvzxdwrkAePL1aMpqcVkhoD9RNF_x9wEu8kCK848jpAk-PGTefUrDtISB/pub?gid=0&single=true&output=csv";

let allData = []; 
let filteredData = []; 
let currentPage = 1;
const itemsPerPage = 12;

// 1. ฟังก์ชันคำนวณระยะทาง
function getDisplacement(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 2. ฟังก์ชันดึงข้อมูล
async function init() {
    const container = document.getElementById('placeContainer');
    const titleElement = document.getElementById('pageTitle');
    if (!titleElement) return;
    
    let targetType = titleElement.getAttribute('data-type').trim().toLowerCase().replace('é', 'e');

    try {
        const response = await fetch(sheetUrl);
        const csvText = await response.text();
        
        const rows = csvText.split(/\r?\n/).filter(row => row.trim() !== "");
        if (rows.length < 2) return;

        const headers = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ""));
        
        allData = rows.slice(1).map(row => {
            const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
            let obj = {};
            headers.forEach((header, i) => {
                let val = values[i] ? values[i].trim().replace(/["']/g, "") : "";
                obj[header] = val;
            });
            return obj;
        });

        filteredData = allData.filter(item => {
            const itemType = item.type ? item.type.toLowerCase().replace('é', 'e') : "";
            return itemType === targetType;
        });

        renderPage(); 

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => updateDistances(pos.coords.latitude, pos.coords.longitude),
                (error) => {
                    console.warn("GPS Denied: Using Chiang Dao Center");
                    updateDistances(19.3528235, 98.9624811); 
                },
                { enableHighAccuracy: false, timeout: 5000 }
            );
        } else {
            updateDistances(19.3528235, 98.9624811);
        }
    } catch (error) {
        console.error("Error:", error);
        if (container) container.innerHTML = "<p style='text-align:center;'>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>";
    }
}

function updateDistances(uLat, uLng) {
    filteredData.forEach(item => {
        if (item.lat && item.lng) {
            item.dist = getDisplacement(uLat, uLng, parseFloat(item.lat), parseFloat(item.lng));
        } else {
            item.dist = 9999;
        }
    });
    filteredData.sort((a, b) => (a.dist || 9999) - (b.dist || 9999));
    renderPage();
}

// 3. ฟังก์ชันแสดงผล
function renderPage() {
    const container = document.getElementById('placeContainer');
    if (!container) return;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredData.slice(start, end);

    if (filteredData.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding: 50px;">ไม่พบข้อมูล</p>`;
        return;
    }

    let cardsHtml = "";
    paginatedItems.forEach(item => {
        let imagesContent = "";
        // วนลูป 20 รูป
        for (let i = 1; i <= 20; i++) {
            imagesContent += `
                <img src="IMG/places/${item.code}_${i}.jpg" 
                     loading="lazy" 
                     class="slide-img"
                     onerror="this.style.display='none'; this.classList.add('hide'); checkControls('${item.code}')">
            `;
        }

        cardsHtml += `
            <div class="place-card" id="card-${item.code}">
                <div class="card-image">
                    <div class="image-track" style="transform: translateX(0%);" data-index="0">
                        ${imagesContent}
                        <img src="IMG/LOGO/logo.png" class="placeholder-img" onerror="this.src='IMG/LOGO/logo.jpg';">
                    </div>
                    <div class="slider-controls" id="controls-${item.code}">
                        <button class="nav-btn prev-btn" onclick="moveSlide('${item.code}', -1)">❮</button>
                        <button class="nav-btn next-btn" onclick="moveSlide('${item.code}', 1)">❯</button>
                    </div>
                </div>
                <div class="info">
                    <h3>${item.name}</h3>
                    <p class="dist-tag">${item.dist && item.dist < 9999 ? `📏 ประมาณ ${item.dist.toFixed(1)} กม.` : '📍 กำลังคำนวณระยะทาง...'}</p>
                    <div class="actions">
                        <a href="${item.location}" target="_blank" class="map-btn">เปิดแผนที่ Google Maps</a>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = cardsHtml;
    renderPagination();
}

// 4. เช็คจำนวนรูป
function checkControls(code) {
    const card = document.getElementById(`card-${code}`);
    if (!card) return;

    const visibleImgs = card.querySelectorAll('.image-track img.slide-img:not(.hide)');
    const controls = card.querySelector('.slider-controls');
    const placeholder = card.querySelector('.placeholder-img');
    
    // ซ่อนปุ่มถ้ามีรูปเดียวหรือไม่มีเลย
    if (controls) {
        controls.style.display = visibleImgs.length <= 1 ? 'none' : 'flex';
    }

    // โชว์โลโก้ถ้าไม่มีรูปเลย
    if (visibleImgs.length === 0 && placeholder) {
        placeholder.classList.add('show-placeholder');
    }
}

// 5. เลื่อนรูป
function moveSlide(code, direction) {
    const card = document.getElementById(`card-${code}`);
    const track = card.querySelector('.image-track');
    const imgs = track.querySelectorAll('img.slide-img:not(.hide)');
    if (imgs.length <= 1) return;

    let currentIndex = parseInt(track.dataset.index || 0);
    currentIndex += direction;

    if (currentIndex >= imgs.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = imgs.length - 1;

    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    track.dataset.index = currentIndex;
}

// 6. Pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const topContainer = document.getElementById('paginationTop');
    const bottomContainer = document.getElementById('paginationBottom');
    
    const html = Array.from({ length: totalPages }, (_, i) => `
        <button class="page-btn ${currentPage === i + 1 ? 'active' : ''}" onclick="changePage(${i + 1})">${i + 1}</button>
    `).join('');
    
    if(topContainer) topContainer.innerHTML = html;
    if(bottomContainer) bottomContainer.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 7. ค้นหา
function searchFunction() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const titleElement = document.getElementById('pageTitle');
    let targetType = titleElement.getAttribute('data-type').trim().toLowerCase().replace('é', 'e');
    
    filteredData = allData.filter(item => {
        const itemType = item.type ? item.type.toLowerCase().replace('é', 'e') : "";
        return itemType === targetType && item.name.toLowerCase().includes(input);
    });
    currentPage = 1; 
    renderPage();
}

// เริ่มงาน
init();